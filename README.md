# Studio Narasi TTS Indonesia

Aplikasi web lokal untuk mengubah naskah teks menjadi audio narasi bahasa Indonesia, dari satu paragraf sampai
dongeng bertokoh banyak. Alurnya: tempel naskah (atau ambil dari URL) → rapikan → atur ekspresi dan jeda → pilih
mesin dan suara → generate. Hasil disimpan dalam folder bernama sesuai judul.

> **Privasi.** Supertonic dan Pocket-TTS berjalan sepenuhnya di komputer ini. Mesin cloud (Gemini TTS, Drama 3) dan
> semua fitur AI (Analisis Cerita, Petakan Ekspresi, ambil dari URL) **mengirim teks ke layanan luar**. Lihat
> [Privasi dan keamanan](#privasi-dan-keamanan).

## Fitur

- **Tiga mode**: tanpa scene (satu audio), dengan scene (satu audio per scene), dan **teater** (banyak tokoh, tiap tokoh
  punya suara sendiri).
- **Empat mesin suara**: Supertonic (lokal, cepat), Pocket-TTS (lokal, kloning suara), Gemini TTS (cloud, ekspresif,
  langsung atau lewat OmniRoute), dan Drama 3 (cloud, per tokoh).
- **Pembersih teks**: markdown, emoji, singkatan, kata Inggris, penanda `[jeda N]` dan `[emosi X]`, hasil Jina Reader.
- **Pemetaan AI** untuk scene, tokoh, emosi, dan jeda, dengan cadangan aturan generik bila AI tidak tersedia.
- **Estimasi waktu proses** yang belajar dari hasil sebelumnya, hot reload saat pengembangan, dan unduh ZIP per folder.
- **Proyek video** (`videos/`): narasi menjadi video 9:16 dengan B-roll dan caption kata demi kata (HyperFrames).

## Instalasi

Kebutuhan sistem: Python 3.12, `ffmpeg`, `sox` (geser nada suara anak, dekode audio), dan **Node.js 20+** dengan
`pnpm` untuk membangun frontend.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env        # lalu isi sesuai kebutuhan; .env tidak ikut git

# Frontend React (FieldNote UI) — cukup sekali, run.sh juga membangunnya otomatis bila belum ada
cd frontend
corepack enable pnpm
pnpm install
pnpm run build:vendor       # bangun paket desain @fieldnote-ui/*
pnpm run build              # hasil -> ../static/app
cd ..
```

Hanya `flask`, `numpy`, `soundfile`, dan `supertonic` yang wajib untuk memakai Supertonic. `pocket-tts` perlu ±3 GB
untuk model dan internet pada unduhan pertama. `gradio_client` hanya untuk Drama 3.

Frontend memakai **FieldNote UI** (`rohadi-themes`): token warna `--fn-*`, tipografi editorial (Source Serif 4 +
Inter + JetBrains Mono), dan komponen React. Paket desainnya di-*vendor* di `frontend/vendor/` (MIT) agar build
tidak bergantung pada npm publik.

## Menjalankan

```bash
./run.sh                    # http://127.0.0.1:5055, hot reload aktif
./run.sh --no-reload        # tanpa hot reload (disarankan untuk naskah panjang)
./run.sh --build            # paksa bangun ulang frontend
PORT=6066 ./run.sh          # port lain (default 5055)
```

- **Frontend**: Flask menyajikan hasil build React dari `static/app/`. Bila folder itu belum ada, `run.sh`
  menjalankan `pnpm install` + build lebih dulu.
- **Pengembangan UI**: jalankan backend (`./run.sh --no-reload`) lalu `cd frontend && pnpm dev`. Vite di port 5173
  meneruskan `/api` dan `/output` ke backend, dengan hot reload React.
- **Hot reload Python**: perubahan `app.py`/`*.py` memicu restart (±8 detik, termasuk memuat model). `output/`,
  `videos/`, `suara-kloning/`, `static/`, dan `.venv/` tidak memicu restart.
- **Antrian**: job disimpan di memori dan dicadangkan ke `queue_state.json` setiap kali statusnya berubah. Saat
  server dinyalakan ulang, job yang masih menunggu dimasukkan lagi ke antrian, dan job yang terputus di tengah
  (termasuk karena hot reload) diulang dari awal. Satu pekerja memproses satu job pada satu waktu.
- Supertonic dan Pocket-TTS dimuat di latar belakang saat start (status di kepala halaman).
- Server mendengarkan di semua antarmuka (`0.0.0.0`), sehingga bisa diakses lewat Tailscale/LAN.

## Konfigurasi `.env`

Hanya variabel di bawah ini yang dibaca aplikasi; variabel lain di `.env` tidak disentuh.

| Variabel | Fungsi |
|---|---|
| `OMNIROUTE_KEY`, `OMNIROUTE_ENDPOINT` | Gateway AI kompatibel OpenAI (ejaan `OMNIROUTE_ENPOINT` juga diterima) |
| `OMNIROUTE_PRIMARY_MODEL` | Model utama semua alur AI. Default `agy/gemini-3.8-flash-tiered` (stabil, mendukung gambar dan alat) |
| `OMNIROUTE_MODELS` | Cadangan dipisah koma. Default `auto/best-chat,auto/fast,auto/chat` |
| `GEMINI_KEY` | Cadangan AI langsung dan mesin Gemini TTS |
| `GEMINI_MODELS` | Model teks Gemini cadangan. Default `gemini-flash-latest,gemini-2.5-flash` |
| `GEMINI_TTS_MODEL`, `GEMINI_TTS_RPM`, `GEMINI_TTS_TEMPERATURE`, `GEMINI_TTS_ROUTE` | Pengaturan Gemini TTS: model (`gemini-3.8-flash-tts`), batas panggilan/menit (4), temperature (0,8), urutan jalur (`direct,omniroute`) |
| `HF_TOKEN`, `DRAMA3_URL` | Drama 3 di Space Hugging Face milik sendiri |
| `POCKET_REF_SECONDS`, `POCKET_EOS_THRESHOLD` | Pocket-TTS: panjang referensi (12) dan eos-threshold (-6,0) |
| `PIXABAY_API` | Pencarian B-roll untuk proyek video |

Urutan penyedia AI: model utama OmniRoute → cadangan OmniRoute → Gemini langsung → **aturan generik tanpa AI**.
Hasil AI ditolak (pindah ke berikutnya) bila mengubah atau menghilangkan naskah (kesetiaan kata di bawah ambang).

## Mesin suara

| Mesin | Cocok untuk | Kecepatan (kasar) | Catatan |
|---|---|---|---|
| **Supertonic** | Naskah panjang, banyak scene, campuran Indonesia–Inggris | ±0,5–1× durasi audio | Lokal. Suara M1–M5, F1–F5, 44,1 kHz; bisa menambah suara kloning lewat JSON |
| **Pocket-TTS** | Meniru suara dari sampel | ±3–4× | Lokal. 24 kHz, hanya Indonesia, rawan mengigau bila sampel atau teks buruk |
| **Gemini TTS** | Narasi storyteller, ekspresi | ±0,4× | Cloud. `gemini-3.8-flash-tts` lewat API Gemini; gaya bacaan bekerja; batas ±4 panggilan/menit |
| **Gemini via OmniRoute** | Kecepatan, naskah panjang | ±0,3× | Cloud. Suara sama, tanpa batas beruntun, tetapi gaya bacaan nyaris tidak berpengaruh |
| **Drama 3** | Tokoh ekspresif, suara anak (mode teater) | ±8–25 detik/panggilan | Cloud (Space ZeroGPU sendiri). Kuota akun gratis kecil |

Kecepatan adalah ukuran kasar di mesin pengembangan, bukan jaminan.

### Supertonic
Emosi hanya mengatur **tempo baca** (sedih/berbisik lebih pelan, takut/senang lebih cepat) dan jeda; model terbuka ini tidak
punya kontrol emosi, dan tag ekspresi `<laugh>`/`<sigh>` terbaca sebagai kata (sudah diuji). Kata Inggris dibaca dengan
model bahasa Inggris.

**Suara kloning (eksperimental).** Bobot terbuka Supertonic tidak punya *speaker encoder*, tetapi ada pipeline komunitas
yang membalik rekaman referensi menjadi berkas gaya suara JSON:
[`Mimocro/supertonic-voice-cloning`](https://github.com/Mimocro/supertonic-voice-cloning). Pipeline itu butuh **GPU
NVIDIA ≥ 6 GB VRAM** (CUDA; CPU tidak didukung), jadi jalankan di mesin lain, Colab, atau RunPod — bukan di server ini
(tanpa GPU). Setelah JSON-nya jadi:

1. Salin berkas hasil (mis. `cloned_voice.10000.json`) ke `voices/supertonic/nama_suara.json`.
2. Muat ulang halaman Studio; suara muncul di dropdown Supertonic sebagai **“nama suara (kloning)”**.
3. Berkas JSON yang bukan gaya Supertonic 3 (dimensi `style_ttl` 1×50×256 dan `style_dp` 1×8×16) dilewati dengan
   peringatan di log.

Hasil kloning sangat bergantung pada sampel: satu penutur, bersih tanpa musik, 10–30 detik. Berkas JSON ±290 KB dan
tidak ikut git (`voices/supertonic/*.json` diabaikan); simpan cadangannya sendiri. Suara kloning tidak dimasukkan ke
rekomendasi AI karena karakter timbrenya tidak bisa dinilai dari teks — pilih manual di dropdown.

### Pocket-TTS
- Taruh sampel (`.wav`, `.mp3`, `.ogg`, `.flac`) di `suara-kloning/`; nama berkas menjadi nama suara.
- **Sampel ideal ±10–15 detik**, satu penutur, bersih, tanpa musik. Sampel lebih panjang dipotong otomatis menjadi 12
  detik paling "bersuara" (salinan di `suara-kloning/_cache/`, berkas asli tidak diubah). Referensi panjang merusak hasil:
  ±60 detik membuat model tak pernah berhenti bicara; 20 detik pun menurunkan keterbacaan (diukur Whisper pada teks
  yang sama: WER 28,6% pada 20 detik vs 2–8% pada 12 detik).
- Kata Inggris diganti ejaan lisan (`LOANWORD_RESPELL` di `cleaner.py`, kamus terbatas), tanda kutip dibuang, jeda antar
  segmen mengikuti tanda baca.

### Gemini TTS
- Suara favorit **Zubenelgenubi** (default); lainnya Zali, Riko, Sami, Enzo, Achird, Kore, Puck, Charon, Aoede (semua
  sudah diuji valid). Tambah suara baru dengan menaruh nama persisnya di `VOICES` pada `gemini_tts.py`.
- Kolom **Gaya bacaan** (Inggris, mis. "Rich, unhurried storytelling narration in Indonesian") dikirim sebagai
  `speechMetadata.style`; `[emosi X]` menambah arahan gaya otomatis; `[jeda N]` menjadi hening.
- Batas laju kunci langsung ±4 panggilan/menit ditangani otomatis (naskah dipecah ±500 karakter, percobaan ulang).
  Bila jalur langsung gagal, dicoba lewat OmniRoute.

### Drama 3
Per tokoh di mode teater. Suara dibuat dari deskripsi bahasa Inggris (mode *Design*), disimpan lewat `keep_voice`, lalu
baris berikutnya memakai mode *Clone*. Slot suara hidup di sesi Space dan **hilang bila aplikasi atau Space restart**;
selesaikan satu cerita dalam satu sesi. Bila gagal, baris otomatis dibacakan Supertonic dengan peringatan.

## Cara pakai

1. Isi **Judul Narasi**; judul menjadi nama folder hasil (`Kota Rawa` → `output/kota-rawa/`).
2. Atau isi **URL** lalu klik *Ambil* untuk mengambil isi artikel/cerita (lewat Jina Reader; navigasi dan iklan dibuang). Hasil
   Jina yang ditempel langsung ke kotak naskah juga dikenali otomatis.
3. Pilih mode:
   - **Tanpa Scene**: *Cek & Bersihkan Teks* → (opsional) *Petakan Ekspresi & Jeda* → mesin dan suara → *Tambah ke
     antrian* (atau *Generate langsung*).
   - **Dengan Scene**: tempel semua scene → *Rapikan / Bersihkan Scene* → edit per scene → *Generate*. Slider "gabung
     paragraf jadi scene" berlaku bila naskah tanpa pemisah scene.
   - **Teater**: tempel cerita → *Analisis Cerita* → atur penyedia, suara, nada, dan kecepatan tiap tokoh (*Coba suara*
     untuk mendengar) → koreksi baris dan emosi/jeda per baris → *Generate*. **Narator otomatis memakai Gemini** bila
     `GEMINI_KEY` ada; tokoh anak memakai Drama 3 bila `HF_TOKEN` ada.
4. Hasil per scene: `output/<judul>/scene_01.wav`, `scene_02.wav`, … plus `info.json` (naskah, tokoh, baris). Ada tombol ZIP.
5. **Antrian**: setiap klik *Tambah ke antrian* membuat satu job (mode scene/teater: satu job per scene). Panel
   *Antrian generate* memperbarui status tiap 3 detik: Menunggu → Diproses → Selesai/Gagal. Job yang masih menunggu
   bisa dibatalkan; hasil yang selesai bisa langsung diputar, diunduh, atau dibuka di tab terpisah. Satu pekerja
   memproses satu job pada satu waktu, jadi aman untuk menyiapkan banyak naskah sekaligus. Tombol *Hapus* pada
   baris selesai hanya membuang catatan job (berkas tetap ada).
   - **Estimasi**: job yang menunggu menampilkan perkiraan waktu proses dan durasi audio; job yang berjalan
     menampilkan bilah kemajuan, sisa waktu, dan persentase. Angka ini dihitung dari jumlah kata × detik-per-kata
     mesin, lalu **diperbarui otomatis dari hasil nyata** tiap job selesai (disimpan di `queue_state.json`), jadi
     makin sering dipakai makin akurat. Bilah kemajuan berhenti di 97% sampai job benar-benar selesai.
6. **Coba suara**: panel kanan punya tombol *Coba suara <nama>* untuk mendengarkan contoh tiap suara sebelum
   men-generate. Pocket-TTS memakai berkas referensi; Supertonic dan Gemini disintesis sekali lalu di-cache di
   `output/_voice_samples/` (*Buat ulang* untuk menyegarkan).
7. **Rekomendasi suara**: setelah teks dibersihkan, klik *Minta rekomendasi* di kartu *Rekomendasi suara*. AI membaca
   naskah lalu menyarankan satu suara utama beserta kecepatan, gaya bacaan (Gemini), emosi dominan, alasan, dan dua
   alternatif. Tombol *Pakai suara ini* langsung mengganti mesin/suara/kecepatan/gaya. Bila AI tidak tersedia, dipakai
   aturan kata kunci (genre, suasana, panjang dialog) dan kartu menandainya *Aturan kata kunci*.
8. **Hapus hasil**: di panel *Riwayat produksi*, tiap berkas punya tombol *Hapus*, dan tiap folder punya *Hapus
   folder* (menghapus semua scene di dalamnya). Ada konfirmasi sebelum dihapus, dan tidak bisa dibatalkan. Folder
   kosong ikut dibersihkan otomatis. Akses dibatasi pada `output/` (nama berkas tidak boleh keluar folder).

## Format naskah

- **Pemisah scene**: baris `Scene 1` / `Adegan 2` / `Babak 3`, atau `---` / `***` / `___`. Tanpa pemisah, dipecah per baris kosong.
- **Jeda**: `(Jeda 2 detik)`, `[jeda 1.5]`, atau `(jeda)` (default 1 detik, maks 10). Baris yang hanya `...` juga menjadi jeda.
- **Emosi**: `[emosi sedih]` (juga `(emosi: takut)`) berlaku sampai penanda berikutnya. Pilihan: netral, senang, sedih,
  marah, takut, kaget, berbisik, tegas, lembut, licik, menggoda.
- **Dialog teater**: baris `Nama: ucapan` = tokoh; selain itu Narator.
- Tulis angka dengan huruf ("seratus dua puluh"), tanda baca teratur, kalimat pendek–sedang.
- **Kata Inggris** dideteksi dengan heuristik sederhana dan tampil sebagai peringatan; hasilnya bisa meleset. Untuk
  istilah Inggris yang banyak, pakai Supertonic atau Gemini.

## Proyek video

`videos/<judul>/` memuat resep video HyperFrames (komposisi, generator frame dan caption, pencarian B-roll Pixabay,
penyelarasan kata Whisper). Contoh jadi: `videos/bayangan-masa-lalu` (Scene 1, 81,5 detik, 9:16). Status dan rencana
otomasi penuh: [`docs/PLAN-video.md`](docs/PLAN-video.md). Aset dan hasil render tidak ikut git.

## Struktur proyek

```
app.py               Flask: API, penyajian SPA, pemuatan mesin, sintesis, antrian, ZIP, riwayat, hot reload
cleaner.py           Pembersihan teks, segmentasi, penanda jeda/emosi, scene, kata Inggris, ekstraksi artikel
director.py          Pemetaan cerita dan ekspresi (AI + aturan), penetapan suara; PRIMARY_MODEL
gemini_tts.py        Gemini TTS: suara, gaya dari emosi, pembatas laju, cadangan OmniRoute
drama3.py            Drama 3 (Space HF): cast, keep_voice, clone, unduh HLS
frontend/            UI React + Vite (FieldNote UI): src/, vendor/ (paket desain), pnpm workspace
static/app/          Hasil build frontend yang disajikan Flask (dibuat oleh run.sh, tidak ikut git)
templates/index.html UI lama (satu berkas, JS vanilla) — tidak dipakai lagi, disimpan sebagai rujukan
run.sh               Peluncur: bangun frontend bila perlu, lalu jalankan Flask
queue_state.json     Cadangan antrian + statistik detik-per-kata (dibuat otomatis, tidak ikut git)
videos/              Proyek video HyperFrames
docs/                Rencana dan catatan
tts-kloning.py       Servis kloning mandiri (versi awal)
bench_supertonic.py  Benchmark Supertonic
suara-kloning/       Sampel suara Pocket-TTS (tidak ikut git)
voices/supertonic/   Gaya suara kloning Supertonic (.json, tidak ikut git)
output/              Hasil audio (tidak ikut git)
```

## Frontend

- **Stack**: React 19 + Vite + TypeScript, Tailwind v3 memakai preset `@fieldnote-ui/theme`, komponen dari
  `@fieldnote-ui/ui` (Button, StatusChip, Tag, Meter, ThemeToggle), layout dan token `--fn-*`.
- **Tema**: terang (paper) sebagai bawaan; tombol Light/Dark/System ada di kanan atas dan tersimpan di browser.
- **Struktur**: `src/App.tsx` menyimpan state alur, `src/components/*` memecah panel per mode, `src/api.ts`
  membungkus endpoint Flask, `src/hooks.ts` menangani polling status/antrian/riwayat.
- **Vendor**: `frontend/vendor/{tokens,theme,icons,ui,layouts,charts}` adalah salinan paket FieldNote UI (MIT) yang
  dibangun lokal lewat `pnpm run build:vendor`.

## API

| Route | Fungsi |
|---|---|
| `GET /api/status` | Kesiapan tiap mesin |
| `GET /api/options` | Daftar mesin dan suara |
| `GET /api/sample/<voice_id>` | Sampel referensi Pocket-TTS |
| `POST /api/voice_sample` | `{engine, voice, refresh?}` → sampel singkat semua mesin (di-cache di `output/_voice_samples/`) |
| `POST /api/clean` | `{text}` → teks bersih, statistik, segmen, peringatan |
| `POST /api/fetch_url` | `{url}` → judul dan isi artikel (lewat Jina Reader) |
| `POST /api/clean_scenes` | `{text, group_words?}` → daftar scene bersih |
| `POST /api/annotate` | `{texts[], use_ai}` → teks berpenanda `[emosi]`/`[jeda]` |
| `POST /api/recommend_voice` | `{text, use_ai}` → mesin, suara, kecepatan, gaya, alasan, alternatif |
| `POST /api/direct` | `{text, use_ai}` → scene, tokoh, baris, usulan suara |
| `POST /api/synthesize` | `{engine, text, voice, speed, style?, title, scene?}` atau `{lines[], title, scene}` → WAV |
| `POST /api/queue/enqueue` | Payload sama dengan `/api/synthesize` → `{ok, job_id, position}` |
| `GET /api/queue/list` | Daftar job antrian + jumlah yang menunggu |
| `GET /api/queue/jobs/<id>` | Status satu job |
| `POST /api/queue/cancel/<id>` | Batalkan job yang masih menunggu |
| `POST /api/queue/remove/<id>` | Hapus satu catatan job yang sudah selesai (berkas tetap ada) |
| `POST /api/queue/clear_done` | Hapus job selesai/gagal/dibatalkan dari riwayat |
| `GET /api/zip/<folder>` | ZIP seluruh scene dalam folder |
| `GET /api/history` | Audio terbaru dan folder scene |
| `DELETE /api/history/file/<path>` | Hapus satu berkas `.wav` di `output/` |
| `DELETE /api/history/folder/<folder>` | Hapus satu folder hasil beserta seluruh isinya |
| `GET /output/<path>` | Berkas hasil |

## Privasi dan keamanan

- **Dikirim ke luar**: teks naskah ke Google (Gemini TTS, juga lewat OmniRoute), ke gateway/penyedia model AI (Analisis
  Cerita, Petakan Ekspresi, Rekomendasi Suara), ke Space Hugging Face (Drama 3), dan alamat halaman ke r.jina.ai
  (ambil dari URL).
  Untuk naskah sensitif, pakai Supertonic atau Pocket-TTS dan matikan "Pakai AI".
- **Rahasia** hanya di `.env` (tidak dilacak git; contoh di `.env.example`). Jangan menempel token di chat atau kode.
- Server terbuka di semua antarmuka dan **tanpa autentikasi**: siapa pun di jaringan yang sama bisa memakai fitur AI
  (kuota Anda). Jalankan di jaringan tepercaya.
- Kunci Gemini langsung dan akun gratis Hugging Face punya batas laju/kuota; mesin otomatis jatuh ke cadangan.

## Pemecahan masalah

- **"Gagal memuat Pocket-TTS"**: lihat pesan lengkapnya di terminal `run.sh` atau `/api/status` (field `error`). Status
  dicatat saat start; restart setelah perbaikan.
- **Pocket-TTS mengigau atau audio rusak**: periksa panjang sampel (≤ 15 detik), atau kalimat terlalu panjang/pendek.
- **Gemini 429 / lambat**: batas ±4 panggilan/menit pada kunci langsung; otomatis diatur dan dicoba ulang, atau pilih
  "Gemini via OmniRoute".
- **Drama 3 gagal**: kuota ZeroGPU akun habis; baris jatuh ke Supertonic dengan peringatan ⚠️.
- **"Frontend belum dibangun" (503)**: jalankan `./run.sh --build`, atau `cd frontend && pnpm install && pnpm run
  build:vendor && pnpm run build`.
- **Job antrian diulang setelah edit kode**: hot reload me-restart proses, jadi job yang sedang berjalan diulang
  dari awal (job yang masih menunggu tetap aman). Pakai `./run.sh --no-reload` saat menjalankan naskah panjang.
- **Antrian tidak kembali setelah restart**: pastikan `queue_state.json` ada dan bisa ditulis. Bila berkas itu
  rusak/terhapus, antrian dimulai kosong; hasil audio yang sudah selesai tetap ada di `output/`.
- **Perubahan UI tidak muncul saat `pnpm build`**: hasil ditulis ke `static/app/`; muat ulang browser dengan
  hard refresh (Ctrl+Shift+R) agar CSS/JS lama tidak terpakai.
- **Sintesis terputus di tengah**: hot reload me-restart server saat kode berubah; gunakan `./run.sh --no-reload`.
