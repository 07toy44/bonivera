/* ============================================================
   BONIVERA — RECAP DATA
   ------------------------------------------------------------
   Source of truth for completed activities shown on recap.html.
   Each entry's `id` should match the corresponding entry in
   data/schedule.js so the two pages can cross-link ("View Recap"
   on an upcoming-turned-completed schedule card, and "Back to
   Schedule" from a recap).

   NOTE ON SAMPLE DATA
   These are clearly-labeled PLACEHOLDER / SAMPLE recaps used to
   demonstrate the timeline, detail modal, song list and
   documentation gallery. Replace with real recap write-ups as
   activities actually happen.

   SONGS
   Leave `songs` as an empty array until the real setlist is
   confirmed — the page will automatically display
   "Song information will be updated." Never invent song titles.

   LOGO
   `logo` is a single image path shown as the square frame next
   to each recap card on the timeline (e.g. the setlist's logo).
   Entries that share a setlist can reuse the same path. If
   omitted, the page falls back to the BONIVERA logo.

   DOCUMENTATION
   Array of { src, caption }. `src` can point to a local file in
   assets/images/gallery/ or to any external image/video/YouTube
   link — documentation.js and recap.js both know how to render
   either kind.
   ============================================================ */

window.BoniveraData = window.BoniveraData || {};

BoniveraData.recaps = [
  {
    id: 1,
    date: "2026-02-22",
    time: "19:30",
    title: "JKT48 SCHOOL",
    category: "THEATER",
    logo: "assets/images/setlist/JKT48SCHL.JPG",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: [],
    documentation: [

    ],
  },
  {
    id: 2,
    date: "2026-03-01",
    time: "19:30",
    title: "JKT48 SCHOOL",
    category: "THEATER",
    logo: "assets/images/setlist/JKT48SCHL.JPG",
    location: "JKT48 Theater, Jakarta",
    description:
      "pada penampilan kali ini bella membawakan beberapa bonus song",
    songs: [
 "Aitakata","Pesawat kertas 365 Hari","Only Today","Fortune Cookie in Love",
],
    documentation: [

    ],
  },
  {
   id: 3,
    date: "2026-03-08",
    time: "19:30",
    title: "JKT48 SCHOOL",
    category: "THEATER",
    logo: "assets/images/setlist/JKT48SCHL.JPG",
    location: "JKT48 Theater, Jakarta",
    description:
      "pada penampilan kali ini bella membawakan beberapa bonus song",
    songs: [
 "Fortune Cookie in Love","Only Today","Tsugi No Season",
],
    documentation: [

    ],
  },
  {
   id: 4,
    date: "2026-03-15",
    time: "19:30",
    title: "JKT48 SCHOOL",
    category: "THEATER",
    logo: "assets/images/setlist/JKT48SCHL.JPG",
    location: "JKT48 Theater, Jakarta",
    description:
      "pada penampilan kali ini bella membawakan beberapa bonus song",
    songs: [
 "Aitakata","Only Today","Tsugi No Season","Mirai ga Me ni Shimiru","Pesawat kertas 365 Hari"
],
    documentation: [

    ],
  },
  {
    id: 5,
    date: "2026-05-03",
    time: "14:00",
    title: "[01] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/PAJAMADRIVE.JPEG",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: [
  "Kagami no NAKA no Jeane d'Arc",
  "Jonjou Shugi⭐"
],
    documentation: [

    ],
  },
  {
    id: 6,
    date: "2026-05-15",
    time: "19:00",
    title: "[02] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/PAJAMADRIVE.JPEG",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: [
 "Kagami no NAKA no Jeane d'Arc","Jonjou Shugi⭐"
],
    documentation: [

    ],
  },
  {
    id: 7,
    date: "2026-05-23",
    time: "19:00",
    title: "JKT48 Personal Meet and Greet Festival: LOVE DREAM PASSION",
    category: "JKT48 EVENT",
    logo: "assets/images/setlist/mngldp.JPEG",
    location: "ICE BSD City, Tangerang",
    description:
      "",
    songs: [
 ""
],
    documentation: [

    ],
  },
  {
    id: 8,
    date: "2026-05-29",
    time: "19:00",
    title: "[03] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/PAJAMADRIVE.JPEG",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: [
 "Kagami no NAKA no Jeane d'Arc","Jonjou Shugi⭐"
],
    documentation: [

    ],
  },
  {
    id: 9,
    date: "2026-06-13",
    time: "19:00",
    title: "JKT48 Request Hour 2026 Setlist Best 40",
    category: "JKT48 EVENT",
    logo: "assets/images/setlist/rh26.JPEG",
    location: "Tennis Indoor Senayan, Jakarta",
    description:
      "",
    songs: [
 "Heavy Rotation","Binggo!","Saikou ka yo"
],
    documentation: [

    ],
  },
  {
    id: 10,
    date: "2026-06-27",
    time: "16:00",
    title: "[04] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/PAJAMADRIVE.JPEG",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: [
 "Kagami no NAKA no Jeane d'Arc","Jonjou Shugi⭐","[BONUS SONG] Mirai ga Me ni Shimiru⭐"
],
    documentation: [

    ],
  },
  {
    id: 11,
    date: "2026-07-04",
    time: "19:00",
    title: "[05] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/PAJAMADRIVE.JPEG",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: [
 "Kagami no NAKA no Jeane d'Arc","Jonjou Shugi","[BONUS SONG] Heshire Penguin⭐"
],
    documentation: [

    ],
  },
 {
   id: 12,
    date: "2026-07-05",
    time: "16:00",
    title: "“FUN ON BOARD #3: Fun Board Games with JKT48 Trainee”",
    category: "OFC EVENT",
    logo: "assets/images/setlist/FUNBOARD.PNG",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: [],
    documentation: []
},

  {
    id: 13,
    date: "2026-07-18",
    time: "19:00",
    title: "[06] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/PAJAMADRIVE.JPEG",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: [
 "Kagami no NAKA no Jeane d'Arc","Jonjou Shugi⭐","[BONUS SONG] First Rabit"
],
    documentation: [

    ],
  },
  {
  id: 14,
    date: "2026-07-26",
    time: "20:00",
    title: "SAKURA MATSURI 2026",
    category: "OFF AIR EVENT",
    logo: "assets/images/setlist/SAKURAMATSURI2026.png",
    location: "Hollywood Junction, Kota Jababeka, Cikarang",
    description:
      "",
    songs: [],
    documentation: [

    ],
  },
  {
    id: 15,
    date: "2026-08-01",
    time: "20:00",
    title: "[07] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/PAJAMADRIVE.JPEG",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: [
 "Jonjou Shugi⭐","Kagami no NAKA no Jeane d'Arc","Ponytail To Shushu"
],
    documentation: [

    ],
  },
   { 
    id: 16, 
    date: "2026-08-13", 
    time: "20:00", 
    title: "[08] PAJAMA DRIVE", 
    category: "THEATER", 
    logo: "assets/images/setlist/PAJAMADRIVE.JPEG", 
    location: "JKT48 Theater, Jakarta", 
    description: 
      "", 
    songs: [ 
      "Jonjou Shugi⭐","Kagami no NAKA no Jeane d'Arc","Juuryoku Sympathy" 
    ], 
    documentation: [ 
   
    ], 
  },
 
  {
    id: 17,
    date: "2026-08-23",
    time: "20:00",
    title: "[09] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/pajamadrive.jpeg",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: [ 
      "Jonjou Shugi⭐","Kagami no NAKA no Jeane d'Arc","Oogoe Diamond⭐" 
    ], 
    documentation: [

    ],
  },
  {
    id: 18,
    date: "2026-08-29",
    time: "20:00",
    title: "Ardan Senja Syahdu vol.7 2026",
    category: "OFF AIR EVENT",
    logo: "assets/images/setlist/ardan.jpg",
    location: "Lapangan Wiradhika Secapa AD Bandung",
    description:
      "",
    songs: [      "Futari Nori no Jitensha","Ponytail To Shushu","Mirai ga Me ni Shimiru","Oogoe Diamond","Pesawat kertas 365 Hari","Everyday, Kachuusha","Fortune Cookie in Love","Heavy Rotation"],
    documentation: [

    ],
  },
  {
    id: 19,
    date: "2026-08-30",
    time: "20:00",
    title: "[10] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/pajamadrive.jpeg",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: ["Jonjou Shugi⭐", "Kagami no NAKA no Jeane d'Arc", "Baby! Baby! Baby!"],
    documentation: [

    ],
  },
  {
    id: 20,
    date: "2026-09-09",
    time: "20:00",
    title: "[11] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/pajamadrive.jpeg",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: ["Jonjou Shugi⭐", "Kagami no NAKA no Jeane d'Arc", "After Rain"],
    documentation: [

    ],
    
  },
  {
    id: 21,
    date: "2026-09-19",
    time: "20:00",
    title: "[12] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/pajamadrive.jpeg",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: ["Jonjou Shugi⭐", "Kagami no NAKA no Jeane d'Arc", "Everyday, Kachuusha"],
    documentation: [

    ],
    
  },
  {
    id: 22,
    date: "2026-10-04",
    time: "20:00",
    title: "[13] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/pajamadrive.jpeg",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: ["Jonjou Shugi⭐", "Kagami no NAKA no Jeane d'Arc", "Saikou ka yo"],
    documentation: [

    ],
    
  },
  {
    id: 23,
    date: "2026-10-10",
    time: "20:00",
    title: "[14] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/pajamadrive.jpeg",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: ["Jonjou Shugi⭐", "Kagami no NAKA no Jeane d'Arc", "Baby! Baby! Baby!"],
    documentation: [

    ],
    
  },
  {
    id: 24,
    date: "2026-10-16",
    time: "20:00",
    title: "[15] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/pajamadrive.jpeg",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: ["Jonjou Shugi⭐", "Kagami no NAKA no Jeane d'Arc", "After Rain"],
    documentation: [

    ],
    
  },
  {
    id: 25,
    date: "2026-10-24",
    time: "20:00",
    title: 'JKT48 & AKB48 Personal Meet & Greet Festival dengan Tema "Ayo Senyumlah"',
    category: "JKT48 EVENT",
    logo: "assets/images/setlist/senyumlah.png",
    location: "ICE BSD City, Tangerang",
    description:
      "",
    songs: [
 
],
    documentation: [

    ],
    
  },
  {
    id: 26,
    date: "2026-10-31",
    time: "19:00",
    title: "[16] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/pajamadrive.jpeg",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: ["Kagami no NAKA no Jeane d'Arc","Jonjou Shugi⭐", "High Tension"],
    documentation: [

    ],
    
  },
  {
    id: 27,
    date: "2026-11-05",
    time: "19:00",
    title: "[17] PAJAMA DRIVE",
    category: "THEATER",
    logo: "assets/images/setlist/pajamadrive.jpeg",
    location: "JKT48 Theater, Jakarta",
    description:
      "",
    songs: ["Jonjou Shugi⭐","Kagami no NAKA no Jeane d'Arc", "Shoujotachi Yo"],
    documentation: [

    ],
    
  },
];