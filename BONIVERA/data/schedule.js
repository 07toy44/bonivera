/* ============================================================
   BONIVERA — SCHEDULE DATA
   ------------------------------------------------------------
   This file is the single source of truth for Bella's schedule.
   Add, edit or remove entries from the `schedules` array below —
   every page (schedule.html, home.html quick-view) reads from
   this same array, so nothing else needs to change.

   NOTE ON SAMPLE DATA
   The entries below are clearly-labeled PLACEHOLDER / SAMPLE
   events. They exist only to demonstrate that filtering, status
   detection, countdowns and the detail modal are fully working.
   Replace them with Bella's real schedule as it is announced —
   do not treat the sample titles/locations as real events.

   FIELDS
   id            unique number, also used to link a completed
                 schedule entry to its recap (data/recap.js) —
                 use the same id on both sides.
   date          "YYYY-MM-DD"
   time          "HH:MM" (24h, WIB / Jakarta time)
   durationMinutes  optional, defaults to 120 if omitted. Used to
                 detect the LIVE / ONGOING window.
   title         event name
   category      "THEATER" | "OFFAIR EVENT" | "ON AIR EVENT"
   location      venue / city
   description   short description
   cancelled     optional boolean — set true to force CANCELLED
   logo          optional image path shown as the square frame
                 next to the event on the card and in the detail
                 modal (e.g. the setlist's logo). Falls back to
                 the BONIVERA logo if omitted.
   documentation optional array of { src, caption } for photos
                 attached directly to the schedule (in addition
                 to whatever documentation.js/recap carries)
   ============================================================ */

window.BoniveraData = window.BoniveraData || {};

BoniveraData.schedules = [
  
  {
    id: 28,
    date: "2026-11-20",
    time: "19:00",
    durationMinutes: 120,
    title: "[18] PAJAMA DRIVE",
    category: "THEATER",
    location: "JKT48 Theater",
    description: "Pertunjukan Pajama Drive.",
    logo: "assets/images/setlist/PAJAMADRIVE.jpeg",
    streams: ["idn"],
}

];