"""
drama3.py - Penyedia suara Fish Audio Drama 3 lewat Hugging Face Space (ZeroGPU) milik sendiri.

Alur per tokoh (supaya suaranya konsisten antar baris):
  1. cast():  mode "Design" dari deskripsi suara -> /keep_voice menyimpan hasilnya sebagai slot suara.
  2. speak(): mode "Clone" memakai slot itu untuk baris-baris berikutnya.

Slot hidup di sesi Gradio (memori Space): hilang bila aplikasi atau Space restart. Selesaikan satu cerita
dalam satu sesi aplikasi agar suara tokoh tetap sama.

Konfigurasi di .env (hanya variabel ini yang dibaca): HF_TOKEN, DRAMA3_URL (opsional).
Kuota GPU dihitung dari akun pemilik HF_TOKEN. Token tidak pernah dicetak.
"""

import os
import re
import subprocess
import tempfile
import threading

import numpy as np
import soundfile as sf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_URL = "https://rohadiz-drama-3.hf.space/"

# Emosi (dari direktur AI) -> arahan akting bahasa Inggris untuk kolom "scene"
EMOTION_DIRECTION = {
    "senang": "cheerful, delighted", "sedih": "sad, tearful", "marah": "angry, sharp",
    "takut": "frightened, trembling", "kaget": "startled, gasping", "berbisik": "whispering softly",
    "tegas": "firm and assertive", "lembut": "gentle and soft", "licik": "sly and scheming",
    "menggoda": "teasing and playful",
}


class Drama3Error(RuntimeError):
    pass


def _env() -> dict:
    env = {}
    path = os.path.join(BASE_DIR, ".env")
    if os.path.isfile(path):
        for line in open(path, encoding="utf-8"):
            m = re.match(r"\s*(HF_TOKEN|DRAMA3_URL)\s*=\s*(.*?)\s*$", line)
            if m:
                env[m.group(1)] = m.group(2).strip().strip("\"'")
    for k in ("HF_TOKEN", "DRAMA3_URL"):
        if os.environ.get(k):
            env.setdefault(k, os.environ[k])
    return env


def is_configured() -> bool:
    return bool(_env().get("HF_TOKEN"))


class Drama3:
    def __init__(self):
        self._client = None
        self._lock = threading.Lock()
        self._voices = {}          # (nama, deskripsi) -> {"slot": id, "transcript": str}

    # -- koneksi ---------------------------------------------------------
    def _connect(self):
        if self._client is None:
            env = _env()
            if not env.get("HF_TOKEN"):
                raise Drama3Error("HF_TOKEN belum diisi di .env")
            from gradio_client import Client
            try:
                self._client = Client(env.get("DRAMA3_URL") or DEFAULT_URL, token=env["HF_TOKEN"],
                                      download_files=False, verbose=False)
            except Exception as e:
                raise Drama3Error(f"Tidak bisa terhubung ke Space Drama 3: {_short(e)}")
        return self._client

    def _reset(self):
        """Sesi baru: slot suara lama tidak berlaku lagi."""
        self._client = None
        self._voices.clear()

    # -- unduh audio streaming (HLS) -------------------------------------
    def _fetch_audio(self, client, filedata) -> tuple[np.ndarray, int]:
        import httpx
        url = filedata["url"] if isinstance(filedata, dict) else str(filedata)
        with httpx.Client(headers=dict(client.headers), timeout=60, follow_redirects=True) as h:
            pl = h.get(url)
            pl.raise_for_status()
            segs = [x.strip() for x in pl.text.splitlines() if x.strip() and not x.startswith("#")]
            if not segs:
                raise Drama3Error("Space tidak mengembalikan audio")
            base = url.rsplit("/", 1)[0] + "/"
            data = b""
            for s in segs:
                r = h.get(base + s)
                r.raise_for_status()
                data += r.content
        with tempfile.TemporaryDirectory() as d:
            src, dst = os.path.join(d, "a.aac"), os.path.join(d, "a.wav")
            open(src, "wb").write(data)
            p = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, dst], capture_output=True, text=True)
            if p.returncode != 0:
                raise Drama3Error("ffmpeg gagal mendekode audio: " + p.stderr[:160])
            wav, sr = sf.read(dst, dtype="float32")
        return (wav if wav.ndim == 1 else wav[:, 0]), sr

    # -- panggilan ke Space ----------------------------------------------
    def _perform(self, client, **kw):
        base = dict(transcript="", name="", description="", scene="", temperature=1.0, top_p=0.9, top_k=0)
        base.update(kw)
        try:
            return client.predict(api_name="/perform", **base)
        except Exception as e:
            msg = str(e)
            if "ZeroGPU" in msg and "limit" in msg:
                raise Drama3Error("Kuota ZeroGPU akun habis. Coba lagi nanti atau gunakan PRO.")
            raise Drama3Error(_short(e))

    def cast(self, name: str, description: str, sample_text: str, scene: str = ""):
        """
        Buat suara tokoh dari deskripsi, simpan sebagai slot. Mengembalikan (wav, sr) untuk sample_text,
        sehingga baris pertama tokoh tidak perlu dibuat dua kali.
        """
        with self._lock:
            client = self._connect()
            desc = description.strip() or "a clear, natural speaking voice"
            r = self._perform(client, text=sample_text, mode="Design", voice="clone1",
                              name=name, description=desc, scene=scene)
            wav, sr = self._fetch_audio(client, r[0])
            try:
                k = client.predict(api_name="/keep_voice")
            except Exception as e:
                raise Drama3Error("keep_voice gagal: " + _short(e))
            slot = k[0]["value"] if isinstance(k[0], dict) else k[0]
            self._voices[(name, description)] = {"slot": slot, "transcript": k[2]}
            return wav, sr

    def has_voice(self, name: str, description: str) -> bool:
        return (name, description) in self._voices

    def speak(self, name: str, description: str, text: str, emotion: str = "netral", scene: str = ""):
        """Bacakan teks dengan suara tokoh yang sudah di-cast (mode Clone). Mengembalikan (wav, sr)."""
        v = self._voices.get((name, description))
        if v is None:
            return self.cast(name, description, text, scene=_direction(emotion, scene))
        with self._lock:
            client = self._connect()
            try:
                r = self._perform(client, text=text, mode="Clone", voice=v["slot"], transcript=v["transcript"],
                                  name=name, scene=_direction(emotion, scene))
            except Drama3Error as e:
                if "not in the list of choices" in str(e):       # sesi Space berganti: slot hilang
                    self._reset()
                    raise Drama3Error("Slot suara hilang karena sesi Space berganti; coba generate ulang.")
                raise
            return self._fetch_audio(client, r[0])


def _direction(emotion: str, scene: str) -> str:
    d = EMOTION_DIRECTION.get((emotion or "").strip().lower(), "")
    return ", ".join(x for x in (scene.strip(), d) if x)


def _short(e) -> str:
    return re.sub(r"hf_[A-Za-z0-9]+", "hf_***", str(e))[:240]


_instance = None


def get() -> Drama3:
    global _instance
    if _instance is None:
        _instance = Drama3()
    return _instance
