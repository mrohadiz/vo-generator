---
version: alpha
name: Bayangan — Frame (9:16)
description: >
  Sinematik gelap untuk narasi reflektif. B-roll hasil perlakuan media (gelap, tenang, cenderung dingin lalu menghangat)
  sebagai latar penuh; teks narasi sebagai tokoh utama: serif besar lembut, ditulis per kata mengikuti suara, kata yang
  sedang diucapkan menyala hangat. Tanpa dekorasi bergaya web. Hanya satu aksen (bara/ember).
unit: the frame — 1080x1920 (9:16)
principle: teks adalah sutradara · footage adalah suasana · satu aksen hangat melawan dunia dingin

colors:
  night: "#0A0D12"        # dasar & titik gelap (didinginkan, bukan hitam murni)
  dusk: "#141A22"         # permukaan sekunder
  bone: "#EAE3D6"         # teks aktif/terbaca (hangat, bukan putih murni)
  bone-dim: "#B2ACA5"     # teks yang belum/ sudah diucapkan (dinaikkan agar lolos kontras 3:1 di atas awan)
  ember: "#D08B5B"        # satu-satunya aksen: kata menyala, garis tipis, cahaya latar
  ember-soft: "#7A4E33"   # ember untuk cahaya redup di belakang teks

typography:
  caption:        { fontFamily: "Fraunces", px: 104, weight: 300, lineHeight: 1.1, tracking: "-0.02em", color: "bone-dim" }
  caption-active: { fontFamily: "Fraunces", px: 104, weight: 300, lineHeight: 1.1, tracking: "-0.02em", color: "bone" }
  caption-finale: { fontFamily: "Fraunces", px: 128, weight: 300, italic: true, lineHeight: 1.06, tracking: "-0.025em", color: "bone" }
  label:          { fontFamily: "IBM Plex Mono", px: 24, weight: 400, tracking: "0.3em", upper: true, color: "bone-dim", opacity: 0.8 }
  numeral:        { fontFamily: "IBM Plex Mono", px: 24, weight: 400, tracking: "0.2em", color: "bone-dim", opacity: 0.8 }

spacing:
  pad-edge: "108px"          # title-safe 10% (caption & konten kunci)
  caption-width: "864px"      # 1080 - 2 x pad-edge
  caption-anchor-y: "62%"     # blok caption berpusat sedikit di bawah tengah

components:
  caption-block:
    anchor: "kiri (pad-edge), rata kiri, lebar maks 864px, 2-3 baris, 3-5 kata per grup"
    description: "Fokus utama. Satu grup tampil sekali; kata diucapkan menyala dari bone-dim ke bone dengan cahaya ember halus (rule asr-keyword-glow, karaoke)."
  label-top:
    anchor: "kiri atas, di dalam pad-edge; judul 'BAYANGAN MASA LALU' dan nomor scene di kanan atas"
    description: "Metadata mono kecil sebagai fokus kedua; muncul pelan di awal."
  progress-hairline:
    rule: "garis 2px ember pada tepi bawah, skala X 0→1 sepanjang durasi"
    description: "Satu-satunya elemen struktural; menunjukkan perjalanan scene."
  broll-layer:
    description: "Video penuh layar. Warna, kecerahan, vinyet, dan grain diatur lewat media-treatment resmi (bukan filter CSS). Dikecilkan terang agar caption terbaca."
  ember-bloom:
    background: "radial {colors.ember-soft} → transparan"
    placement: "di belakang blok caption, puncak opasitas ≤ 0.35, bernapas pelan"
    description: "Lapisan kedalaman hangat; tidak pernah dominan."

## Overview

Narasi ini sunyi dan intim: seseorang menyadari terlambat bahwa masa lalu menjadi bayangan dalam hubungan baru. Visual
tidak menjelaskan, hanya memberi ruang. Warna bergerak dari dingin (biru malam, hujan di kaca) ke hangat (kilau emas di
air, matahari menembus awan) mengikuti arah emosi dari kesepian menuju "Langit tetap memilih tinggal".

## The Frame

- Kanvas 1080x1920. Teks utama memenuhi sekitar 80% lebar (864px, kotak title-safe) dan ditambatkan ke tepi kiri, bukan dipusatkan.
- Dua titik fokus: blok caption (utama) dan label mono kiri atas (kedua). Garis progres di bawah sebagai penutup struktur.
- Latar selalu footage; tidak ada panel, kartu, atau kotak.

## Composition Rules

- Satu aksen saja (ember). Tidak ada neon, tidak ada ungu-ke-biru, tidak ada teks gradien.
- Tidak ada gradien linier layar penuh pada latar gelap (garis banding di H.264); kedalaman datang dari footage, perlakuan media, dan radial ember.
- Kontras teks diukur oleh `hyperframes check`; caption harus terbaca di atas footage yang paling terang (awan di penutup).
- Waktu adalah hierarki: kata muncul tepat saat diucapkan; tidak ada kata muncul lebih awal dari suaranya.

## Do

- Biarkan caption bernapas: jeda hening dalam narasi berarti layar caption kosong sejenak, bukan diisi dekorasi.
- Ganti klip dengan crossfade kabur pelan (0,8 detik) pada jeda alami antar kalimat.

## Don't

- Jangan memakai filter CSS, overlay SVG, atau lapisan DOM untuk vinyet, grain, atau grade.
- Jangan menambah musik, efek suara, atau elemen yang tidak diminta.
- Jangan font terlarang (Inter, Roboto, Playfair, EB Garamond, dan sejenisnya).
