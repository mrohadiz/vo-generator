"""
cleaner.py - Modul pembersih dan penormalisasi teks narasi untuk TTS.
Dioptimalkan untuk narasi bahasa Indonesia sebelum diproses oleh model TTS Kloning.
"""

import re
import unicodedata

# Pemetaan singkatan umum bahasa Indonesia ke bentuk lisan
ABBREVIATIONS = {
    r"\brp\.?\s*(\d+)": r"rupiah \1",
    r"(\d+)\s*\%": r"\1 persen",
    r"\bjt\b": "juta",
    r"\bmlyr\b": "miliar",
    r"\bbln\b": "bulan",
    r"\bthn\b": "tahun",
    r"\bdkk\.?": "dan kawan-kawan",
    r"\bdll\.?": "dan lain-lain",
    r"\bdsb\.?": "dan sebagainya",
    r"\byg\b": "yang",
    r"\bdgn\b": "dengan",
    r"\butk\b": "untuk",
    r"\bsbg\b": "sebagai",
    r"\bno\.?\s*(\d+)": r"nomor \1",
    r"\bkm/jam\b": "kilometer per jam",
    r"\bkm\b": "kilometer",
    r"\bkg\b": "kilogram",
    r"\bvs\.?\b": "versus",
}

# Regex pembersih
EMOJI_PATTERN = re.compile(
    r"[\U00010000-\U0010ffff]|[\u2600-\u27bf]|[\u2300-\u23ff]",
    flags=re.UNICODE
)
URL_PATTERN = re.compile(r"https?://\S+|www\.\S+")
MARKDOWN_PATTERN = re.compile(r"(\*\*|__|\*|_|`{1,3}|#{1,6}\s+|\[.*?\]\(.*?\))")


# --- Bahasa Inggris di tengah narasi Indonesia ---------------------------
# Ejaan lisan Indonesia untuk kata serapan/Inggris yang sering dibaca salah oleh
# model TTS Indonesia (dipakai Pocket-TTS, yang tidak bisa berbahasa Inggris).
LOANWORD_RESPELL = {
    "download": "daunlod", "upload": "aplod", "online": "onlain", "offline": "oflain",
    "website": "websait", "update": "apdet", "software": "sofwer", "hardware": "hardwer",
    "smartphone": "smartfon", "handphone": "henpon", "password": "paswerd",
    "username": "yusernem", "user": "yuser", "feedback": "fidbek", "deadline": "dedlain",
    "meeting": "miting", "budget": "bajet", "brand": "bren", "branding": "brending",
    "content": "konten", "creator": "krieter", "live": "laiv", "review": "riviu",
    "subscribe": "sabskraib", "share": "syer", "like": "laik", "startup": "startap",
    "founder": "faonder", "leader": "lider", "team": "tim", "training": "trening",
    "mindset": "maindset", "workshop": "werkshop", "love": "lav", "time": "taim",
    "email": "imel", "link": "link", "marketing": "markéting", "customer": "kastomer",
    "service": "servis", "support": "seporte", "growth": "growt", "hacker": "heker",
    "the": "de", "and": "en", "you": "yu", "your": "yor", "we": "wi", "with": "wit",
    "of": "ov", "to": "tu", "this": "dis", "that": "det", "my": "mai", "are": "ar",
}

# Kata fungsi Inggris yang hampir tidak pernah muncul dalam teks Indonesia.
ENGLISH_FUNCTION_WORDS = {
    "the", "and", "is", "are", "was", "were", "of", "to", "in", "on", "for", "with",
    "you", "your", "we", "our", "they", "this", "that", "it", "my", "be", "not", "but",
    "or", "as", "at", "by", "from", "have", "will", "can", "do", "does", "what", "how",
    "why", "when", "who", "which", "all", "just", "so", "if", "about", "get", "go",
    "make", "new", "more", "one", "out", "up", "their", "there", "here", "its",
}
ENGLISH_PATTERN = re.compile(r"(ck|ght|ough|wh)|(tion|ness|ment)$", re.IGNORECASE)
_TOKEN_RE = re.compile(r"\w+|[^\w\s]|\s+", re.UNICODE)


def is_english_word(word: str) -> bool:
    w = word.lower()
    if not w.isalpha() or not w.isascii() or len(w) < 2:
        return False
    if w.isupper() is False and word.isupper():
        return False
    return (
        w in ENGLISH_FUNCTION_WORDS
        or w in LOANWORD_RESPELL
        or bool(ENGLISH_PATTERN.search(w))
    )


def find_english_words(text: str) -> list[str]:
    """Daftar kata (unik, urutan muncul) yang terdeteksi berbahasa Inggris."""
    seen, out = set(), []
    for tok in re.findall(r"\w+", text):
        if is_english_word(tok) and tok.lower() not in seen:
            seen.add(tok.lower())
            out.append(tok)
    return out


def respell_loanwords(text: str) -> str:
    """Ganti kata Inggris yang ada di kamus dengan ejaan lisan Indonesia."""
    def sub(m):
        return LOANWORD_RESPELL.get(m.group(0).lower(), m.group(0))
    return re.sub(r"[A-Za-z]+", sub, text)


def split_language_spans(text: str) -> list[tuple[str, str]]:
    """
    Pecah teks menjadi potongan berurutan [(lang, teks)], lang 'en' atau 'id'.
    Tanda baca dan spasi mengikuti potongan yang sedang berjalan.
    """
    spans: list[list] = []
    for tok in _TOKEN_RE.findall(text):
        if tok.isspace() or not re.match(r"\w", tok):
            lang = spans[-1][0] if spans else "id"
        else:
            lang = "en" if is_english_word(tok) else "id"
        if spans and spans[-1][0] == lang:
            spans[-1][1] += tok
        else:
            spans.append([lang, tok])
    # Potongan tanpa huruf (hanya tanda baca) digabung ke tetangganya
    merged: list[list] = []
    for lang, t in spans:
        if merged and not re.search(r"[^\W\d_]", t):
            merged[-1][1] += t
        elif merged and merged[-1][0] == lang:
            merged[-1][1] += t
        else:
            merged.append([lang, t])
    return [(l, t.strip()) for l, t in merged if t.strip()]


# --- Hasil Jina Reader / artikel web (markdown) ------------------------------
_LINK_RE = re.compile(r"!?\[([^\]]*)\]\([^)]*\)")
_HEADING_RE = re.compile(r"^#{1,6}\s+(.*)$")


def looks_like_web_markdown(text: str) -> bool:
    """Deteksi keluaran r.jina.ai atau markdown halaman web (banyak tautan/gambar)."""
    if not text:
        return False
    head = text[:600]
    if "Markdown Content:" in head or re.match(r"\s*Title:.*\n+\s*URL Source:", head):
        return True
    return len(re.findall(r"\]\(https?://", text)) >= 8


def _is_boilerplate_para(p: str) -> bool:
    """Paragraf navigasi: berisi tautan dominan, daftar, atau hanya gambar."""
    if re.match(r"^\s*(?:[*+-]|\d+\.)\s", p):
        return True
    no_links = _LINK_RE.sub("", p).strip()
    n_links = len(_LINK_RE.findall(p))
    return n_links >= 1 and len(no_links) < 0.5 * len(p)


def _tidy_dialogue(p: str) -> str:
    p = _LINK_RE.sub(lambda m: m.group(1), p)               # [teks](url) -> teks
    p = re.sub(r"^\s*[—–-]+\s*", "", p)                      # tanda ucapan di awal
    p = re.sub(r"(:\s*)[_*]*\s*[—–]+\s*", r"\1", p)          # "Ratu: —ucapan" -> "Ratu: ucapan"
    return p.strip()


def extract_article(md: str) -> dict:
    """
    Ambil judul dan isi utama dari markdown halaman web (mis. keluaran r.jina.ai).
    Isi utama = rangkaian paragraf prosa berurutan terpanjang dalam satu seksi;
    menu, metadata, gambar, tautan, daftar, dan 'cerita lainnya' dibuang.
    """
    md = (md or "").replace("\r\n", "\n")
    title = ""
    m = re.search(r"^Title:\s*(.+)$", md, re.MULTILINE)
    if m:
        title = m.group(1).strip()
    if "Markdown Content:" in md:
        md = md.split("Markdown Content:", 1)[1]

    # Seksi dipisah oleh heading; H1 pertama (bila ada) dipakai sebagai judul
    h1_found = False
    sections: list[list[str]] = [[]]
    for line in md.split("\n"):
        h = _HEADING_RE.match(line)
        if h:
            if line.startswith("# ") and not h1_found:
                title = _LINK_RE.sub(lambda mm: mm.group(1), h.group(1)).strip()
                h1_found = True
            sections.append([])
        else:
            sections[-1].append(line)

    best, best_len = [], 0
    for sec in sections:
        paras = [p.strip() for p in re.split(r"\n\s*\n", "\n".join(sec)) if p.strip()]
        runs, cur = [], []
        for p in paras:
            if _is_boilerplate_para(p):
                runs.append(cur)
                cur = []
            elif re.fullmatch(r"(?:!\[[^\]]*\]\([^)]*\)\s*)+", p):
                continue                                    # gambar tidak memutus rangkaian
            else:
                cur.append(p)
        runs.append(cur)
        for run in runs:
            n = sum(len(x) for x in run)
            if n > best_len:
                best, best_len = run, n

    body = "\n\n".join(_tidy_dialogue(p) for p in best)
    title = re.sub(r"\s+[-|–]\s+[^-|–]{3,40}$", "", title).strip()   # buang akhiran nama situs
    return {"title": title, "text": body}


# --- Scene -----------------------------------------------------------------
SCENE_HEADER = re.compile(r"^\s*(?:scene|adegan|babak)\s*\d+\b.*$", re.IGNORECASE | re.MULTILINE)


# Garis pemisah: ---, ***, ___ atau "* * *" sendirian di satu baris
SCENE_BREAK = re.compile(r"^[ \t]*(?:-{3,}|\*{3,}|_{3,}|(?:\*[ \t]+){2,}\*)[ \t]*$", re.MULTILINE)


def split_scenes(text: str, group_words: int = 0) -> list[str]:
    """
    Pecah naskah menjadi scene. Pemisah: baris 'Scene N' / 'Adegan N' (barisnya
    dibuang), atau baris pemisah '---' / '***'; bila tidak ada, dipisah oleh baris kosong.
    """
    text = (text or "").replace("\r\n", "\n").strip()
    if not text:
        return []
    if SCENE_HEADER.search(text):
        parts = SCENE_HEADER.split(text)
    elif SCENE_BREAK.search(text):
        parts = SCENE_BREAK.split(text)
    else:
        parts = re.split(r"\n\s*\n", text)
        if group_words and group_words > 0:
            # Gabung paragraf berurutan sampai tiap scene >= group_words kata
            grouped, cur, n = [], [], 0
            for para in parts:
                if not re.search(r"\w", para):
                    continue
                cur.append(para.strip())
                n += len(para.split())
                if n >= group_words:
                    grouped.append("\n\n".join(cur))
                    cur, n = [], 0
            if cur:
                if grouped and n < group_words * 0.4:
                    grouped[-1] += "\n\n" + "\n\n".join(cur)
                else:
                    grouped.append("\n\n".join(cur))
            parts = grouped
    # Buang bagian tanpa huruf/angka (mis. sisa "***")
    return [p.strip() for p in parts if re.search(r"\w", p)]


# Penanda arahan di dalam teks:
#   jeda   : (Jeda 2 detik) / [jeda 1.5] / (jeda)
#   emosi  : [emosi sedih] / (emosi: takut)  - berlaku sampai penanda emosi berikutnya
EMOTIONS = ("netral", "senang", "sedih", "marah", "takut", "kaget", "berbisik", "tegas", "lembut",
            "licik", "menggoda")
DIRECTIVE_RE = re.compile(
    r"[\(\[]\s*(?:jeda\s*(?P<pause>\d+(?:[.,]\d+)?)?\s*(?:detik|dtk|s)?"
    r"|emosi\s*:?\s*(?P<emo>[A-Za-z]+))\s*[\)\]]",
    re.IGNORECASE,
)
DEFAULT_PAUSE = 1.0
MAX_PAUSE = 10.0


def _pause_seconds(raw) -> str:
    try:
        v = float(str(raw).replace(",", ".")) if raw else DEFAULT_PAUSE
    except ValueError:
        v = DEFAULT_PAUSE
    v = max(0.1, min(MAX_PAUSE, v))
    return f"{v:g}"


def norm_emotion(label) -> str:
    label = str(label or "").strip().lower()
    return label if label in EMOTIONS else "netral"


def _directive_token(m) -> str:
    if m.group("emo"):
        return f"[emosi {norm_emotion(m.group('emo'))}]"
    return f"[jeda {_pause_seconds(m.group('pause'))}]"


def split_directives(text: str) -> list[tuple[str, object]]:
    """Pecah teks menjadi urutan ('text', str) | ('pause', detik) | ('emotion', label)."""
    parts, last = [], 0
    for m in DIRECTIVE_RE.finditer(text):
        seg = text[last:m.start()].strip()
        if seg:
            parts.append(("text", seg))
        if m.group("emo"):
            parts.append(("emotion", norm_emotion(m.group("emo"))))
        else:
            parts.append(("pause", float(_pause_seconds(m.group("pause")))))
        last = m.end()
    tail = text[last:].strip()
    if tail:
        parts.append(("text", tail))
    return parts


def split_pauses(text: str) -> list[tuple[str, object]]:
    """Seperti split_directives tetapi penanda emosi diabaikan."""
    return [p for p in split_directives(text) if p[0] != "emotion"]


def strip_directives(text: str) -> str:
    return DIRECTIVE_RE.sub(" ", text)


def clean_text(text: str) -> str:
    """
    Membersihkan teks dari elemen non-lisan:
    - Normalisasi unicode (smart quotes, dash)
    - Hapus URL, emoji, formatting markdown
    - Normalisasi tanda baca ganda (misal '???', '!!!', '....')
    - Ekspansi simbol & singkatan umum
    - Rapikan spasi & enter
    """
    if not text:
        return ""

    # 0a. Baris yang hanya berisi "..." / "…" = jeda dramatis, bukan teks untuk dibaca
    text = re.sub(r"(?m)^[ \t]*(?:\.{3,}|…+)[ \t]*$", "(jeda 0.8)", text)

    # 0. Penanda [jeda N] / [emosi X] -> baris sendiri (bukan dibaca sebagai kata)
    if DIRECTIVE_RE.search(text):
        out, last = [], 0
        for m in DIRECTIVE_RE.finditer(text):
            out.append(clean_text(text[last:m.start()]))
            out.append(_directive_token(m))
            last = m.end()
        out.append(clean_text(text[last:]))
        return "\n".join(x for x in out if x)

    # 1. Normalisasi unicode bentuk NFKC
    text = unicodedata.normalize("NFKC", text)

    # 2. Ganti smart quotes, backticks, dan em-dash
    text = text.replace("“", '"').replace("”", '"')
    text = text.replace("‘", "'").replace("’", "'")
    text = text.replace("—", " - ").replace("–", " - ")

    # 3. Hapus URL dan link
    text = URL_PATTERN.sub("", text)

    # 4. Hapus format Markdown
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)  # ambil teks link
    text = MARKDOWN_PATTERN.sub("", text)

    # 5. Hapus Emoji
    text = EMOJI_PATTERN.sub("", text)

    # 6. Normalisasi singkatan & simbol penting sebelum filter karakter
    text = text.replace("&", " dan ")
    text = text.replace("@", " di ")
    text = text.replace("$", " dolar ")
    text = text.replace("/", " atau ")

    # 7. Hapus karakter kontrol aneh kecuali huruf, angka, spasi, dan tanda baca umum
    text = re.sub(r"[^\w\s.,!?:;\-\'\"%]", " ", text)

    # 8. Normalisasi singkatan kata
    for pattern, repl in ABBREVIATIONS.items():
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)

    # 8. Normalisasi tanda baca berulang (mis. !!! -> ! atau ... -> ...)
    text = re.sub(r"\!{2,}", "!", text)
    text = re.sub(r"\?{2,}", "?", text)
    text = re.sub(r"\.{4,}", "...", text)
    text = re.sub(r"-{2,}", "-", text)

    # 9. Rapikan spasi sebelum tanda baca
    text = re.sub(r"[ \t]+([.,!?:;])", r"\1", text)

    # 10. Rapikan multiple whitespace & newline
    # Satu baris kosong dipertahankan sebagai batas paragraf (dipakai pemetaan jeda & ekspresi)
    out_lines: list[str] = []
    for line in (re.sub(r"[ \t]+", " ", ln).strip() for ln in text.splitlines()):
        if line:
            out_lines.append(line)
        elif out_lines and out_lines[-1] != "":
            out_lines.append("")
    text = "\n".join(out_lines)

    return text.strip()


def split_into_segments(text: str, max_chars: int = 90) -> list[str]:
    """
    Memecah teks panjang menjadi segmen klausa/kalimat pendek (ideal: 40-90 karakter).
    Pocket-TTS sangat rentan looping/gagap jika 1 segmen melebihi 100 karakter
    atau mengandung klausa bertumpuk.
    """
    if not text:
        return []

    # 1. Pecah dulu per baris, lalu berdasarkan tanda baca akhir kalimat (. ! ? ;).
    #    Baris baru selalu batas segmen: satu segmen tak boleh memuat baris baru.
    raw_sentences = []
    for line in text.split("\n"):
        raw_sentences += re.split(r"(?<=[.!?;])\s+", line)
    segments = []

    for sentence in raw_sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        # Jika kalimat sudah cukup pendek, masukkan langsung
        if len(sentence) <= max_chars:
            segments.append(sentence)
            continue

        # Jika kalimat panjang (> max_chars), pecah lebih lanjut di koma / strip
        clauses = re.split(r"(?<=[,-])\s+", sentence)
        current_chunk = ""

        for clause in clauses:
            clause = clause.strip()
            if not clause:
                continue

            if not current_chunk:
                current_chunk = clause
            elif len(current_chunk) + len(clause) + 1 <= max_chars:
                current_chunk += " " + clause
            else:
                segments.append(current_chunk)
                current_chunk = clause

        if current_chunk:
            segments.append(current_chunk)

    return _hard_wrap(_merge_short_segments(segments, max_chars), max_chars + 30)


def _hard_wrap(segments: list[str], limit: int) -> list[str]:
    """Pastikan tak ada segmen melebihi limit: pecah di spasi terdekat dari tengah."""
    out = []
    for seg in segments:
        while len(seg) > limit:
            cut = seg.rfind(" ", 0, limit)
            if cut < limit // 2:
                cut = seg.find(" ", limit // 2)
            if cut <= 0:
                break
            out.append(seg[:cut].strip())
            seg = seg[cut:].strip()
        if seg:
            out.append(seg)
    return out


def _merge_short_segments(segments: list[str], max_chars: int, min_chars: int = 28) -> list[str]:
    """
    Segmen yang terlalu pendek ("Namun...", "Buah itu aku.") membuat Pocket-TTS
    mengigau/berdurasi aneh, jadi digabung ke segmen sebelah selama masih muat.
    """
    limit = max_chars + 30
    merged: list[str] = []
    carry = ""
    for seg in segments:
        seg = (carry + " " + seg).strip() if carry else seg
        carry = ""
        if len(seg) < min_chars:
            carry = seg
            continue
        merged.append(seg)
    if carry:
        if merged and len(merged[-1]) + len(carry) + 1 <= limit:
            merged[-1] += " " + carry
        else:
            merged.append(carry)
    return merged


def analyze_text(raw_text: str) -> dict:
    """
    Menganalisis teks: pembersihan, segmentasi, dan statistik durasi.
    """
    cleaned = clean_text(raw_text)
    words = strip_directives(cleaned).split()
    word_count = len(words)
    char_count = len(cleaned)

    # Rata-rata tempo bicara narasi Indonesia: ~130 - 150 kata per menit (WPM)
    # 140 WPM = ~2.33 kata per detik
    est_seconds = round((word_count / 140) * 60) if word_count > 0 else 0
    est_minutes = est_seconds // 60
    est_rem_seconds = est_seconds % 60

    if est_minutes > 0:
        durasi_str = f"± {est_minutes}m {est_rem_seconds}s"
    else:
        durasi_str = f"± {est_seconds}s"

    segments = split_into_segments(cleaned)

    # Deteksi isu potensial
    warnings = []
    if not cleaned:
        warnings.append("Teks kosong setelah dibersihkan.")
    if any(len(s) > 300 for s in segments):
        warnings.append("Ada kalimat yang sangat panjang tanpa tanda baca titik, disarankan beri tanda titik.")
    if re.search(r"\d{5,}", cleaned):
        warnings.append("Ada deretan angka panjang (>4 digit), pastikan sudah sesuai lisan.")

    english = find_english_words(cleaned)
    if english:
        warnings.append(
            "Terdeteksi kata Inggris: " + ", ".join(english[:15])
            + ". Supertonic membacanya dengan aksen Inggris; Pocket-TTS memakai ejaan lisan "
            "(kamus terbatas). Untuk hasil terbaik di Pocket-TTS, tulis ulang ejaan lisannya."
        )

    return {
        "english_words": english,
        "raw_text": raw_text,
        "cleaned_text": cleaned,
        "word_count": word_count,
        "char_count": char_count,
        "estimated_duration": durasi_str,
        "estimated_seconds": est_seconds,
        "segment_count": len(segments),
        "segments": segments,
        "warnings": warnings,
    }
