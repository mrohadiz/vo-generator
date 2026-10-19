# Studio Narasi TTS Indonesia

Aplikasi web lokal untuk membuat audio narasi bahasa Indonesia dari naskah teks.
Alurnya: tempel naskah → rapikan/bersihkan → pilih engine & suara → generate audio.
Mendukung mode **tanpa scene** (satu audio) dan **dengan scene** (satu audio per scene,
disimpan dalam satu folder bernama sesuai judul).

Berjalan sepenuhnya di CPU lokal. Tidak ada data naskah yang dikirim ke layanan luar
(model diunduh sekali dari Hugging Face, lalu dipakai dari cache).

## Engine

| Engine | Cocok untuk | Kecepatan (CPU) | Catatan |
|---|---|---|---|
| **Supertonic** | Naskah panjang, banyak scene, campuran Indonesia–Inggris | ±1× durasi audio | Preset suara M1–M5 dan F1–F5, 44,1 kHz. Kata Inggris dibaca dengan model bahasa Inggris |
| **Pocket-TTS** | Kloning suara dari sampel di `suara-kloning/` | ±3–4× durasi audio | 24 kHz, hanya Indonesia. Kata Inggris diganti ejaan lisan |
| **Gemini TTS** (cloud) | Narasi storyteller akurat dan ekspresif, banyak suara | ±0,4× durasi audio (tergantung batas laju) | `gemini-3.8-flash-tts` lewat API Gemini (kunci `GEMINI_KEY`). Teks dikirim ke Google. Batas ±4 panggilan/menit, otomatis diatur dan dicoba ulang |
| **Gemini TTS via OmniRoute** (cloud) | Gemini yang sama lewat gateway: cepat, tanpa batas beruntun | ±0,3× durasi audio | Hanya suara yang terkendali; gaya bacaan nyaris tidak berpengaruh |

Angka kecepatan adalah hasil ukur kasar di mesin pengembangan, bukan jaminan.

## Menjalankan

```bash
# sekali saja
python3 -m venv .venv
.venv/bin/pip install flask soundfile numpy pocket-tts supertonic

./run.sh                 # http://127.0.0.1:5000
PORT=5055 ./run.sh       # port lain
```

Pada start pertama Supertonic dan Pocket-TTS dimuat di latar belakang (indikator hijau di
pojok kanan atas). Pocket-TTS membutuhkan ±3 GB untuk model dan internet pada unduhan pertama.

Untuk Pocket-TTS, **sampel referensi sebaiknya ±10–15 detik** satu penutur, bersih, tanpa musik. Sampel yang lebih panjang
dipotong otomatis menjadi 12 detik paling "bersuara" (salinan di `suara-kloning/_cache/`, berkas asli tidak diubah; atur lewat
`POCKET_REF_SECONDS`). Referensi panjang merusak hasil: ±60 detik membuat Pocket-TTS tak pernah berhenti bicara (audio berujung
ocehan) dan memuat sampel sangat lambat; 20 detik pun masih menurunkan keterbacaan. Diukur dengan Whisper pada teks yang sama,
`ayu_muntar` memberi WER 28,6% (20 detik) vs 2–8% (12 detik). `POCKET_EOS_THRESHOLD` default -6,0 (anjuran kartu model).
Tanda kutip dibuang dan jeda antar segmen disesuaikan tanda baca untuk Pocket-TTS. Taruh sampel suara (`.wav`, `.mp3`, `.ogg`, `.flac`) di `suara-kloning/`.
Nama file menjadi nama suara di pilihan.

## Cara pakai

1. Isi **Judul Narasi**. Judul menjadi nama folder hasil, mis. `Kota Rawa` → `output/kota-rawa/`.
2. Pilih mode:
   - **Tanpa Scene**: tempel naskah → *Cek & Bersihkan Teks* → pilih engine/suara → *Generate*.
   - **Dengan Scene**: tempel semua scene → *Rapikan / Bersihkan Scene* → edit per scene bila perlu → *Generate*.
3. Hasil mode scene: `output/<judul>/scene_01.wav`, `scene_02.wav`, … plus `info.json`. Ada tombol ZIP.

Estimasi waktu proses tampil di bawah tombol Generate. Rasionya belajar dari hasil generate
sebelumnya dan disimpan di `localStorage` browser.

### Mode Teater (multi-tokoh)

Untuk dongeng/cerita dengan banyak pemeran: tempel cerita (boleh hasil Jina) → **Analisis Cerita** →
atur suara tiap tokoh → Generate. Hasil per scene ada di `output/<judul>/`.

- **Pemetaan**: AI membagi cerita menjadi scene, tokoh, dan baris ucapan (narasi → *Narator*).
  Urutan penyedia: model OmniRoute, lalu Gemini, lalu **aturan generik** (baris `Nama: ucapan`
  = tokoh, selain itu Narator) bila AI gagal atau hasilnya mengubah naskah (kesetiaan kata < 85%).
- **Suara**: tiap tokoh dapat suara Supertonic berbeda (M1–M5, F1–F5) plus geser nada dan kecepatan.
  Supertonic tidak punya suara anak, jadi tokoh anak = suara wanita + nada naik (sox). Tombol ▶ Coba
  memutar contoh suara per tokoh. Baris bisa dikoreksi (pembicara dan teks) sebelum generate.
- **Gemini TTS**: pilih mesin "Gemini TTS" lalu suara. Suara favorit **Zubenelgenubi** (default), pilihan lain Zali, Riko, Sami,
  Enzo, Achird, Kore, Puck, Charon, Aoede (semua sudah diuji valid). Kolom *Gaya bacaan* (Inggris, mis. "Rich, unhurried
  storytelling narration in Indonesian") dikirim sebagai `speechMetadata.style`; penanda `[emosi X]` menambah arahan
  gaya otomatis; `[jeda N]` menjadi hening. Tag `<short pause>` tidak dibaca keras tetapi belum terbukti menambah jeda.
  Opsional di `.env`: `GEMINI_TTS_MODEL`, `GEMINI_TTS_RPM` (default 4), `GEMINI_TTS_TEMPERATURE` (default 0,8).
  Jalur: Gemini langsung dulu (gaya bacaan benar-benar bekerja; batas laju diatur otomatis), lalu OmniRoute (`google/gemini-3.8-flash-tts`)
  sebagai cadangan: cepat dan tanpa batas beruntun, tetapi `instructions` nyaris tidak memengaruhi gaya dan tempo. Urutan bisa diubah
  dengan `GEMINI_TTS_ROUTE=omniroute,direct` di `.env`. Di mode teater
  Narator otomatis memakai Gemini bila `GEMINI_KEY` ada; tiap tokoh bisa diganti mesin dan suaranya.
- **Konfigurasi AI** di `.env` (hanya `OMNIROUTE_*` dan `GEMINI_*` yang dibaca):
  `OMNIROUTE_KEY`, `OMNIROUTE_ENDPOINT` (ejaan `OMNIROUTE_ENPOINT` juga diterima), opsional
  `OMNIROUTE_PRIMARY_MODEL` (default **`agy/gemini-3.8-flash-tiered`**, model utama untuk semua alur AI: stabil,
  mendukung gambar dan pemanggilan alat; ia "berpikir" dulu, jadi `max_tokens` jangan terlalu kecil) dan
  `OMNIROUTE_MODELS` (cadangan dipisah koma, default `auto/best-chat,auto/fast,auto/chat`),
  `GEMINI_KEY`, opsional `GEMINI_MODELS` (default `gemini-flash-latest,gemini-2.5-flash`).
  Teks cerita dikirim ke layanan itu saat Analisis Cerita dengan AI aktif.
- **Drama 3 (opsional, cloud)**: per tokoh bisa dipilih mesin *Drama 3* alih-alih Supertonic, terutama untuk
  suara anak/tokoh khusus. Suara dibuat dari deskripsi bahasa Inggris (mode *Design*), disimpan lewat
  `keep_voice`, lalu baris berikutnya memakai mode *Clone* dengan slot itu. Label emosi dari AI dikirim sebagai
  arahan akting. Bila Drama 3 gagal (kuota, jaringan), baris itu otomatis dibacakan Supertonic dan muncul
  peringatan. Tokoh anak otomatis memakai Drama 3 bila `HF_TOKEN` terisi.
  - Konfigurasi `.env`: `HF_TOKEN` (token fine-grained, hanya baca), opsional `DRAMA3_URL`
    (default `https://rohadiz-drama-3.hf.space/`). Kuota GPU dihitung dari akun pemilik token.
  - Slot suara hidup di sesi Space dan hilang bila aplikasi/Space restart. Selesaikan satu cerita dalam satu
    sesi agar suara tokoh tetap sama.
  - Teks baris Drama 3 dikirim ke Space di Hugging Face. Tag ekspresi seperti `[sighs]` belum didukung
    (pembersih teks membuang tanda kurung siku).
- **Emosi** dari AI dipakai Drama 3 saja; Supertonic tidak punya kontrol emosi.

### Format naskah

- **Pemisah scene**: baris `Scene 1` / `Adegan 2` / `Babak 3`, atau baris `---` / `***` / `___`.
  Tanpa pemisah, naskah dipecah per baris kosong (satu paragraf = satu scene).
- **Jeda**: tulis `(Jeda 2 detik)`, `[jeda 1.5]`, atau `(jeda)` (default 1 detik, maks 10).
  Jeda dibuat sebagai hening, tidak dibaca.
- **Emosi**: `[emosi sedih]` (juga `(emosi: takut)`) berlaku sampai penanda emosi berikutnya. Pilihan: netral, senang,
  sedih, marah, takut, kaget, berbisik, tegas, lembut, licik, menggoda. Di Supertonic emosi hanya mengatur tempo baca
  (sedih/berbisik lebih pelan, takut/senang lebih cepat); di Drama 3 menjadi arahan akting; Pocket-TTS
  mengabaikannya (jeda tetap dipakai).
- **Petakan Ekspresi & Jeda**: tombol 🎭 di mode Tanpa Scene dan Dengan Scene menyisipkan `[emosi ...]` dan `[jeda ...]`
  otomatis (AI, cadangan aturan tanda baca/kata kunci) ke teks yang bisa diedit. Di mode Teater, emosi dan jeda ada
  per baris (kolom emosi dan jeda).
- Tulis angka dengan huruf ("seratus dua puluh"), pakai tanda baca teratur, dan kalimat
  pendek–sedang. Pocket-TTS bisa mengigau pada segmen terlalu pendek atau kalimat berbelit.

### Bahasa Inggris di tengah narasi

Kata Inggris terdeteksi lewat heuristik sederhana (daftar kata fungsi, kamus serapan, pola huruf)
dan tampil sebagai peringatan. Supertonic membacanya dengan model bahasa Inggris. Pocket-TTS
memakai ejaan lisan dari `LOANWORD_RESPELL` di `cleaner.py` (kamus terbatas, mudah ditambah).
Deteksi bisa meleset; untuk naskah dengan banyak istilah Inggris pakai Supertonic.

## Struktur proyek

```
app.py               Flask: routes, pemuatan engine, sintesis, ZIP, riwayat
gemini_tts.py        Mesin Gemini TTS: suara, gaya dari emosi, pembatas laju, cadangan OmniRoute
drama3.py            Penyedia suara Drama 3 (Space Hugging Face): cast, keep_voice, clone, unduh HLS
director.py          Mode teater: pemetaan cerita (AI + aturan generik), penetapan suara
cleaner.py           Pembersihan teks, segmentasi, jeda, scene, deteksi/ejaan kata Inggris
templates/index.html UI (satu file, JS vanilla)
run.sh               Peluncur
suara-kloning/       Sampel suara untuk Pocket-TTS
output/              Hasil audio (folder per judul)
download_broll.py    Skrip unduh B-roll lama (lihat docs/PLAN-video.md, akan diganti)
tts-kloning.py       Servis TTS kloning mandiri (versi awal)
bench_*.py           Skrip benchmark engine
```

## API

| Route | Fungsi |
|---|---|
| `GET /api/status` | Status kesiapan tiap engine (`ready`, `loading`, `error`) |
| `GET /api/options` | Daftar engine dan suara |
| `GET /api/sample/<voice_id>` | Putar sampel suara Pocket-TTS |
| `POST /api/clean` | `{text}` → teks bersih, statistik, segmen, peringatan |
| `POST /api/clean_scenes` | `{text}` → daftar scene yang sudah dibersihkan |
| `POST /api/annotate` | `{texts[], use_ai}` → teks berpenanda `[emosi]`/`[jeda]` per teks |
| `POST /api/direct` | `{text, use_ai}` → scene, tokoh, baris, usulan suara |
| `POST /api/synthesize` | `{engine, text, voice, speed, title, scene?}` → WAV. Dengan `scene` masuk ke `output/<slug>/scene_NN.wav` |
| `GET /api/zip/<folder>` | ZIP seluruh scene dalam folder |
| `GET /api/history` | Audio terbaru dan folder scene |
| `GET /output/<path>` | Berkas hasil |

## Pemecahan masalah

- **"Gagal memuat Pocket-TTS"**: lihat teks lengkap setelah pesan itu di terminal `run.sh` atau di
  `/api/status` (field `error`). Status engine dicatat sekali saat start, jadi restart server
  setelah memperbaiki penyebabnya.
- **Pocket-TTS suara ngaco/berulang**: biasanya segmen terlalu pendek atau kalimat terlalu panjang.
  Tambah tanda baca atau pecah kalimat.
- **Sintesis sangat lama**: normal untuk Pocket-TTS di CPU. Pakai Supertonic untuk naskah panjang.
