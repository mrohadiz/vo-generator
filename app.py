#!/usr/bin/env python3
"""
app.py - Multi-Engine Studio Narasi TTS Indonesia.
Mendukung 3 engine:
1. Supertonic (Super cepat, 44.1kHz, preset M1..M5 & F1..F5)
2. Pocket-TTS (Kloning karakter suara dari suara-kloning/)
3. Gemini TTS (cloud; langsung atau lewat OmniRoute) dan Drama 3 (cloud, per tokoh di mode teater)
"""

import os
import sys
import time
import datetime
import threading
import numpy as np
import soundfile as sf
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file

import cleaner
import director
import drama3
import gemini_tts

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SUARA_DIR = os.path.join(BASE_DIR, "suara-kloning")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = Flask(__name__, template_folder=os.path.join(BASE_DIR, "templates"))

# --- Engine 1: Pocket-TTS ---
POCKET_CONFIG = (
    "hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml"
    "@382fe85ca848546efb04bf1b7fdba78c6396e2ce"
)
# Nilai terbaik menurut kartu model anak10thn/pocket-tts-indonesian (WER median 9,1% vs 13,3% pada -4,0)
POCKET_EOS_THRESHOLD = float(os.environ.get("POCKET_EOS_THRESHOLD", "-6.0"))
pocket_model = None
pocket_sr = 24000
pocket_state_suara = {}

# --- Engine 2: Supertonic ---
supertonic_tts = None
SUPERTONIC_VOICES = [
    {"id": "M1", "name": "M1 - Pria (Standar Narator)", "gender": "male"},
    {"id": "M2", "name": "M2 - Pria (Santai)", "gender": "male"},
    {"id": "M3", "name": "M3 - Pria (Berat & Dalam)", "gender": "male"},
    {"id": "M4", "name": "M4 - Pria (Resmi / Berita)", "gender": "male"},
    {"id": "M5", "name": "M5 - Pria (Hangat)", "gender": "male"},
    {"id": "F1", "name": "F1 - Wanita (Jelas / Presenter)", "gender": "female"},
    {"id": "F2", "name": "F2 - Wanita (Lembut)", "gender": "female"},
    {"id": "F3", "name": "F3 - Wanita (Ceria)", "gender": "female"},
    {"id": "F4", "name": "F4 - Wanita (Formal)", "gender": "female"},
    {"id": "F5", "name": "F5 - Wanita (Ekspresif)", "gender": "female"},
]

# Global lock untuk menjaga eksekusi sintesis aman di CPU
lock_sintesis = threading.Lock()

# Status kesiapan engine
engine_status = {
    "supertonic": {"ready": False, "loading": False, "error": None},
    "pocket_tts": {"ready": False, "loading": False, "error": None},
    "gemini_tts": {"ready": False, "loading": False, "error": None},   # cloud: siap bila GEMINI_KEY ada
    "gemini_gw": {"ready": False, "loading": False, "error": None},    # cloud lewat OmniRoute
}


def load_supertonic():
    global supertonic_tts
    if supertonic_tts is not None:
        return supertonic_tts
    engine_status["supertonic"]["loading"] = True
    try:
        from supertonic import TTS
        print("⚡ Memuat model Supertonic...", flush=True)
        t0 = time.time()
        supertonic_tts = TTS(auto_download=True)
        engine_status["supertonic"]["ready"] = True
        print(f"✅ Supertonic siap ({time.time()-t0:.1f}s)", flush=True)
    except Exception as e:
        engine_status["supertonic"]["error"] = str(e)
        print(f"❌ Gagal memuat Supertonic: {e}", flush=True)
    finally:
        engine_status["supertonic"]["loading"] = False
    return supertonic_tts


def load_pocket_tts():
    global pocket_model, pocket_sr
    if pocket_model is not None:
        return pocket_model
    engine_status["pocket_tts"]["loading"] = True
    try:
        from pocket_tts import TTSModel
        print("🎭 Memuat model Pocket-TTS 6L...", flush=True)
        t0 = time.time()
        pocket_model = TTSModel.load_model(config=POCKET_CONFIG, eos_threshold=POCKET_EOS_THRESHOLD)
        try:
            pocket_sr = int(pocket_model.config.mimi.sample_rate)
        except Exception:
            pocket_sr = 24000
        engine_status["pocket_tts"]["ready"] = True
        print(f"✅ Pocket-TTS siap ({time.time()-t0:.1f}s)", flush=True)
    except Exception as e:
        engine_status["pocket_tts"]["error"] = str(e)
        print(f"❌ Gagal memuat Pocket-TTS: {e}", flush=True)
    finally:
        engine_status["pocket_tts"]["loading"] = False
    return pocket_model


def prewarm_default_engines():
    """Supertonic dan Pocket-TTS dimuat awal secara non-blocking di background."""
    load_supertonic()
    load_pocket_tts()


def get_pocket_voices():
    if not os.path.isdir(SUARA_DIR):
        return []
    files = sorted(
        f for f in os.listdir(SUARA_DIR)
        if f.lower().endswith((".wav", ".mp3", ".ogg", ".flac"))
    )
    voices = []
    for f in files:
        file_id = os.path.splitext(f)[0]
        label = file_id.replace("_", " ").replace("-", " ").title()
        voices.append({
            "id": file_id,
            "filename": f,
            "name": label,
            "path": os.path.join(SUARA_DIR, f),
        })
    return voices


# --- ROUTES ---

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    engine_status["gemini_tts"]["ready"] = gemini_tts.is_configured()
    engine_status["gemini_gw"]["ready"] = gemini_tts.gateway_configured()
    return jsonify({
        "engines": engine_status
    })


@app.route("/api/options")
def api_options():
    """Mengembalikan daftar engine dan opsi suara masing-masing."""
    pocket_voices = get_pocket_voices()
    return jsonify({
        "engines": [
            {
                "id": "supertonic",
                "name": "Supertonic (Rekomendasi - Cepat & 44.1 kHz)",
                "description": "Sangat cepat di CPU (~10s untuk 20s audio), intonasi stabil, tanpa sampel file.",
                "supports_preview": False,
                "supports_speed": True,
                "voices": SUPERTONIC_VOICES,
            },
            {
                "id": "gemini_tts",
                "name": "Gemini TTS (Cloud - Ekspresif, Storyteller)",
                "description": "gemini-3.8-flash-tts: bacaan Indonesia akurat, gaya bacaan bisa diatur, emosi dari [emosi X]. Teks dikirim ke Google; ada batas laju (±4 panggilan/menit).",
                "supports_preview": False,
                "supports_speed": False,
                "supports_style": True,
                "default_style": gemini_tts.DEFAULT_STYLE,
                "voices": gemini_tts.VOICES,
            },
            {
                "id": "gemini_gw",
                "name": "Gemini TTS via OmniRoute (Cepat, tanpa batas beruntun)",
                "description": "Model & suara sama dengan Gemini TTS, lewat gateway OmniRoute: ±3 detik per panggilan tanpa 429. Gaya bacaan nyaris tidak berpengaruh (tempo tetap), hanya suara yang terkendali.",
                "supports_preview": False,
                "supports_speed": False,
                "supports_style": False,
                "voices": gemini_tts.VOICES,
            },
            {
                "id": "pocket_tts",
                "name": "Pocket-TTS (Kloning Karakter Suara 24 kHz)",
                "description": "Kloning suara berbasis sampel file audio di folder suara-kloning/.",
                "supports_preview": True,
                "supports_speed": False,
                "voices": [
                    {"id": v["id"], "name": v["name"], "filename": v["filename"]}
                    for v in pocket_voices
                ],
            },
        ]
    })


@app.route("/api/sample/<voice_id>")
def api_sample(voice_id):
    """Streaming audio sampel referensi suara Pocket-TTS."""
    voices = get_pocket_voices()
    for v in voices:
        if v["id"] == voice_id:
            return send_file(v["path"])
    return jsonify({"error": "Sampel tidak ditemukan"}), 404


@app.route("/api/clean", methods=["POST"])
def api_clean():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    title = ""
    if cleaner.looks_like_web_markdown(text):
        art = cleaner.extract_article(text)
        title, text = art["title"], art["text"]
    analysis = cleaner.analyze_text(text)
    analysis["title"] = title
    analysis["extracted"] = bool(title or text != data.get("text", ""))
    return jsonify(analysis)


@app.route("/api/fetch_url", methods=["POST"])
def api_fetch_url():
    """Ambil isi utama sebuah halaman web lewat Jina Reader (r.jina.ai), tanpa navigasi/iklan."""
    import urllib.request
    from urllib.parse import urlparse
    url = str((request.get_json(silent=True) or {}).get("url", "")).strip()
    u = urlparse(url)
    if u.scheme not in ("http", "https") or not u.netloc:
        return jsonify({"ok": False, "message": "URL harus diawali http:// atau https://"}), 400
    try:
        req = urllib.request.Request(
            "https://r.jina.ai/" + url,
            headers={"User-Agent": "tts-narasi/1.0", "Accept": "text/plain"},
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            md = r.read(4_000_000).decode("utf-8", errors="replace")
    except Exception as e:
        return jsonify({"ok": False, "message": f"Gagal mengambil halaman: {e}"}), 502
    art = cleaner.extract_article(md)
    if len(art["text"]) < 200:
        return jsonify({"ok": False, "message": "Isi artikel tidak ditemukan di halaman ini."}), 422
    return jsonify({"ok": True, "title": art["title"], "text": art["text"], "source": url})


def _peak_norm(wav, level=0.95):
    peak = np.max(np.abs(wav)) if len(wav) else 0
    return (wav / peak) * level if peak > 0.001 else wav


def _synth_supertonic(text, voice_id, speed):
    tts = load_supertonic()
    if tts is None:
        raise RuntimeError("Gagal memuat Supertonic")
    style_name = voice_id if voice_id in tts.voice_style_names else "M1"
    style = tts.get_voice_style(style_name)
    gap = np.zeros(int(tts.sample_rate * 0.12), dtype=np.float32)
    chunks = []
    # Kata Inggris dibacakan dengan model bahasa Inggris, sisanya bahasa Indonesia
    for lang, span in cleaner.split_language_spans(text):
        wav, _ = tts.synthesize(
            text=span, lang=lang, voice_style=style, total_steps=8,
            speed=max(0.7, min(1.4, speed)), silence_duration=0.25,
        )
        wav = wav[0] if wav.ndim > 1 else wav
        chunks += [np.asarray(wav, dtype=np.float32), gap]
    return np.concatenate(chunks[:-1]), tts.sample_rate


# Sampel referensi yang terlalu panjang merusak hasil Pocket-TTS: >=60 detik membuatnya tak pernah berhenti
# bicara (kalimat berujung ocehan) dan memuat sampel sangat lambat; 20 detik pun masih menurunkan keterbacaan
# (WER 28,6% vs 2-8% pada potongan 12 detik, diukur dengan Whisper). Pakai potongan paling "bersuara".
POCKET_REF_SECONDS = float(os.environ.get("POCKET_REF_SECONDS", "12"))


def _pocket_reference(path):
    """Kembalikan path referensi <= POCKET_REF_SECONDS detik (salinan di suara-kloning/_cache/; asli tak diubah)."""
    try:
        info = sf.info(path)
    except Exception:
        return path
    if info.duration <= POCKET_REF_SECONDS + 1:
        return path
    cache_dir = os.path.join(SUARA_DIR, "_cache")
    os.makedirs(cache_dir, exist_ok=True)
    name = os.path.splitext(os.path.basename(path))[0]
    out = os.path.join(cache_dir, f"{name}_{int(POCKET_REF_SECONDS)}s_{int(os.path.getmtime(path))}.wav")
    if os.path.exists(out):
        return out
    x, sr = sf.read(path, dtype="float32")
    mono = x if x.ndim == 1 else x.mean(axis=1)
    frame = max(1, int(sr * 0.02))
    n = len(mono) // frame
    rms = np.sqrt((mono[: n * frame].reshape(n, frame) ** 2).mean(axis=1))
    voiced = (rms > 0.1 * np.percentile(rms, 95)).astype(np.int32)
    csum = np.concatenate([[0], np.cumsum(voiced)])
    win = int(POCKET_REF_SECONDS / 0.02)
    starts = np.arange(0, max(1, n - win), int(0.5 / 0.02))
    scores = csum[starts + win] - csum[starts]
    best = int(starts[int(np.argmax(scores))]) * frame          # jendela dengan porsi suara tertinggi
    sf.write(out, mono[best: best + win * frame], sr)
    print(f"✂️ Referensi {name}: {info.duration:.0f}s -> {POCKET_REF_SECONDS:.0f}s ({os.path.basename(out)})", flush=True)
    return out


def _trim_edges(wav, sr, pad=0.04):
    """Buang hening di awal/akhir hasil satu segmen (Pocket-TTS membawa hening sendiri di tiap ujung)."""
    wav = np.asarray(wav, dtype=np.float32)
    if wav.ndim > 1:
        wav = wav.mean(axis=1)
    frame = max(1, int(sr * 0.01))
    n = len(wav) // frame
    if n < 3:
        return wav
    rms = np.sqrt((wav[: n * frame].reshape(n, frame) ** 2).mean(axis=1))
    voiced = np.where(rms > 0.06 * np.percentile(rms, 95))[0]
    if len(voiced) == 0:
        return wav
    a = max(0, int(voiced[0] * frame - pad * sr))
    b = min(len(wav), int((voiced[-1] + 1) * frame + pad * sr))
    return wav[a:b]


def _gap_after(seg, sr):
    """Jeda antar segmen menurut tanda baca penutupnya (akhir kalimat lebih panjang daripada koma)."""
    end = seg.rstrip()[-1:] if seg.strip() else ""
    sec = 0.32 if end in ".!?…" else 0.16 if end in ",;:" else 0.12
    return np.zeros(int(sr * sec), dtype=np.float32)


def _synth_pocket(text, voice_id):
    m = load_pocket_tts()
    if m is None:
        raise RuntimeError("Gagal memuat Pocket-TTS: " + str(engine_status["pocket_tts"]["error"]))
    from pocket_tts.data.audio import stream_audio_chunks

    pvoices = get_pocket_voices()
    v_match = next((v for v in pvoices if v["id"] == voice_id), None)
    v_path = v_match["path"] if v_match else (pvoices[0]["path"] if pvoices else None)
    if not v_path:
        raise ValueError("Tidak ada file sampel di suara-kloning/")
    key = v_match["id"] if v_match else pvoices[0]["id"]
    if key not in pocket_state_suara:
        pocket_state_suara[key] = m.get_state_for_audio_prompt(_pocket_reference(v_path))
    st = pocket_state_suara[key]

    # Model Indonesia tak bisa membaca Inggris: pakai ejaan lisan Indonesia
    text = cleaner.respell_loanwords(text)
    text = text.replace('"', "").replace("“", "").replace("”", "")   # tanda kutip mengacaukan pembacaan Pocket-TTS
    audio = []
    for i, seg in enumerate(cleaner.split_into_segments(text, max_chars=90)):
        seg = seg.strip()
        if not seg:
            continue
        tmp_seg = f"/tmp/pocket_seg_{i}_{os.getpid()}.wav"
        try:
            stream_audio_chunks(tmp_seg, m.generate_audio_stream(st, seg), pocket_sr)
            d_seg, _ = sf.read(tmp_seg)
        finally:
            if os.path.exists(tmp_seg):
                os.remove(tmp_seg)
        d_seg = _trim_edges(d_seg, pocket_sr)
        if len(d_seg) > 0:
            audio += [d_seg, _gap_after(seg, pocket_sr)]
    if not audio:
        raise RuntimeError("Gagal sintesis audio.")
    return np.concatenate(audio[:-1]), pocket_sr


# Pengali kecepatan baca per emosi (Supertonic tidak punya kontrol emosi, jadi ekspresi lewat tempo + jeda)
EMOTION_SPEED = {
    "netral": 1.0, "senang": 1.05, "sedih": 0.9, "marah": 1.04, "takut": 1.07, "kaget": 1.06,
    "berbisik": 0.92, "tegas": 1.0, "lembut": 0.94, "licik": 0.95, "menggoda": 0.95,
}


def synthesize_text(engine, cleaned, voice_id, speed, emotion="netral", style=None):
    """
    Sintesis teks bersih -> (wav float, sample_rate). Penanda [jeda N] menjadi hening; penanda
    [emosi X] mengatur tempo baca (Supertonic). Pocket-TTS hanya memakai jeda.
    """
    out, sr = [], None
    emotion = cleaner.norm_emotion(emotion)
    for kind, val in cleaner.split_directives(cleaned):
        if kind == "emotion":
            emotion = val
            continue
        if kind == "pause":
            if sr is None:
                sr = {"supertonic": 44100, "pocket_tts": pocket_sr, "gemini_tts": 24000, "gemini_gw": 24000}.get(engine, 24000)
            out.append(np.zeros(int(sr * val), dtype=np.float32))
            continue
        if engine == "supertonic":
            wav, sr_new = _synth_supertonic(val, voice_id, speed * EMOTION_SPEED.get(emotion, 1.0))
        elif engine == "pocket_tts":
            wav, sr_new = _synth_pocket(val, voice_id)
        elif engine in ("gemini_tts", "gemini_gw"):
            try:
                wav, sr_new = gemini_tts.speak(val, voice_id or gemini_tts.DEFAULT_VOICE, emotion, style,
                                               routes=["omniroute"] if engine == "gemini_gw" else None)
            except gemini_tts.GeminiTTSError as e:
                raise RuntimeError(str(e))
        else:
            raise ValueError(f"Engine '{engine}' tidak dikenali.")
        if sr is not None and sr != sr_new:
            raise RuntimeError("Sample rate tidak konsisten")
        sr = sr_new
        out.append(np.asarray(wav, dtype=np.float32))
    if not any(len(x) for x in out):
        raise ValueError("Teks kosong setelah dibersihkan.")
    return _peak_norm(np.concatenate(out)), sr


def _slug(title, maxlen=60):
    """'Kota Rawa: Dunia Antara' -> 'kota-rawa-dunia-antara' (aman untuk nama folder)."""
    import re
    import unicodedata
    t = unicodedata.normalize("NFKD", str(title)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:maxlen].strip("-")


def _record_info(folder, title, scene_no, text, engine, voice_id, lines=None):
    """Catat judul & naskah tiap scene di <folder>/info.json (dipakai tahap video nanti)."""
    import json
    path = os.path.join(OUTPUT_DIR, folder, "info.json")
    try:
        info = json.load(open(path, encoding="utf-8"))
    except Exception:
        info = {}
    info["title"] = title or info.get("title", folder)
    info["engine"], info["voice"] = engine, voice_id
    if lines:
        info.setdefault("lines", {})[f"{scene_no:02d}"] = lines
    if scene_no:
        info.setdefault("scenes", {})[f"{scene_no:02d}"] = text
    else:
        info["text"] = text
    with open(path, "w", encoding="utf-8") as f:
        json.dump(info, f, ensure_ascii=False, indent=1)


def _pitch_shift(wav, sr, semitones):
    """Geser nada tanpa mengubah tempo, memakai sox (kecepatan tidak berubah)."""
    import subprocess
    import tempfile
    if not semitones or abs(semitones) < 0.05:
        return wav
    with tempfile.TemporaryDirectory() as d:
        src, dst = os.path.join(d, "in.wav"), os.path.join(d, "out.wav")
        sf.write(src, wav, sr)
        r = subprocess.run(["sox", src, dst, "pitch", str(int(round(semitones * 100)))],
                           capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError("sox gagal: " + r.stderr[:200])
        out, _ = sf.read(dst, dtype="float32")
    return out


def _resample(wav, sr_from, sr_to):
    if sr_from == sr_to:
        return wav
    n = int(len(wav) * sr_to / sr_from)
    return np.interp(np.linspace(0, len(wav) - 1, n), np.arange(len(wav)), wav).astype(np.float32)


def _speak_drama3(ln, text):
    """Bacakan teks (boleh berisi [jeda N] / [emosi X]) dengan suara Drama 3 milik tokoh ini."""
    d3 = drama3.get()
    emotion = cleaner.norm_emotion(ln.get("emotion"))
    pieces = []
    sr = None
    for kind, val in cleaner.split_directives(text):
        if kind == "emotion":
            emotion = val
            continue
        if kind == "pause":
            pieces.append(("pause", val))
            continue
        wav, sr_new = d3.speak(str(ln.get("name", "")), str(ln.get("description", "")), val, emotion)
        sr = sr_new
        pieces.append(("wav", np.asarray(wav, dtype=np.float32)))
    sr = sr or 44100
    out = [np.zeros(int(sr * v), dtype=np.float32) if k == "pause" else v for k, v in pieces]
    return _peak_norm(np.concatenate(out)), sr


def _speak_gemini(ln, text, routes=None):
    """Bacakan teks (boleh berisi [jeda N] / [emosi X]) dengan suara Gemini TTS milik tokoh ini."""
    emotion = cleaner.norm_emotion(ln.get("emotion"))
    voice = str(ln.get("gemini_voice") or gemini_tts.DEFAULT_VOICE)
    style = str(ln.get("style") or "").strip() or None
    pieces, sr = [], None
    for kind, val in cleaner.split_directives(text):
        if kind == "emotion":
            emotion = val
        elif kind == "pause":
            pieces.append(("pause", val))
        else:
            wav, sr_new = gemini_tts.speak(val, voice, emotion, style, routes=routes)
            sr = sr_new
            pieces.append(("wav", np.asarray(wav, dtype=np.float32)))
    sr = sr or 24000
    out = [np.zeros(int(sr * v), dtype=np.float32) if k == "pause" else v for k, v in pieces]
    return _peak_norm(np.concatenate(out)), sr


def synthesize_lines(lines):
    """
    Mode teater: tiap baris dibacakan dengan suara tokohnya. Penyedia per tokoh:
    "supertonic" (lokal, dengan kecepatan & geser nada) atau "drama3" (Space cloud). Bila Drama 3
    gagal, baris itu otomatis dibacakan Supertonic dengan suara cadangan tokoh. Baris berurutan
    dari tokoh yang sama (dan emosi sama, untuk Drama 3) digabung supaya intonasi mengalir.
    Mengembalikan (wav, sr, peringatan[]).
    """
    groups = []
    for ln in lines:
        text = str(ln.get("text", "")).strip()
        if not text:
            continue
        provider = ln.get("provider", "supertonic")
        emotion = cleaner.norm_emotion(ln.get("emotion"))
        try:
            pause = max(0.0, min(5.0, float(ln.get("pause", 0) or 0)))
        except (TypeError, ValueError):
            pause = 0.0
        key = (provider, str(ln.get("voice", "M1")), round(float(ln.get("speed", 1.0)), 3),
               round(float(ln.get("pitch", 0.0)), 2), emotion)
        if provider == "drama3":
            key += (str(ln.get("name", "")), str(ln.get("description", "")))
        elif provider in ("gemini_tts", "gemini_gw"):
            key += (str(ln.get("gemini_voice", "")),)
        # Baris disatukan hanya bila suara & emosi sama dan baris sebelumnya tidak minta jeda panjang
        if groups and groups[-1][0] == key and groups[-1][3] < 0.3:
            groups[-1][1].append(text)
            groups[-1][3] = pause
        else:
            groups.append([key, [text], ln, pause])
    if not groups:
        raise ValueError("Tidak ada baris untuk dibacakan.")

    out, sr, prev, prev_pause, warnings = [], None, None, 0.0, []
    for key, texts, first, last_pause in groups:
        provider, voice, speed, pitch, emotion = key[:5]
        cleaned = cleaner.clean_text(" ".join(texts))
        if not cleaned:
            continue
        wav = None
        if provider == "drama3":
            try:
                wav, sr_new = _speak_drama3(first, cleaned)
            except Exception as e:
                warnings.append(f"{first.get('name', '?')}: Drama 3 gagal ({e}); dibacakan Supertonic {voice}.")
                print(f"⚠️ Drama 3 gagal untuk {first.get('name')}: {e}", flush=True)
        elif provider in ("gemini_tts", "gemini_gw"):
            try:
                wav, sr_new = _speak_gemini(first, cleaned, routes=["omniroute"] if provider == "gemini_gw" else None)
            except Exception as e:
                warnings.append(f"{first.get('name', '?')}: Gemini TTS gagal ({e}); dibacakan Supertonic {voice}.")
                print(f"⚠️ Gemini TTS gagal untuk {first.get('name')}: {e}", flush=True)
        if wav is None:
            wav, sr_new = synthesize_text("supertonic", cleaned, voice, speed, emotion)
            wav = _pitch_shift(wav, sr_new, pitch)
        if sr is None:
            sr = sr_new
        wav = _resample(np.asarray(wav, dtype=np.float32), sr_new, sr)
        speaker = (provider, voice, first.get("name", ""))
        gap = 0.45 if prev is not None and prev != speaker else 0.28
        if out:
            out.append(np.zeros(int(sr * max(gap, prev_pause)), dtype=np.float32))
        out.append(wav)
        prev, prev_pause = speaker, last_pause
    if not out:
        raise ValueError("Teks kosong setelah dibersihkan.")
    return _peak_norm(np.concatenate(out)), sr, warnings


@app.route("/api/annotate", methods=["POST"])
def api_annotate():
    """Sisipkan penanda [emosi X] dan [jeda N] ke teks narasi (AI, cadangan aturan generik)."""
    data = request.get_json(silent=True) or {}
    texts = data.get("texts")
    if texts is None:
        texts = [data.get("text", "")]
    results = []
    for t in texts:
        t = cleaner.clean_text(cleaner.strip_directives(str(t)))   # petakan ulang dari teks polos
        results.append(director.annotate(t, use_ai=bool(data.get("use_ai", True))) if t else
                       {"text": "", "segments": [], "info": {"mode": "rules", "note": "Teks kosong."}})
    return jsonify({"ok": True, "results": results})


@app.route("/api/direct", methods=["POST"])
def api_direct():
    """Petakan cerita -> scene, tokoh, baris, dan usulan suara (AI, cadangan aturan generik)."""
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    if not text:
        return jsonify({"ok": False, "message": "Naskah kosong."}), 400
    if cleaner.looks_like_web_markdown(text):
        art = cleaner.extract_article(text)
        text = art["text"]
    result = director.direct(text, use_ai=bool(data.get("use_ai", True)))
    result["drama3_available"] = drama3.is_configured()
    result["gemini_available"] = gemini_tts.is_configured()
    result["gemini_gw_available"] = gemini_tts.gateway_configured()
    for c in result["characters"]:
        c["gemini_voice"] = gemini_tts.DEFAULT_VOICE
        # Narator memakai Gemini (suara favorit) bila tersedia: bacaan storyteller paling akurat dan ekspresif
        if result["gemini_available"] and c["name"] == director.NARATOR:
            c["provider"] = "gemini_tts"
        # Suara anak: Drama 3 (mode Design) jauh lebih natural daripada Supertonic + geser nada
        if c["age"] == "child" and result["drama3_available"]:
            c["provider"] = "drama3"
    result["ok"] = True
    return jsonify(result)


def _safe_name(value, maxlen=40):
    return "".join(c for c in str(value) if c.isalnum() or c in "-_")[:maxlen]


@app.route("/api/clean_scenes", methods=["POST"])
def api_clean_scenes():
    """Pecah naskah jadi scene, lalu bersihkan tiap scene."""
    data = request.get_json(silent=True) or {}
    scenes = []
    text = str(data.get("text", ""))
    title = ""
    if cleaner.looks_like_web_markdown(text):
        art = cleaner.extract_article(text)
        title, text = art["title"], art["text"]
    try:
        group_words = int(data.get("group_words") or 0)
    except (TypeError, ValueError):
        group_words = 0
    for raw in cleaner.split_scenes(text, group_words):
        a = cleaner.analyze_text(raw)
        if not a["cleaned_text"]:
            continue
        scenes.append({
            "index": len(scenes) + 1,
            "raw_text": raw,
            "cleaned_text": a["cleaned_text"],
            "word_count": a["word_count"],
            "estimated_duration": a["estimated_duration"],
            "english_words": a["english_words"],
            "warnings": a["warnings"],
        })
    return jsonify({"scenes": scenes, "title": title})


@app.route("/api/synthesize", methods=["POST"])
def api_synthesize():
    """
    Sintesis satu teks. Tanpa 'folder': file narasi_*.wav di output/.
    Dengan 'folder' (mode scene): output/<folder>/scene_NN.wav.
    """
    data = request.get_json(silent=True) or {}
    engine = str(data.get("engine", "supertonic")).strip()
    text = str(data.get("text", "")).strip()
    voice_id = str(data.get("voice", "")).strip()
    style = str(data.get("style", "")).strip() or None
    try:
        speed = float(data.get("speed", 1.0))
    except (TypeError, ValueError):
        speed = 1.0

    lines = data.get("lines")
    if isinstance(lines, list) and lines:
        engine = "supertonic"
        text = " ".join(str(ln.get("text", "")) for ln in lines).strip()
    else:
        lines = None
    if not text:
        return jsonify({"ok": False, "message": "Teks narasi kosong."}), 400
    cleaned = cleaner.clean_text(text)
    if not cleaned:
        return jsonify({"ok": False, "message": "Teks kosong setelah dibersihkan."}), 400

    # Folder hasil = slug dari judul. Mode scene wajib punya folder (cadangan: scene-<tanggal>).
    title = str(data.get("title", "")).strip()
    is_scene = data.get("scene") is not None
    folder = _slug(title)
    preview = bool(data.get("preview"))
    if preview:
        folder, is_scene = "_preview", True
    if is_scene and not folder:
        folder = "scene-" + datetime.datetime.now().strftime("%Y%m%d")
    scene_no = int(data.get("scene") or 1) if is_scene else 0
    if folder:
        os.makedirs(os.path.join(OUTPUT_DIR, folder), exist_ok=True)
        if preview:
            out_filename = "_preview/coba.wav"
        elif is_scene:
            out_filename = f"{folder}/scene_{scene_no:02d}.wav"
        else:
            out_filename = f"{folder}/narasi_{engine}_{_safe_name(voice_id, 20) or 'voice'}.wav"
    else:
        now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        out_filename = f"narasi_{engine}_{now_str}_{_safe_name(voice_id, 20) or 'voice'}.wav"
    out_path = os.path.join(OUTPUT_DIR, out_filename)

    t0 = time.time()
    try:
        with lock_sintesis:
            if lines:
                wav, sr, warns = synthesize_lines(lines)
            else:
                (wav, sr), warns = synthesize_text(engine, cleaned, voice_id, speed, style=style), []
    except ValueError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
    except Exception as e:
        print(f"❌ Sintesis gagal ({engine}): {e}", flush=True)
        return jsonify({"ok": False, "message": str(e)}), 500

    sf.write(out_path, wav, sr)
    duration_sec = len(wav) / sr
    if folder and not preview:
        _record_info(folder, title, scene_no, cleaned, engine, voice_id, lines)
    return jsonify({
        "ok": True,
        "folder": folder,
        "engine": engine,
        "filename": out_filename,
        "audio_url": f"/output/{out_filename}",
        "voice": voice_id,
        "duration": f"{duration_sec:.1f} detik",
        "duration_sec": duration_sec,
        "size_bytes": os.path.getsize(out_path),
        "process_time_sec": round(time.time() - t0, 2),
        "warnings": warns,
    })


@app.route("/api/zip/<folder>")
def api_zip(folder):
    """Unduh seluruh folder scene sebagai satu ZIP."""
    import io
    import zipfile
    folder = _safe_name(folder, 60)
    d = os.path.join(OUTPUT_DIR, folder)
    if not folder or not os.path.isdir(d):
        return jsonify({"error": "Folder tidak ditemukan"}), 404
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
        for f in sorted(os.listdir(d)):
            if f.endswith(".wav"):
                z.write(os.path.join(d, f), f)
    buf.seek(0)
    return send_file(buf, mimetype="application/zip", as_attachment=True, download_name=f"{folder}.zip")


@app.route("/output/<path:filename>")
def serve_output(filename):
    return send_from_directory(OUTPUT_DIR, filename)


@app.route("/api/history")
def api_history():
    files = []
    if os.path.isdir(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            if f.endswith(".wav"):
                full_path = os.path.join(OUTPUT_DIR, f)
                mtime = os.path.getmtime(full_path)
                parts = f.replace(".wav", "").split("_")
                engine_tag = parts[1] if len(parts) > 2 else "pocket"
                voice_tag = parts[-1] if parts else "Unknown"
                files.append({
                    "filename": f,
                    "url": f"/output/{f}",
                    "size": os.path.getsize(full_path),
                    "mtime": mtime,
                    "time": datetime.datetime.fromtimestamp(mtime).strftime("%d/%m/%Y %H:%M"),
                    "engine": engine_tag,
                    "voice": voice_tag
                })
    files.sort(key=lambda x: x["mtime"], reverse=True)

    folders = []
    if os.path.isdir(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            d = os.path.join(OUTPUT_DIR, f)
            if os.path.isdir(d) and not f.startswith("_"):
                wavs = sorted(x for x in os.listdir(d) if x.endswith(".wav"))
                if wavs:
                    folders.append({
                        "folder": f,
                        "count": len(wavs),
                        "files": [{"name": x, "url": f"/output/{f}/{x}"} for x in wavs],
                        "mtime": os.path.getmtime(d),
                        "time": datetime.datetime.fromtimestamp(os.path.getmtime(d)).strftime("%d/%m/%Y %H:%M"),
                    })
    folders.sort(key=lambda x: x["mtime"], reverse=True)
    return jsonify({"files": files[:25], "folders": folders[:15]})


# Hot reload: template UI langsung berlaku (cukup refresh browser); kode Python memicu restart otomatis.
# Matikan dengan RELOAD=0 (atau ./run.sh --no-reload) saat sesi generate panjang, karena restart menghentikan sintesis
# yang sedang berjalan dan menghapus slot suara Drama 3 yang hidup di memori.
app.config["TEMPLATES_AUTO_RELOAD"] = True
RELOAD = os.environ.get("RELOAD", "1") != "0"


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    # Dengan reloader proses induk hanya mengawasi berkas; model dimuat di proses anak (WERKZEUG_RUN_MAIN=true)
    is_worker = (not RELOAD) or os.environ.get("WERKZEUG_RUN_MAIN") == "true"
    if is_worker:
        threading.Thread(target=prewarm_default_engines, daemon=True).start()
        print(f"🚀 Studio Narasi aktif di http://127.0.0.1:{port}" + ("  (hot reload aktif)" if RELOAD else ""), flush=True)
    app.run(
        host="0.0.0.0", port=port, debug=False,
        use_reloader=RELOAD, reloader_type="stat",
        # hanya kode proyek yang diawasi; hasil audio, cache, video, dan paket tidak memicu restart
        exclude_patterns=["*/.venv/*", "*/output/*", "*/videos/*", "*/suara-kloning/*", "*/audio/*",
                          "*/__pycache__/*", "*/.git/*", "*/docs/*"],
    )
