/* ============================================================
   BONIVERA — DOCUMENTATION PAGE LOGIC
   Sumber data:
   1) Foto dokumentasi di tiap recap  -> data/recap.js (otomatis)
   2) Foto / video lainnya + filter   -> data/bella-gallery.js
   Panduan lengkap: README-GALLERY.md

   Video TikTok:
   - klik kartu        -> diputar di website (pemutar resmi TikTok)
   - label "TikTok ↗"  -> link langsung ke video (di kartu & di overlay)

   Preview kartu TikTok, urutan prioritas:
   1) cover lokal: `poster` di data, atau hasil tools/fetch-tiktok-covers.mjs (paling stabil)
   2) thumbnail otomatis lewat oEmbed (di-cache di browser)
   3) kartu placeholder bergaya (ikon, caption, tanggal)

   Foto Instagram:
   - isi `url` di data (link postingan asli) -> tombol "View on Instagram"
     muncul HANYA di lightbox (fullscreen), bukan di grid.

   Daftar isi file ini:
   1. Konfigurasi
   2. Helper umum
   3. TikTok (ID, thumbnail otomatis + cache + fallback)
   4. Data item (recap + gallery)
   5. Filter dropdown (type & category)
   5b. Sorting tanggal
   5c. Grid (jumlah kolom)
   6. Video overlay
   7. Render grid (+ tombol Instagram di lightbox)
   8. Init
   ============================================================ */
(function () {
  "use strict";

  /* ==========================================================
     1. KONFIGURASI
     ========================================================== */
  const data = window.BoniveraData || {};
  const recaps = data.recaps || [];
  const gallery = data.gallery || [];
  const config = data.galleryConfig || { types: [], categories: [] };

  // Foto dari recap selalu masuk grup ini.
  // Aturan: teks kategori recap (huruf besar, tanpa spasi) dicocokkan
  // berurutan, aturan pertama yang cocok dipakai.
  // Tambah baris baru di sini kalau punya sub kategori JKT48 baru.
  const RECAP_GROUP = "JKT48";
  const RECAP_DEFAULT_SUB = "JKT48EVENT";
  const RECAP_SUB_RULES = [
    ["THEATER", "THEATER"],
    ["OFFAIR", "OFFAIR"],
    ["ONAIR", "ONAIR"],
    ["OFC", "OFC"],
    ["JKT48", "JKT48EVENT"],
  ];

  // Thumbnail otomatis TikTok (hanya dipakai kalau `poster` kosong).
  // Dicoba berurutan; semuanya mengembalikan JSON oEmbed berisi `thumbnail_url`.
  // Sumber yang gagal terus sejak awal otomatis dilewati (lihat resolveTikTokThumb).
  const OEMBED = (u) => "https://www.tiktok.com/oembed?url=" + encodeURIComponent(u);
  const THUMB_SOURCES = [
    OEMBED,
    (u) => "https://noembed.com/embed?url=" + encodeURIComponent(u),
    (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(OEMBED(u)),
  ];
  const THUMB_TIMEOUT_MS = 6000;               // batas waktu per permintaan
  const THUMB_CONCURRENCY = 4;                 // jumlah permintaan bersamaan
  const THUMB_CACHE_KEY = "bonivera:tt-thumbs:v1";
  const THUMB_CACHE_TTL = 12 * 60 * 60 * 1000; // link thumbnail TikTok kedaluwarsa, simpan 12 jam

  // Pemutar resmi TikTok: https://developers.tiktok.com/doc/embed-player
  const TIKTOK_PLAYER = "https://www.tiktok.com/player/v1/";
  const TIKTOK_AUTOPLAY = true;             // putar otomatis saat overlay dibuka
  // Pratinjau langsung di kartu: pemutar TikTok tanpa kontrol (tidak diputar), dipasang
  // hanya saat kartu mendekati layar. Matikan (false) kalau terasa berat, lalu pakai
  // tools/fetch-tiktok-covers.mjs saja.
  const TIKTOK_LIVE_PREVIEW = true;
  const TIKTOK_READY_TIMEOUT_MS = 10000;    // tanpa kabar "ready" selama ini -> tampilkan pesan, bukan kotak putih
  const TIKTOK_FAIL_MSG =
    "This video can’t be played here. Use “Open on TikTok” to watch it." +
    (location.protocol === "file:"
      ? " Tip: this page is opened as a local file; TikTok’s player usually needs a real address (Live Server or hosting)."
      : "");

  // Cover hasil tools/fetch-tiktok-covers.mjs: { "<id video>": "assets/images/gallery/tiktok/<id>.jpg" }
  const posters = data.tiktokPosters || {};

  const TIKTOK_ICON_PATH =
    "M15.5 3c.35 2.1 1.55 3.45 3.5 3.8v3.05a7.7 7.7 0 0 1-3.48-1.08v6.1a6.13 6.13 0 1 1-5.3-6.08v3.1a3.05 3.05 0 1 0 2.25 2.95V3h3.03Z";

  // Link postingan Instagram yang dianggap valid untuk tombol di lightbox
  const INSTAGRAM_URL_RE = /^https?:\/\/(?:www\.)?instagram\.com\/\S+$/i;

  // Sorting tanggal: "newest" (terbaru dulu) / "oldest" (terlama dulu)
  const SORT_KEY = "bonivera:doc-sort:v1";
  const SORT_OPTIONS = [
    { id: "newest", label: "Newest to Oldest" },
    { id: "oldest", label: "Oldest to Newest" },
  ];
  const SORT_DEFAULT = "newest";

  // Grid: pilihan kolom per kelas layar. Angka desktop TIDAK dipakai di mobile.
  // Tanpa pilihan tersimpan, aturan breakpoint di documentation.css tetap berlaku
  // (4 desktop / 3 tablet / 2 mobile / 1 HP kecil).
  const GRID_KEY = "bonivera:doc-grid:v1";
  const GRID_OPTIONS = {
    desktop: [3, 4, 5],   // > 1100px
    tablet: [2, 3, 4],    // 761px – 1100px
    mobile: [1, 2],       // <= 760px
  };
  const MQ_MOBILE = "(max-width: 760px)";
  const MQ_TABLET = "(max-width: 1100px)";
  const MQ_PHONE = "(max-width: 420px)";

  /* ==========================================================
     2. HELPER UMUM
     ========================================================== */
  const $ = (id) => document.getElementById(id);

  const ready = (fn) =>
    document.readyState === "loading"
      ? document.addEventListener("DOMContentLoaded", fn)
      : fn();

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(value) {
    if (!value) return "";
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? window.Bonivera.formatDateLong(value)
      : String(value);
  }

  // Tanggal YYYY-MM-DD -> timestamp UTC. Kosong / format salah / tanggal mustahil -> NaN.
  function dateValue(raw) {
    if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return NaN;
    const [y, m, d] = raw.split("-").map(Number);
    const t = Date.UTC(y, m - 1, d);
    const dt = new Date(t);
    const ok =
      dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
    return ok ? t : NaN;
  }

  // Baca / tulis localStorage dengan aman (bisa diblokir / penuh)
  function readStore(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  function writeStore(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) { /* diblokir / penuh: abaikan */ }
  }

  const catKey = (group, sub) => `${group}:${sub}`;

  function mapRecapSub(category) {
    const n = String(category || "").toUpperCase().replace(/\s+/g, "");
    const rule = RECAP_SUB_RULES.find(([needle]) => n.includes(needle));
    return rule ? rule[1] : RECAP_DEFAULT_SUB;
  }

  // indeks cepat: "GROUP:SUB" -> { group, child }
  const leafIndex = new Map();
  (config.categories || []).forEach((g) => {
    (g.children || []).forEach((c) =>
      leafIndex.set(catKey(g.id, c.id), { group: g, child: c })
    );
  });

  /* ==========================================================
     3. TIKTOK
     ========================================================== */
  // Video dianggap TikTok kalau `url` berisi tiktok.com
  const isTikTok = (item) => /tiktok\.com/i.test(item.url || "");

  // Buang parameter pelacak (?is_from_webapp=1 dst.) dari link TikTok
  const tidyUrl = (url) =>
    /tiktok\.com/i.test(url || "") ? String(url).split(/[?#]/)[0] : url || "";

  // Embed butuh ID (angka setelah /video/). Link pendek vm.tiktok.com tidak punya ID.
  function getTikTokId(url) {
    const m = String(url || "").match(/\/(?:video|photo)\/(\d+)/);
    return m ? m[1] : "";
  }

  // Cover lokal untuk video TikTok (kalau sudah diunduh dengan tools/fetch-tiktok-covers.mjs)
  const posterFor = (url) => posters[getTikTokId(url)] || "";

  /* ---------- cache thumbnail di browser (localStorage) ---------- */
  let thumbStore = null;
  const thumbPromises = new Map();

  function loadThumbStore() {
    if (thumbStore) return thumbStore;
    try {
      thumbStore = JSON.parse(localStorage.getItem(THUMB_CACHE_KEY) || "{}") || {};
    } catch (e) {
      thumbStore = {};
    }
    return thumbStore;
  }

  function saveThumbStore() {
    try {
      localStorage.setItem(THUMB_CACHE_KEY, JSON.stringify(loadThumbStore()));
    } catch (e) { /* storage penuh / diblokir: abaikan */ }
  }

  function readCachedThumb(url) {
    const hit = loadThumbStore()[url];
    return hit && Date.now() - hit.ts < THUMB_CACHE_TTL ? hit.thumb : "";
  }

  function writeCachedThumb(url, thumb) {
    loadThumbStore()[url] = { thumb, ts: Date.now() };
    saveThumbStore();
  }

  function dropCachedThumb(url) {
    delete loadThumbStore()[url];
    thumbPromises.delete(url);
    saveThumbStore();
  }

  /* ---------- antrean permintaan ---------- */
  const thumbQueue = [];
  let thumbActive = 0;

  function thumbPump() {
    while (thumbActive < THUMB_CONCURRENCY && thumbQueue.length) {
      const job = thumbQueue.shift();
      thumbActive++;
      job().finally(() => {
        thumbActive--;
        thumbPump();
      });
    }
  }

  function thumbEnqueue(task) {
    return new Promise((resolve) => {
      thumbQueue.push(() => task().then(resolve));
      thumbPump();
    });
  }

  async function fetchJson(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), THUMB_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // Cache dulu, lalu coba tiap sumber sampai dapat thumbnail_url.
  // Sumber yang belum pernah berhasil dan sudah gagal 3x dilewati,
  // jadi tidak ada puluhan permintaan sia-sia (mis. kena CORS).
  // Tidak pernah melempar error; gagal = string kosong.
  const sourceStats = THUMB_SOURCES.map(() => ({ ok: 0, fail: 0 }));

  async function resolveTikTokThumb(url) {
    const cached = readCachedThumb(url);
    if (cached) return cached;

    for (let i = 0; i < THUMB_SOURCES.length; i++) {
      const stats = sourceStats[i];
      if (stats.ok === 0 && stats.fail >= 3) continue;

      const json = await fetchJson(THUMB_SOURCES[i](url));
      if (json && json.thumbnail_url) {
        stats.ok++;
        writeCachedThumb(url, json.thumbnail_url);
        return json.thumbnail_url;
      }
      stats.fail++;
    }
    return "";
  }

  function fetchTikTokThumb(url) {
    if (!thumbPromises.has(url)) {
      thumbPromises.set(url, thumbEnqueue(() => resolveTikTokThumb(url)));
    }
    return thumbPromises.get(url);
  }

  // Muat gambar di luar halaman dulu. JANGAN pakai loading="lazy" di sini:
  // gambar yang belum dipasang ke DOM tidak pernah dianggap "terlihat",
  // sehingga umumnya tidak pernah dimuat dan preview tidak muncul.
  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.alt = "";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer"; // CDN TikTok sering menolak hotlink ber-referrer
      img.onload = () => resolve(img.naturalWidth > 1 ? img : null);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  /* ==========================================================
     4. DATA ITEM
        Tambahan: rawDate / time (untuk sorting) dan order (urutan asli,
        dipakai sebagai pembeda kalau tanggal sama). `date` tetap teks
        yang ditampilkan. Data sumber tidak diubah.
     ========================================================== */
  function buildItems() {
    const items = [];

    // 1) dari recap (otomatis, selalu grup JKT48)
    recaps.forEach((r) => {
      (r.documentation || []).forEach((doc) => {
        items.push({
          type: doc.type === "video" ? "video" : "photo",
          src: doc.src || "",
          poster: doc.poster || posterFor(doc.url),
          url: tidyUrl(doc.url),
          caption: doc.caption || r.title,
          event: r.title,
          date: formatDate(r.date),
          rawDate: r.date || "",
          time: dateValue(r.date),
          order: items.length,
          group: RECAP_GROUP,
          sub: mapRecapSub(r.category),
        });
      });
    });

    // 2) dari data/bella-gallery.js
    gallery.forEach((g) => {
      const leaf = leafIndex.get(catKey(g.group, g.sub));
      items.push({
        type: g.type === "video" ? "video" : "photo",
        src: g.src || "",
        poster: g.poster || posterFor(g.url),
        url: tidyUrl(g.url),
        caption: g.caption || "",
        event: g.title || (leaf ? leaf.child.label : "BONIVERA"),
        date: formatDate(g.date),
        rawDate: g.date || "",
        time: dateValue(g.date),
        order: items.length,
        group: g.group || "",
        sub: g.sub || "",
      });
    });

    return items;
  }

  // URL Instagram valid untuk sebuah item foto, atau "" kalau tidak ada / tidak valid.
  // Dihitung dari item itu sendiri (bukan dari index terakhir), jadi tidak bisa tertukar foto.
  function instagramUrl(item) {
    if (!item || item.type !== "photo") return "";
    const u = String(item.url || "").trim();
    return INSTAGRAM_URL_RE.test(u) ? u : "";
  }

  /* ==========================================================
     ELEMEN & STATE
     ========================================================== */
  const grid = $("masonryGrid");
  const emptyState = $("docEmptyState");
  const lightboxEl = $("lightbox");
  const lightbox = window.Bonivera.createLightboxController($("lightbox"));
  const igLink = $("lightboxIg");

  const videoModal = $("videoModal");
  const videoPlayer = $("videoPlayer");
  const videoEmbed = $("videoEmbed");
  const videoCaption = $("videoCaption");
  const videoLink = $("videoLink");
  const videoClose = $("videoClose");
  const videoStatus = $("videoStatus");

  // Set kosong = "All"
  const typeSel = new Set();   // contoh: "photo"
  const catSel = new Set();    // contoh: "SOCIAL:INSTAGRAM"
  let allItems = [];
  let sortMode = SORT_DEFAULT; // "newest" | "oldest"
  let tiktokFrame = null;      // iframe pemutar TikTok yang sedang aktif
  let tiktokTimer = 0;         // timer menunggu kabar "ready" dari pemutar
  let lastTrigger = null;      // tombol yang membuka video (untuk fokus balik)

  // Lightbox: daftar foto yang sedang dibuka + posisi foto aktif
  let lbPhotos = [];
  let lbIndex = -1;

  function matches(item) {
    if (typeSel.size && !typeSel.has(item.type)) return false;
    if (catSel.size && !catSel.has(catKey(item.group, item.sub))) return false;
    return true;
  }

  /* ==========================================================
     5. FILTER DROPDOWN
     ========================================================== */
  const dropdowns = [];

  function createDropdown(rootId, toggleId) {
    const root = $(rootId);
    const toggle = $(toggleId);
    const api = {
      root,
      toggle,
      isOpen: () => root.classList.contains("is-open"),
      setOpen(open) {
        root.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      },
    };

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !api.isOpen();
      dropdowns.forEach((d) => d.setOpen(false));
      api.setOpen(willOpen);
    });

    dropdowns.push(api);
    return api;
  }

  function checkHtml(label, attrs, extraClass) {
    return (
      `<label class="check ${extraClass || ""}">` +
      `<input type="checkbox" ${attrs}><span>${esc(label)}</span></label>`
    );
  }

  const DIVIDER = '<div class="doc-filter__divider" aria-hidden="true"></div>';

  /* ---------- TYPE ---------- */
  function initTypeFilter() {
    const panel = $("docTypePanel");
    const label = $("docTypeLabel");
    const types = config.types || [];

    panel.innerHTML =
      checkHtml("All", 'data-kind="all"') +
      DIVIDER +
      types
        .map((t) => checkHtml(t.label, `data-kind="leaf" data-value="${esc(t.id)}"`))
        .join("");

    function sync() {
      panel.querySelectorAll("input").forEach((cb) => {
        cb.checked =
          cb.dataset.kind === "all" ? typeSel.size === 0 : typeSel.has(cb.dataset.value);
      });

      if (typeSel.size === 0) {
        label.textContent = "All types";
      } else if (typeSel.size === 1) {
        const [only] = typeSel;
        const t = types.find((x) => x.id === only);
        label.textContent = t ? t.label : only;
      } else {
        label.textContent = `${typeSel.size} types`;
      }
    }

    panel.addEventListener("change", (e) => {
      const cb = e.target;
      if (cb.type !== "checkbox") return;

      if (cb.dataset.kind === "all") typeSel.clear();
      else if (cb.checked) typeSel.add(cb.dataset.value);
      else typeSel.delete(cb.dataset.value);

      sync();
      renderGrid();
    });

    sync();
  }

  /* ---------- CATEGORY (induk + sub) ---------- */
  function initCategoryFilter() {
    const panel = $("docCategoryPanel");
    const label = $("docCategoryLabel");
    const groups = config.categories || [];
    const findGroup = (id) => groups.find((g) => g.id === id);

    panel.innerHTML =
      checkHtml("All", 'data-kind="all"') +
      DIVIDER +
      groups
        .map(
          (g) => `
        <div class="doc-filter__group">
          ${checkHtml(g.label, `data-kind="group" data-group="${esc(g.id)}"`, "check--group")}
          ${(g.children || [])
            .map((c) =>
              checkHtml(
                c.label,
                `data-kind="leaf" data-value="${esc(catKey(g.id, c.id))}"`,
                "check--child"
              )
            )
            .join("")}
        </div>`
        )
        .join("");

    function labelText() {
      if (catSel.size === 0) return "All categories";

      if (catSel.size === 1) {
        const [only] = catSel;
        const leaf = leafIndex.get(only);
        return leaf ? leaf.child.label : only;
      }

      // semua anak dari satu grup terpilih -> tampilkan nama grup
      const full = groups.filter(
        (g) =>
          (g.children || []).length &&
          g.children.every((c) => catSel.has(catKey(g.id, c.id)))
      );
      if (full.length === 1 && catSel.size === full[0].children.length) {
        return full[0].label;
      }
      return `${catSel.size} categories`;
    }

    function sync() {
      panel.querySelectorAll("input").forEach((cb) => {
        const kind = cb.dataset.kind;

        if (kind === "all") {
          cb.checked = catSel.size === 0;
          cb.indeterminate = false;
        } else if (kind === "group") {
          const g = findGroup(cb.dataset.group);
          const kids = g ? g.children || [] : [];
          const n = kids.filter((c) => catSel.has(catKey(g.id, c.id))).length;
          cb.checked = kids.length > 0 && n === kids.length;
          cb.indeterminate = n > 0 && n < kids.length;
        } else {
          cb.checked = catSel.has(cb.dataset.value);
        }
      });
      label.textContent = labelText();
    }

    panel.addEventListener("change", (e) => {
      const cb = e.target;
      if (cb.type !== "checkbox") return;
      const kind = cb.dataset.kind;

      if (kind === "all") {
        catSel.clear();
      } else if (kind === "group") {
        const g = findGroup(cb.dataset.group);
        (g ? g.children || [] : []).forEach((c) => {
          const key = catKey(g.id, c.id);
          if (cb.checked) catSel.add(key);
          else catSel.delete(key);
        });
      } else if (cb.checked) {
        catSel.add(cb.dataset.value);
      } else {
        catSel.delete(cb.dataset.value);
      }

      sync();
      renderGrid();
    });

    sync();
  }

  /* ==========================================================
     5b. SORTING TANGGAL
         Bekerja pada SALINAN hasil filter (allItems tidak pernah diubah).
         Tanggal kosong / tidak valid selalu di paling akhir, apa pun arahnya.
         Tanggal sama -> urutan asli di data dipertahankan.
     ========================================================== */
  function sortItems(list) {
    const dir = sortMode === "oldest" ? 1 : -1;
    return list.slice().sort((a, b) => {
      const aBad = Number.isNaN(a.time);
      const bBad = Number.isNaN(b.time);
      if (aBad && bBad) return a.order - b.order;
      if (aBad) return 1;
      if (bBad) return -1;
      if (a.time !== b.time) return (a.time - b.time) * dir;
      return a.order - b.order;
    });
  }

  function initSortFilter() {
    const panel = $("docSortPanel");
    const label = $("docSortLabel");
    if (!panel || !label) return;

    const saved = readStore(SORT_KEY);
    if (SORT_OPTIONS.some((o) => o.id === saved)) sortMode = saved;

    panel.innerHTML = SORT_OPTIONS.map(
      (o) =>
        `<label class="check"><input type="radio" name="docSort" value="${esc(o.id)}">` +
        `<span>${esc(o.label)}</span></label>`
    ).join("");

    function sync() {
      panel.querySelectorAll("input").forEach((rb) => {
        rb.checked = rb.value === sortMode;
      });
      const opt = SORT_OPTIONS.find((o) => o.id === sortMode);
      label.textContent = opt ? opt.label : "Sort by date";
    }

    panel.addEventListener("change", (e) => {
      const rb = e.target;
      if (rb.type !== "radio") return;

      sortMode = rb.value;
      writeStore(SORT_KEY, sortMode);
      sync();
      renderGrid();

      const dd = dropdowns.find((d) => d.root.id === "docSortFilter");
      if (dd) dd.setOpen(false);
    });

    sync();
  }

  /* ==========================================================
     5c. GRID (JUMLAH KOLOM)
         Hanya menambah data-cols + --doc-cols pada .masonry. Tidak
         me-render ulang kartu, jadi cepat dan tidak mengganggu pratinjau.
         Kalau belum ada pilihan tersimpan untuk kelas layar ini,
         atribut tidak dipasang dan CSS breakpoint lama yang berlaku.
     ========================================================== */
  const mqMobile = window.matchMedia(MQ_MOBILE);
  const mqTablet = window.matchMedia(MQ_TABLET);
  const mqPhone = window.matchMedia(MQ_PHONE);

  function gridClass() {
    if (mqMobile.matches) return "mobile";
    if (mqTablet.matches) return "tablet";
    return "desktop";
  }

  // Sama dengan default di CSS lama
  function gridDefault(cls) {
    if (cls === "desktop") return 4;
    if (cls === "tablet") return 3;
    return mqPhone.matches ? 1 : 2;
  }

  function loadGridPrefs() {
    try {
      const obj = JSON.parse(readStore(GRID_KEY) || "{}");
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      return {};
    }
  }

  let gridPrefs = {};

  function applyGrid() {
    const btns = $("docGridBtns");
    if (!grid || !btns) return;

    const cls = gridClass();
    const options = GRID_OPTIONS[cls];
    const saved = Number(gridPrefs[cls]);
    const hasPref = options.includes(saved);

    // pilihan tidak valid untuk kelas ini (mis. angka desktop di mobile) -> diabaikan
    if (hasPref) {
      grid.dataset.cols = String(saved);
      grid.style.setProperty("--doc-cols", String(saved));
    } else {
      grid.removeAttribute("data-cols");
      grid.style.removeProperty("--doc-cols");
    }

    const active = hasPref ? saved : gridDefault(cls);
    btns.innerHTML = options
      .map(
        (n) =>
          `<button type="button" class="doc-grid-btn" data-cols="${n}" ` +
          `aria-pressed="${n === active}" aria-label="${n} ${n === 1 ? "column" : "columns"}" ` +
          `title="${n} ${n === 1 ? "column" : "columns"}">${n}</button>`
      )
      .join("");
  }

  function initGridControl() {
    const btns = $("docGridBtns");
    if (!btns) return;

    gridPrefs = loadGridPrefs();

    btns.addEventListener("click", (e) => {
      const btn = e.target.closest(".doc-grid-btn");
      if (!btn) return;
      gridPrefs[gridClass()] = Number(btn.dataset.cols);
      writeStore(GRID_KEY, JSON.stringify(gridPrefs));
      applyGrid();
    });

    // lebar layar berubah (rotasi HP, resize jendela) -> pilihan kolom ikut menyesuaikan
    [mqMobile, mqTablet, mqPhone].forEach((mq) => {
      if (mq.addEventListener) mq.addEventListener("change", applyGrid);
      else if (mq.addListener) mq.addListener(applyGrid);
    });

    applyGrid();
  }

  /* ==========================================================
     6. VIDEO OVERLAY
        - TikTok  : embed resmi (iframe) + tombol "Open on TikTok"
        - Lainnya : video lokal (<video>)
     ========================================================== */
  function setStatus(text) {
    if (!videoStatus) return;
    videoStatus.textContent = text;
    videoStatus.hidden = !text;
  }

  function showOverlay(caption) {
    videoCaption.textContent = caption || "";
    videoModal.classList.add("is-open");
    videoModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    videoClose.focus();
  }

  function resetPlayers() {
    videoPlayer.pause();
    videoPlayer.removeAttribute("src");
    videoPlayer.removeAttribute("poster");
    videoPlayer.load();
    clearTimeout(tiktokTimer);
    tiktokFrame = null;
    setStatus("");
    videoEmbed.innerHTML = "";   // hapus iframe -> video TikTok berhenti
    videoEmbed.hidden = true;
    videoLink.hidden = true;
    videoPlayer.hidden = false;
  }

  function openTikTok(item) {
    const id = getTikTokId(item.url);

    // link pendek (vm./vt.tiktok.com) tidak punya ID -> tidak bisa diputar di sini, buka langsung
    if (!id) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }

    resetPlayers();
    videoPlayer.hidden = true;

    const params = new URLSearchParams({
      autoplay: TIKTOK_AUTOPLAY ? "1" : "0",
      rel: "0",
      description: "0",
      music_info: "0",
      closed_caption: "0",
      native_context_menu: "0",
    });
    const frame = document.createElement("iframe");
    frame.src = `${TIKTOK_PLAYER}${id}?${params}`;
    frame.title = item.caption || item.event || "TikTok video";
    frame.allow = "autoplay; fullscreen; encrypted-media";
    frame.allowFullscreen = true;
    videoEmbed.appendChild(frame);
    videoEmbed.hidden = false;
    tiktokFrame = frame;

    videoLink.href = item.url;
    videoLink.hidden = false;

    // pemutar resmi mengirim "onPlayerReady" lewat postMessage; kalau tidak datang -> pesan jelas
    setStatus("Loading video…");
    tiktokTimer = setTimeout(() => setStatus(TIKTOK_FAIL_MSG), TIKTOK_READY_TIMEOUT_MS);

    showOverlay(item.caption || item.event);
  }

  // Kabar dari pemutar TikTok: siap / mulai diputar / error
  function onPlayerMessage(e) {
    if (e.origin !== "https://www.tiktok.com") return;

    let msg = e.data;
    if (typeof msg === "string") {
      try { msg = JSON.parse(msg); } catch (err) { return; }
    }
    if (!msg || !msg["x-tiktok-player"]) return;

    // pratinjau di kartu: tampilkan iframe-nya begitu pemutar siap
    if (msg.type === "onPlayerReady") {
      for (const f of previewFrames) {
        if (f.contentWindow === e.source) {
          f.classList.add("is-ready");
          return;
        }
      }
    }

    // pemutar di overlay
    if (!tiktokFrame || e.source !== tiktokFrame.contentWindow) return;

    if (msg.type === "onPlayerReady" || (msg.type === "onStateChange" && msg.value === 1)) {
      clearTimeout(tiktokTimer);
      setStatus("");
    } else if (msg.type === "onPlayerError") {
      const v = msg.value;
      const code = v && typeof v === "object" ? v.errorCode : v;
      // 3002 = autoplay diblokir browser: pemutar tetap tampil, tinggal tekan play
      if (code !== 3002) {
        clearTimeout(tiktokTimer);
        setStatus(TIKTOK_FAIL_MSG);
      }
    }
  }

  function openLocalVideo(item) {
    resetPlayers();

    videoPlayer.poster = item.poster || "";
    videoPlayer.src = item.src;
    showOverlay(item.caption || item.event);

    const p = videoPlayer.play();
    if (p && p.catch) p.catch(() => {});
  }

  function openVideo(item) {
    if (isTikTok(item)) return openTikTok(item);
    if (item.src) return openLocalVideo(item);
    // fallback: hanya punya url non-TikTok
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
  }

  function closeVideo() {
    if (!videoModal.classList.contains("is-open")) return;

    resetPlayers();
    videoModal.classList.remove("is-open");
    videoModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (lastTrigger && lastTrigger.isConnected) lastTrigger.focus();
    lastTrigger = null;
  }

  /* ==========================================================
     6b. TOMBOL INSTAGRAM DI LIGHTBOX
         Controller lightbox ada di shared.js (tidak diubah). Posisi foto
         aktif dilacak dari counter "n / total" yang dikelola controller,
         lalu diverifikasi dengan src gambar yang tampil. Tombol hanya
         ditampilkan kalau item aktif punya url Instagram yang valid.
     ========================================================== */
  function absoluteSrc(src) {
    try {
      return new URL(src, document.baseURI).href;
    } catch (e) {
      return src || "";
    }
  }

  function syncLightboxIndex() {
    if (!lbPhotos.length) return;

    const counter = lightboxEl.querySelector('[data-lightbox="counter"]');
    const imgEl = lightboxEl.querySelector('[data-lightbox="img"]');

    // 1) posisi dari counter "n / total" (hanya dipercaya kalau total cocok)
    const m = counter && counter.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    if (m && Number(m[2]) === lbPhotos.length) {
      const i = Number(m[1]) - 1;
      if (i >= 0 && i < lbPhotos.length) lbIndex = i;
    }

    // 2) verifikasi dengan gambar yang benar-benar tampil
    const shown = imgEl ? imgEl.currentSrc || imgEl.src : "";
    const current = lbPhotos[lbIndex];
    if (shown && current && absoluteSrc(current.src) !== shown) {
      let best = -1;
      for (let i = 0; i < lbPhotos.length; i++) {
        if (absoluteSrc(lbPhotos[i].src) === shown) {
          if (best === -1 || Math.abs(i - lbIndex) < Math.abs(best - lbIndex)) best = i;
        }
      }
      if (best !== -1) lbIndex = best;
    }

    updateInstagramLink();
  }

  function updateInstagramLink() {
    if (!igLink) return;
    const url = instagramUrl(lbPhotos[lbIndex]);
    if (url) {
      igLink.href = url;
      igLink.hidden = false;
    } else {
      igLink.hidden = true;
      igLink.removeAttribute("href");
    }
  }

  function initInstagramLink() {
    if (!igLink || !lightboxEl) return;

    // klik tombol tidak boleh dianggap klik "area gelap" yang menutup lightbox
    igLink.addEventListener("click", (e) => e.stopPropagation());

    // prev / next / buka: counter & gambar berubah -> sinkronkan tombol
    // (atribut yang diamati TIDAK termasuk href/hidden, jadi tidak ada loop)
    new MutationObserver(syncLightboxIndex).observe(lightboxEl, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["src", "class", "aria-hidden"],
    });
  }

  function openPhoto(photos, item) {
    lbPhotos = photos;
    lbIndex = photos.indexOf(item);
    updateInstagramLink();                       // posisi awal sudah pasti benar
    lightbox.open(photos, lbIndex, { title: item.event });
    syncLightboxIndex();                         // jaga-jaga kalau controller mengubah posisi
  }

  /* ==========================================================
     7. RENDER GRID
     ========================================================== */

  // Kartu placeholder bergaya: ikon TikTok + caption + tanggal.
  // Sudut gradien sedikit berbeda per video supaya grid tidak monoton.
  // Styling: .masonry__placeholder--rich (lihat documentation.css).
  function placeholderHtml(item, hydrate) {
    const id = getTikTokId(item.url) || item.src || item.caption;
    const seed = String(id).split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const angle = 120 + (seed % 70);
    const title = item.caption || item.event;
    const attr = hydrate ? ` data-tiktok-thumb="${esc(item.url)}"` : "";

    return (
      `<span class="masonry__placeholder masonry__placeholder--rich"${attr} style="--ph-angle:${angle}deg">` +
      `<svg class="masonry__ph-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${TIKTOK_ICON_PATH}" fill="currentColor"/></svg>` +
      `<span class="masonry__ph-title">${esc(title)}</span>` +
      (item.date ? `<span class="masonry__ph-date">${esc(item.date)}</span>` : "") +
      `</span>`
    );
  }

  function thumbHtml(item) {
    const alt = esc(item.caption);
    const img = (src) =>
      `<img src="${esc(src)}" alt="${alt}" loading="lazy" width="600" height="750">`;

    if (item.type === "photo") return img(item.src);
    if (item.poster) return img(item.poster);
    if (isTikTok(item)) return placeholderHtml(item, true); // thumbnail menyusul (hydrate)
    if (item.src) {
      return `<video src="${esc(item.src)}#t=0.5" preload="metadata" muted playsinline tabindex="-1"></video>`;
    }
    return placeholderHtml(item, false);
  }

  // Ganti satu placeholder dengan thumbnail kalau berhasil diambil.
  // Gagal -> placeholder bergaya tetap tampil dan animasi kilau dihentikan.
  async function hydrateOne(ph, url, canRetry) {
    const thumb = await fetchTikTokThumb(url);
    const img = thumb ? await preloadImage(thumb) : null;
    if (!ph.isConnected) return;

    if (img) {
      ph.replaceWith(img);
      return;
    }
    if (thumb && canRetry) {          // link thumbnail kedaluwarsa -> ambil ulang sekali
      dropCachedThumb(url);
      return hydrateOne(ph, url, false);
    }
    ph.removeAttribute("data-tiktok-thumb");
  }

  function hydrateTikTokThumbs() {
    grid.querySelectorAll("[data-tiktok-thumb]").forEach((ph) => {
      if (ph.dataset.hydrating) return;
      ph.dataset.hydrating = "1";
      hydrateOne(ph, ph.dataset.tiktokThumb, true);
    });
  }

  // Poster lokal gagal dimuat (path salah / file belum di-upload)
  // -> jatuh ke placeholder bergaya, bukan gambar rusak.
  function attachPosterFallback(btn, item) {
    if (item.type !== "video" || !item.poster) return;
    const img = btn.querySelector("img");
    if (!img) return;
    img.addEventListener(
      "error",
      () => {
        const tmp = document.createElement("div");
        tmp.innerHTML = placeholderHtml(item, isTikTok(item));
        img.replaceWith(tmp.firstChild);
        hydrateTikTokThumbs();
      },
      { once: true }
    );
  }

  /* ---------- pratinjau langsung TikTok di kartu ---------- */
  const previewFrames = new Set();
  const PREVIEW_PARAMS = new URLSearchParams({
    autoplay: "0",
    controls: "0",
    muted: "1",
    rel: "0",
    description: "0",
    music_info: "0",
    closed_caption: "0",
    native_context_menu: "0",
  }).toString();

  function mountPreview(btn) {
    if (btn.querySelector(".masonry__preview")) return;

    const frame = document.createElement("iframe");
    frame.className = "masonry__preview";
    frame.src = `${TIKTOK_PLAYER}${btn.dataset.tiktokPreview}?${PREVIEW_PARAMS}`;
    frame.title = "";
    frame.tabIndex = -1;
    frame.setAttribute("aria-hidden", "true");

    // di atas placeholder, di bawah ikon play / caption
    const ph = btn.querySelector(".masonry__placeholder");
    if (ph) ph.after(frame);
    else btn.prepend(frame);
    previewFrames.add(frame);
  }

  function unmountPreview(btn) {
    const frame = btn.querySelector(".masonry__preview");
    if (!frame) return;
    previewFrames.delete(frame);
    frame.remove();
  }

  // Pasang pratinjau hanya untuk kartu yang dekat layar; copot lagi kalau sudah jauh (hemat memori)
  const previewObserver =
    TIKTOK_LIVE_PREVIEW && "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) =>
            entries.forEach((en) =>
              en.isIntersecting ? mountPreview(en.target) : unmountPreview(en.target)
            ),
          { rootMargin: "400px 0px" }
        )
      : null;

  function observePreviews() {
    if (!previewObserver) return;
    grid.querySelectorAll("[data-tiktok-preview]").forEach((btn) => previewObserver.observe(btn));
  }

  function resetPreviews() {
    if (previewObserver) previewObserver.disconnect();
    previewFrames.clear();
  }

  function createCard(item, photos) {
    const isVideo = item.type === "video";
    const label = item.caption || item.event;

    // Pembungkus <div>: link <a> tidak boleh berada di dalam <button>
    const cell = document.createElement("div");
    cell.className = "masonry__cell reveal in-view";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "masonry__item" + (isVideo ? " masonry__item--video" : "");
    btn.setAttribute("aria-label", `${isVideo ? "Play video" : "Open photo"}: ${label}`);
    btn.innerHTML = `
      ${thumbHtml(item)}
      ${isVideo
        ? '<span class="masonry__play" aria-hidden="true">▶</span>'
        : '<span class="masonry__zoom" aria-hidden="true">⤢</span>'}
      <span class="masonry__overlay">
        <span class="masonry__caption">${esc(item.event)}</span>
        ${item.date ? `<span class="masonry__date">${esc(item.date)}</span>` : ""}
      </span>
    `;
    // kartu TikTok tanpa poster -> boleh dapat pratinjau langsung (dipasang saat mendekati layar)
    if (TIKTOK_LIVE_PREVIEW && isVideo && isTikTok(item) && !item.poster && getTikTokId(item.url)) {
      btn.dataset.tiktokPreview = getTikTokId(item.url);
    }
    cell.appendChild(btn);

    // Link langsung ke TikTok: bisa diklik tanpa membuka overlay
    if (isVideo && isTikTok(item)) {
      cell.insertAdjacentHTML(
        "beforeend",
        `<a class="masonry__out" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" ` +
          `aria-label="Open on TikTok: ${esc(label)}">TikTok ↗</a>`
      );
    }

    attachPosterFallback(btn, item);

    btn.addEventListener("click", () => {
      if (isVideo) {
        lastTrigger = btn;
        openVideo(item);
      } else {
        openPhoto(photos, item);
      }
    });

    return cell;
  }

  function renderGrid() {
    // filter -> lalu urutkan SALINANNYA; daftar foto lightbox mengikuti urutan ini
    const filtered = sortItems(allItems.filter(matches));
    const photos = filtered.filter((it) => it.type === "photo");

    resetPreviews();
    grid.innerHTML = "";
    emptyState.hidden = filtered.length > 0;
    if (!filtered.length) return;

    const frag = document.createDocumentFragment();
    filtered.forEach((item) => frag.appendChild(createCard(item, photos)));
    grid.appendChild(frag);

    hydrateTikTokThumbs();
    observePreviews();
  }

  /* ==========================================================
     8. INIT
     ========================================================== */
  ready(() => {
    allItems = buildItems();

    createDropdown("docTypeFilter", "docTypeToggle");
    createDropdown("docCategoryFilter", "docCategoryToggle");
    createDropdown("docSortFilter", "docSortToggle");
    initTypeFilter();
    initCategoryFilter();
    initSortFilter();
    initGridControl();
    initInstagramLink();

    // klik di luar -> tutup semua dropdown
    document.addEventListener("click", (e) => {
      dropdowns.forEach((d) => {
        if (!d.root.contains(e.target)) d.setOpen(false);
      });
    });

    // Escape -> tutup video, atau dropdown yang terbuka
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;

      if (videoModal.classList.contains("is-open")) {
        closeVideo();
        return;
      }
      const open = dropdowns.find((d) => d.isOpen());
      if (open) {
        open.setOpen(false);
        open.toggle.focus();
      }
    });

    // pemutar TikTok memberi kabar lewat postMessage
    window.addEventListener("message", onPlayerMessage);

    // video overlay: tombol close & klik area gelap
    videoClose.addEventListener("click", closeVideo);
    videoModal.addEventListener("click", (e) => {
      if (e.target === videoModal) closeVideo();
    });

    renderGrid();
  });
})();