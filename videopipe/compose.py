"""Tulis proyek HyperFrames satu scene (index.html, frame per denyut, captions, chrome) dari sebuah `spec`.

Menggeneralisasi videos/bayangan-masa-lalu/tools/build_frames.py dan build_captions.py (hasil Scene 1 harus identik;
lihat tools di sana). Struktur mengikuti aturan /hyperframes-studio: root hanya memuat host berwaktu dan audio, tiap
frame sub-komposisi, satu host caption (data-track-kind="captions"), jenis berbeda di lintasan berbeda. Perlakuan warna
B-roll dipasang lewat `hyperframes media-treatment`, bukan filter CSS.

spec = {
  "title": str, "scene_no": int, "scene_total": int, "duration": float (detik, total video),
  "audio": "assets/audio/scene.wav",
  "bounds": [0, b1, ..., duration],
  "frames": [{"slug","src","media_start","pos","s0","s1","bloom","treatment"}],
  "finale_from": float | None,         # kalimat penutup berukuran besar (opsional)
  "speakers": {"Layla": "left", "Langit": "right"},   # selain Narator
}
words = [{"text","start","end","spk"}]
"""
import json
import os
import re
import subprocess

W, H = 1080, 1920
XFADE = 0.8
OVER = XFADE / 2
CLI = "hyperframes@0.8.174"


# --- jendela waktu per frame ---------------------------------------------------------------------------------------
def window(spec: dict, i: int) -> tuple[float, float]:
    b, n = spec["bounds"], len(spec["frames"])
    start = 0.0 if i == 0 else b[i] - OVER
    end = spec["duration"] if i == n - 1 else b[i + 1] + OVER
    return round(start, 3), round(end - start, 3)


# --- frame ---------------------------------------------------------------------------------------------------------
def frame_html(spec: dict, i: int, motion: bool = True) -> str:
    f = spec["frames"][i]
    n = i + 1
    start, dur = window(spec, i)
    p, cid = f"f{n:02d}", f"frame-{n:02d}"
    first, last = i == 0, i == len(spec["frames"]) - 1
    bloom = f.get("bloom", 0.0)
    bloom_div = f'<div class="bloom" id="{p}-bloom"></div>' if bloom else ""
    bloom_css = (
        f"#{p}-bloom {{ position:absolute; left:0; top:36%; width:100%; height:44%; opacity:0;"
        f" background: radial-gradient(ellipse at 38% 50%, #7A4E33 0%, rgba(122,78,51,0.55) 35%, rgba(122,78,51,0) 70%);"
        f" will-change: opacity, transform; }}" if bloom else "")
    if motion:
        fade_in = (f'tl.fromTo("#{p}-fade", {{ opacity: 0 }}, {{ opacity: 1, duration: 1.2, ease: "sine.inOut" }}, 0);' if first else
                   f'tl.fromTo("#{p}-fade", {{ opacity: 0, filter: "blur(14px)" }}, '
                   f'{{ opacity: 1, filter: "blur(0px)", duration: {XFADE}, ease: "sine.inOut" }}, 0);')
        fade_out = (f'tl.to("#{p}-fade", {{ opacity: 0, duration: 0.8, ease: "sine.in" }}, {round(dur - 0.8, 3)});' if last else "")
        bloom_js = ""
        if bloom:
            bloom_js = f"""
      // ambient-glow-bloom: mekar pelan lalu napas terbatas (bukan yoyo)
      const bloom = document.getElementById("{p}-bloom");
      tl.fromTo("#{p}-bloom", {{ opacity: 0, scale: 0.92 }}, {{ opacity: {bloom}, scale: 1, duration: 2.2, ease: "power2.out" }}, 0.6);
      const bp = {{ p: 0 }};
      tl.to(bp, {{ p: Math.PI * 2 * {max(1, int((dur - 2.8) // 7))}, duration: {round(dur - 2.8, 3)}, ease: "none", onUpdate: () => {{
        const s = Math.sin(bp.p);
        bloom.style.opacity = String({bloom} + s * 0.05);
        bloom.style.transform = "scale(" + (1 + s * 0.03) + ")";
      }} }}, 2.8);"""
        motion_js = f"""
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
        motion_js = f"""
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
      const tl = gsap.timeline({{ paused: true }});{motion_js}
      window.__timelines["{cid}"] = tl;
      </script>
    </template>
  </body>
</html>
"""


def index_html(spec: dict) -> str:
    total = spec["duration"]
    hosts = []
    for i, f in enumerate(spec["frames"]):
        start, dur = window(spec, i)
        cid = f"frame-{i + 1:02d}"
        hosts.append(
            f'      <div id="{cid}" class="clip host" data-composition-id="{cid}" '
            f'data-composition-src="compositions/frames/{i + 1:02d}-{f["slug"]}.html" '
            f'data-start="{start}" data-duration="{dur}" data-track-index="{1 + i % 2}" '
            f'data-track-kind="graphics" data-width="{W}" data-height="{H}" style="z-index:{i + 1}"></div>')
    title = f"{spec['title']} — Scene {spec['scene_no']:02d}"
    return f"""<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <title>{title}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: {W}px; height: {H}px; overflow: hidden; background: #0A0D12; }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; background: #0A0D12; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="{W}" data-height="{H}" data-duration="{total}">
      <audio id="narration" src="{spec['audio']}" data-start="0" data-track-index="0" data-volume="1"></audio>
{chr(10).join(hosts)}
      <div id="captions" class="clip host" data-composition-id="captions" data-composition-src="compositions/captions.html"
        data-start="0" data-duration="{total}" data-track-index="3" data-track-kind="captions" data-width="{W}" data-height="{H}" style="z-index:10"></div>
      <div id="chrome" class="clip host" data-composition-id="chrome" data-composition-src="compositions/chrome.html"
        data-start="0" data-duration="{total}" data-track-index="4" data-track-kind="graphics" data-width="{W}" data-height="{H}" style="z-index:11"></div>
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""


def chrome_html(spec: dict) -> str:
    total = spec["duration"]
    label = spec["title"].replace("&", "&amp;").replace("<", "&lt;")
    return f"""<!doctype html>
<html lang="id">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        #chrome {{ position: absolute; inset: 0; overflow: hidden; }}
        #chrome-label, #chrome-num {{
          position: absolute; top: 200px; font-family: "IBM Plex Mono", monospace; font-weight: 400; font-size: 24px;
          text-transform: uppercase; color: #A59F98; opacity: 0;
        }}
        #chrome-label {{ left: 108px; letter-spacing: 0.3em; }}
        #chrome-num {{ right: 108px; letter-spacing: 0.2em; }}
        #chrome-progress {{ position: absolute; left: 108px; top: 1816px; width: 864px; height: 2px; display: block; background: #D08B5B; opacity: 0.85; transform-origin: 0 50%; }}
      </style>
      <div id="chrome" data-composition-id="chrome" data-width="{W}" data-height="{H}">
        <div id="chrome-label">{label}</div>
        <div id="chrome-num">{spec['scene_no']:02d} / {spec['scene_total']:02d}</div>
        <div id="chrome-progress"></div>
      </div>
      <script>
        const tl = gsap.timeline({{ paused: true }});
        const DURATION = {total};
        tl.fromTo("#chrome-label", {{ opacity: 0 }}, {{ opacity: 0.8, duration: 1.4, ease: "sine.inOut" }}, 0.8);
        tl.fromTo("#chrome-num", {{ opacity: 0 }}, {{ opacity: 0.8, duration: 1.4, ease: "sine.inOut" }}, 1.0);
        tl.fromTo("#chrome-progress", {{ scaleX: 0 }}, {{ scaleX: 1, duration: DURATION - 0.8, ease: "none" }}, 0);
        tl.to(["#chrome-label", "#chrome-num", "#chrome-progress"], {{ opacity: 0, duration: 0.8, ease: "sine.in" }}, DURATION - 0.8);
        window.__timelines["chrome"] = tl;
      </script>
    </template>
  </body>
</html>
"""


# --- caption -------------------------------------------------------------------------------------------------------
MAX_WORDS, MAX_CHARS, TILE_GAP = 4, 34, 0.6


def _esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _split_sentence(words, idx):
    n = len(idx)
    k = -(-n // MAX_WORDS)
    while True:
        base = [n // k + (1 if r < n % k else 0) for r in range(k)]
        cuts, acc = [], 0
        for size in base[:-1]:
            acc += size
            cuts.append(acc)
        for ci, c in enumerate(cuts):
            for d in (0, -1, 1):
                j = c + d
                lo = (cuts[ci - 1] if ci else 0) + 1
                hi = (cuts[ci + 1] if ci + 1 < len(cuts) else n) - 1
                if lo <= j <= hi and re.search(r"[,;:]$", words[idx[j - 1]]["text"]):
                    cuts[ci] = j
                    break
        parts, prev = [], 0
        for c in cuts + [n]:
            parts.append(idx[prev:c])
            prev = c
        longest = max(sum(len(words[i]["text"]) + 1 for i in part) for part in parts)
        if longest <= MAX_CHARS or k >= n:
            return parts
        k += 1


def caption_groups(spec: dict, words: list[dict]) -> tuple[list[list[int]], list[tuple]]:
    sentences, cur = [], []
    for i, w in enumerate(words):
        if cur and w.get("spk") != words[cur[-1]].get("spk"):        # ganti pembicara = kalimat baru
            sentences.append(cur)
            cur = []
        cur.append(i)
        if re.search(r"[.?!]$", w["text"]):
            sentences.append(cur)
            cur = []
    if cur:
        sentences.append(cur)
    finale_from = spec.get("finale_from")
    groups = []
    for sent in sentences:
        if finale_from is not None and words[sent[0]]["start"] >= finale_from:
            groups.append(sent)
        else:
            groups.extend(_split_sentence(words, sent))
    total = spec["duration"]
    wins = []
    for n, g in enumerate(groups):
        t0 = max(0.0, words[g[0]]["start"] - 0.04)
        last_end = words[g[-1]]["end"]
        if n + 1 < len(groups):
            nxt0 = max(0.0, words[groups[n + 1][0]]["start"] - 0.04)
            t1 = nxt0 if nxt0 - last_end < TILE_GAP else last_end + 0.35
        else:
            t1 = total
        wins.append((round(t0, 3), round(t1, 3)))
    return groups, wins


def captions_html(spec: dict, words: list[dict]) -> str:
    groups, wins = caption_groups(spec, words)
    total = spec["duration"]
    finale_from = spec.get("finale_from")
    speakers = spec.get("speakers", {})
    html_groups, prev_spk = [], None
    for n, g in enumerate(groups):
        spk = words[g[0]].get("spk", "Narator")
        finale = finale_from is not None and words[g[0]]["start"] >= finale_from
        classes = ["grp"]
        if finale:
            classes.append("finale")
        if spk in speakers:
            classes.append("spk")
            if speakers[spk] == "right":
                classes.append("r")
        tag = f'<span class="tag">{_esc(spk)}</span>' if (spk in speakers and spk != prev_spk) else ""
        prev_spk = spk
        spans = "".join(f'<span class="w" data-w="{i}">{_esc(words[i]["text"])}</span>' for i in g)
        html_groups.append(f'      <div class="{" ".join(classes)}" id="g{n}">{tag}{spans}</div>')
    timings = [[w["start"], w["end"]] for w in words]
    finale_js = ""
    if finale_from is not None and groups and words[groups[-1][0]]["start"] >= finale_from:
        finale_js = (f'\n      // penutup: memudar bersama video di 0,8 detik terakhir (pengecualian scene terakhir)\n'
                     f'      tl.fromTo("#g{len(groups) - 1}", {{ opacity: 1 }}, {{ opacity: 0, duration: 0.8, ease: "sine.in", '
                     f'immediateRender: false }}, DURATION - 0.8);')
    else:
        finale_js = (f'\n      tl.to("#g{len(groups) - 1}", {{ opacity: 0, duration: 0.8, ease: "sine.in" }}, DURATION - 0.8);'
                     if groups else "")
    return f"""<!doctype html>
<html lang="id">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        @font-face {{ font-family: "Fraunces"; src: url("assets/fonts/Fraunces-normal.woff2") format("woff2"); font-weight: 300 700; font-style: normal; }}
        @font-face {{ font-family: "Fraunces"; src: url("assets/fonts/Fraunces-italic.woff2") format("woff2"); font-weight: 300 700; font-style: italic; }}
        #captions {{ position: absolute; inset: 0; overflow: hidden; }}
        #captions .grp {{
          position: absolute; left: 108px; top: 1040px; width: 864px; opacity: 0;
          display: flex; flex-wrap: wrap; column-gap: 0.26em; row-gap: 0;
          font-family: "Fraunces", serif; font-weight: 300; font-size: 104px; line-height: 1.1; letter-spacing: -0.02em;
          color: #B2ACA5;
        }}
        #captions .grp.spk {{ font-style: italic; }}
        #captions .grp.r {{ justify-content: flex-end; text-align: right; }}
        #captions .grp .tag {{
          flex: 0 0 100%; font-family: "IBM Plex Mono", monospace; font-style: normal; font-weight: 400; font-size: 24px;
          letter-spacing: 0.3em; text-transform: uppercase; color: #D08B5B; line-height: 1; margin-bottom: 22px;
        }}
        #captions .grp.finale {{ font-style: italic; font-weight: 400; font-size: 128px; line-height: 1.06; letter-spacing: -0.025em; top: 560px; }}
        #captions .w {{ display: inline-block; transform-origin: 50% 70%; color: #B2ACA5; text-shadow: 0 2px 30px rgba(10,13,18,0.6); }}
      </style>
      <div id="captions" data-composition-id="captions" data-width="{W}" data-height="{H}">
{chr(10).join(html_groups)}
      </div>
      <script>
      const WINS = {json.dumps(wins)};
      const TIMINGS = {json.dumps(timings)};
      const DURATION = {total};
      const tl = gsap.timeline({{ paused: true }});

      // grup: muncul sekali, mati keras setelah selesai
      WINS.forEach((w, n) => {{
        tl.fromTo("#g" + n, {{ opacity: 0, y: 14 }}, {{ opacity: 1, y: 0, duration: 0.14, ease: "power2.out" }}, w[0]);
        tl.set("#g" + n, {{ opacity: 0 }}, w[1]);
      }});{finale_js}

      // asr-keyword-glow, gaya karaoke: satu driver linear, envelope attack-sustain-release per kata
      const ATTACK = 0.10, RELEASE = 0.40, REST = 0.55, MAX_BLUR = 26, MAX_SCALE = 0.05;
      const REST_RGB = [178, 172, 165], FINALE_REST_RGB = [204, 199, 192], ACTIVE_RGB = [234, 227, 214], EMBER = [208, 139, 91];
      const els = Array.from(document.querySelectorAll("#captions .w"));
      const lerp = (a, b, t) => Math.round(a + (b - a) * t);
      function envelope(time, s, e) {{
        if (time < s) return 0;
        if (time < e) return Math.min((time - s) / ATTACK, 1);
        if (time < e + RELEASE) return 1 - ((time - e) / RELEASE) * (1 - REST);
        return REST;
      }}
      const driver = {{ t: 0 }};
      tl.to(driver, {{ t: DURATION, duration: DURATION, ease: "none", onUpdate: () => {{
        els.forEach((el) => {{
          const tm = TIMINGS[+el.dataset.w];
          const env = envelope(driver.t, tm[0], tm[1]);
          const glow = Math.max(0, (env - REST) / (1 - REST));
          const base = el.parentElement.classList.contains("finale") ? FINALE_REST_RGB : REST_RGB;
          const c = [0, 1, 2].map((k) => lerp(base[k], ACTIVE_RGB[k], env));
          el.style.color = "rgb(" + c.join(",") + ")";
          el.style.textShadow = "0 2px 30px rgba(10,13,18,0.6), 0 0 " + (MAX_BLUR * glow).toFixed(1) + "px rgba(" + EMBER.join(",") + "," + (0.75 * glow).toFixed(3) + ")";
          el.style.transform = "scale(" + (1 + MAX_SCALE * glow).toFixed(4) + ")";
        }});
      }} }}, 0);

      window.__timelines["captions"] = tl;
      </script>
    </template>
  </body>
</html>
"""


# --- tulis proyek --------------------------------------------------------------------------------------------------
def write_project(project_dir: str, spec: dict, words: list[dict], motion: bool = True):
    os.makedirs(os.path.join(project_dir, "compositions", "frames"), exist_ok=True)
    for i, f in enumerate(spec["frames"]):
        open(os.path.join(project_dir, "compositions", "frames", f"{i + 1:02d}-{f['slug']}.html"), "w", encoding="utf-8").write(frame_html(spec, i, motion))
    open(os.path.join(project_dir, "index.html"), "w", encoding="utf-8").write(index_html(spec))
    open(os.path.join(project_dir, "compositions", "captions.html"), "w", encoding="utf-8").write(captions_html(spec, words))
    open(os.path.join(project_dir, "compositions", "chrome.html"), "w", encoding="utf-8").write(chrome_html(spec))


def apply_treatments(project_dir: str, spec: dict, only: list[int] | None = None) -> list[str]:
    """Pasang perlakuan media per frame lewat CLI resmi. Kembalikan daftar galat (kosong = semua ok)."""
    errors = []
    for i, f in enumerate(spec["frames"]):
        if only is not None and i not in only:
            continue
        rel = f"compositions/frames/{i + 1:02d}-{f['slug']}.html"
        sel = f"#f{i + 1:02d}-video"
        subprocess.run(["npx", "--yes", CLI, "media-treatment", "--file", rel, "--selector", sel, "--clear", "--json"],
                       cwd=project_dir, capture_output=True, text=True)
        r = subprocess.run(["npx", "--yes", CLI, "media-treatment", "--file", rel, "--selector", sel, "--grading",
                            json.dumps(f["treatment"]), "--apply", "--json"], cwd=project_dir, capture_output=True, text=True)
        if '"ok": true' not in r.stdout.replace('"ok":true', '"ok": true'):
            errors.append(f"frame-{i + 1:02d}: {(r.stdout + r.stderr)[-200:]}")
    return errors
