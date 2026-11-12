"""Cari, saring, pilih, dan unduh B-roll Pixabay (API resmi; kunci PIXABAY_API dari .env, tidak pernah dicetak)."""
import io
import json
import os
import re
import subprocess
import time
import urllib.parse
import urllib.request

from . import ai

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(REPO, "videos", "_cache")
CLIP_DIR = os.path.join(CACHE_DIR, "pixabay")
USED_FILE = os.path.join(CACHE_DIR, "used_clips.json")
UA = {"User-Agent": "tts-narasi/1.0"}
MAX_FILE_MB = 130


def _key() -> str:
    for line in open(os.path.join(REPO, ".env"), encoding="utf-8"):
        m = re.match(r"\s*PIXABAY_API\s*=\s*(.*?)\s*$", line)
        if m:
            return m.group(1).strip().strip("\"'")
    raise RuntimeError("PIXABAY_API tidak ada di .env")


def used_ids() -> set:
    try:
        return set(json.load(open(USED_FILE)).get("ids", []))
    except Exception:
        return set()


def mark_used(clip_id: int):
    os.makedirs(CACHE_DIR, exist_ok=True)
    ids = used_ids() | {clip_id}
    json.dump({"ids": sorted(ids)}, open(USED_FILE, "w"))


def search(q: str, per: int = 20) -> list[dict]:
    qs = urllib.parse.urlencode({"key": _key(), "q": q, "per_page": per, "safesearch": "true"})
    req = urllib.request.Request("https://pixabay.com/api/videos/?" + qs, headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=40)).get("hits", [])


def pick_version(hit: dict) -> dict | None:
    """Versi file yang dipakai: vertikal -> 1080x1920; lanskap -> tinggi >=1440 terkecil (tajam saat dipotong 9:16)."""
    vs = [dict(v, key=k) for k, v in hit["videos"].items() if v.get("url") and v.get("width")]
    if not vs:
        return None
    vs = [v for v in vs if (v.get("size") or 0) <= MAX_FILE_MB * 1e6] or sorted(vs, key=lambda v: v.get("size") or 0)[:1]
    portrait = max(vs, key=lambda v: v["width"] * v["height"])["height"] > max(vs, key=lambda v: v["width"] * v["height"])["width"]
    want_h = 1920 if portrait else 1440
    ok = sorted([v for v in vs if v["height"] >= want_h], key=lambda v: v["width"] * v["height"])
    return ok[0] if ok else max(vs, key=lambda v: v["width"] * v["height"])


def candidates(queries: list[str], need: float, exclude: set, limit: int = 8) -> list[dict]:
    seen, out = set(), []
    for q in queries:
        try:
            hits = search(q)
        except Exception:
            continue
        for h in hits:
            if h["id"] in seen or h["id"] in exclude or h.get("isLowQuality"):
                continue
            seen.add(h["id"])
            v = pick_version(h)
            if not v or h["duration"] < need:
                continue
            vertical = v["height"] > v["width"]
            score = (4.0 * vertical + 1.5 * (min(v["width"], v["height"]) >= 1080) - 1.0 * (v["width"] > 2600)
                     + min((h.get("views") or 0) / 2e5, 1.0) - 1.0 * bool(h.get("isAiGenerated"))
                     + min((h["duration"] - need) / 20.0, 0.5))
            out.append({"id": h["id"], "page": h["pageURL"], "user": h["user"], "tags": h["tags"], "duration": h["duration"],
                        "w": v["width"], "h": v["height"], "vertical": vertical, "url": v["url"], "size": v.get("size"),
                        "thumb": v.get("thumbnail") or (h["videos"].get("medium") or {}).get("thumbnail"),
                        "query": q, "score": round(score, 2)})
        time.sleep(0.7)
    out.sort(key=lambda c: -c["score"])
    return out[:limit]


def contact_sheet(cands: list[dict], path: str):
    from PIL import Image, ImageDraw
    CW = CH = 300
    cols = min(4, len(cands))
    rows = -(-len(cands) // cols)
    sheet = Image.new("RGB", (cols * CW, rows * CH), (18, 18, 20))
    d = ImageDraw.Draw(sheet)
    for i, c in enumerate(cands):
        x0, y0 = (i % cols) * CW, (i // cols) * CH
        try:
            raw = urllib.request.urlopen(urllib.request.Request(c["thumb"], headers=UA), timeout=30).read()
            im = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception:
            im = Image.new("RGB", (320, 180), (60, 20, 20))
        im.thumbnail((CW - 6, CH - 26))
        ox, oy = x0 + (CW - im.width) // 2, y0 + 3
        sheet.paste(im, (ox, oy))
        cw = im.width if c["vertical"] else int(im.height * 9 / 16)
        d.rectangle([ox + (im.width - cw) // 2, oy, ox + (im.width + cw) // 2, oy + im.height - 1], outline=(255, 255, 255))
        d.rectangle([x0, y0, x0 + 34, y0 + 22], fill=(0, 0, 0))
        d.text((x0 + 8, y0 + 5), str(i + 1), fill=(255, 255, 0))
        d.text((x0 + 4, y0 + CH - 18), f"{c['duration']}s {c['w']}x{c['h']}{' V' if c['vertical'] else ''}", fill=(220, 220, 220))
    sheet.save(path)


SYSTEM = "Kamu editor video sinematik. Jawab HANYA JSON valid."


def choose(beat: dict, cands: list[dict], sheet_path: str, context: str) -> tuple[dict, dict]:
    """AI visi memilih satu kandidat. Kembalikan (kandidat, info). Cadangan: skor tertinggi, fokus tengah."""
    info = {"mode": "skor", "model": None, "reason": "", "focus_x": 50}
    if len(cands) == 1:
        return cands[0], info
    contact_sheet(cands, sheet_path)
    prompt = f"""{context}

Pilih SATU klip video stok sebagai latar denyut ini. Gambar berisi {len(cands)} kandidat bernomor; kotak putih = area yang
akan terlihat setelah dipotong tengah ke 9:16 (kandidat berhuruf V sudah vertikal).
Denyut: "{beat.get('name', '')}" | mood: {beat.get('mood')} | {beat.get('note', '')}
Teks narasi: {beat['text'][:420]}
Kriteria (urut penting): (1) cocok dengan suasana dan makna teks; (2) kalem, gelap atau bisa digelapkan, tanpa area terang
besar di tengah-bawah tempat teks tampil; (3) tanpa teks, logo, watermark; (4) tanpa wajah close-up yang menatap kamera;
(5) gerak lambat. Berikan focus_x (0-100): posisi horizontal subjek utama pada klip lanskap agar tetap masuk potongan 9:16 (50 = tengah).
Keluaran: {{"pick": <nomor 1..{len(cands)}>, "focus_x": 50, "reason": "satu kalimat"}}"""

    def check(d):
        if not isinstance(d.get("pick"), int) or not 1 <= d["pick"] <= len(cands):
            raise ValueError("pick di luar rentang")
    try:
        data, model = ai.ask_json(SYSTEM, prompt, images=[sheet_path], max_tokens=2500, validate=check)
        fx = data.get("focus_x", 50)
        info.update(mode="ai", model=model, reason=str(data.get("reason", ""))[:200],
                    focus_x=max(0, min(100, fx)) if isinstance(fx, (int, float)) else 50)
        return cands[data["pick"] - 1], info
    except Exception as e:
        info["reason"] = f"AI gagal ({str(e)[:100]}); memakai skor tertinggi"
        return cands[0], info


def object_position(clip: dict, focus_x: float) -> str:
    """object-position CSS agar fokus subjek masuk potongan 9:16 (lanskap) atau tengah (vertikal)."""
    if clip["vertical"]:
        return "50% 50%"
    cw = (9 / 16) / (clip["w"] / clip["h"])          # lebar potongan sebagai pecahan lebar klip
    left = max(0.0, min(1 - cw, focus_x / 100 - cw / 2))
    return f"{left / (1 - cw) * 100:.0f}% 50%"


def download(clip: dict) -> str:
    os.makedirs(CLIP_DIR, exist_ok=True)
    dest = os.path.join(CLIP_DIR, f"{clip['id']}_{clip['w']}x{clip['h']}.mp4")
    if os.path.exists(dest) and os.path.getsize(dest) > 300_000:
        return dest
    tmp = dest + ".part"
    with urllib.request.urlopen(urllib.request.Request(clip["url"], headers=UA), timeout=180) as r, open(tmp, "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    if os.path.getsize(tmp) < 300_000:
        os.remove(tmp)
        raise RuntimeError(f"unduhan klip {clip['id']} terlalu kecil")
    os.replace(tmp, dest)
    return dest


def probe(path: str) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,duration",
                          "-of", "json", path], capture_output=True, text=True).stdout
    s = json.loads(out)["streams"][0]
    return {"w": s["width"], "h": s["height"], "duration": float(s.get("duration") or 0)}
