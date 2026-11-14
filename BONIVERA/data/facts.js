/* ============================================================
   BONIVERA — DATA FAKTA & TRIVIA BELLA
   category : "PRESTASI" | "FAKTA" | "TRIVA"
   text     : ringkasan (selalu tampil)
   more     : isi panjang (tampil setelah "Baca selengkapnya"), boleh dikosongkan
   photos   : [] kosong = kotak ikon foto tercoret
              1 foto = foto tunggal, lebih dari 1 = menumpuk seperti halaman buku
              format: [{ src: "path.jpg", caption: "keterangan" }]
   ============================================================ */
window.BoniveraData = window.BoniveraData || {};

BoniveraData.facts = [
  {
    id: 1,
    category: "TRIVA",
    title: "Bella adalah fans JKT48",
    text: "Sebelum masuk ke JKT48 trainee, Bella adalah seorang fans JKT48!",
    more: "Bella pernah terlihat menonton show theater Seitansai Michie pada 2025, sebelum akhirnya bergabung sebagai trainee.",
    photos: [
      { src: "assets/images/facts/bellastsmichie.jpeg", caption: "Bella menonton show theater special seitansai michie, 2025" },
      
    ]
  },
  {
  id: 2,
  category: "PRESTASI",
  title: "Bella, Atlet Ice Skating Berprestasi Sejak Usia 8 Tahun",
  text: "Sebelum menjadi trainee JKT48, Bella ternyata telah berprestasi sebagai atlet ice skating sejak usia 8 tahun.",
  more: "Dalam Indonesia Ice Skating Open 2020 (IISO 2020) di BX Rink, Bintaro, Bella berhasil meraih 4 medali, terdiri dari 2 emas, 1 perak, dan 1 perunggu.",
  photos: [{ src: "assets/images/facts/bellaiceskate.jpeg", caption: "Sumber: BX Rink — Skaters List Indonesia Ice Skating Open 2020 (IISO 2020)" }]
},
];