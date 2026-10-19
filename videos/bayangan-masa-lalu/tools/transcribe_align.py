#!/usr/bin/env python3
"""
Waktu per kata untuk narasi yang teksnya sudah diketahui.

1. faster-whisper (CPU, model small, bahasa Indonesia) menghasilkan kata + waktu dari audio.
2. Kata-kata itu dicocokkan ke kata naskah asli (difflib); kata naskah yang tak terdengar jelas
   diberi waktu hasil interpolasi di antara kata-kata jangkar terdekat.
Keluaran memakai ejaan NASKAH, bukan tebakan Whisper:  transcript.json = {"words":[{"text","start","end"}], ...}

Pakai:  python tools/transcribe_align.py assets/audio/scene_01.wav script_01.txt transcript_01.json
"""
import difflib, json, re, sys

audio, script_path, out_path = sys.argv[1:4]
script = open(script_path, encoding="utf-8").read()

import subprocess
import numpy as np
from faster_whisper import WhisperModel

# Decode lewat ffmpeg (hindari ketergantungan versi PyAV): mono 16 kHz float32
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", audio, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                     capture_output=True, check=True).stdout
samples = np.frombuffer(raw, dtype=np.float32)

class _Info:  # durasi dari sampel
    duration = len(samples) / 16000.0

model = WhisperModel("small", device="cpu", compute_type="int8")
segments, _ = model.transcribe(samples, language="id", beam_size=5, word_timestamps=True, vad_filter=False)
info = _Info()
heard = []
for seg in segments:
    for w in seg.words or []:
        heard.append((w.word.strip(), float(w.start), float(w.end)))

norm = lambda t: re.sub(r"[^a-z0-9]+", "", t.lower())
script_tokens = [t for t in script.split() if norm(t)]           # kata naskah dengan tanda baca aslinya
a = [norm(t) for t in script_tokens]
b = [norm(w[0]) for w in heard]
sm = difflib.SequenceMatcher(None, a, b, autojunk=False)

times = [None] * len(a)                                             # (start, end) per kata naskah
matched = 0
for blk in sm.get_matching_blocks():
    for k in range(blk.size):
        times[blk.a + k] = (heard[blk.b + k][1], heard[blk.b + k][2])
        matched += 1

# interpolasi untuk kata yang tak cocok, berbobot panjang huruf
dur = float(info.duration)
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
    weights = [max(1, len(a[k])) for k in range(i, j)]
    total = sum(weights)
    cur = t0
    for k, wgt in zip(range(i, j), weights):
        step = (t1 - t0) * wgt / total
        times[k] = (cur, cur + step)
        cur += step
    i = j

words = [{"text": t, "start": round(s, 3), "end": round(e, 3)} for t, (s, e) in zip(script_tokens, times)]
for k in range(1, len(words)):                                      # tak boleh tumpang tindih / mundur
    if words[k]["start"] < words[k - 1]["end"]:
        words[k]["start"] = words[k - 1]["end"]
    if words[k]["end"] < words[k]["start"]:
        words[k]["end"] = words[k]["start"] + 0.05
json.dump({"audio": audio, "duration": round(dur, 3), "words": words,
           "matched": matched, "script_words": len(a), "heard_words": len(b)},
          open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{matched}/{len(a)} kata naskah cocok dengan hasil dengar ({len(b)} kata terdengar); durasi {dur:.1f}s -> {out_path}")
