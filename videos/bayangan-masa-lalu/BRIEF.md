---
workflow: general-video
flow: automation
storyboard: yes
message: "Masa lalu yang belum dilepaskan akan selalu menjadi bayangan dalam hubungan yang baru"
destination: shorts-tiktok
aspect: 1080x1920
language: id
length: 81s
---

## Intent

Video uji (Scene 1 dari 6) untuk narasi "Bayangan Masa Lalu": monolog reflektif tentang seseorang yang baru sadar
perasaannya setelah hubungan usai, karena masih terikat bayangan masa lalu. Suasana sedih, tenang, intim.
Gaya yang dipilih pengguna: gelap, sinematik, tipografi besar (serif), caption kata demi kata sinkron suara.
Setelah uji ini cocok, lima scene lain (total narasi 8,5 menit) mengikuti gaya yang sama.

## Assets

- /home/rohadi/Projects/tts-narasi/output/bayangan-masa-lalu/scene_01.wav — voiceover Scene 1 (81,2 detik, 44,1 kHz, mono). SUDAH ADA, pakai apa adanya; jangan generate TTS baru.
- /home/rohadi/Projects/tts-narasi/output/bayangan-masa-lalu/info.json — naskah per scene (`lines["01"]`: 4 baris, tokoh Narator, emosi netral/sedih, jeda tiap baris di field `pause`). Sumber teks caption.

## Customizations

- B-roll dari Pixabay (API resmi, kunci di variabel `PIXABAY_API` pada `/home/rohadi/Projects/tts-narasi/.env`; jangan cetak atau catat kunci). Klip suasana (hujan, jendela, siluet, senja) sebagai latar redup di bawah caption, sekitar 4-5 klip untuk scene ini. Sebagian besar klip 16:9, dipotong tengah ke 9:16. Catat kredit dan lisensi tiap klip.
- Caption kata demi kata sinkron suara; butuh transkripsi per kata. Mesin tanpa GPU: cek `hyperframes transcribe` di CPU, cadangan faster-whisper CPU (model small) di scratchpad `gv/bin/python`.

## Notes

- Tanpa musik latar kecuali pengguna meminta.
- Mesin hanya CPU: render lama. Iterasi dengan `--quality draft`; render akhir hanya setelah persetujuan Studio preview.
- Cakupan uji hanya Scene 1; jangan membangun scene 2-6 sebelum diminta.
- Disimpulkan (bukan jawaban pengguna): 4-5 klip B-roll, tanpa musik, durasi video = durasi audio asli.

## Keputusan selama run (diperbarui)

- Rencana 5 frame disetujui; papan sketsa (`boards/storyboard.html`) dikonfirmasi; gerak dibangun setelahnya.
- B-roll terpilih (Pixabay, kredit di `broll/CREDITS.md`): A 40797, B 11722, C 258799, D 296062, E 4753. Frame 5 memakai klip E dari detik 13 agar matahari menembus awan saat kalimat penutup.
- Perlakuan media lewat `hyperframes media-treatment` (resep di `tools/build_frames.py`, TREATMENTS); footage terang digelapkan keras agar caption terbaca.
- Font: Fraunces (berkas lokal `assets/fonts/`), IBM Plex Mono (bawaan). Teks dan konten kunci di dalam kotak title-safe (108px kiri-kanan).
- Waktu kata: faster-whisper CPU diselaraskan ke naskah (`tools/transcribe_align.py`; 152/158 kata cocok langsung).
- Regenerasi: `python tools/build_frames.py --motion` dan `python tools/build_captions.py` (jangan edit file hasil secara manual).
- `hyperframes check` dengan sampel default melebihi batas waktu karena footage 4K/185 MB; dijalankan per kelompok `--at` (10 titik waktu, semua lolos).
