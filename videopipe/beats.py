"""Memecah satu scene menjadi 'denyut' visual (beat): tiap denyut = kalimat berurutan dengan satu suasana dan satu klip B-roll."""
import re

from . import ai

MIN_BEAT, MAX_BEAT, TARGET_BEAT = 8.0, 30.0, 18.0
MOODS = ("cold", "neutral", "warm")

# kata kunci Indonesia -> istilah visual Inggris (cadangan tanpa AI)
KEYWORDS = {
    "hujan": "rain", "malam": "night", "jendela": "window", "laut": "ocean", "pantai": "beach shore", "langit": "sky clouds",
    "awan": "clouds", "hutan": "forest", "gunung": "mountain", "puncak": "mountain summit fog", "senja": "sunset",
    "pagi": "morning light", "kota": "city night", "jalan": "empty street", "ponsel": "smartphone screen night",
    "pesan": "smartphone messages", "diary": "notebook writing", "buku": "book pages", "bunga": "flowers", "air": "water",
    "lilin": "candle flame", "kopi": "coffee cup", "peluk": "embrace silhouette", "tangan": "hands", "tangis": "tears",
    "sunyi": "empty quiet room", "kenangan": "old photographs", "ulang tahun": "birthday candles", "cahaya": "soft light",
}


def sentences(words: list[dict]) -> list[dict]:
    """Kalimat = berakhir . ? ! atau pembicara berganti."""
    groups, cur = [], []
    for i, w in enumerate(words):
        if cur and w.get("spk") != words[cur[-1]].get("spk"):
            groups.append(cur)
            cur = []
        cur.append(i)
        if re.search(r'[.?!]["”]?$', w["text"]):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return [{"k": k, "first": g[0], "last": g[-1], "start": words[g[0]]["start"], "end": words[g[-1]]["end"],
             "spk": words[g[0]].get("spk", "Narator"), "text": " ".join(words[x]["text"] for x in g)}
            for k, g in enumerate(groups)]


def _dur(sents, a, b, total):
    start = 0.0 if a == 0 else sents[a]["start"]
    end = total if b == len(sents) - 1 else sents[b]["end"]
    return end - start


def _normalize(beats: list[dict], sents: list[dict], total: float) -> list[dict]:
    """Rapat dan berurutan, tiap denyut 8-30 detik (gabung yang pendek, pecah yang panjang di jeda terbesar)."""
    beats = sorted(beats, key=lambda b: b["a"])
    # rapat
    for i, b in enumerate(beats):
        b["a"] = 0 if i == 0 else beats[i - 1]["b"] + 1
        b["b"] = len(sents) - 1 if i == len(beats) - 1 else max(b["a"], min(b["b"], len(sents) - 2))
    beats = [b for b in beats if b["a"] <= b["b"]]
    # gabung yang pendek
    changed = True
    while changed and len(beats) > 1:
        changed = False
        for i, b in enumerate(beats):
            if _dur(sents, b["a"], b["b"], total) < MIN_BEAT:
                j = i - 1 if i > 0 else i + 1
                lo, hi = sorted((i, j))
                beats[lo]["b"] = beats[hi]["b"]
                beats.pop(hi)
                changed = True
                break
    # pecah yang panjang
    out = []
    for b in beats:
        stack = [b]
        while stack:
            c = stack.pop(0)
            if _dur(sents, c["a"], c["b"], total) > MAX_BEAT and c["b"] > c["a"]:
                mid = (_dur(sents, c["a"], c["b"], total)) / 2
                t0 = 0.0 if c["a"] == 0 else sents[c["a"]]["start"]
                best, bscore = c["a"], -1
                for k in range(c["a"], c["b"]):
                    gap = sents[k + 1]["start"] - sents[k]["end"]
                    score = gap - abs(sents[k]["end"] - t0 - mid) * 0.15
                    if score > bscore:
                        best, bscore = k, score
                stack = [dict(c, b=best), dict(c, a=best + 1)] + stack
            else:
                out.append(c)
    return out


def _rule_beats(sents: list[dict], total: float) -> list[dict]:
    beats, a = [], 0
    for k in range(len(sents)):
        d = _dur(sents, a, k, total)
        nxt_gap = (sents[k + 1]["start"] - sents[k]["end"]) if k + 1 < len(sents) else 9
        if d >= TARGET_BEAT and nxt_gap >= 0.4:
            beats.append({"a": a, "b": k})
            a = k + 1
    if a < len(sents):
        beats.append({"a": a, "b": len(sents) - 1})
    for b in beats:
        text = " ".join(s["text"] for s in sents[b["a"]:b["b"] + 1]).lower()
        q = [v for k, v in KEYWORDS.items() if k in text][:3]
        b.update(name="", mood="neutral", note="", queries=(q + ["quiet atmospheric dusk", "slow calm nature moody", "lonely silhouette window"])[:3])
    return beats


SYSTEM = ("Kamu sutradara video pendek vertikal (9:16) bernuansa gelap sinematik untuk cerita berbahasa Indonesia. "
          "Jawab HANYA JSON valid.")


def _prompt(sents: list[dict], total: float, context: str) -> str:
    lines = "\n".join(f"{s['k']}: [{s['start']:.1f}-{s['end']:.1f}s] ({s['spk']}) {s['text']}" for s in sents)
    return f"""{context}

Bagi scene berdurasi {total:.0f} detik ini menjadi DENYUT visual berurutan. Satu denyut = beberapa kalimat berurutan yang
berbagi satu suasana visual dan akan memakai SATU klip video stok sebagai latar. Aturan:
- 2 sampai 6 denyut. Tiap denyut {MIN_BEAT:.0f}-{MAX_BEAT:.0f} detik. Batas hanya di antara kalimat; semua kalimat tercakup, urut.
- Ikuti perubahan suasana atau topik (mis. pindah dari kenangan ke kenyataan), bukan sekadar memotong rata.
- mood: "cold" (biru malam, kesepian), "neutral", atau "warm" (emas, harapan, kehangatan).
- queries: tepat 3 query bahasa Inggris yang konkret untuk mencari video stok (objek/suasana yang bisa difilmkan: rain on window,
  silhouette at dusk, foggy forest, ocean waves at twilight). HINDARI konsep abstrak, teks, logo, wajah close-up, kerumunan.
- name: 2-3 kata, note: satu kalimat Indonesia tentang gambaran visualnya.
Kalimat (indeks: [waktu] (pembicara) teks):
{lines}

Keluaran: {{"beats":[{{"first":0,"last":2,"name":"...","mood":"cold","queries":["...","...","..."],"note":"..."}}]}}"""


def make_beats(words: list[dict], total: float, context: str, use_ai: bool = True) -> dict:
    sents = sentences(words)
    info = {"mode": "rules", "model": None, "note": ""}
    beats = None
    if use_ai:
        def check(d):
            bs = d.get("beats")
            if not isinstance(bs, list) or not (1 <= len(bs) <= 8):
                raise ValueError("jumlah denyut tak wajar")
            for b in bs:
                if not isinstance(b.get("first"), int) or not isinstance(b.get("last"), int):
                    raise ValueError("first/last bukan bilangan bulat")
                if not (isinstance(b.get("queries"), list) and len(b["queries"]) >= 1):
                    raise ValueError("queries kosong")
        try:
            data, model = ai.ask_json(SYSTEM, _prompt(sents, total, context), max_tokens=3000, validate=check)
            beats = []
            for b in data["beats"]:
                q = [str(x).strip() for x in b["queries"] if str(x).strip()][:3]
                beats.append({"a": int(b["first"]), "b": int(b["last"]), "name": str(b.get("name", "")).strip(),
                              "mood": b.get("mood") if b.get("mood") in MOODS else "neutral",
                              "note": str(b.get("note", "")).strip(), "queries": q})
            info.update(mode="ai", model=model)
        except Exception as e:
            info["note"] = f"AI gagal ({str(e)[:160]}); memakai aturan jeda dan kata kunci."
    if beats is None:
        beats = _rule_beats(sents, total)
    beats = _normalize(beats, sents, total)
    # batas waktu (detik): di tengah jeda antar denyut
    bounds = [0.0]
    for i in range(1, len(beats)):
        prev_end = sents[beats[i - 1]["b"]]["end"]
        nxt_start = sents[beats[i]["a"]]["start"]
        bounds.append(round(max(prev_end, (prev_end + nxt_start) / 2) if nxt_start - prev_end > 0.2 else prev_end, 2))
    bounds.append(round(total, 2))
    for i, b in enumerate(beats):
        b["start"], b["end"] = bounds[i], bounds[i + 1]
        b["text"] = " ".join(s["text"] for s in sents[b["a"]:b["b"] + 1])
    return {"beats": beats, "bounds": bounds, "sentences": sents, "info": info}
