#!/usr/bin/env python3
"""
make_video - dari audio scene (output/<judul>/scene_NN.wav) ke proyek video HyperFrames 9:16 per scene.

  python make_video.py bayangan-masa-lalu --scene 3            # satu scene
  python make_video.py bayangan-masa-lalu --scenes 2-6         # beberapa scene
  python make_video.py bayangan-masa-lalu --scene 3 --render   # + render (lama; hanya setelah disetujui)
  python make_video.py bayangan-masa-lalu --concat             # gabung hasil render semua scene menjadi satu video
  opsi: --no-ai (tanpa AI), --force (ulang dari awal), --skip-check

Tahap per scene (semua hasil antara disimpan di videos/<judul>-sNN/, jadi bisa dilanjutkan):
  1 kata+waktu (Whisper CPU, diselaraskan ke naskah) -> 2 denyut cerita (AI) -> 3 B-roll Pixabay (AI visi memilih)
  -> 4 perlakuan warna dari terang area caption -> 5 tulis komposisi -> 6 `hyperframes check` (umpan balik kontras)
  -> 7 snapshot + tinjauan AI -> laporan. Render TIDAK otomatis: berat (±19 detik per detik video) dan perlu persetujuan.

AI memakai model utama director.PRIMARY_MODEL dengan cadangan; tanpa AI jalur aturan tetap menghasilkan video.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time

REPO = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, REPO)
from videopipe import ai, align, beats as beatmod, broll, compose, grade  # noqa: E402

TEMPLATE = os.path.join(REPO, "videos", "bayangan-masa-lalu")     # sumber berkas statis proyek (font, konfigurasi)
CLI = compose.CLI
MOOD_FALLBACK = {"cold": ["rain on window night", "lonely silhouette window", "dark foggy street night"],
                 "neutral": ["quiet atmospheric dusk", "calm moody clouds", "slow waves at twilight"],
                 "warm": ["golden hour light through trees", "warm sunset glow horizon", "soft sunrise clouds"]}


def log(*a):
    print(*a, flush=True)


def slug_of(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def run_cli(project: str, args: list[str], timeout: int = 1500) -> str:
    r = subprocess.run(["npx", "--yes", CLI] + args, cwd=project, capture_output=True, text=True, timeout=timeout)
    return re.sub(r"\x1b\[[0-9;]*m", "", r.stdout + r.stderr)


# --- 0. proyek ------------------------------------------------------------------------------------------------------
def prepare_project(project: str, title: str, name: str, scene_wav: str, scene_no: int):
    os.makedirs(os.path.join(project, "assets", "audio"), exist_ok=True)
    os.makedirs(os.path.join(project, "assets", "broll"), exist_ok=True)
    for f in ("hyperframes.json", "package.json", "CLAUDE.md", "AGENTS.md"):
        dst = os.path.join(project, f)
        if not os.path.exists(dst):
            shutil.copy(os.path.join(TEMPLATE, f), dst)
    pj = json.load(open(os.path.join(project, "package.json")))
    pj["name"] = name
    json.dump(pj, open(os.path.join(project, "package.json"), "w"), indent=2)
    meta = os.path.join(project, "meta.json")
    if not os.path.exists(meta):
        json.dump({"id": name, "name": name, "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())}, open(meta, "w"), indent=2)
    fonts = os.path.join(project, "assets", "fonts")
    if not os.path.isdir(fonts):
        shutil.copytree(os.path.join(TEMPLATE, "assets", "fonts"), fonts)
    dst = os.path.join(project, "assets", "audio", f"scene_{scene_no:02d}.wav")
    if not os.path.exists(dst):
        try:
            os.link(scene_wav, dst)
        except OSError:
            shutil.copy(scene_wav, dst)


# --- 4. B-roll ------------------------------------------------------------------------------------------------------
def select_broll(project, spec_beats, bounds, total, context, use_ai, scene_no, info_log):
    """Pilih satu klip per denyut. Kembalikan daftar dict frame (tanpa perlakuan)."""
    frames, chosen_here = [], set()
    for i, b in enumerate(spec_beats):
        start = 0.0 if i == 0 else bounds[i] - compose.OVER
        end = total if i == len(spec_beats) - 1 else bounds[i + 1] + compose.OVER
        need = end - start + 1.5
        exclude = broll.used_ids() | chosen_here
        cands = broll.candidates(b["queries"], need, exclude)
        if len(cands) < 2:                                    # perluas dengan query suasana
            cands += [c for c in broll.candidates(MOOD_FALLBACK.get(b["mood"], MOOD_FALLBACK["neutral"]), need, exclude)
                      if c["id"] not in {x["id"] for x in cands}]
            cands = sorted(cands, key=lambda c: -c["score"])[:8]
        if not cands:
            raise RuntimeError(f"denyut {i + 1}: tidak ada klip Pixabay yang cukup panjang (≥{need:.0f} detik)")
        sheet_dir = os.path.join(project, "broll", "sheets")
        os.makedirs(sheet_dir, exist_ok=True)
        if use_ai:
            clip, pick = broll.choose(b, cands, os.path.join(sheet_dir, f"beat{i + 1}.png"), context)
        else:
            clip, pick = cands[0], {"mode": "skor", "model": None, "reason": "", "focus_x": 50}
        path = broll.download(clip)
        pr = broll.probe(path)
        clip.update(w=pr["w"], h=pr["h"], vertical=pr["h"] > pr["w"])
        link = os.path.join(project, "assets", "broll", f"B{i + 1}_{clip['id']}.mp4")
        if not os.path.exists(link):
            try:
                os.link(path, link)
            except OSError:
                shutil.copy(path, link)
        slack = pr["duration"] - (end - start)
        media_start = 0.5 if slack > 1.2 else 0.0
        broll.mark_used(clip["id"])
        chosen_here.add(clip["id"])
        frames.append({"clip": {k: clip[k] for k in ("id", "page", "user", "duration", "w", "h", "tags")},
                       "src": f"assets/broll/B{i + 1}_{clip['id']}.mp4", "path": link, "media_start": media_start,
                       "pos": broll.object_position(clip, pick["focus_x"]), "pick": pick, "dur": end - start})
        log(f"   denyut {i + 1}: klip {clip['id']} ({clip['w']}x{clip['h']}{' V' if clip['vertical'] else ''}, {pick['mode']})"
            + (f" - {pick['reason'][:80]}" if pick.get("reason") else ""))
    return frames


# --- 6. check -------------------------------------------------------------------------------------------------------
CONTRAST_RE = re.compile(r"(\d+(?:\.\d+)?):1 \(need (\d+(?:\.\d+)?):1, t=(\d+(?:\.\d+)?)s\)")


def caption_times(spec, words, fractions=(0.35, 0.7)) -> list[float]:
    """Waktu saat caption TAMPIL di tiap denyut (di luar tumpang tindih crossfade), agar pemeriksaan kontras bermakna."""
    groups, wins = compose.caption_groups(spec, words)
    b = spec["bounds"]
    out = []
    for i in range(len(b) - 1):
        lo, hi = b[i] + 0.8, b[i + 1] - 0.8
        usable = [w for w in wins if w[0] >= lo and w[1] <= hi and w[1] - w[0] >= 0.8]
        if not usable:
            usable = [w for w in wins if lo <= (w[0] + w[1]) / 2 <= hi]
        fr = fractions if (b[i + 1] - b[i]) >= 14 else (0.5,)
        for f in fr:
            target = b[i] + f * (b[i + 1] - b[i])
            if usable:
                w = min(usable, key=lambda w: abs((w[0] + w[1]) / 2 - target))
                out.append(round(w[0] + 0.45 * (w[1] - w[0]), 2))
            else:
                out.append(round(target, 2))
    return sorted(set(out))


def _check_once(project: str, chunk: list[float]) -> tuple[list, list, list]:
    out = run_cli(project, ["check", "--at", ",".join(str(t) for t in chunk), "--timeout", "90000"], timeout=1500)
    fails = [{"ratio": float(m.group(1)), "need": float(m.group(2)), "t": float(m.group(3))} for m in CONTRAST_RE.finditer(out)]
    layout, errors = [], []
    for line in out.splitlines():
        if "check_runtime_failure" in line or "Check failed" in line:
            errors.append(line.strip()[:160])
        if re.search(r"\b(text_overflow|overlap|clipped)\b", line) and "ℹ" not in line:
            layout.append(line.strip()[:160])
    return fails, layout, errors


def run_check(project: str, times: list[float], group: int = 3) -> dict:
    """`hyperframes check` per kelompok waktu (sampel penuh melewati batas waktu pada footage berat); kelompok yang gagal
    dijalankan ulang per titik."""
    fails, layout, errors = [], [], []
    for k in range(0, len(times), group):
        chunk = times[k:k + group]
        f, l, e = _check_once(project, chunk)
        if e and len(chunk) > 1:
            f, l, e = [], [], []
            for t in chunk:
                f1, l1, e1 = _check_once(project, [t])
                f += f1
                l += l1
                e += e1
        fails += f
        layout += l
        errors += e
    return {"contrast_fails": fails, "layout": layout, "errors": errors}


def beat_of(bounds, t):
    for i in range(len(bounds) - 1):
        if bounds[i] - 0.05 <= t < bounds[i + 1] + 0.4:
            return i
    return len(bounds) - 2


# --- 7. tinjauan AI -------------------------------------------------------------------------------------------------
def review_sheet(project, spec, use_ai, words) -> dict:
    mids = caption_times(spec, words, fractions=(0.5,))
    snap = os.path.join(project, "snapshots", "final")
    shutil.rmtree(snap, ignore_errors=True)
    out = run_cli(project, ["snapshot", "--at", ",".join(str(t) for t in mids), "--no-end", "--describe", "false",
                            "--timeout", "60000", "-o", snap], timeout=1500)
    sheet = os.path.join(snap, "contact-sheet.jpg")
    res = {"times": mids, "sheet": sheet if os.path.exists(sheet) else None, "ai": None}
    if use_ai and res["sheet"]:
        prompt = (f"Lembar kontak ini berisi {len(mids)} panel video 9:16 (urut kiri-kanan, atas-bawah), tiap panel dengan caption serif. "
                  f"Untuk SETIAP panel nilai apakah teks caption terbaca jelas di atas latar (bukan tertimpa area terang) dan apakah latar "
                  f"tampak sesuai suasana gelap sinematik. Keluaran HANYA JSON: "
                  f'{{"panels":[{{"readable":true,"issue":"kosong atau satu kalimat"}}]}} dengan tepat {len(mids)} elemen.')
        try:
            data, model = ai.ask_json("Kamu penilai kualitas video. Jawab HANYA JSON valid.", prompt, images=[res["sheet"]],
                                      max_tokens=2500,
                                      validate=lambda d: (_ for _ in ()).throw(ValueError("jumlah panel salah"))
                                      if len(d.get("panels", [])) != len(mids) else None)
            res["ai"] = {"model": model, "panels": data["panels"]}
        except Exception as e:
            res["ai"] = {"error": str(e)[:200]}
    return res


# --- tulis dokumen proyek ---------------------------------------------------------------------------------------------
def write_docs(project, title, scene_no, scene_total, spec, bt, frames, words):
    fm = ["---", "format: 1080x1920", f"duration: {spec['duration']}s", f'message: "{title}: scene {scene_no}"',
          "arc: " + " -> ".join(b.get("name") or f"denyut {i + 1}" for i, b in enumerate(bt)), "mode: autonomous", "---", ""]
    for i, (b, f) in enumerate(zip(bt, frames)):
        s, d = compose.window(spec, i)
        fm += [f"## Frame {i + 1} — {b.get('name') or 'Denyut ' + str(i + 1)}", "", f"- scene: {b.get('note', '')}",
               f"- duration: {d}s", f"- transition_in: {'fade dari hitam' if i == 0 else 'blur crossfade 0.8s'}", "- status: animated",
               f"- voiceover: \"{b['text'][:300]}\"", f"- src: compositions/frames/{i + 1:02d}-{spec['frames'][i]['slug']}.html",
               f"- broll: pixabay {f['clip']['id']} ({f['clip']['w']}x{f['clip']['h']})", f"- mood: {b['mood']}", ""]
    open(os.path.join(project, "STORYBOARD.md"), "w", encoding="utf-8").write("\n".join(fm))
    brief = f"""---
workflow: general-video
flow: automation
storyboard: no
message: "{title}: scene {scene_no}"
destination: shorts-tiktok
aspect: 1080x1920
language: id
length: {spec['duration']}s
---

## Intent

Scene {scene_no} dari {scene_total} narasi "{title}", dibuat otomatis oleh `make_video.py` memakai gaya Scene 1
(gelap sinematik, Fraunces, satu aksen ember). Lihat docs/PLAN-video.md.

## Notes

- Dihasilkan otomatis; pemilihan klip dan denyut oleh AI (model utama) dengan cadangan aturan.
- Kredit B-roll di broll/CREDITS.md. Lisensi Pixabay belum diverifikasi dari halaman resminya.
"""
    open(os.path.join(project, "BRIEF.md"), "w", encoding="utf-8").write(brief)
    os.makedirs(os.path.join(project, "broll"), exist_ok=True)
    with open(os.path.join(project, "broll", "CREDITS.md"), "w", encoding="utf-8") as fh:
        fh.write("# Kredit B-roll (Pixabay)\n\nLisensi Pixabay Content License; BELUM DIVERIFIKASI dari halaman resmi.\n\n")
        for i, f in enumerate(frames):
            c = f["clip"]
            fh.write(f"- Denyut {i + 1}: {c['user']} — {c['page']} (id {c['id']}, {c['duration']}s, {c['w']}x{c['h']})\n")


# --- satu scene -----------------------------------------------------------------------------------------------------
def build_scene(folder: str, scene_no: int, use_ai: bool, force: bool, skip_check: bool) -> dict:
    out_dir = os.path.join(REPO, "output", folder)
    info = json.load(open(os.path.join(out_dir, "info.json"), encoding="utf-8"))
    title = info.get("title") or folder
    k = f"{scene_no:02d}"
    lines = info["lines"][k]
    wav = os.path.join(out_dir, f"scene_{k}.wav")
    scene_total = len([f for f in os.listdir(out_dir) if re.fullmatch(r"scene_\d+\.wav", f)])
    name = f"{folder}-s{k}"
    project = os.path.join(REPO, "videos", name)
    if force and os.path.isdir(project):
        shutil.rmtree(project)
    log(f"\n=== Scene {scene_no}/{scene_total}: {title} -> videos/{name}/")
    prepare_project(project, title, name, wav, scene_no)

    # 1. kata + waktu
    tpath = os.path.join(project, "transcript.json")
    if os.path.exists(tpath):
        tr = json.load(open(tpath, encoding="utf-8"))
        log(f" 1. transkrip dipakai ulang ({len(tr['words'])} kata)")
    else:
        t0 = time.time()
        tr = align.align(wav, lines)
        json.dump(tr, open(tpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        log(f" 1. kata+waktu: {tr['matched']}/{tr['script_words']} kata cocok langsung ({time.time() - t0:.0f} detik)")
    words, audio_dur = tr["words"], tr["duration"]
    total = round(audio_dur + 0.35, 1)
    counts = {}
    for w in words:
        if w["spk"] != "Narator":
            counts[w["spk"]] = counts.get(w["spk"], 0) + 1
    spk_order = sorted(counts, key=lambda s: (-counts[s], s))          # tokoh dengan kata terbanyak di kiri
    speakers = {s: ("left" if i % 2 == 0 else "right") for i, s in enumerate(spk_order)}

    # 2. denyut
    chars = sorted({l.get("name", "Narator") for l in info["lines"][k]} - {"Narator"})
    context = (f"Judul: {title}. Nada: sedih, reflektif, sinematik gelap. Tokoh: {', '.join(chars) or 'narator saja'}. "
               f"Ini scene {scene_no} dari {scene_total} dalam satu cerita yang sama.")
    bpath = os.path.join(project, "beats.json")
    if os.path.exists(bpath):
        bt = json.load(open(bpath, encoding="utf-8"))
        log(f" 2. denyut dipakai ulang ({len(bt['beats'])})")
    else:
        bt = beatmod.make_beats(words, total, context, use_ai=use_ai)
        json.dump(bt, open(bpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        log(f" 2. {len(bt['beats'])} denyut ({bt['info']['mode']}{', ' + bt['info']['model'] if bt['info'].get('model') else ''})"
            + (f" - {bt['info']['note']}" if bt["info"].get("note") else ""))
    beats_, bounds = bt["beats"], bt["bounds"]
    bounds[-1] = total
    for i, b in enumerate(beats_):
        log(f"    {bounds[i]:6.1f}-{bounds[i + 1]:6.1f}s {b['mood']:7s} {b.get('name', ''):22s} {b['queries']}")

    # 3. B-roll
    spath = os.path.join(project, "broll", "selected.json")
    if os.path.exists(spath):
        frames = json.load(open(spath, encoding="utf-8"))
        log(" 3. B-roll dipakai ulang")
    else:
        log(" 3. B-roll:")
        frames = select_broll(project, beats_, bounds, total, context, use_ai, scene_no, None)
        json.dump(frames, open(spath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # 4. perlakuan + spec
    log(" 4. perlakuan warna dari terang area caption")
    spec = {"title": title, "scene_no": scene_no, "scene_total": scene_total, "duration": total,
            "audio": f"assets/audio/scene_{k}.wav", "bounds": bounds, "finale_from": None, "speakers": speakers, "frames": []}
    for i, (b, f) in enumerate(zip(beats_, frames)):
        clip = {"w": f["clip"]["w"], "h": f["clip"]["h"], "vertical": f["clip"]["h"] > f["clip"]["w"]}
        p85 = grade.band_luma(clip, f["path"], f["media_start"], f["dur"], f["pos"])
        tr_ = grade.treatment(p85, b["mood"], f.get("extra_dark", 0.0))
        s1 = round(1.06 + min(0.08, f["dur"] / 300), 3)
        spec["frames"].append({"slug": re.sub(r"[^a-z0-9]+", "-", (b.get("name") or f"denyut-{i + 1}").lower()).strip("-") or f"denyut-{i + 1}",
                               "src": f["src"], "media_start": f["media_start"], "pos": f["pos"], "s0": 1.06, "s1": s1,
                               "bloom": 0.28 if b["mood"] == "warm" else 0.0, "treatment": tr_, "p85": round(p85, 2)})
        log(f"    denyut {i + 1}: p85={p85:.2f} eksposur {tr_['adjust']['exposure']:+.2f}")

    # 5. komposisi
    def rebuild(only=None):
        compose.write_project(project, spec, words, motion=True)
        errs = compose.apply_treatments(project, spec, only)
        if errs:
            log("    PERINGATAN perlakuan:", errs)
    rebuild()
    write_docs(project, title, scene_no, scene_total, spec, beats_, frames, words)
    json.dump(spec, open(os.path.join(project, "scene.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    lint = run_cli(project, ["lint"], timeout=300)
    log(" 5. komposisi ditulis; lint:", re.search(r"\d+ errors?, \d+ warnings?", lint).group(0) if re.search(r"\d+ errors?, \d+ warnings?", lint) else lint[-120:].strip())

    # 6. check dengan umpan balik kontras
    report = {"scene": scene_no, "project": name, "duration": total, "beats": [{"name": b.get("name"), "mood": b["mood"], "start": bounds[i], "end": bounds[i + 1]} for i, b in enumerate(beats_)], "check": []}
    if not skip_check:
        for attempt in range(3):
            res = run_check(project, caption_times(spec, words))
            report["check"].append(res)
            if res["errors"]:
                log(f" 6. check percobaan {attempt + 1}: galat runtime: {res['errors'][:2]}")
                break
            bad = sorted({beat_of(bounds, f["t"]) for f in res["contrast_fails"]})
            log(f" 6. check percobaan {attempt + 1}: kontras gagal {len(res['contrast_fails'])} titik di denyut {[b + 1 for b in bad] or '-'}; layout {len(res['layout'])}")
            if not bad:
                break
            for i in bad:
                worst = max((f["need"] / max(f["ratio"], 0.1) for f in res["contrast_fails"] if beat_of(bounds, f["t"]) == i), default=1.3)
                frames[i]["extra_dark"] = frames[i].get("extra_dark", 0.0) + min(0.5, 0.3 * worst)
                tr_ = grade.treatment(spec["frames"][i]["p85"], beats_[i]["mood"], frames[i]["extra_dark"])
                spec["frames"][i]["treatment"] = tr_
                log(f"    gelapkan denyut {i + 1}: eksposur {tr_['adjust']['exposure']:+.2f}")
            compose.write_project(project, spec, words, motion=True)
            compose.apply_treatments(project, spec, bad)
            json.dump(frames, open(spath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            json.dump(spec, open(os.path.join(project, "scene.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        report["contrast_ok"] = not report["check"][-1]["contrast_fails"] and not report["check"][-1]["errors"]
    else:
        report["contrast_ok"] = None

    # 7. snapshot + tinjauan AI (panel yang ditandai tak terbaca digelapkan lalu ditinjau ulang, maksimal 2 putaran)
    rv = review_sheet(project, spec, use_ai, words)
    for rnd in range(2):
        panels = (rv.get("ai") or {}).get("panels") or []
        NOCAP = re.compile(r"tidak (ditemukan|terdapat|tampil|ada teks|terlihat)|caption.*(hilang|kosong|tidak ada)", re.I)
        bad = [i for i, p in enumerate(panels)
               if not p.get("readable", True) and not NOCAP.search(p.get("issue", "")) and frames[i].get("extra_dark", 0.0) < 0.9]
        if not bad or not use_ai:
            break
        for i in bad:
            frames[i]["extra_dark"] = frames[i].get("extra_dark", 0.0) + 0.3
            spec["frames"][i]["treatment"] = grade.treatment(spec["frames"][i]["p85"], beats_[i]["mood"], frames[i]["extra_dark"])
            log(f"    AI: denyut {i + 1} sulit dibaca ({panels[i].get('issue', '')[:70]}) -> gelapkan, eksposur "
                f"{spec['frames'][i]['treatment']['adjust']['exposure']:+.2f}")
        compose.write_project(project, spec, words, motion=True)
        compose.apply_treatments(project, spec, bad)
        json.dump(frames, open(spath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        json.dump(spec, open(os.path.join(project, "scene.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        rv = review_sheet(project, spec, use_ai, words)
    report["review"] = rv
    if rv.get("ai") and rv["ai"].get("panels"):
        for i, p in enumerate(rv["ai"]["panels"]):
            if not p.get("readable", True):
                log(f"    AI masih menandai denyut {i + 1}: {p.get('issue', '')[:100]}")
    json.dump(report, open(os.path.join(project, "report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    log(f" 7. snapshot: {rv['sheet']}")
    log(f" selesai scene {scene_no}: kontras {'LOLOS' if report['contrast_ok'] else 'PERLU DITINJAU' if report['contrast_ok'] is False else 'tidak diperiksa'}")
    return report


def render_scene(folder: str, scene_no: int):
    name = f"{folder}-s{scene_no:02d}"
    project = os.path.join(REPO, "videos", name)
    out = os.path.join(project, "renders", f"{name}.mp4")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    log(f"render {name} ...")
    t0 = time.time()
    txt = run_cli(project, ["render", "--quality", "looks", "--fps", "30", "-o", out], timeout=20000)
    log(f"  selesai {(time.time() - t0) / 60:.1f} menit -> {out}" if os.path.exists(out) else "  GAGAL:\n" + txt[-600:])


def concat(folder: str):
    clips = []
    legacy = os.path.join(REPO, "videos", folder, "renders", f"{folder}-scene01.mp4")
    if os.path.exists(legacy):
        clips.append(legacy)
    for f in sorted(os.listdir(os.path.join(REPO, "videos"))):
        m = re.fullmatch(rf"{re.escape(folder)}-s(\d+)", f)
        if m:
            p = os.path.join(REPO, "videos", f, "renders", f + ".mp4")
            if os.path.exists(p):
                clips.append(p)
    if len(clips) < 2:
        log("kurang dari 2 hasil render untuk digabung:", clips)
        return
    listfile = os.path.join(REPO, "videos", f"{folder}-concat.txt")
    open(listfile, "w").write("".join(f"file '{c}'\n" for c in clips))
    out = os.path.join(REPO, "output", folder, f"{folder}-penuh.mp4")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listfile, "-c", "copy", out], check=True)
    os.remove(listfile)
    log(f"gabungan {len(clips)} scene -> {out}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder", help="nama folder di output/ (slug judul)")
    ap.add_argument("--scene", type=int)
    ap.add_argument("--scenes", help="rentang, mis. 2-6")
    ap.add_argument("--no-ai", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--skip-check", action="store_true")
    ap.add_argument("--render", action="store_true")
    ap.add_argument("--concat", action="store_true")
    a = ap.parse_args()
    if a.concat:
        concat(a.folder)
        return
    if a.scenes:
        lo, hi = [int(x) for x in a.scenes.split("-")]
        todo = list(range(lo, hi + 1))
    elif a.scene:
        todo = [a.scene]
    else:
        ap.error("pilih --scene N, --scenes A-B, atau --concat")
    for n in todo:
        build_scene(a.folder, n, not a.no_ai, a.force, a.skip_check)
        if a.render:
            render_scene(a.folder, n)


if __name__ == "__main__":
    main()
