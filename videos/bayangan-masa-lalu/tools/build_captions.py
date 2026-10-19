#!/usr/bin/env python3
"""
Bangun compositions/captions.html dari transcript.json (kata + waktu, ejaan naskah).

Gaya: karaoke (rule asr-keyword-glow). Satu driver linear menggerakkan semua kata: kata yang diucapkan naik dari
bone-dim ke bone dengan cahaya ember halus, lalu turun ke tingkat 'rest' (tetap terbaca). Grup 3-5 kata, ditampilkan
sekali, dimatikan keras setelah selesai (aturan caption). Penutup (kalimat terakhir) memakai italic besar.

  python tools/build_captions.py
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = json.load(open(os.path.join(ROOT, "transcript.json"), encoding="utf-8"))
words = data["words"]
TOTAL = 81.5
FINALE_FROM = 77.8          # kalimat penutup

MAX_WORDS, MAX_CHARS = 4, 34
TILE_GAP = 0.6      # jeda antar grup di bawah ini: grup berganti langsung (tanpa tumpang tindih)


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def split_sentence(idx):
    """Bagi satu kalimat menjadi grup seimbang (<= MAX_WORDS kata), memilih koma sebagai titik potong bila dekat."""
    n = len(idx)
    k = -(-n // MAX_WORDS)
    while True:
        base = [n // k + (1 if r < n % k else 0) for r in range(k)]
        cuts, acc = [], 0
        for size in base[:-1]:
            acc += size
            cuts.append(acc)
        # geser potongan ke koma terdekat (maks 1 kata)
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


# kalimat: berakhir tanda akhir kalimat; kalimat penutup (>= FINALE_FROM) dijadikan satu grup utuh
sentences, cur = [], []
for i, w in enumerate(words):
    cur.append(i)
    if re.search(r"[.?!]$", w["text"]):
        sentences.append(cur)
        cur = []
if cur:
    sentences.append(cur)

groups = []
for sent in sentences:
    if words[sent[0]]["start"] >= FINALE_FROM:
        groups.append(sent)
    else:
        groups.extend(split_sentence(sent))

# jendela tampil: muncul sedikit sebelum kata pertama; berganti langsung bila ucapan berlanjut, selain itu hilang 0.35s setelah kata terakhir
wins = []
for n, g in enumerate(groups):
    t0 = max(0.0, words[g[0]]["start"] - 0.04)
    last_end = words[g[-1]]["end"]
    if n + 1 < len(groups):
        nxt0 = max(0.0, words[groups[n + 1][0]]["start"] - 0.04)
        t1 = nxt0 if nxt0 - last_end < TILE_GAP else last_end + 0.35
    else:
        t1 = TOTAL
    wins.append((round(t0, 3), round(t1, 3)))
FINALE_GROUP = len(groups) - 1

html_groups, timings = [], []
for n, g in enumerate(groups):
    finale = words[g[0]]["start"] >= FINALE_FROM
    spans = "".join(f'<span class="w" data-w="{i}">{esc(words[i]["text"])}</span>' for i in g)
    html_groups.append(f'      <div class="grp{" finale" if finale else ""}" id="g{n}">{spans}</div>')
for i, w in enumerate(words):
    timings.append([w["start"], w["end"]])

out = f"""<!doctype html>
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
        #captions .grp.finale {{ font-style: italic; font-weight: 400; font-size: 128px; line-height: 1.06; letter-spacing: -0.025em; top: 560px; }}
        #captions .w {{ display: inline-block; transform-origin: 50% 70%; color: #B2ACA5; text-shadow: 0 2px 30px rgba(10,13,18,0.6); }}
      </style>
      <div id="captions" data-composition-id="captions" data-width="1080" data-height="1920">
{chr(10).join(html_groups)}
      </div>
      <script>
      const WINS = {json.dumps(wins)};
      const TIMINGS = {json.dumps(timings)};
      const DURATION = {TOTAL};
      const tl = gsap.timeline({{ paused: true }});

      // grup: muncul sekali, mati keras setelah selesai
      WINS.forEach((w, n) => {{
        tl.fromTo("#g" + n, {{ opacity: 0, y: 14 }}, {{ opacity: 1, y: 0, duration: 0.14, ease: "power2.out" }}, w[0]);
        tl.set("#g" + n, {{ opacity: 0 }}, w[1]);
      }});
      // penutup: memudar bersama video di 0,8 detik terakhir (pengecualian scene terakhir)
      tl.fromTo("#g{FINALE_GROUP}", {{ opacity: 1 }}, {{ opacity: 0, duration: 0.8, ease: "sine.in", immediateRender: false }}, DURATION - 0.8);

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
os.makedirs(os.path.join(ROOT, "compositions"), exist_ok=True)
open(os.path.join(ROOT, "compositions", "captions.html"), "w", encoding="utf-8").write(out)
print(f"{len(groups)} grup, {len(words)} kata")
for n, (g, w) in enumerate(zip(groups, wins)):
    print(f"  g{n:02d} {w[0]:6.2f}-{w[1]:6.2f}  {' '.join(words[i]['text'] for i in g)}")
