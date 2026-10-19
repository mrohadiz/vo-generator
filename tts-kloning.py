#!/usr/bin/env python3
"""
Servis TTS kloning Indonesia (anak10thn/pocket-tts-indonesian, 6 lapis).

Model dimuat SEKALI lalu standby di RAM — tiap sapaan disintesis dalam
hitungan detik (jauh lebih cepat daripada memanggil CLI per sapaan).

Pakai:
  1. pip install pocket-tts soundfile   (sekali saja; butuh ±3 GB + internet)
  2. python tts-kloning.py              (jalan pertama unduh model ±438 MB)
  3. Di server.js: TTS_KLONING_URL = 'http://localhost:5000'
     lalu pilih suara 🎭 Kloning di /kontrol.html

API:
  GET  /sehat     -> {"ok":true,"siap":true,"suara":["suara1",...]}
  POST /sintesis  {"teks":"...","suara":"suara1"} -> audio WAV (24 kHz mono)

Suara bawaan: 4 sampel CC0 di folder suara-kloning/ (suara1..suara4).
Suara sendiri: taruh file WAV/MP3 48 kHz di suara-kloning/suara-saya.mp3
lalu panggil dengan {"suara":"suara-saya"}.
"""

import io
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("TTS_KLONING_PORT", "5000"))
CONFIG = (
    "hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml"
    "@382fe85ca848546efb04bf1b7fdba78c6396e2ce"
)
EOS_THRESHOLD = -6.0  # nilai terbaik di eval resmi (median WER 9,09%)
SUARA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "suara-kloning")
SUARA_DEFAULT = "suara1"

try:
    from pocket_tts import TTSModel
    from pocket_tts.data.audio import stream_audio_chunks
except ImportError:
    sys.exit("❌ Modul pocket_tts tidak ada. Jalankan: pip install pocket-tts soundfile")
import numpy as np
import soundfile as sf

model = None
sample_rate = 24000
state_suara = {}  # nama -> voice state (di-cache, dihitung sekali per suara)
kunci = threading.Lock()  # generate_audio_stream TIDAK thread-safe → antrekan


def daftar_suara():
    """Petakan suara1..N ke file audio di suara-kloning/ (urut nama)."""
    if not os.path.isdir(SUARA_DIR):
        return {}
    files = sorted(
        f for f in os.listdir(SUARA_DIR)
        if f.lower().endswith((".wav", ".mp3", ".ogg", ".flac"))
    )
    hasil = {f"suara{i+1}": os.path.join(SUARA_DIR, f) for i, f in enumerate(files)}
    # alias nama-file (tanpa ekstensi), mis. suara-saya.mp3 -> "suara-saya"
    for f in files:
        hasil[os.path.splitext(f)[0]] = os.path.join(SUARA_DIR, f)
    return hasil


def dapat_state(nama):
    if nama in state_suara:
        return state_suara[nama]
    peta = daftar_suara()
    path = peta.get(nama) or peta.get(SUARA_DEFAULT)
    if not path:
        raise RuntimeError("Folder suara-kloning/ kosong — tidak ada sampel suara.")
    print(f"🎤 Mengkode suara '{nama}' ({os.path.basename(path)})...", flush=True)
    st = model.get_state_for_audio_prompt(path)
    state_suara[nama] = st
    return st


class Handler(BaseHTTPRequestHandler):
    server_version = "TTS-Kloning/1.0"

    def log_message(self, fmt, *args):  # log ringkas 1 baris
        sys.stderr.write(f"{self.address_string()} {fmt % args}\n")

    def _kirim(self, kode, badan: bytes, tipe):
        try:
            self.send_response(kode)
            self.send_header("Content-Type", tipe)
            self.send_header("Content-Length", str(len(badan)))
            self.end_headers()
            self.wfile.write(badan)
        except (BrokenPipeError, ConnectionResetError):
            # klien sudah putus (mis. server Node restart / timeout), abaikan
            pass

    def _json(self, obj, kode=200):
        self._kirim(kode, json.dumps(obj).encode(), "application/json")

    def do_GET(self):
        if self.path.split("?")[0] == "/sehat":
            return self._json({
                "ok": True,
                "siap": model is not None,
                "suara": sorted(daftar_suara().keys()),
            })
        return self._json({"ok": False, "pesan": "Gunakan GET /sehat atau POST /sintesis"}, 404)

    def do_POST(self):
        if self.path.split("?")[0] != "/sintesis":
            return self._json({"ok": False, "pesan": "Gunakan POST /sintesis"}, 404)
        try:
            panjang = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(panjang) or b"{}")
        except Exception:
            return self._json({"ok": False, "pesan": "Body harus JSON"}, 400)
        teks = str(data.get("teks", "")).strip()
        suara = str(data.get("suara", SUARA_DEFAULT)).strip() or SUARA_DEFAULT
        if not teks:
            return self._json({"ok": False, "pesan": "Teks kosong"}, 400)
        if model is None:
            return self._json({"ok": False, "pesan": "Model belum siap"}, 503)
        t0 = time.time()
        try:
            with kunci:  # antrekan — model hanya melayani 1 sintesis per saat
                st = dapat_state(suara)
                chunks = model.generate_audio_stream(st, teks)
                # stream_audio_chunks menutup stream-nya sendiri → pakai file temp
                # (aman: sintesis selalu antre 1-per-1, file ini tidak dipakai bareng)
                tmpwav = "/tmp/tts-kloning-terakhir.wav"
                stream_audio_chunks(tmpwav, chunks, sample_rate)
                # Normalisasi volume ke peak ~0.95 (-0.5 dB) agar suara lantang & jelas
                try:
                    data, sr = sf.read(tmpwav)
                    peak = np.max(np.abs(data))
                    if peak > 0.001:
                        data = (data / peak) * 0.95
                        sf.write(tmpwav, data, sr)
                except Exception as err_norm:
                    print(f"⚠️ Gagal normalisasi audio: {err_norm}", flush=True)
                wav = open(tmpwav, "rb").read()
            if len(wav) < 1000:
                raise RuntimeError("Hasil audio kosong/tak valid.")
        except Exception as e:
            return self._json({"ok": False, "pesan": f"Gagal sintesis: {e}"}, 500)
        dt = time.time() - t0
        print(f"🔊 {len(teks)} karakter → {len(wav)//1024} KB dalam {dt:.1f}s [{suara}]", flush=True)
        return self._kirim(200, wav, "audio/wav")


def main():
    global model, sample_rate
    print("🎭 TTS Kloning Indonesia (pocket-tts 6L) — memuat model...", flush=True)
    print("   (jalan pertama mengunduh ±438 MB, hanya sekali)", flush=True)
    t0 = time.time()
    model = TTSModel.load_model(config=CONFIG, eos_threshold=EOS_THRESHOLD)
    try:
        sample_rate = int(model.config.mimi.sample_rate)
    except Exception:
        pass
    print(f"✅ Model siap dalam {time.time()-t0:.0f} detik (sample rate {sample_rate} Hz).", flush=True)
    dapat_state(SUARA_DEFAULT)  # panaskan suara default selagi idle
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"🎧 Mendengar di http://127.0.0.1:{PORT}  (GET /sehat, POST /sintesis)", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Servis berhenti.", flush=True)


if __name__ == "__main__":
    main()
