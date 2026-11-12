"""Taksir perlakuan media (eksposur, highlight, vinyet, grain) dari pengukuran terang area caption pada klip.

Kalibrasi dari Scene 1 (diukur dengan lembar kontak dan `hyperframes check`): kabut terang (persentil-85 luma area caption
≈ 0,8) butuh eksposur ≈ -1,0; hujan dengan lampu (≈ 0,5) ≈ -0,55; air gelap berkilau (≈ 0,35) ≈ -0,3; siluet gelap (≈ 0,1) ≈ -0,1.
Perlakuan dipasang lewat `hyperframes media-treatment` (bukan filter CSS), lalu `check` menjadi hakim kontras.
"""
import subprocess

import numpy as np

W, H = 1080, 1920
BAND = (1040, 1440)           # area caption (y) pada kanvas 9:16
_FIN = {"vignetteFeather": 0.7, "grain": 0.10, "grainSize": 0.3}
TEMP = {"cold": -0.12, "neutral": -0.02, "warm": 0.10}


def band_luma(clip: dict, path: str, media_start: float, dur: float, pos: str, n: int = 4) -> float:
    """Persentil-85 luma (0-1) area caption pada n cuplikan di sepanjang segmen klip yang dipakai."""
    px, py = [float(v.strip("%")) / 100 for v in pos.split()[:2]]
    f = max(W / clip["w"], H / clip["h"])
    sw, sh = int(np.ceil(clip["w"] * f)), int(np.ceil(clip["h"] * f))
    ox, oy = int((sw - W) * px), int((sh - H) * py)
    vf = f"scale={sw}:{sh},crop={W}:{H}:{ox}:{oy},crop={W}:{BAND[1]-BAND[0]}:0:{BAND[0]},scale=108:40,format=gray"
    vals = []
    for k in range(n):
        t = media_start + dur * (k + 0.5) / n
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", path, "-frames:v", "1", "-vf", vf,
                              "-f", "rawvideo", "-"], capture_output=True).stdout
        if raw:
            vals.append(np.frombuffer(raw, dtype=np.uint8) / 255.0)
    return float(np.percentile(np.concatenate(vals), 85)) if vals else 0.4


def treatment(p85: float, mood: str = "neutral", extra_dark: float = 0.0) -> dict:
    """Perlakuan dari persentil terang area caption. extra_dark > 0 = gelapkan lagi (umpan balik dari `check`)."""
    e = -max(0.10, min(1.25, 1.5 * (p85 - 0.15))) - extra_dark
    e = max(-1.6, e)
    mag = abs(e)
    adjust = {"exposure": round(e, 2), "contrast": round(0.08 + 0.10 * min(mag, 1.0), 2),
              "saturation": round(-0.18 - 0.12 * min(mag, 1.0), 2), "temperature": TEMP.get(mood, 0.0)}
    if mag > 0.3:
        adjust["highlights"] = round(-min(0.85, 0.7 * mag), 2)
    if mag > 0.5:
        adjust["whites"] = round(-min(0.6, 0.5 * mag), 2)
    return {"adjust": adjust, "details": {"vignette": round(0.40 + 0.10 * min(mag / 1.0, 1.0), 2), **_FIN}}
