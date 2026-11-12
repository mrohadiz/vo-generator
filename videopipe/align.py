"""Waktu per kata untuk narasi yang teksnya diketahui, plus pembicara tiap kata (dari baris info.json)."""
import difflib
import json
import os
import re
import subprocess

import numpy as np

NORM = lambda t: re.sub(r"[^a-z0-9]+", "", t.lower())


def script_tokens(lines: list[dict]) -> tuple[list[str], list[str]]:
    """(token naskah, pembicara per token) dari daftar baris [{name,text}]."""
    toks, spk = [], []
    for ln in lines:
        for t in str(ln["text"]).split():
            if NORM(t):
                toks.append(t)
                spk.append(ln.get("name") or "Narator")
    return toks, spk


def align(audio: str, lines: list[dict], model_size: str = "small") -> dict:
    """faster-whisper (CPU) -> kata terdengar; dicocokkan ke kata naskah (difflib); sisanya diinterpolasi."""
    from faster_whisper import WhisperModel
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", audio, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    samples = np.frombuffer(raw, dtype=np.float32)
    dur = len(samples) / 16000.0
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(samples, language="id", beam_size=5, word_timestamps=True, vad_filter=False)
    heard = [(w.word.strip(), float(w.start), float(w.end)) for s in segments for w in (s.words or [])]

    toks, spk = script_tokens(lines)
    a = [NORM(t) for t in toks]
    b = [NORM(w[0]) for w in heard]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    times = [None] * len(a)
    matched = 0
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = (heard[blk.b + k][1], heard[blk.b + k][2])
            matched += 1
    i = 0
    while i < len(a):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(a) and times[j] is None:
            j += 1
        t0 = times[i - 1][1] if i > 0 else 0.0
        t1 = times[j][0] if j < len(a) else dur
        t1 = max(t1, t0 + 0.05 * (j - i))
        wts = [max(1, len(a[k])) for k in range(i, j)]
        cur = t0
        for k, w in zip(range(i, j), wts):
            step = (t1 - t0) * w / sum(wts)
            times[k] = (cur, cur + step)
            cur += step
        i = j
    words = [{"text": t, "start": round(s, 3), "end": round(e, 3), "spk": sp} for t, (s, e), sp in zip(toks, times, spk)]
    for k in range(1, len(words)):
        if words[k]["start"] < words[k - 1]["end"]:
            words[k]["start"] = words[k - 1]["end"]
        if words[k]["end"] < words[k]["start"]:
            words[k]["end"] = words[k]["start"] + 0.05
    return {"audio": os.path.basename(audio), "duration": round(dur, 3), "words": words,
            "matched": matched, "script_words": len(a), "heard_words": len(b)}
