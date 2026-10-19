#!/usr/bin/env python3
"""
Hasilkan compositions/frames/NN-*.html dan index.html dari satu tabel frame.

  python tools/build_frames.py            # pass sketsa: tata letak statis, tanpa gerak
  python tools/build_frames.py --motion   # pass bangun: crossfade kabur, kamera pelan, ember bloom

Struktur (aturan /hyperframes-studio): root hanya memuat host berwaktu, audio, dan media; tiap scene sub-komposisi;
satu host caption (data-track-kind="captions"); jenis berbeda di lintasan berbeda. Perlakuan warna B-roll TIDAK ditulis
di sini: dipasang lewat `hyperframes media-treatment` (atribut data-color-grading pada <video>).
"""
import os, sys

MOTION = "--motion" in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1080, 1920
XFADE = 0.8          # lama crossfade kabur (detik)
OVER = XFADE / 2     # tiap sisi batas

# batas antar denyut (detik, pada jeda alami narasi) dan akhir
BOUNDS = [0.0, 14.5, 32.2, 50.3, 77.8, 81.5]
FRAMES = [
    dict(n=1, slug="bayangan",        src="assets/broll/A_40797.mp4",  media_start=0.0, pos="86% 50%", s0=1.06, s1=1.12, bloom=0.0,  track=1),
    dict(n=2, slug="kesadaran",       src="assets/broll/B_11722.mp4",  media_start=0.0, pos="40% 50%", s0=1.06, s1=1.10, bloom=0.0,  track=2),
    dict(n=3, slug="langit-hadir",    src="assets/broll/C_258799.mp4", media_start=2.0, pos="50% 50%", s0=1.06, s1=1.11, bloom=0.32, track=1),
    dict(n=4, slug="tenggelam",       src="assets/broll/D_296062.mp4", media_start=6.0, pos="50% 50%", s0=1.06, s1=1.08, bloom=0.28, track=2),
    dict(n=5, slug="memilih-tinggal", src="assets/broll/E_4753.mp4",   media_start=13.0, pos="50% 55%", s0=1.06, s1=1.16, bloom=0.0,  track=1),
]
TOTAL = BOUNDS[-1]

# Perlakuan media (grade + vinyet + grain) per klip, dipasang lewat `hyperframes media-treatment` (bukan filter CSS).
# Footage terang digelapkan keras supaya caption terbaca (diukur dari lembar kontak sebelum/sesudah).
_FIN = {"vignetteFeather": 0.7, "grain": 0.10, "grainSize": 0.3}
TREATMENTS = {
    1: {"adjust": {"exposure": -0.10, "contrast": 0.10, "saturation": -0.25, "temperature": -0.12}, "details": {"vignette": 0.40, **_FIN}},
    2: {"adjust": {"exposure": -0.60, "highlights": -0.7, "whites": -0.5, "contrast": 0.10, "saturation": -0.30, "temperature": -0.10}, "details": {"vignette": 0.45, **_FIN}},
    3: {"adjust": {"exposure": -1.05, "highlights": -0.7, "whites": -0.5, "contrast": 0.18, "saturation": -0.35, "temperature": -0.08}, "details": {"vignette": 0.50, **_FIN}},
    4: {"adjust": {"exposure": -0.35, "highlights": -0.3, "contrast": 0.05, "saturation": -0.15, "temperature": 0.05}, "details": {"vignette": 0.40, **_FIN}},
    5: {"adjust": {"exposure": -0.50, "highlights": -0.45, "whites": -0.30, "contrast": 0.15, "saturation": -0.25, "temperature": 0.15}, "details": {"vignette": 0.50, **_FIN}},
}


def window(i):
    """(start, duration) host: tumpang tindih OVER di tiap batas; frame pertama mulai 0, terakhir selesai di TOTAL."""
    start = 0.0 if i == 0 else BOUNDS[i] - OVER
    end = TOTAL if i == len(FRAMES) - 1 else BOUNDS[i + 1] + OVER
    return round(start, 3), round(end - start, 3)


def frame_html(i, f):
    start, dur = window(i)
    p, cid = f"f{f['n']:02d}", f"frame-{f['n']:02d}"
    first, last = i == 0, i == len(FRAMES) - 1
    bloom_div = f'<div class="bloom" id="{p}-bloom"></div>' if f["bloom"] else ""
    bloom_css = (
        f"#{p}-bloom {{ position:absolute; left:0; top:36%; width:100%; height:44%; opacity:0;"
        f" background: radial-gradient(ellipse at 38% 50%, #7A4E33 0%, rgba(122,78,51,0.55) 35%, rgba(122,78,51,0) 70%);"
        f" will-change: opacity, transform; }}"
        if f["bloom"] else ""
    )
    motion = ""
    if MOTION:
        fade_in = (
            f'tl.fromTo("#{p}-fade", {{ opacity: 0 }}, {{ opacity: 1, duration: 1.2, ease: "sine.inOut" }}, 0);'
            if first else
            f'tl.fromTo("#{p}-fade", {{ opacity: 0, filter: "blur(14px)" }}, '
            f'{{ opacity: 1, filter: "blur(0px)", duration: {XFADE}, ease: "sine.inOut" }}, 0);'
        )
        fade_out = (
            f'tl.to("#{p}-fade", {{ opacity: 0, duration: 0.8, ease: "sine.in" }}, {round(dur - 0.8, 3)});'
            if last else ""
        )
        bloom_js = ""
        if f["bloom"]:
            bloom_js = f"""
      // ambient-glow-bloom: mekar pelan lalu napas terbatas (bukan yoyo)
      const bloom = document.getElementById("{p}-bloom");
      tl.fromTo("#{p}-bloom", {{ opacity: 0, scale: 0.92 }}, {{ opacity: {f['bloom']}, scale: 1, duration: 2.2, ease: "power2.out" }}, 0.6);
      const bp = {{ p: 0 }};
      tl.to(bp, {{ p: Math.PI * 2 * {max(1, int((dur - 2.8) // 7))}, duration: {round(dur - 2.8, 3)}, ease: "none", onUpdate: () => {{
        const s = Math.sin(bp.p);
        bloom.style.opacity = String({f['bloom']} + s * 0.05);
        bloom.style.transform = "scale(" + (1 + s * 0.03) + ")";
      }} }}, 2.8);"""
        motion = f"""
      {fade_in}
      {fade_out}
      // multi-phase-camera: skala lambat + drift mikro; satu-satunya penulis transform kamera
      const cam = document.getElementById("{p}-cam");
      const ph = {{ s: {f['s0']} }};
      tl.to(ph, {{ s: {f['s1']}, duration: {dur}, ease: "sine.inOut" }}, 0);
      const dr = {{ p: 0 }};
      tl.to(dr, {{ p: Math.PI * 2 * {max(1, round(dur / 18))}, duration: {dur}, ease: "none", onUpdate: () => {{
        const dx = Math.sin(dr.p) * 9, dy = Math.sin(dr.p * 1.3 + 1.1) * 6;
        cam.style.transform = "translate(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px) scale(" + ph.s.toFixed(4) + ")";
      }} }}, 0);{bloom_js}"""
    else:
        motion = f"""
      document.getElementById("{p}-cam").style.transform = "scale({f['s0']})";"""
    return f"""<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <template>
      <style>
        #{cid} {{ position: absolute; inset: 0; overflow: hidden; background: #0A0D12; }}
        #{p}-fade {{ position: absolute; inset: 0; }}
        #{p}-cam {{ position: absolute; inset: 0; transform-origin: 50% 50%; will-change: transform; }}
        #{p}-video {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: {f['pos']}; }}
        {bloom_css}
      </style>
      <div id="{cid}" data-composition-id="{cid}" data-width="{W}" data-height="{H}">
        <div id="{p}-fade">
          <div id="{p}-cam">
            <video id="{p}-video" src="{f['src']}" muted playsinline
              data-start="0" data-duration="{dur}" data-media-start="{f['media_start']}" data-track-index="0"></video>
          </div>
          {bloom_div}
        </div>
      </div>
      <script>
      const tl = gsap.timeline({{ paused: true }});{motion}
      window.__timelines["{cid}"] = tl;
      </script>
    </template>
  </body>
</html>
"""


def index_html():
    hosts = []
    for i, f in enumerate(FRAMES):
        start, dur = window(i)
        cid = f"frame-{f['n']:02d}"
        hosts.append(
            f'      <div id="{cid}" class="clip host" data-composition-id="{cid}" '
            f'data-composition-src="compositions/frames/{f["n"]:02d}-{f["slug"]}.html" '
            f'data-start="{start}" data-duration="{dur}" data-track-index="{f["track"]}" '
            f'data-track-kind="graphics" data-width="{W}" data-height="{H}" style="z-index:{i + 1}"></div>'
        )
    hosts_html = "\n".join(hosts)
    return f"""<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <title>Bayangan Masa Lalu — Scene 01</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: {W}px; height: {H}px; overflow: hidden; background: #0A0D12; }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; background: #0A0D12; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="{W}" data-height="{H}" data-duration="{TOTAL}">
      <audio id="narration" src="assets/audio/scene_01.wav" data-start="0" data-track-index="0" data-volume="1"></audio>
{hosts_html}
      <div id="captions" class="clip host" data-composition-id="captions" data-composition-src="compositions/captions.html"
        data-start="0" data-duration="{TOTAL}" data-track-index="3" data-track-kind="captions" data-width="{W}" data-height="{H}" style="z-index:10"></div>
      <div id="chrome" class="clip host" data-composition-id="chrome" data-composition-src="compositions/chrome.html"
        data-start="0" data-duration="{TOTAL}" data-track-index="4" data-track-kind="graphics" data-width="{W}" data-height="{H}" style="z-index:11"></div>
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""


os.makedirs(os.path.join(ROOT, "compositions", "frames"), exist_ok=True)
for i, f in enumerate(FRAMES):
    path = os.path.join(ROOT, "compositions", "frames", f"{f['n']:02d}-{f['slug']}.html")
    open(path, "w", encoding="utf-8").write(frame_html(i, f))
open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(index_html())
def apply_treatments():
    import json, subprocess
    for f in FRAMES:
        rel = f"compositions/frames/{f['n']:02d}-{f['slug']}.html"
        r = subprocess.run(
            ["npx", "--yes", "hyperframes@0.8.174", "media-treatment", "--file", rel, "--selector", f"#f{f['n']:02d}-video",
             "--grading", json.dumps(TREATMENTS[f["n"]]), "--apply", "--json"],
            cwd=ROOT, capture_output=True, text=True)
        ok = '"ok": true' in r.stdout.replace('"ok":true', '"ok": true')
        print(f"  perlakuan frame-{f['n']:02d}:", "ok" if ok else "GAGAL " + (r.stdout + r.stderr)[-200:])


if "--no-treat" not in sys.argv:
    apply_treatments()
print("mode:", "bangun (gerak)" if MOTION else "sketsa (statis)")
for i, f in enumerate(FRAMES):
    print(f"  frame-{f['n']:02d} {window(i)}")
