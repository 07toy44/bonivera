/* ============================================================
   BONIVERA — BELLA GALLERY DATA
   File: data/bella-gallery.js
   Satu-satunya tempat untuk:
   1) mengatur daftar filter (galleryConfig)
   2) menambah foto / video baru (gallery)
   Panduan lengkap: README-GALLERY.md
   ============================================================ */
window.BoniveraData = window.BoniveraData || {};

/* ------------------------------------------------------------
   KONFIGURASI FILTER
   - id    : dipakai di data di bawah (jangan diubah kalau sudah dipakai)
   - label : teks yang tampil di website (bebas diubah)
   ------------------------------------------------------------ */
window.BoniveraData.galleryConfig = {
  types: [
    { id: "photo", label: "Photo" },
    { id: "video", label: "Video" },
  ],

  categories: [
    {
      id: "SOCIAL",
      label: "Social Media",
      children: [
        { id: "INSTAGRAM", label: "Instagram" },
        { id: "TIKTOK", label: "TikTok" },
        { id: "X", label: "X (Twitter)" },
      ],
    },
    {
      id: "JKT48",
      label: "JKT48",
      children: [
        { id: "OFFICIAL", label: "OFFICIAL" },
        { id: "THEATER", label: "Theater" },
        { id: "OFFAIR", label: "Offair Event" },
        { id: "ONAIR", label: "On Air Event" },
        { id: "OFC", label: "OFC Event" },
        { id: "JKT48EVENT", label: "JKT48 Event" },
      ],
    },
  ],
};

/* ------------------------------------------------------------
   DAFTAR FOTO / VIDEO

   Template FOTO:
   { type: "photo", group: "SOCIAL", sub: "INSTAGRAM",
     src: "assets/images/gallery/nama-file.jpg",
     caption: "Deskripsi singkat", date: "2026-11-03",
     url: "https://www.instagram.com/p/POST_ID/" },

   `url` (foto Instagram) = link postingan asli. Tombol "View on Instagram"
   hanya muncul di lightbox (fullscreen). Kosongkan ("") atau hapus kalau
   tidak ada: tombolnya otomatis disembunyikan. Hanya link instagram.com
   yang dianggap valid.
   CATATAN: untuk foto Instagram tetap pakai group: "SOCIAL" dan
   sub: "INSTAGRAM" supaya filter kategori berfungsi.

   Template VIDEO TIKTOK (diputar di website via embed + ada tombol
   "Buka di TikTok"). Pakai link LENGKAP yang ada /video/angka-nya:
   { type: "video", group: "SOCIAL", sub: "TIKTOK",
     url: "https://www.tiktok.com/@bonivera.cb/video/1234567890123456789",
     poster: "assets/images/gallery/cover-tiktok.jpg",
     caption: "Deskripsi singkat", date: "2026-11-03" },

   Template VIDEO LAINNYA (file lokal, diputar di website):
   { type: "video", group: "JKT48", sub: "THEATER",
     src: "assets/videos/nama-video.mp4",
     poster: "assets/images/gallery/cover-video.jpg",
     caption: "Deskripsi singkat", date: "2026-11-03" },

   date boleh dikosongkan ("") atau pakai format YYYY-MM-DD.
   Tanggal kosong / tidak valid selalu tampil paling akhir saat diurutkan.
   ------------------------------------------------------------ */
window.BoniveraData.gallery = [
  { type: "photo", group: "JKT48", sub: "OFFICIAL", src: "assets/images/gallery/kabesha.jpeg", caption: "bella kabesha", date: "2026-02-14" },

  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7637855995212942612", caption: "TikTok JKT48 U16", date: "2026-05-09" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_1.jpg", caption: "bella instagram photos", date: "2026-05-13", url: "https://www.instagram.com/p/DYRkcpfAdP1/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_2.jpg", caption: "bella instagram photos", date: "2026-05-13", url: "https://www.instagram.com/p/DYRkcpfAdP1/?img_index=1" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7640479029782433031", caption: "TikTok JKT48 U16", date: "2026-05-16" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7640799460771007762", caption: "TikTok JKT48 U16", date: "2026-05-17" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7642312558317210898", caption: "TikTok JKT48 U16", date: "2026-05-21" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7642968689188375826", caption: "TikTok JKT48 U16", date: "2026-05-23" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7643098403202665735", caption: "TikTok JKT48 U16", date: "2026-05-23" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7643683926585756935", caption: "TikTok JKT48 U16", date: "2026-05-25" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_3.jpg", caption: "bella instagram photos", date: "2026-05-27", url: "https://www.instagram.com/p/DY1a4ZXAXA7/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_4.jpg", caption: "bella instagram photos", date: "2026-05-27", url: "https://www.instagram.com/p/DY1a4ZXAXA7/?img_index=1" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7645537009376775442", caption: "TikTok JKT48 U16", date: "2026-05-30" },

  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_5.jpg", caption: "bella instagram photos", date: "2026-06-03", url: "https://www.instagram.com/p/DZHYGPCATao/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_6.jpg", caption: "bella instagram photos", date: "2026-06-03", url: "https://www.instagram.com/p/DZHYGPCATao/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_7.jpg", caption: "bella instagram photos", date: "2026-06-03", url: "https://www.instagram.com/p/DZHYGPCATao/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_8.jpg", caption: "bella instagram photos", date: "2026-06-03", url: "https://www.instagram.com/p/DZHYGPCATao/?img_index=1" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7647775533572361479", caption: "TikTok JKT48 U16", date: "2026-06-05" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7652952221289598226", caption: "TikTok JKT48 U16", date: "2026-06-19" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7655270698570517767", caption: "TikTok JKT48 U16", date: "2026-06-25" },

  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella-9.jpg", caption: "bella instagram photos", date: "2026-07-02", url: "https://www.instagram.com/p/DaR3tjSgXF4/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella-10.jpg", caption: "bella instagram photos", date: "2026-07-02", url: "https://www.instagram.com/p/DaR3tjSgXF4/?img_index=1" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7660422332099431688", caption: "TikTok JKT48 U16", date: "2026-07-09" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella-11.jpg", caption: "bella instagram photos", date: "2026-07-23", url: "https://www.instagram.com/p/DbIgwSIgddn/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella-12.jpg", caption: "bella instagram photos", date: "2026-07-23", url: "https://www.instagram.com/p/DbIgwSIgddn/?img_index=1" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7665682315439361287", caption: "TikTok JKT48 U16", date: "2026-07-23" },

  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7670912006144331016", caption: "TikTok JKT48 U16", date: "2026-08-06" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_13.jpg", caption: "bella instagram photos", date: "2026-08-18", url: "https://www.instagram.com/p/DcLmtEMAacv/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_14.jpg", caption: "bella instagram photos", date: "2026-08-18", url: "https://www.instagram.com/p/DcLmtEMAacv/?img_index=1" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7676803644079017237", caption: "TikTok JKT48 U16", date: "2026-08-22" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7679768483952905492", caption: "TikTok JKT48 U16", date: "2026-08-30" },

  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7681220674806893844", caption: "TikTok JKT48 U16", date: "2026-09-03" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7683524337428663560", caption: "TikTok JKT48 U16", date: "2026-09-09" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_15.jpeg", caption: "bella instagram photos", date: "2026-09-11", url: "https://www.instagram.com/p/DdIJ0_pgaqP/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_16.jpeg", caption: "bella instagram photos", date: "2026-09-11", url: "https://www.instagram.com/p/DdIJ0_pgaqP/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_17.jpeg", caption: "bella instagram photos", date: "2026-09-11", url: "https://www.instagram.com/p/DdIJ0_pgaqP/?img_index=1" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7684921653926628616", caption: "TikTok JKT48 U16", date: "2026-09-13" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7686751801353309460", caption: "TikTok JKT48 U16", date: "2026-09-18" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7688274937471192341", caption: "TikTok JKT48 U16", date: "2026-09-22" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7690170294232747284", caption: "TikTok JKT48 U16", date: "2026-09-27" },

  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7691949356131323157", caption: "TikTok JKT48 U16", date: "2026-10-02" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_18.jpeg", caption: "bella instagram photos", date: "2026-10-05", url: "https://www.instagram.com/p/DeGqRArgayG/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_19.jpeg", caption: "bella instagram photos", date: "2026-10-05", url: "https://www.instagram.com/p/DeGqRArgayG/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_20.jpeg", caption: "bella instagram photos", date: "2026-10-05", url: "https://www.instagram.com/p/DeGqRArgayG/?img_index=1" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7697483702095449396", caption: "TikTok JKT48 U16", date: "2026-10-17" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7700539483418053909", caption: "TikTok JKT48 U16", date: "2026-10-25" },

  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_21.jpg", caption: "bella instagram photos", date: "2026-11-02", url: "https://www.instagram.com/p/DfO0Tijof7T/?img_index=1" },
  { type: "photo", group: "SOCIAL", sub: "INSTAGRAM", src: "assets/images/gallery/bella_22.jpg", caption: "bella instagram photos", date: "2026-11-02", url: "https://www.instagram.com/p/DfO0Tijof7T/?img_index=1" },
  { type: "video", group: "SOCIAL", sub: "TIKTOK", url: "https://www.tiktok.com/@jkt48.u16/video/7705293987468332308?q=jkt48u16&t=1794037342364", caption: "TikTok JKT48 U16", date: "2026-11-07" },
]; 