#!/usr/bin/env python3
"""Lembar kontak kandidat B-roll: baris = denyut, kolom = kandidat; kotak putih = potongan tengah 9:16."""
import io, json, sys, urllib.request
from PIL import Image, ImageDraw

N = int(sys.argv[1]) if len(sys.argv) > 1 else 8
data = json.load(open("broll/candidates.json"))
CW, CH = 300, 169
beats = list(data)
sheet = Image.new("RGB", (N * CW + 60, len(beats) * CH + 4), (18, 18, 20))
d = ImageDraw.Draw(sheet)
for r, beat in enumerate(beats):
    d.text((4, r * CH + 8), beat.split("_")[0], fill=(255, 255, 255))
    d.text((4, r * CH + 24), f"{data[beat]['need_s']:.0f}s", fill=(160, 160, 160))
    for c, cand in enumerate(data[beat]["candidates"][:N]):
        try:
            raw = urllib.request.urlopen(urllib.request.Request(cand["thumb"], headers={"User-Agent": "tts-narasi/1.0"}), timeout=30).read()
            im = Image.open(io.BytesIO(raw)).convert("RGB").resize((CW, CH))
        except Exception:
            im = Image.new("RGB", (CW, CH), (60, 20, 20))
        x0, y0 = 60 + c * CW, r * CH
        sheet.paste(im, (x0, y0))
        cw = int(CH * 9 / 16)
        d.rectangle([x0 + (CW - cw) // 2, y0, x0 + (CW + cw) // 2, y0 + CH - 1], outline=(255, 255, 255))
        tag = f"{beat.split('_')[0]}{c+1} {cand['duration']}s {cand['w']}p{'V' if cand['vertical'] else ''}{' AI' if cand['ai'] else ''}"
        d.rectangle([x0, y0 + CH - 14, x0 + CW, y0 + CH], fill=(0, 0, 0))
        d.text((x0 + 3, y0 + CH - 13), tag, fill=(255, 255, 255))
sheet.save("boards/candidates.png")
print(sheet.size)
