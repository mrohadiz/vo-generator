#!/usr/bin/env python3
"""
Cari kandidat B-roll di Pixabay (API resmi) per denyut cerita; simpan ke broll/candidates.json.
Kunci dibaca dari variabel PIXABAY_API di ../../.env dan tidak pernah dicetak.
Pakai:  python tools/pixabay_search.py
"""
import json, os, re, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = os.path.join(ROOT, "..", "..", ".env")
KEY = None
for line in open(ENV, encoding="utf-8"):
    m = re.match(r"\s*PIXABAY_API\s*=\s*(.*?)\s*$", line)
    if m:
        KEY = m.group(1).strip().strip("\"'")
assert KEY, "PIXABAY_API tidak ada di .env"

# denyut -> (durasi segmen dalam detik, daftar query)
BEATS = {
    "A_bayangan":   (14.5, ["silhouette shadow wall light", "rain window night alone", "dark room window light curtain"]),
    "B_sadar":      (18.0, ["woman alone window rain", "lonely woman night city window", "sad woman looking out window"]),
    "C1_langit":    (18.0, ["man silhouette sunset quiet", "man standing beach dusk", "silhouette couple sunset calm"]),
    "CD_air":       (28.0, ["ocean waves dusk calm", "sea twilight slow waves", "underwater blue calm"]),
    "E_langit":     (4.5,  ["sky clouds sunrise light", "clouds breaking golden light sky", "sky timelapse clouds sunrise"]),
}

def search(q, per=20):
    qs = urllib.parse.urlencode({"key": KEY, "q": q, "per_page": per, "safesearch": "true"})
    req = urllib.request.Request("https://pixabay.com/api/videos/?" + qs, headers={"User-Agent": "tts-narasi/1.0"})
    return json.load(urllib.request.urlopen(req, timeout=40))

out = {}
for beat, (need, queries) in BEATS.items():
    seen, cands = set(), []
    for q in queries:
        try:
            d = search(q)
        except Exception as e:
            print("ERR", beat, q, str(e)[:80]); continue
        for h in d.get("hits", []):
            if h["id"] in seen or h.get("isLowQuality"):
                continue
            seen.add(h["id"])
            v = h["videos"]
            best = max((v[k] for k in v if v[k].get("url")), key=lambda x: x["width"] * x["height"])
            small = v.get("medium") or v.get("small") or best
            vertical = best["height"] > best["width"]
            cands.append({
                "id": h["id"], "page": h["pageURL"], "user": h["user"], "tags": h["tags"], "duration": h["duration"],
                "w": best["width"], "h": best["height"], "vertical": vertical,
                "url_best": best["url"], "url_medium": small["url"], "w_m": small["width"], "h_m": small["height"],
                "thumb": small.get("thumbnail"), "ai": bool(h.get("isAiGenerated")), "user_url": h.get("userURL"),
                "query": q, "views": h.get("views"),
            })
        time.sleep(0.7)
    # urutkan: cukup panjang dulu, vertikal diutamakan
    cands.sort(key=lambda c: (c["duration"] >= need + 1, c["vertical"], c["views"] or 0), reverse=True)
    out[beat] = {"need_s": need, "candidates": cands}
    print(f"{beat}: {len(cands)} kandidat, {sum(c['vertical'] for c in cands)} vertikal, {sum(c['duration']>=need+1 for c in cands)} cukup panjang")
os.makedirs(os.path.join(ROOT, "broll"), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, "broll", "candidates.json"), "w"), ensure_ascii=False, indent=1)
