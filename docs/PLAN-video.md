# Video dari Audio Scene: status dan rencana

Status: **Scene 1 "Bayangan Masa Lalu" sudah dibangun dan dirender dengan HyperFrames**
(`videos/bayangan-masa-lalu/`). Otomasi untuk scene lain (`make_video`) belum ada.

## Yang sudah jadi (Scene 1)

Video 1080×1920, 81,5 detik, narasi `output/bayangan-masa-lalu/scene_01.wav`, tanpa musik, dengan B-roll Pixabay dan
caption kata demi kata. Dirender dalam 22 menit 27 detik di mesin ini (CPU, tangkap frame dengan percepatan GPU); berkas
161,5 MB (H.264 + AAC). `hyperframes check` lulus pada 10 titik waktu (sampel bawaan melewati batas waktu karena footage 4K).

Alur yang terbukti, semuanya skrip di `videos/<judul>/tools/`:

| Tahap | Skrip | Catatan |
|---|---|---|
| Waktu per kata | `transcribe_align.py` | faster-whisper CPU (model small) diselaraskan ke naskah asli; 152 dari 158 kata cocok langsung, sisanya diinterpolasi |
| Cari B-roll | `pixabay_search.py` | API resmi Pixabay, kunci `PIXABAY_API` di `.env`; kandidat per denyut cerita |
| Pilih klip | `contact_sheet.py` | lembar kontak 9:16 untuk memilih dengan mata (belum otomatis) |
| Susun frame | `build_frames.py` | menulis komposisi per frame dan memasang perlakuan media lewat `hyperframes media-treatment` |
| Caption | `build_captions.py` | karaoke kata demi kata (rule `asr-keyword-glow`), grup seimbang per kalimat |

Spesifikasi desain di `frame.md` (gelap sinematik, Fraunces + IBM Plex Mono, satu aksen hangat), rencana per frame di
`STORYBOARD.md`, brief dan keputusan di `BRIEF.md`.

## Keputusan

| Topik | Keputusan | Alasan |
|---|---|---|
| Perakit video | **HyperFrames** (bukan Remotion) | Ada alur siap untuk narasi, caption, dan audio; transkripsi Remotion di skill-nya butuh GPU, mesin ini tidak punya |
| Format | 9:16 (Shorts/TikTok) | Pilihan pengguna |
| Sumber B-roll | Pixabay (API resmi) | Pendaftaran API Pexels sedang ditutup; skrip lama `download_broll.py` memakai endpoint internal Pexels, tidak dipakai |
| Perlakuan warna | `media-treatment` resmi, bukan filter CSS | Aturan skill; footage terang digelapkan keras agar caption terbaca |
| Unit kerja | Satu proyek per scene, lalu digabung ffmpeg | Bisa dilanjutkan atau diulang per scene |
| Model AI | `agy/gemini-3.8-flash-tiered` (utama, mendukung gambar dan alat) | Stabil pada uji; model lain cadangan |

## Rencana: `make_video <folder>`

Satu perintah dari `output/<judul>/` ke video per scene, memakai skrip di atas ditambah tiga titik AI, masing-masing
dengan cadangan non-AI:

1. **Kata kunci per denyut** (AI; cadangan: kata kunci dari kalimat).
2. **Memilih klip dari thumbnail** (AI visi; cadangan: skor durasi, vertikal, resolusi, kegelapan).
3. **Menilai snapshot** keterbacaan caption (AI visi sebagai tanda bahaya; **hakim terakhirnya tetap `hyperframes check`**,
   karena penilaian AI lebih ketat dan tidak selalu sejalan dengan angka kontras).

Eksposur footage dihitung dari pengukuran terang area caption, bukan disetel manual. Hanya klip 1080p atau vertikal yang
dipilih supaya `check` dan render tidak macet pada 4K.

Perkiraan render: ±19 detik per detik video di mesin ini, jadi narasi 8,5 menit ≈ 2,5–3 jam.

## Risiko dan catatan

| Risiko | Penanganan |
|---|---|
| Stok video tak cocok dengan naskah spesifik | Pratinjau kandidat dan ganti manual; query menekankan suasana |
| Lisensi Pixabay **belum diverifikasi** dari halaman resmi (diblokir Cloudflare) | Baca ketentuannya sebelum menerbitkan; kredit di `broll/CREDITS.md` |
| Waktu kata yang diinterpolasi bisa meleset | Periksa saat memutar; cocokkan ke naskah asli |
| `check` sampel bawaan melewati batas waktu | Jalankan per kelompok `--at` |
| Penilaian visual AI berbeda dari angka kontras | AI hanya menandai; angka yang memutuskan |
| Render lama | Render per scene di latar, bisa dilanjutkan |

Aset (footage, render) tidak ikut git; hanya resep (skrip, komposisi, brief, storyboard, transkrip).
