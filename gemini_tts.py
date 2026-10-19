"""
gemini_tts.py - Mesin suara Gemini TTS (gemini-3.8-flash-tts) lewat API Gemini langsung, dengan cadangan OmniRoute.

Kenapa langsung: API asli mendukung `speechMetadata.style` (gaya bacaan), suara baru (Zubenelgenubi, Riko, Zali, ...),
dan tag jeda. Hasil uji: bacaan Indonesia akurat (WER 0-7%), instruksi gaya TIDAK dibaca keras bila lewat speechMetadata.

Batas laju: kunci gratis terkena 429 setelah ±4 panggilan per menit. Pemanggilan diberi pembatas jendela 60 detik dan
percobaan ulang otomatis. Naskah panjang dipecah per kelompok kalimat (<= ~500 karakter) agar panggilan sedikit.

.env (hanya variabel ini yang dibaca di sini): GEMINI_KEY / GEMINI_API_KEY, opsional GEMINI_TTS_MODEL,
GEMINI_TTS_RPM (default 4), GEMINI_TTS_TEMPERATURE (default 0.8), GEMINI_TTS_ROUTE (default "direct,omniroute").

Jalur (hasil uji): Gemini LANGSUNG dulu, karena `speechMetadata.style` benar-benar mengatur gaya dan tempo (paragraf
18,5 detik dengan gaya "unhurried"); batasnya ±4 panggilan/menit, ditangani pembatas laju (naskah dipecah ±500 karakter,
jadi narasi 8,5 menit ≈ 15 panggilan ≈ 4 menit). OmniRoute sebagai cadangan: lancar (12/12 panggilan beruntun, ±3 detik,
hanya panggilan paralel yang kena 429) tetapi `instructions` nyaris tidak memengaruhi tempo (12-12,7 detik apa pun
instruksinya), jadi hanya suara yang terkendali, bukan gaya.
"""

import base64
import collections
import io
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request

import numpy as np
import soundfile as sf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL = "gemini-3.8-flash-tts"
API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models/"
MAX_CHARS = 500

# Suara yang sudah diuji valid (nama persis seperti di AI Studio). Zubenelgenubi = favorit, jadi pertama.
VOICES = [
    {"id": "Zubenelgenubi", "name": "Zubenelgenubi - Santai, nada menengah-rendah (favorit)"},
    {"id": "Zali", "name": "Zali - Hangat dan empatik, nada menengah"},
    {"id": "Riko", "name": "Riko - Percaya diri dan jelas, nada dalam"},
    {"id": "Sami", "name": "Sami - Tenang dan yakin, nada rendah"},
    {"id": "Enzo", "name": "Enzo - Tajam dan bersemangat, nada rendah"},
    {"id": "Achird", "name": "Achird - Ramah, nada menengah-rendah"},
    {"id": "Kore", "name": "Kore - Tegas"},
    {"id": "Puck", "name": "Puck - Ceria"},
    {"id": "Charon", "name": "Charon - Informatif"},
    {"id": "Aoede", "name": "Aoede - Ringan, mengalir"},
]
DEFAULT_VOICE = VOICES[0]["id"]
DEFAULT_STYLE = "Rich, unhurried storytelling narration in Indonesian, warm and natural."

# Emosi ([emosi X] / baris teater) -> arahan gaya bahasa Inggris untuk speechMetadata.style
EMOTION_STYLE = {
    "netral": "",
    "senang": "warm, bright, softly smiling",
    "sedih": "sad, quiet, slow, a little breathy",
    "marah": "angry, tense, sharp",
    "takut": "frightened, trembling, hushed",
    "kaget": "startled, with a quick intake of breath",
    "berbisik": "whispering softly",
    "tegas": "firm and assertive",
    "lembut": "gentle, soft and tender",
    "licik": "sly, low and scheming",
    "menggoda": "teasing, playful and smooth",
}


class GeminiTTSError(RuntimeError):
    pass


def _env() -> dict:
    env = {}
    path = os.path.join(BASE_DIR, ".env")
    if os.path.isfile(path):
        for line in open(path, encoding="utf-8"):
            m = re.match(r"\s*(GEMINI_KEY|GEMINI_API_KEY|GEMINI_TTS_[A-Z_]+)\s*=\s*(.*?)\s*$", line)
            if m:
                env[m.group(1)] = m.group(2).strip().strip("\"'")
    for k in ("GEMINI_KEY", "GEMINI_API_KEY", "GEMINI_TTS_MODEL", "GEMINI_TTS_RPM", "GEMINI_TTS_TEMPERATURE", "GEMINI_TTS_ROUTE"):
        if os.environ.get(k):
            env.setdefault(k, os.environ[k])
    return env


def api_key() -> str | None:
    e = _env()
    return e.get("GEMINI_KEY") or e.get("GEMINI_API_KEY")


def is_configured() -> bool:
    return bool(api_key())


def gateway_configured() -> bool:
    try:
        import director
        return any(c["name"] == "omniroute" for c in (director.ai_config() or []))
    except Exception:
        return False


def build_style(emotion: str = "netral", base: str | None = None) -> str:
    """Susun teks 'Style:' dari gaya dasar + emosi."""
    base = (base or DEFAULT_STYLE).strip()
    base = re.sub(r"^style:\s*", "", base, flags=re.I)
    mod = EMOTION_STYLE.get((emotion or "netral").strip().lower(), "")
    return f"Style: {base}" + (f" Delivery: {mod}." if mod else "")


# --- pembatas laju ---------------------------------------------------------
_lock = threading.Lock()
_calls: collections.deque = collections.deque()


def _throttle():
    rpm = int(_env().get("GEMINI_TTS_RPM", "4") or 4)
    with _lock:
        while True:
            now = time.time()
            while _calls and now - _calls[0] > 60:
                _calls.popleft()
            if len(_calls) < rpm:
                _calls.append(now)
                return
            wait = 60 - (now - _calls[0]) + 0.5
            time.sleep(max(0.5, wait))


# --- panggilan -------------------------------------------------------------
def _decode(b64: str, mime: str) -> tuple[np.ndarray, int]:
    raw = base64.b64decode(b64)
    if "wav" in mime or raw[:4] == b"RIFF":
        wav, sr = sf.read(io.BytesIO(raw), dtype="float32")
    else:                                   # audio/L16;rate=24000 (PCM mentah)
        m = re.search(r"rate=(\d+)", mime)
        sr = int(m.group(1)) if m else 24000
        wav = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    return (wav if wav.ndim == 1 else wav.mean(axis=1)), sr


def _call_direct(text: str, voice: str, style: str) -> tuple[np.ndarray, int]:
    key = api_key()
    if not key:
        raise GeminiTTSError("GEMINI_KEY belum diisi di .env")
    env = _env()
    model = env.get("GEMINI_TTS_MODEL") or DEFAULT_MODEL
    temp = float(env.get("GEMINI_TTS_TEMPERATURE", "0.8") or 0.8)
    part = {"text": text}
    if style:
        part["speechMetadata"] = {"style": style}
    body = {"contents": [{"role": "user", "parts": [part]}],
            "generationConfig": {"temperature": temp, "responseModalities": ["audio"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    last = None
    for attempt in range(4):
        _throttle()
        req = urllib.request.Request(API_ROOT + f"{model}:generateContent", data=json.dumps(body).encode(), method="POST",
                                     headers={"x-goog-api-key": key, "Content-Type": "application/json"})
        try:
            r = json.load(urllib.request.urlopen(req, timeout=180))
            p = r["candidates"][0]["content"]["parts"][0]["inlineData"]
            return _decode(p["data"], p.get("mimeType", "audio/wav"))
        except urllib.error.HTTPError as e:
            detail = e.read()[:200].decode("utf8", "replace")
            last = f"HTTP {e.code}: {detail.replace(key, '***')}"
            if e.code == 429:                          # batas laju: tunggu lalu ulang
                time.sleep(30 + 15 * attempt)
                continue
            if e.code in (500, 503):
                time.sleep(5 * (attempt + 1))
                continue
            if e.code == 400 and "No matching speaker voice" in detail:
                raise GeminiTTSError(f"Suara '{voice}' tidak dikenal Gemini")
            break
        except (KeyError, IndexError):
            last = "respons tanpa audio (mungkin diblokir filter)"
            break
        except Exception as e:                         # jaringan
            last = str(e)[:120]
            time.sleep(3)
    raise GeminiTTSError(f"Gemini TTS gagal: {last}")


def _call_omniroute(text: str, voice: str, style: str) -> tuple[np.ndarray, int]:
    """Cadangan: gateway OmniRoute /audio/speech (instruksi lewat parameter `instructions`)."""
    import director
    cfgs = director.ai_config() or []
    cfg = next((c for c in cfgs if c["name"] == "omniroute"), None)
    if not cfg:
        raise GeminiTTSError("OmniRoute tidak dikonfigurasi")
    body = {"model": "google/" + (_env().get("GEMINI_TTS_MODEL") or DEFAULT_MODEL), "input": text, "voice": voice,
            "response_format": "wav", "instructions": re.sub(r"^Style:\s*", "", style or "")}
    req = urllib.request.Request(cfg["endpoint"] + "/audio/speech", data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": "Bearer " + cfg["key"], "Content-Type": "application/json",
                                          "User-Agent": "tts-narasi/1.0"})
    raw = None
    for attempt in range(4):
        try:
            raw = urllib.request.urlopen(req, timeout=180).read()
            break
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:           # gateway membatasi panggilan paralel: tunggu sebentar
                time.sleep(3 + 4 * attempt)
                continue
            raise GeminiTTSError(f"OmniRoute TTS gagal: HTTP {e.code} {e.read()[:100].decode('utf8', 'replace')}")
        except Exception as e:
            raise GeminiTTSError(f"OmniRoute TTS gagal: {str(e)[:120]}")
    wav, sr = sf.read(io.BytesIO(raw), dtype="float32")
    return (wav if wav.ndim == 1 else wav.mean(axis=1)), sr


def chunk_text(text: str, max_chars: int = MAX_CHARS) -> list[str]:
    """Pecah per paragraf lalu per kelompok kalimat <= max_chars (satu panggilan = satu kelompok)."""
    chunks = []
    for para in [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]:
        para = re.sub(r"\s*\n\s*", " ", para)
        sents = re.split(r"(?<=[.!?…])\s+", para)
        cur = ""
        for s in sents:
            if cur and len(cur) + len(s) + 1 > max_chars:
                chunks.append(cur)
                cur = s
            else:
                cur = (cur + " " + s).strip()
        if cur:
            chunks.append(cur)
    return chunks


def speak(text: str, voice: str = DEFAULT_VOICE, emotion: str = "netral", style: str | None = None,
          routes: list[str] | None = None) -> tuple[np.ndarray, int]:
    """
    Bacakan teks (tanpa penanda) -> (wav float32 mono, sample_rate). Dipecah per kelompok kalimat; antar kelompok
    diberi jeda singkat. Gagal Gemini langsung -> coba OmniRoute.
    """
    voice = voice or DEFAULT_VOICE
    sty = build_style(emotion, style)
    out, sr = [], None
    routes = routes or [r.strip() for r in (_env().get("GEMINI_TTS_ROUTE") or "direct,omniroute").split(",") if r.strip()]
    for chunk in chunk_text(text):
        first_err = None
        wav = None
        for route in routes:
            try:
                wav, sr_new = (_call_omniroute if route == "omniroute" else _call_direct)(chunk, voice, sty)
                break
            except GeminiTTSError as e:
                first_err = first_err or e
        if wav is None:
            raise first_err or GeminiTTSError("Gemini TTS gagal")
        if sr is None:
            sr = sr_new
        if out:
            out.append(np.zeros(int(sr * 0.35), dtype=np.float32))
        out.append(np.asarray(wav, dtype=np.float32))
    if not out:
        raise GeminiTTSError("Teks kosong")
    return np.concatenate(out), sr
