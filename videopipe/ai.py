"""Panggilan AI untuk alur video: teks atau teks+gambar, keluaran JSON, model utama lalu cadangan (lihat director.py)."""
import base64
import json
import os
import re
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import director  # noqa: E402


class AIError(RuntimeError):
    pass


def _image_part(path: str) -> dict:
    ext = os.path.splitext(path)[1].lower().lstrip(".") or "png"
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    b64 = base64.b64encode(open(path, "rb").read()).decode()
    return {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}


def _call(cfg: dict, model: str, system: str, user_parts: list, max_tokens: int, timeout: int = 240) -> str:
    body = {"model": model, "temperature": 0, "max_tokens": max_tokens,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_parts}]}
    req = urllib.request.Request(
        cfg["endpoint"] + "/chat/completions", data=json.dumps(body).encode(), method="POST",
        headers={"Authorization": "Bearer " + cfg["key"], "Content-Type": "application/json", "User-Agent": "tts-narasi/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.load(r)
    return data["choices"][0]["message"]["content"] or ""


def ask_json(system: str, prompt: str, images: list[str] | None = None, max_tokens: int = 3000,
             validate=None) -> tuple[dict, str]:
    """
    Kirim prompt (+ gambar) dan kembalikan (JSON, 'penyedia/model'). Model utama dulu (PRIMARY_MODEL, "berpikir" dulu jadi
    max_tokens longgar), lalu cadangan. `validate(data)` boleh melempar ValueError agar model berikutnya dicoba.
    """
    providers = director.ai_config()
    if not providers:
        raise AIError("AI belum dikonfigurasi (OMNIROUTE_KEY/ENDPOINT atau GEMINI_KEY di .env)")
    parts = [{"type": "text", "text": prompt}] + [_image_part(p) for p in (images or [])]
    errors = []
    for cfg, model in [(p, m) for p in providers for m in p["models"]]:
        for attempt in range(2):
            try:
                raw = _call(cfg, model, system, parts, max_tokens)
                data = director._parse_json(raw)
                if validate:
                    validate(data)
                return data, f"{cfg['name']}/{model}"
            except Exception as e:                       # model berikutnya (atau ulang sekali untuk gangguan sesaat)
                errors.append(f"{cfg['name']}/{model}: {str(e)[:100]}")
                if "429" in str(e) or "timed out" in str(e):
                    time.sleep(4)
                    continue
                break
    raise AIError(" | ".join(errors[-4:]) or "AI tidak tersedia")
