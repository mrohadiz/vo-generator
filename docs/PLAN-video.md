# Rencana: Dari Audio Scene ke Video Otomatis

Status: **perencanaan** (belum ada kode). Dokumen ini adalah titik awal tahap video; perbarui
seiring keputusan berubah.

## Tujuan

Dari naskah yang sudah menjadi `output/<judul>/scene_NN.wav`, hasilkan video vertikal
**9:16 (1080×1920)** berisi B-roll yang relevan, caption yang sinkron dengan suara, judul scene,
dan transisi, dengan intervensi manual seminimal mungkin. Tetap ada langkah pratinjau supaya
klip yang meleset bisa diganti sebelum render.

## Keputusan yang sudah diambil

| Topik | Keputusan |
|---|---|
| Format | 9:16 vertikal (Shorts/Reels/TikTok) |
| Perakit video | Remotion (React), Lottie untuk aksen kecil (opsional) |
| Sumber B-roll | Pixabay (API resmi) dulu. Pexels menyusul bila pendaftaran API dibuka |
| Pemilihan klip | Otomatis + pratinjau kandidat untuk diganti |
| Unit kerja | Satu komposisi per scene, lalu digabung dengan ffmpeg |
| Folder proyek | `output/<slug-judul>/`, sama dengan folder audio |

## Alur

```
naskah per scene ──► scene_NN.wav            (sudah ada)
                        │
        1. timing       │  faster-whisper → kata + waktu mulai/selesai
        2. kata kunci   │  Gemini → 2–4 query visual (Inggris) per scene
        3. B-roll       │  Pixabay → kandidat, unduh, cache
        4. susun        │  scene.json: klip, caption, durasi
        5. render       │  Remotion per scene → ffmpeg gabung → mp4
                        ▼
              output/<judul>/video/scene_NN.mp4 + final.mp4
```

## Struktur berkas yang direncanakan

```
output/<judul>/
  scene_NN.wav
  info.json                  judul, engine, suara, naskah tiap scene (sudah ada)
  timing/scene_NN.json       kata + waktu (tahap 1)
  broll/
    candidates.json          kandidat per scene dari pencarian (tahap 3)
    selected.json            klip terpilih per scene
    *.mp4                    klip terunduh (+ kredit pembuat)
  video/scene_NN.mp4, final.mp4
broll.py                     pencarian & unduh B-roll (provider modular)
video/                       proyek Remotion
```

## Tahapan

### Tahap 1. Timing & caption
- Transkripsi tiap `scene_NN.wav` dengan faster-whisper (model *small* sudah ada di cache
  Hugging Face; paket Python belum terpasang di `.venv`).
- Keluaran: `timing/scene_NN.json` berisi kata, `start`, `end`.
- Karena teks sumber sudah diketahui, cocokkan hasil transkripsi ke naskah asli supaya
  caption memakai ejaan naskah, bukan hasil tebakan model.
- **Selesai bila**: caption menampilkan kata yang sedang diucapkan dengan selisih waktu
  yang tidak terasa.

### Tahap 2. Kata kunci B-roll
- Gemini (kunci `GEMINI_API_KEY` sudah ada di environment) membaca tiap scene dan mengusulkan
  2–4 query bahasa Inggris yang konkret (objek/suasana yang bisa difilmkan, bukan konsep abstrak).
- Keluaran disimpan ke `info.json` agar bisa diedit manual.
- **Selesai bila**: tiap scene punya query yang masuk akal; query bisa diedit di UI.

### Tahap 3. Pencarian & pemilihan B-roll
- `broll.py` dengan antarmuka provider: `search(query) -> [Clip]` (`id`, `url`, `width`, `height`,
  `duration`, `author`, `page`). Provider pertama: Pixabay. Provider Pexels ditambahkan nanti
  tanpa mengubah kode lain.
- Pixabay tidak punya filter orientasi untuk video, jadi filter berdasarkan ukuran. Klip landscape
  di-*crop* tengah oleh Remotion.
- Hanya unduh klip yang dipilih. Pratinjau memakai tautan pratinjau kecil dari API.
- Klip yang ditaruh manual di `broll/` ikut muncul sebagai kandidat.
- Simpan kredit pembuat di `broll/*.json` (pengganti `manifest.json` skrip lama).
- UI: tiap scene menampilkan 3–4 kandidat; klik untuk mengganti, simpan ke `selected.json`.

### Tahap 4. Render Remotion
- Proyek di `video/`. Komposisi `Scene` menerima props dari `scene.json`.
- Isi: B-roll berganti mengikuti kalimat (≈ 3–6 detik per klip), caption karaoke, judul scene,
  transisi sederhana antar klip dan antar scene.
- Render berjalan di latar (proses terpisah) karena lama; UI membaca status dari berkas atau endpoint.
- Gabungkan semua scene dengan ffmpeg menjadi `final.mp4`.
- Lottie hanya setelah dasar stabil (lower-third, ikon penanda).

### Tahap 5. Integrasi UI
- Tombol **Buat Video** pada hasil scene, panel pratinjau B-roll, bilah progres render,
  pemutar `final.mp4`.
- Endpoint baru (usulan): `POST /api/video/prepare`, `GET /api/video/candidates`,
  `POST /api/video/select`, `POST /api/video/render`, `GET /api/video/status`.

## Risiko & catatan

| Risiko | Penanganan |
|---|---|
| Stok video tidak cocok dengan naskah spesifik (tokoh, tempat tertentu) | Pratinjau + ganti manual; cadangan klip lokal; query yang menekankan suasana |
| Koleksi Pixabay lebih terbatas | Provider modular, tambah Pexels/lainnya kemudian |
| Render Remotion lambat di CPU | Render per scene di latar; satu scene gagal tidak menggagalkan lainnya; resolusi pratinjau lebih rendah |
| Crop landscape ke 9:16 membuang banyak area | Preferensi klip portrait; titik fokus tengah |
| Waktu caption meleset | Cocokkan ke naskah asli; opsi geser offset global |
| Kunci API bocor | Simpan di `.env` (masuk `.gitignore`), jangan di kode |

## Catatan soal `download_broll.py`

Skrip lama **tidak dipakai** untuk pipeline ini:
- Memanggil endpoint internal pexels.com dengan kunci front-end dan menyamar sebagai browser,
  bukan API resmi. Rapuh dan kemungkinan melanggar ketentuan layanan.
- Daftar klipnya tertulis tangan untuk satu naskah, dan menulis ke `remotion-video/public/broll`
  yang tidak ada di proyek ini.

Yang dipertahankan sebagai ide: pilih file 720×1280 lebih dulu, minimal durasi 3 detik, buang file
di bawah 200 KB, dan catat kredit pembuat.

## Prasyarat & status

| Item | Status |
|---|---|
| Node 24, npm, ffmpeg | Terpasang |
| `GEMINI_API_KEY` | Ada di environment |
| faster-whisper (model *small*) | Model di cache, paket Python belum dipasang |
| Pixabay API key | **Belum ada**, simpan di `.env` sebagai `PIXABAY_API_KEY` |
| Pexels API | Pendaftaran sedang ditutup |
| Proyek Remotion | Belum dibuat |

## Urutan kerja yang disarankan

1. Tahap 1 + 2 (tidak butuh key baru), validasi hasil dengan satu folder scene nyata.
2. Tahap 3 begitu key Pixabay tersedia.
3. Tahap 4 untuk satu scene dulu, lalu semua scene + penggabungan.
4. Tahap 5 (UI), terakhir.
