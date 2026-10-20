"""
director.py - "Direktur" mode teater: memetakan cerita menjadi scene, tokoh, dan baris dialog.

Dua jalur:
  1. AI -> JSON terstruktur. Urutan: model OmniRoute (kompatibel OpenAI), lalu Gemini, bergantian bila gagal.
  2. Aturan generik (tanpa AI) -> dipakai bila AI tak tersedia, gagal, atau hasilnya tidak setia pada naskah.

Hanya variabel OMNIROUTE_* dan GEMINI_* dari .env yang dibaca; kunci lain di file itu tidak disentuh.
"""

import json
import os
import re
import time
import urllib.request

import cleaner

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NARATOR = "Narator"
# Model utama untuk SEMUA alur AI (mode teater, pemetaan ekspresi, dan alur video): stabil (keluaran konsisten, tidak
# berganti model antar panggilan), mendukung gambar dan pemanggilan alat. Model lain hanya cadangan.
# Catatan: model ini "berpikir" dulu, jadi jangan membatasi max_tokens terlalu kecil (>= 1500 untuk panggilan bergambar).
PRIMARY_MODEL = "agy/gemini-3.8-flash-tiered"
DEFAULT_MODELS = ["auto/best-chat", "auto/fast", "auto/chat"]      # cadangan, dicoba berurutan bila utama gagal
CHUNK_CHARS = 6000          # naskah lebih panjang dianalisis per potongan
MIN_COVERAGE = 0.85         # AI harus mempertahankan >= 85% kata naskah, selain itu ditolak


# --- Konfigurasi ------------------------------------------------------------

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai"
DEFAULT_GEMINI_MODELS = ["gemini-flash-latest", "gemini-2.5-flash"]
_ENV_NAMES = ("OMNIROUTE_KEY", "OMNIROUTE_ENDPOINT", "OMNIROUTE_ENPOINT", "OMNIROUTE_MODELS", "OMNIROUTE_PRIMARY_MODEL",
              "GEMINI_KEY", "GEMINI_API_KEY", "GEMINI_MODELS")


def _load_env() -> dict:
    env = {}
    path = os.path.join(BASE_DIR, ".env")
    if os.path.isfile(path):
        for line in open(path, encoding="utf-8"):
            m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*?)\s*$", line)
            if m and m.group(1) in _ENV_NAMES:
                env[m.group(1)] = m.group(2).strip().strip("\"'")
    for k in _ENV_NAMES:
        if os.environ.get(k):
            env.setdefault(k, os.environ[k])
    return env


def _split(value: str, default: list[str]) -> list[str]:
    return [m.strip() for m in (value or "").split(",") if m.strip()] or default


def _models(env: dict) -> list[str]:
    """Model utama dulu (OMNIROUTE_PRIMARY_MODEL menggantikan bawaan), lalu cadangan (OMNIROUTE_MODELS), tanpa duplikat."""
    primary = (env.get("OMNIROUTE_PRIMARY_MODEL") or PRIMARY_MODEL).strip()
    out = [primary]
    for m in _split(env.get("OMNIROUTE_MODELS", ""), DEFAULT_MODELS):
        if m not in out:
            out.append(m)
    return out


def ai_config() -> list[dict] | None:
    """Daftar penyedia AI berurutan: [{name, endpoint, key, models}, ...]; None bila tak ada satu pun."""
    env = _load_env()
    providers = []
    key = env.get("OMNIROUTE_KEY")
    endpoint = env.get("OMNIROUTE_ENDPOINT") or env.get("OMNIROUTE_ENPOINT")   # ejaan di .env: ENPOINT
    if key and endpoint:
        providers.append({"name": "omniroute", "endpoint": endpoint.rstrip("/"), "key": key,
                          "models": _models(env)})
    gkey = env.get("GEMINI_KEY") or env.get("GEMINI_API_KEY")
    if gkey:
        providers.append({"name": "gemini", "endpoint": GEMINI_ENDPOINT, "key": gkey,
                          "models": _split(env.get("GEMINI_MODELS", ""), DEFAULT_GEMINI_MODELS)})
    return providers or None


# --- Jalur AI ---------------------------------------------------------------

SYSTEM_PROMPT = """Kamu adalah sutradara audio drama. Tugasmu memetakan sebuah cerita berbahasa Indonesia \
menjadi scene, tokoh, dan baris ucapan untuk dibacakan banyak pengisi suara.

ATURAN KETAT:
- JANGAN meringkas, menambah, atau mengubah kata naskah. Setiap kalimat naskah harus muncul tepat satu kali, \
urutannya sama. Hanya boleh membuang label pembicara ("Ratu:"), tanda kutip pembuka/penutup, dan tanda ucapan "—".
- Narasi (bukan ucapan tokoh) -> speaker "Narator". Ucapan dalam tanda kutip atau berlabel -> speaker nama tokoh. \
Kalimat penjelas seperti "kata sang Ratu" tetap milik Narator.
- Nama tokoh konsisten (satu nama untuk satu tokoh, tanpa gelar yang berganti-ganti).
- Bagi cerita menjadi scene logis (perubahan tempat/waktu/suasana), kira-kira 120-260 kata per scene.
- emotion salah satu dari: netral, senang, sedih, marah, takut, kaget, berbisik, tegas, lembut, licik, menggoda.
- pause_after: jeda dramatis (detik, 0 sampai 2.5) setelah baris itu: akhir paragraf/adegan 0.8-1.2, sebelum kejutan \
atau sesudah pertanyaan 0.5-0.8, selebihnya 0-0.3.
- Per tokoh beri gender (female|male|neutral), age (child|young|adult|old), dan voice_description: \
satu kalimat bahasa Inggris untuk membuat suara tokoh itu (contoh: "a cold, haughty middle-aged woman, smooth and sharp").
- Keluaran HANYA JSON valid tanpa teks lain, dengan bentuk:
{"title": "...", "characters": [{"name": "...", "gender": "...", "age": "...", "voice_description": "..."}],
 "scenes": [{"title": "...", "lines": [{"speaker": "Narator", "text": "...", "emotion": "netral", "pause_after": 0.3}]}]}
Tokoh "Narator" juga masuk daftar characters."""


def _chat(cfg: dict, model: str, system: str, user: str, timeout: int = 180) -> str:
    body = json.dumps({
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.2,
    }).encode()
    req = urllib.request.Request(
        cfg["endpoint"] + "/chat/completions", data=body, method="POST",
        headers={"Authorization": "Bearer " + cfg["key"], "Content-Type": "application/json",
                 "User-Agent": "tts-narasi/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.load(r)
    return data["choices"][0]["message"]["content"] or ""


def _parse_json(raw: str) -> dict:
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip())
    a, b = raw.find("{"), raw.rfind("}")
    if a < 0 or b <= a:
        raise ValueError("Tidak ada JSON di jawaban AI")
    return json.loads(raw[a:b + 1])


def _norm_words(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def _coverage(original: str, scenes: list[dict]) -> float:
    """Porsi kata naskah yang tetap ada di keluaran (urutan diabaikan, hitungan dijaga)."""
    from collections import Counter
    want = Counter(_norm_words(original))
    got = Counter(w for s in scenes for ln in s["lines"] for w in _norm_words(ln["text"]))
    total = sum(want.values()) or 1
    return sum(min(c, got.get(w, 0)) for w, c in want.items()) / total


def _num(v, lo=0.0, hi=3.0) -> float:
    try:
        return round(max(lo, min(hi, float(v))), 1)
    except (TypeError, ValueError):
        return 0.0


def _validate(data: dict) -> dict:
    scenes, chars = [], {}
    for c in data.get("characters", []):
        name = str(c.get("name", "")).strip()
        if name:
            chars[name] = {
                "name": name,
                "gender": c.get("gender") if c.get("gender") in ("female", "male", "neutral") else "neutral",
                "age": c.get("age") if c.get("age") in ("child", "young", "adult", "old") else "adult",
                "voice_description": str(c.get("voice_description", "")).strip(),
            }
    for s in data.get("scenes", []):
        lines = []
        for ln in s.get("lines", []):
            text = str(ln.get("text", "")).strip()
            if not re.search(r"\w", text):
                continue
            sp = str(ln.get("speaker", NARATOR)).strip() or NARATOR
            chars.setdefault(sp, {"name": sp, "gender": "neutral", "age": "adult", "voice_description": ""})
            lines.append({"speaker": sp, "text": text, "emotion": cleaner.norm_emotion(ln.get("emotion")),
                          "pause": _num(ln.get("pause_after", ln.get("pause", 0)))})
        if lines:
            scenes.append({"title": str(s.get("title", "")).strip(), "lines": lines})
    if not scenes:
        raise ValueError("AI tidak menghasilkan scene")
    chars.setdefault(NARATOR, {"name": NARATOR, "gender": "neutral", "age": "adult", "voice_description": ""})
    return {"title": str(data.get("title", "")).strip(), "characters": list(chars.values()), "scenes": scenes}


def _chunks(text: str) -> list[str]:
    paras = [p for p in re.split(r"\n\s*\n|\n", text) if p.strip()]
    out, cur = [], ""
    for p in paras:
        if cur and len(cur) + len(p) > CHUNK_CHARS:
            out.append(cur)
            cur = ""
        cur += ("\n\n" if cur else "") + p
    if cur:
        out.append(cur)
    return out


def analyze_ai(text: str, providers: list[dict]) -> tuple[dict, str]:
    """Kembalikan (struktur, 'penyedia/model'). Lanjut ke model berikutnya bila gagal/tidak setia."""
    parts = _chunks(text)
    errors = []
    for cfg, model in [(p, m) for p in providers for m in p["models"]]:
        try:
            scenes, chars, title, known = [], {}, "", []
            for part in parts:
                user = part if not known else (
                    "Tokoh yang sudah dikenal (pakai nama yang sama): " + ", ".join(known)
                    + "\n\nLanjutan naskah:\n" + part)
                data = _validate(_parse_json(_chat(cfg, model, SYSTEM_PROMPT, user)))
                cov = _coverage(part, data["scenes"])
                if cov < MIN_COVERAGE:
                    raise ValueError(f"AI mengubah/menghilangkan naskah (kesetiaan {cov:.0%})")
                title = title or data["title"]
                for c in data["characters"]:
                    chars.setdefault(c["name"], c)
                known = list(chars)
                scenes += data["scenes"]
            return {"title": title, "characters": list(chars.values()), "scenes": scenes}, f"{cfg['name']}/{model}"
        except Exception as e:                      # model berikutnya
            errors.append(f"{cfg['name']}/{model}: {str(e)[:90]}")
    raise RuntimeError(" | ".join(errors) or "AI tidak tersedia")


# --- Jalur aturan generik ---------------------------------------------------

_FEMALE = r"ratu|putri|ibu|nenek|bunda|gadis|wanita|perempuan|kakak perempuan|adik perempuan|peri|penyihir|nyonya|dewi|bibi"
_MALE = r"raja|pangeran|ayah|bapak|kakek|pemburu|lelaki|laki-laki|pria|tuan|kurcaci|ksatria|pak|paman|dewa"
_CHILD = r"anak|bocah|kecil|adik|si kecil|bayi"
_OLD = r"nenek|kakek|tua|sesepuh|mbah"
_LABEL_RE = re.compile(r"^\s*([A-ZÀ-Ý][\w' .-]{0,30}?)\s*:\s*(.+)$")


def _guess_traits(name: str) -> tuple[str, str]:
    n = name.lower()
    gender = "female" if re.search(_FEMALE, n) else "male" if re.search(_MALE, n) else "neutral"
    age = "child" if re.search(_CHILD, n) else "old" if re.search(_OLD, n) else "adult"
    return gender, age


EMOTION_LEXICON = {
    "takut": r"takut|gemetar|ngeri|cemas|panik|mengerikan|bersembunyi|menggigil|ancaman|bahaya|curiga",
    "sedih": r"sedih|menangis|air mata|duka|kehilangan|meninggal|pilu|kesepian|pedih|menyesal|terluka",
    "marah": r"marah|murka|geram|membentak|amarah|benci|dendam|berteriak|membentak|kesal",
    "senang": r"senang|gembira|bahagia|tertawa|riang|bersorak|syukur|tersenyum lebar|girang|ceria",
    "kaget": r"terkejut|kaget|tersentak|tiba-tiba|terperanjat|mendadak",
    "berbisik": r"berbisik|lirih|pelan-pelan|diam-diam|samar",
    "licik": r"licik|menyeringai|muslihat|tipu|rencana jahat|siasat",
    "lembut": r"lembut|hangat|menenangkan|perlahan|tenang|tersenyum tipis",
}


def guess_emotion(t: str) -> str:
    """Tebakan emosi dari kata kunci dan tanda baca (cadangan tanpa AI)."""
    low = t.lower()
    for emo, pat in EMOTION_LEXICON.items():
        if re.search(r"\b(?:" + pat + r")", low):
            return emo
    if t.rstrip().endswith("!"):
        return "tegas"
    return "netral"


def guess_pause(t: str, end_of_paragraph: bool = False) -> float:
    """Jeda sesudah kalimat/baris menurut tanda baca (cadangan tanpa AI)."""
    t = t.rstrip()
    if end_of_paragraph:
        return 0.9
    if t.endswith(("...", "…")):
        return 0.6
    if t.endswith("?"):
        return 0.5
    if t.endswith("!"):
        return 0.4
    if t.endswith(":"):
        return 0.3
    return 0.0


def analyze_rules(text: str, group_words: int = 200) -> dict:
    """Tanpa AI: baris 'Nama: ucapan' -> tokoh; selain itu Narator. Scene dari pemisah/paragraf."""
    scenes, chars = [], {NARATOR: {"name": NARATOR, "gender": "neutral", "age": "adult", "voice_description": ""}}
    for raw in cleaner.split_scenes(text, group_words):
        lines = []
        for para in re.split(r"\n+", raw):
            para = cleaner.EMOJI_PATTERN.sub("", re.sub(r"[*_`]+", "", para)).strip()
            if not para:
                continue
            m = _LABEL_RE.match(para)
            if m and len(m.group(1).split()) <= 4:
                sp, body = m.group(1).strip(), m.group(2).strip()
                body = re.sub(r"^[\"“]|[\"”]$", "", re.sub(r"^[—–-]\s*", "", body)).strip()
                if sp not in chars:
                    g, a = _guess_traits(sp)
                    chars[sp] = {"name": sp, "gender": g, "age": a, "voice_description": ""}
            else:
                sp, body = NARATOR, para
            lines.append({"speaker": sp, "text": body, "emotion": guess_emotion(body),
                          "pause": guess_pause(body, end_of_paragraph=True)})
        if lines:
            scenes.append({"title": "", "lines": lines})
    return {"title": "", "characters": list(chars.values()), "scenes": scenes}


# --- Anotasi ekspresi & jeda untuk teks narasi biasa (mode tanpa scene / dengan scene) ----

ANNOTATE_PROMPT = """Kamu adalah sutradara pembacaan narasi. Tugasmu menandai bagaimana sebuah naskah berbahasa Indonesia \
sebaiknya dibacakan: ekspresi dan jeda dramatis.

ATURAN KETAT:
- JANGAN mengubah, menambah, atau membuang kata. Hanya pecah teks menjadi segmen berurutan (1-3 kalimat per segmen), \
urutan dan kata tetap sama. Tanda "—" pembuka dialog dan tanda kutip boleh dibuang.
- Paragraf dipisah baris kosong. Dialog diawali tanda "—" atau tanda kutip; tag dialog seperti "—tanyanya" tetap satu \
segmen dengan ucapannya.
- emotion tiap segmen salah satu dari: netral, senang, sedih, marah, takut, kaget, berbisik, tegas, lembut, licik, menggoda. \
Bacakan seperti pencerita yang hidup: ikuti suasana adegan (tegang, haru, lucu, hening) dan suasana hati pembicara pada \
dialog. Jangan menandai semuanya netral; sekitar sepertiga sampai separuh segmen biasanya punya emosi tertentu pada cerita \
berdrama. Narasi datar/deskriptif boleh netral. Satu emosi bisa berlaku untuk beberapa segmen berurutan.
- pause_after: jeda detik (0 sampai 2.5), harus bervariasi: akhir paragraf 0.8-1.2, pergantian adegan atau suasana 1.2-2.0, \
sebelum kejutan atau sesudah pertanyaan penting 0.5-0.9, sesudah titik tiga atau tanda seru 0.4-0.7, antar kalimat biasa 0-0.2.
- Keluaran HANYA JSON valid: {"segments": [{"text": "...", "emotion": "netral", "pause_after": 0.3}]}"""


def _segments_ai(text: str, providers: list[dict]) -> tuple[list[dict], str]:
    parts = _chunks(text)
    errors = []
    for cfg, model in [(p, m) for p in providers for m in p["models"]]:
        try:
            segs = []
            for part in parts:
                data = _parse_json(_chat(cfg, model, ANNOTATE_PROMPT, part))
                got = [{"text": str(x.get("text", "")).strip(),
                        "emotion": cleaner.norm_emotion(x.get("emotion")),
                        "pause": _num(x.get("pause_after", 0), hi=2.5)}
                       for x in data.get("segments", []) if re.search(r"\w", str(x.get("text", "")))]
                cov = _coverage(part, [{"lines": [{"text": g["text"]} for g in got]}])
                if not got or cov < 0.9:
                    raise ValueError(f"AI mengubah/menghilangkan naskah (kesetiaan {cov:.0%})")
                segs += got
            return segs, f"{cfg['name']}/{model}"
        except Exception as e:
            errors.append(f"{cfg['name']}/{model}: {str(e)[:90]}")
    raise RuntimeError(" | ".join(errors) or "AI tidak tersedia")


def _segments_rules(text: str) -> list[dict]:
    """Cadangan tanpa AI: jeda dari tanda baca, batas paragraf, dan giliran dialog; emosi dari kata kunci."""
    segs = []
    for para in [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]:
        lines = [x.strip() for x in para.split("\n") if x.strip()]
        for li, line in enumerate(lines):
            is_dialogue = bool(re.match(r"^[—–-]+\s*\w", line))
            last_line = li == len(lines) - 1
            line = re.sub(r"^[—–-]+\s*", "", line)
            sents = [x.strip() for x in re.split(r"(?<=[.!?…])\s+", line) if x.strip()]
            for i, sent in enumerate(sents):
                if re.match(r"^[—–-]\s*\w", sent) and segs:
                    segs[-1]["pause"] = 0.0             # tag dialog ("- tanyanya.") menyambung ke ucapan
                    sent = re.sub(r"^[—–-]+\s*", "", sent)
                end_of_line = i == len(sents) - 1
                if end_of_line and last_line:
                    pause = guess_pause(sent, end_of_paragraph=True)
                elif end_of_line and is_dialogue:
                    pause = max(0.4, guess_pause(sent))  # giliran bicara berganti
                else:
                    pause = guess_pause(sent)
                segs.append({"text": sent, "emotion": guess_emotion(sent), "pause": pause})
    return segs


def _tidy_reading(t: str) -> str:
    """Tanda '—' dialog tidak dibaca: buang di awal, ubah ' - tanyanya' menjadi koma."""
    t = re.sub(r"^[—–-]+\s*", "", t.strip())
    return re.sub(r"\s+[—–-]+\s*", ", ", t)


def render_annotated(segments: list[dict]) -> str:
    """Segmen -> teks berpenanda [emosi X] / [jeda N] yang bisa diedit manual."""
    out, cur, line = [], "netral", []
    for sg in segments:
        if sg["emotion"] != cur:
            if line:
                out.append(" ".join(line)); line = []
            out.append(f"[emosi {sg['emotion']}]")
            cur = sg["emotion"]
        line.append(_tidy_reading(sg["text"]))
        if sg["pause"] >= 0.3:
            out.append(" ".join(line)); line = []
            out.append(f"[jeda {sg['pause']:g}]")
    if line:
        out.append(" ".join(line))
    return "\n".join(out)


def annotate(text: str, use_ai: bool = True) -> dict:
    """Tandai ekspresi & jeda pada teks narasi. Mengembalikan {text, segments, info}."""
    info = {"mode": "rules", "model": None, "note": ""}
    segs = None
    if use_ai:
        cfg = ai_config()
        if cfg is None:
            info["note"] = "AI belum dikonfigurasi; memakai aturan generik."
        else:
            t0 = time.time()
            try:
                segs, model = _segments_ai(text, cfg)
                info.update(mode="ai", model=model, note=f"Ekspresi & jeda dipetakan AI ({model}) dalam {time.time()-t0:.0f} detik.")
            except Exception as e:
                info["note"] = f"AI gagal ({str(e)[:300]}); memakai aturan generik."
    if segs is None:
        segs = _segments_rules(text)
        info["note"] = (info["note"] + " " if info["note"] else "") + "Jeda & emosi dari tanda baca dan kata kunci."
    return {"text": render_annotated(segs), "segments": segs, "info": info}


# --- Rekomendasi suara -------------------------------------------------------

VOICE_CATALOG = {
    "supertonic": {
        "M1": {"label": "M1 - Pria (Standar Narator)", "gender": "pria",
               "karakter": "netral, jelas, tenang", "cocok": "narasi umum, dokumenter, berita ringan"},
        "M2": {"label": "M2 - Pria (Santai)", "gender": "pria",
               "karakter": "santai dan akrab", "cocok": "cerita ringan, vlog, edukasi santai"},
        "M3": {"label": "M3 - Pria (Berat & Dalam)", "gender": "pria",
               "karakter": "berat, dalam, berwibawa", "cocok": "misteri, horor, epik, trailer"},
        "M4": {"label": "M4 - Pria (Resmi / Berita)", "gender": "pria",
               "karakter": "resmi dan tegas", "cocok": "berita, pengumuman, korporat"},
        "M5": {"label": "M5 - Pria (Hangat)", "gender": "pria",
               "karakter": "hangat dan ramah, seperti ayah bercerita", "cocok": "dongeng, motivasi, cerita keluarga"},
        "F1": {"label": "F1 - Wanita (Jelas / Presenter)", "gender": "wanita",
               "karakter": "jelas dan tegas seperti presenter", "cocok": "dokumenter, edukasi, presentasi"},
        "F2": {"label": "F2 - Wanita (Lembut)", "gender": "wanita",
               "karakter": "lembut dan menenangkan", "cocok": "dongeng anak, meditasi, cerita hangat"},
        "F3": {"label": "F3 - Wanita (Ceria)", "gender": "wanita",
               "karakter": "ceria dan ringan", "cocok": "konten anak, hiburan, iklan ringan"},
        "F4": {"label": "F4 - Wanita (Formal)", "gender": "wanita",
               "karakter": "formal dan rapi", "cocok": "korporat, berita, instruksional"},
        "F5": {"label": "F5 - Wanita (Ekspresif)", "gender": "wanita",
               "karakter": "ekspresif dan dramatis", "cocok": "audio drama, cerita emosional, teater"},
    },
    "gemini_tts": {
        "Zubenelgenubi": {"label": "Zubenelgenubi - Santai, nada menengah-rendah", "gender": "netral",
                          "karakter": "santai, mengalir, tidak berlebihan", "cocok": "storytelling umum, narasi panjang"},
        "Zali": {"label": "Zali - Hangat dan empatik", "gender": "netral",
                 "karakter": "hangat dan empatik", "cocok": "cerita haru, motivasi, dongeng"},
        "Riko": {"label": "Riko - Percaya diri dan jelas", "gender": "netral",
                 "karakter": "percaya diri, jelas, nada dalam", "cocok": "dokumenter, iklan, narasi tegas"},
        "Sami": {"label": "Sami - Tenang dan yakin", "gender": "netral",
                 "karakter": "tenang dan yakin, nada rendah", "cocok": "misteri, refleksi, meditasi"},
        "Enzo": {"label": "Enzo - Tajam dan bersemangat", "gender": "netral",
                 "karakter": "tajam dan bersemangat, nada rendah", "cocok": "aksi, trailer, pengumuman energik"},
        "Achird": {"label": "Achird - Ramah", "gender": "netral",
                   "karakter": "ramah, nada menengah-rendah", "cocok": "edukasi, cerita santai"},
        "Kore": {"label": "Kore - Tegas", "gender": "netral",
                 "karakter": "tegas", "cocok": "instruksi, berita, otoritas"},
        "Puck": {"label": "Puck - Ceria", "gender": "netral",
                 "karakter": "ceria", "cocok": "anak, hiburan, iklan ceria"},
        "Charon": {"label": "Charon - Informatif", "gender": "netral",
                   "karakter": "informatif", "cocok": "penjelasan, sains, tutorial"},
        "Aoede": {"label": "Aoede - Ringan, mengalir", "gender": "netral",
                  "karakter": "ringan dan mengalir", "cocok": "puisi, narasi artistik, ASMR"},
    },
}

ENGINE_LABEL = {"supertonic": "Supertonic", "gemini_tts": "Gemini TTS"}

RECOMMEND_SYSTEM = """Kamu adalah pengarah suara (voice director) untuk narasi audio bahasa Indonesia.
Baca naskah yang diberikan, lalu pilih SATU suara paling cocok dari katalog dan usulkan dua alternatif.

ATURAN:
- engine hanya boleh "supertonic" atau "gemini_tts"; voice harus id persis dari katalog itu.
- Pilih berdasarkan suasana, genre, dan siapa pendengarnya, bukan berdasarkan panjang naskah.
- speed: angka 0.85 sampai 1.10 (0.9-0.97 untuk cerita reflektif, 1.0 untuk narasi umum, 1.03-1.08 untuk ceria/energik).
- style: hanya untuk gemini_tts; satu kalimat bahasa Inggris yang mendeskripsikan gaya bacaan (contoh: "warm, unhurried bedtime storytelling, gentle and intimate").
- reason: 2-3 kalimat bahasa Indonesia yang menjelaskan kenapa suara itu cocok dengan cerita ini, sebutkan bukti dari isi naskah.
- emotions: 2-5 emosi dominan, hanya dari: netral, senang, sedih, marah, takut, kaget, berbisik, tegas, lembut, licik, menggoda.
- mode_hint: "single" bila naskah satu alur naratif, "scene" bila ada banyak pergantian suasana, "theater" bila banyak dialog tokoh.
- Keluaran HANYA JSON valid tanpa teks lain, bentuk:
{"genre":"...","tone":"...","engine":"...","voice":"...","speed":1.0,"style":"...","reason":"...",
 "emotions":["..."],"mode_hint":"single","alternatives":[{"engine":"...","voice":"...","reason":"..."}]}"""


def _catalog_prompt() -> str:
    lines = []
    for engine, voices in VOICE_CATALOG.items():
        lines.append(f"[{engine}]")
        for vid, meta in voices.items():
            lines.append(f"- {vid}: {meta['label']} — {meta['karakter']}; cocok untuk {meta['cocok']}")
    return "\n".join(lines)


def _recommendation_entry(engine: str, voice: str, reason: str = "") -> dict:
    meta = VOICE_CATALOG[engine][voice]
    return {
        "engine": engine,
        "engine_name": ENGINE_LABEL[engine],
        "voice": voice,
        "voice_name": meta["label"],
        "reason": reason.strip(),
    }


def _validate_recommendation(data: dict) -> dict:
    """Pastikan mesin/suara benar-benar ada dan nilai numerik masuk akal; lengkapi yang kosong."""
    engine = str(data.get("engine", "")).strip()
    if engine not in VOICE_CATALOG:
        engine = "supertonic"
    voices = VOICE_CATALOG[engine]
    voice = str(data.get("voice", "")).strip()
    if voice not in voices:
        voice = next(iter(voices))

    try:
        speed = float(data.get("speed", 1.0))
    except (TypeError, ValueError):
        speed = 1.0
    speed = round(min(1.2, max(0.85, speed)), 2)

    style = str(data.get("style", "")).strip() if engine == "gemini_tts" else ""

    emotions = []
    for e in data.get("emotions") or []:
        e = str(e).strip().lower()
        if e in cleaner.EMOTIONS and e not in emotions:
            emotions.append(e)
    if not emotions:
        emotions = ["lembut"]

    mode_hint = str(data.get("mode_hint", "single")).strip().lower()
    if mode_hint not in ("single", "scene", "theater"):
        mode_hint = "single"

    alternatives = []
    for alt in data.get("alternatives") or []:
        a_engine = str(alt.get("engine", "")).strip()
        a_voice = str(alt.get("voice", "")).strip()
        if a_engine in VOICE_CATALOG and a_voice in VOICE_CATALOG[a_engine]:
            entry = _recommendation_entry(a_engine, a_voice, str(alt.get("reason", "")))
            if (entry["engine"], entry["voice"]) != (engine, voice):
                alternatives.append(entry)
        if len(alternatives) >= 3:
            break

    main = _recommendation_entry(engine, voice, str(data.get("reason", "")))
    return {
        **main,
        "genre": str(data.get("genre", "")).strip() or "narasi",
        "tone": str(data.get("tone", "")).strip() or "netral",
        "speed": speed,
        "style": style,
        "emotions": emotions,
        "mode_hint": mode_hint,
        "alternatives": alternatives,
    }


# Kata kunci untuk jalur tanpa AI. Urutan = prioritas bila skornya sama.
_RULES = [
    ("horor / misteri", "supertonic", "M3", 0.94, "",
     r"hantu|misteri|gelap|darah|kematian|kubur|bisikan|kutukan|seram|menakutkan|kabut|bayangan|sunyi|mencekam"),
    ("dongeng / fantasi", "supertonic", "F2", 0.96, "",
     r"dongeng|peri|bintang|ajaib|sihir|lentera|kerajaan|putri|peri|desa|kakek|nenek|cerita"),
    ("berita / informatif", "supertonic", "M4", 1.0, "",
     r"menurut|data|penelitian|persen|laporan|pemerintah|kebijakan|studi|analisis|fakta"),
    ("motivasi / hangat", "supertonic", "M5", 0.98, "",
     r"harapan|bermimpi|percaya|semangat|syukur|cinta|bahagia|bangkit|berani"),
    ("drama / emosional", "supertonic", "F5", 0.95, "",
     r"menangis|air mata|sedih|kehilangan|rindu|peluk|perpisahan|duka|gemetar"),
    ("santai / edukasi", "supertonic", "M2", 1.0, "",
     r"tips|cara|langkah|mudah|santai|ngobrol|kita|kamu|sehari-hari"),
]

_EMOTION_HINTS = {
    "sedih": r"sedih|menangis|air mata|kehilangan|rindu|duka",
    "takut": r"takut|cemas|gemetar|seram|mencekam|kabut|gelap",
    "senang": r"senang|bahagia|tawa|ceria|syukur|hangat",
    "tegas": r"harus|wajib|jangan|penting|peringatan",
    "lembut": r"bisik|lembut|pelan|sayang|peluk",
}


def _recommend_rules(text: str) -> dict:
    """Rekomendasi tanpa AI: hitung kata kunci suasana, pilih suara dari peta aturan."""
    low = text.lower()
    best = None
    for genre, engine, voice, speed, style, pattern in _RULES:
        score = len(re.findall(pattern, low))
        if best is None or score > best[0]:
            best = (score, genre, engine, voice, speed, style)

    score, genre, engine, voice, speed, style = best or (0, "narasi umum", "supertonic", "M1", 1.0, "")
    if score == 0:
        genre, voice, speed = "narasi umum", "M1", 1.0

    emotions = []
    for emo, pattern in _EMOTION_HINTS.items():
        if len(re.findall(pattern, low)) >= 2:
            emotions.append(emo)
    emotions = emotions[:4] or ["lembut"]

    quotes = len(re.findall(r"[\"“”']", text)) // 2
    paragraphs = len([p for p in re.split(r"\n\s*\n", text) if p.strip()])
    mode_hint = "theater" if quotes >= 6 else "scene" if paragraphs >= 4 else "single"

    meta = VOICE_CATALOG[engine][voice]
    reason = (
        f"Naskah terasa seperti {genre.lower()}. {meta['label']} dipilih karena {meta['karakter']}, "
        f"cocok untuk {meta['cocok']}. Kecepatan {speed:.2f}× menjaga cerita tetap mengalir."
    )
    return {
        **_recommendation_entry(engine, voice, reason),
        "genre": genre,
        "tone": ", ".join(emotions),
        "speed": speed,
        "style": style,
        "emotions": emotions,
        "mode_hint": mode_hint,
        "alternatives": [
            _recommendation_entry("supertonic", "M5", "Alternatif hangat bila ingin kesan seperti ayah bercerita."),
            _recommendation_entry("gemini_tts", "Zubenelgenubi", "Alternatif cloud yang santai untuk narasi panjang."),
        ],
    }


def recommend_voice(text: str, use_ai: bool = True) -> dict:
    """Rekomendasikan mesin + suara + kecepatan + gaya berdasarkan isi naskah."""
    text = (text or "").strip()
    if not text:
        raise ValueError("Naskah kosong; isi dan bersihkan teks dulu.")

    errors = []
    providers = ai_config() if use_ai else None
    if use_ai and providers is None:
        errors.append("AI belum dikonfigurasi")
    if providers:
        user = "Katalog suara:\n" + _catalog_prompt() + "\n\nNaskah:\n" + text[:6000]
        for cfg, model in [(p, m) for p in providers for m in p["models"]]:
            try:
                data = _parse_json(_chat(cfg, model, RECOMMEND_SYSTEM, user, timeout=90))
                rec = _validate_recommendation(data)
                rec.update(source="ai", model=f"{cfg['name']}/{model}", note="")
                return rec
            except Exception as e:
                errors.append(f"{cfg['name']}/{model}: {str(e)[:90]}")

    rec = _recommend_rules(text)
    rec.update(source="rules", model=None,
               note="Rekomendasi dari kata kunci naskah." + (
                   " AI tidak terpakai: " + " | ".join(errors[:2]) if errors else ""))
    return rec


# --- Penetapan suara --------------------------------------------------------

SUPERTONIC_FEMALE = ["F2", "F1", "F4", "F5", "F3"]
SUPERTONIC_MALE = ["M1", "M3", "M2", "M4", "M5"]


def assign_voices(characters: list[dict]) -> list[dict]:
    """
    Beri tiap tokoh suara Supertonic yang berbeda. Narator dulu, lalu tokoh dewasa, anak terakhir
    (anak memakai suara wanita + geser nada ke atas). Bila 10 suara habis, suara dipakai ulang
    dengan nada digeser supaya tetap terdengar berbeda.
    """
    used: dict[str, int] = {}

    def take(pool: list[str]) -> tuple[str, float]:
        for v in pool:
            if v not in used:
                used[v] = 1
                return v, 0.0
        v = min(pool, key=lambda x: used[x])
        used[v] += 1
        return v, (2.0 if used[v] % 2 == 0 else -2.0)

    def other_pool() -> list[str]:
        f_left = sum(v not in used for v in SUPERTONIC_FEMALE)
        m_left = sum(v not in used for v in SUPERTONIC_MALE)
        return SUPERTONIC_FEMALE if f_left > m_left else SUPERTONIC_MALE

    order = sorted(characters, key=lambda c: (c["name"] != NARATOR, c["age"] == "child"))
    for c in order:
        g, age = c["gender"], c["age"]
        if c["name"] == NARATOR:
            pool = SUPERTONIC_FEMALE if g == "female" else SUPERTONIC_MALE
        elif age == "child":
            pool = SUPERTONIC_FEMALE
        elif g == "male":
            pool = SUPERTONIC_MALE
        elif g == "female":
            pool = SUPERTONIC_FEMALE
        else:
            pool = other_pool()
        voice, shift = take(pool)
        pitch, speed = shift, 1.0
        if age == "child":
            pitch, speed = 4.0 + shift, 1.08
        elif age == "old":
            pitch, speed = pitch - 1.5, 0.92
        c.update(provider="supertonic", voice=voice, pitch=pitch, speed=speed)
    return characters


def direct(text: str, use_ai: bool = True) -> dict:
    """Titik masuk: AI bila bisa, selain itu aturan. Selalu mengembalikan struktur yang sama."""
    info = {"mode": "rules", "model": None, "note": ""}
    result = None
    if use_ai:
        cfg = ai_config()
        if cfg is None:
            info["note"] = "AI belum dikonfigurasi (OMNIROUTE_KEY/ENDPOINT atau GEMINI_KEY di .env); memakai aturan generik."
        else:
            t0 = time.time()
            try:
                result, model = analyze_ai(text, cfg)
                info.update(mode="ai", model=model, note=f"Dipetakan AI ({model}) dalam {time.time()-t0:.0f} detik.")
            except Exception as e:
                info["note"] = f"AI gagal ({str(e)[:300]}); memakai aturan generik."
    if result is None:
        result = analyze_rules(text)
    result["characters"] = assign_voices(result["characters"])
    result["info"] = info
    return result
