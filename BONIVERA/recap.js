/* ============================================================
   BONIVERA — RECAP PAGE LOGIC
   Daftar isi:
   1. Data, elemen & state
   2. Helper
   3. Multi-select dropdown (kategori & setlist)
   4. Opsi setlist & filter tanggal
   5. Filtering
   6. Render timeline
   7. Init filter, tanggal, reset, sort
   8. Filter otomatis dari URL (?setlist=...)
   9. Modal detail recap
   10. Deep link (#recap-<id>) & inisialisasi
   ============================================================ */
(function () {
  "use strict";

  /* ==========================================================
     1. DATA, ELEMEN & STATE
     ========================================================== */
  const recaps = (window.BoniveraData && window.BoniveraData.recaps) || [];

  const timelineEl = document.getElementById("timeline");
  const emptyState = document.getElementById("recapEmptyState");
  const emptyText = document.getElementById("recapEmptyText");
  const countEl = document.getElementById("recapCount");

  const recapModalOverlay = document.getElementById("recapModal");
  const lightboxOverlay = document.getElementById("lightbox");
  const lightbox = window.Bonivera.createLightboxController(lightboxOverlay);

  const sortSelect = document.getElementById("recapSort");
  const daySelect = document.getElementById("recapDay");
  const monthSelect = document.getElementById("recapMonth");
  const yearSelect = document.getElementById("recapYear");
  const resetBtn = document.getElementById("recapReset");

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Set kosong = "All"
  const activeFilters = new Set();   // kategori
  const activeSetlists = new Set();  // sub filter setlist (khusus THEATER)
  const dateFilter = { day: "", month: "", year: "" };
  let activeSort = "newest";

  let categoryDD = null;
  let setlistDD = null;

  /* ==========================================================
     2. HELPER
     ========================================================== */

  // Normalisasi judul setlist: semua teks dalam [ ... ] dibuang.
  // Aturan yang sama dipakai di about-bella.js (kartu Setlist Breakdown).
  const cleanSetlistName = (text) =>
    String(text || "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  // Setlist sebuah entry: field `setlist`, fallback ke `title`
  const setlistOf = (entry) => cleanSetlistName(entry.setlist || entry.title);

  // Pecah "YYYY-MM-DD" tanpa new Date() supaya aman dari masalah timezone
  function parseYMD(str) {
    const [y, m, d] = String(str || "").split("-").map(Number);
    return { y: y || 0, m: m || 0, d: d || 0 };
  }

  // Teks label yang tampil untuk sebuah value checkbox
  function labelForValue(panel, value) {
    for (const input of panel.querySelectorAll("input")) {
      if (input.value === value) return input.nextElementSibling.textContent;
    }
    return value;
  }

  /* ==========================================================
     3. MULTI-SELECT DROPDOWN (kategori & setlist)
     ========================================================== */
  const dropdowns = [];

  function createDropdown({ root, toggle, panel, label, set, allText, pluralText, onChange }) {
    const dd = { root, toggle, panel, label, set };

    dd.setOpen = (open) => {
      root.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };

    dd.sync = () => {
      panel.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.checked = cb.value === "ALL" ? set.size === 0 : set.has(cb.value);
      });

      const n = set.size;
      if (n === 0) {
        label.textContent = allText;
      } else if (n === 1) {
        const text = labelForValue(panel, [...set][0]);
        label.textContent = text.length > 26 ? text.slice(0, 24) + "…" : text;
      } else {
        label.textContent = `${n} ${pluralText}`;
      }
    };

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !root.classList.contains("is-open");
      dropdowns.forEach((d) => d.setOpen(false));
      dd.setOpen(willOpen);
    });

    panel.addEventListener("change", (e) => {
      const cb = e.target;
      if (cb.type !== "checkbox") return;

      if (cb.value === "ALL") set.clear();
      else if (cb.checked) set.add(cb.value);
      else set.delete(cb.value);

      dd.sync();
      onChange();
    });

    dropdowns.push(dd);
    return dd;
  }

  /* ==========================================================
     4. OPSI SETLIST & FILTER TANGGAL
     ========================================================== */
  function buildSetlistOptions() {
    const panel = document.getElementById("setlistFilterPanel");
    panel.innerHTML = "";

    const names = [
      ...new Set(
        recaps.filter((r) => r.category === "THEATER").map(setlistOf).filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));

    const makeCheck = (value, text, checked) => {
      const lbl = document.createElement("label");
      lbl.className = "check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = value;
      input.checked = !!checked;
      const span = document.createElement("span");
      span.textContent = text;
      lbl.append(input, span);
      return lbl;
    };

    panel.appendChild(makeCheck("ALL", "All setlists", true));
    names.forEach((name) => panel.appendChild(makeCheck(name, name, false)));
  }

  // Sub filter setlist hanya tampil kalau THEATER dipilih
  function updateSetlistVisibility() {
    const wrap = document.getElementById("setlistFilter");
    const show = activeFilters.has("THEATER");
    wrap.hidden = !show;
    if (!show) {
      activeSetlists.clear();
      setlistDD.setOpen(false);
      setlistDD.sync();
    }
  }

  function buildDateOptions() {
    for (let d = 1; d <= 31; d++) {
      daySelect.insertAdjacentHTML("beforeend", `<option value="${d}">${d}</option>`);
    }
    MONTHS.forEach((name, i) => {
      monthSelect.insertAdjacentHTML("beforeend", `<option value="${i + 1}">${name}</option>`);
    });
    const years = [...new Set(recaps.map((r) => parseYMD(r.date).y).filter(Boolean))].sort((a, b) => b - a);
    years.forEach((y) => {
      yearSelect.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
    });
  }

  /* ==========================================================
     5. FILTERING
     ========================================================== */
  function hasActiveFilters() {
    return (
      activeFilters.size > 0 ||
      activeSetlists.size > 0 ||
      dateFilter.day || dateFilter.month || dateFilter.year
    );
  }

  function matches(entry) {
    // kategori
    if (activeFilters.size && !activeFilters.has(entry.category)) return false;

    // setlist (hanya berlaku untuk entry THEATER)
    if (entry.category === "THEATER" && activeSetlists.size && !activeSetlists.has(setlistOf(entry))) {
      return false;
    }

    // tanggal / bulan / tahun
    const { y, m, d } = parseYMD(entry.date);
    if (dateFilter.day && d !== Number(dateFilter.day)) return false;
    if (dateFilter.month && m !== Number(dateFilter.month)) return false;
    if (dateFilter.year && y !== Number(dateFilter.year)) return false;

    return true;
  }

  /* ==========================================================
     6. RENDER TIMELINE
     ========================================================== */
  function renderTimeline() {
    if (!timelineEl) return;
    timelineEl.innerHTML = "";

    resetBtn.hidden = !hasActiveFilters();

    const filtered = recaps.filter(matches);
    const sorted = [...filtered].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`);
      const db = new Date(`${b.date}T${b.time || "00:00"}`);
      return activeSort === "oldest" ? da - db : db - da;
    });

    countEl.textContent = hasActiveFilters()
      ? `${sorted.length} of ${recaps.length} recaps`
      : "";

    if (!sorted.length) {
      emptyText.textContent = recaps.length
        ? "No recaps match these filters. Try changing or resetting them."
        : "No recaps yet — Bella's completed activities will appear here.";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const frag = document.createDocumentFragment();
    sorted.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "timeline__item reveal in-view";
      li.id = `recap-${entry.id}`;
      const logoSrc = entry.logo || "assets/images/bonivera/bonivera-logo.png";
      const thumbHtml = `<span class="timeline__thumb"><img src="${logoSrc}" alt="" loading="lazy"></span>`;

      li.innerHTML = `
        <span class="timeline__node" aria-hidden="true"></span>
        <button class="timeline__card card card--hover" data-id="${entry.id}" aria-label="View recap: ${entry.title}">
          <div class="timeline__card-main">
            <div class="timeline__card-top">
              <span class="tag">${entry.category}</span>
            </div>
            <h3 class="timeline__title">${entry.title}</h3>
            <div class="timeline__meta">
              <span>📅 ${window.Bonivera.formatDateLong(entry.date)}</span>
              <span>🕒 ${window.Bonivera.formatTime12(entry.time)}</span>
              <span>📍 ${entry.location}</span>
            </div>
          </div>
          ${thumbHtml}
        </button>
      `;
      frag.appendChild(li);
    });
    timelineEl.appendChild(frag);

    timelineEl.querySelectorAll(".timeline__card").forEach((btn) => {
      btn.addEventListener("click", () => openRecapDetail(Number(btn.dataset.id)));
    });
  }

  /* ==========================================================
     7. INIT FILTER, TANGGAL, RESET, SORT
     ========================================================== */
  function initFilter() {
    const filterRoot = document.getElementById("recapFilter");
    if (!filterRoot) return;

    categoryDD = createDropdown({
      root: filterRoot,
      toggle: document.getElementById("recapFilterToggle"),
      panel: document.getElementById("recapFilterPanel"),
      label: document.getElementById("recapFilterLabel"),
      set: activeFilters,
      allText: "All categories",
      pluralText: "categories",
      onChange: () => {
        updateSetlistVisibility();
        renderTimeline();
      },
    });

    buildSetlistOptions();
    setlistDD = createDropdown({
      root: document.getElementById("setlistFilter"),
      toggle: document.getElementById("setlistFilterToggle"),
      panel: document.getElementById("setlistFilterPanel"),
      label: document.getElementById("setlistFilterLabel"),
      set: activeSetlists,
      allText: "All setlists",
      pluralText: "setlists",
      onChange: renderTimeline,
    });

    // klik di luar -> tutup semua dropdown
    document.addEventListener("click", (e) => {
      dropdowns.forEach((d) => {
        if (!d.root.contains(e.target)) d.setOpen(false);
      });
    });

    // Escape -> tutup
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      dropdowns.forEach((d) => {
        if (d.root.classList.contains("is-open")) {
          d.setOpen(false);
          d.toggle.focus();
        }
      });
    });

    categoryDD.sync();
    setlistDD.sync();
    updateSetlistVisibility();
  }

  function initDateFilter() {
    buildDateOptions();

    daySelect.addEventListener("change", () => { dateFilter.day = daySelect.value; renderTimeline(); });
    monthSelect.addEventListener("change", () => { dateFilter.month = monthSelect.value; renderTimeline(); });
    yearSelect.addEventListener("change", () => { dateFilter.year = yearSelect.value; renderTimeline(); });
  }

  function initReset() {
    resetBtn.addEventListener("click", () => {
      activeFilters.clear();
      activeSetlists.clear();
      dateFilter.day = dateFilter.month = dateFilter.year = "";
      daySelect.value = monthSelect.value = yearSelect.value = "";

      categoryDD.sync();
      setlistDD.sync();
      updateSetlistVisibility();
      renderTimeline();

      // buang ?setlist=... dari URL supaya tidak terbawa saat refresh
      history.replaceState(null, "", window.location.pathname + window.location.hash);
    });
  }

  function initSort() {
    if (!sortSelect) return;
    sortSelect.addEventListener("change", () => {
      activeSort = sortSelect.value;
      renderTimeline();
    });
  }

  /* ==========================================================
     8. FILTER OTOMATIS DARI URL: recap.html?setlist=<judul>
     Dipakai kartu "Theater Setlist Breakdown" di About Bella.
     ========================================================== */
  function applyUrlSetlist() {
    const wanted = new URLSearchParams(window.location.search).get("setlist");
    if (!wanted) return;

    const key = cleanSetlistName(wanted).toLowerCase();
    const input = [...document.querySelectorAll("#setlistFilterPanel input")]
      .find((i) => i.value !== "ALL" && i.value.toLowerCase() === key);
    if (!input) return;

    activeFilters.add("THEATER");
    activeSetlists.add(input.value);

    categoryDD.sync();
    updateSetlistVisibility();   // tampilkan dropdown setlist (THEATER aktif)
    setlistDD.sync();
  }

  /* ==========================================================
     9. MODAL DETAIL RECAP
     ========================================================== */
  function openRecapDetail(id) {
    const entry = recaps.find((r) => r.id === id);
    if (!entry) return;

    document.getElementById("recapModalLogo").src = entry.logo || "assets/images/bonivera/bonivera-logo.png";
    document.getElementById("recapModalCategory").textContent = entry.category;
    document.getElementById("recapModalTitle").textContent = entry.title;
    document.getElementById("recapModalDate").textContent = window.Bonivera.formatDateLong(entry.date);
    document.getElementById("recapModalDay").textContent = window.Bonivera.dayNameOf(entry.date);
    document.getElementById("recapModalTime").textContent = window.Bonivera.formatTime12(entry.time);
    document.getElementById("recapModalLocation").textContent = entry.location;
    document.getElementById("recapModalDescription").textContent = entry.description || "";

    const songsEl = document.getElementById("recapModalSongs");
    songsEl.innerHTML = "";
    if (entry.songs && entry.songs.length) {
      entry.songs.forEach((song) => {
        const li = document.createElement("li");
        li.innerHTML = `🎵 ${song}`;
        songsEl.appendChild(li);
      });
    } else {
      songsEl.innerHTML = `<li class="song-note">Song information will be updated.</li>`;
    }

    const docsEl = document.getElementById("recapModalDocs");
    docsEl.innerHTML = "";
    const docs = entry.documentation || [];
    if (docs.length) {
      docs.forEach((doc, i) => {
        const btn = document.createElement("button");
        btn.className = "doc-thumb";
        btn.innerHTML = `<img src="${doc.src}" alt="${doc.caption || entry.title}" loading="lazy">`;
        btn.addEventListener("click", () => lightbox.open(docs, i, { title: entry.title, date: window.Bonivera.formatDateLong(entry.date) }));
        docsEl.appendChild(btn);
      });
    } else {
      docsEl.innerHTML = `<p class="song-note" style="grid-column: 1 / -1;">Documentation will be updated.</p>`;
    }

    recapModal.open();
    // pertahankan ?setlist=... di URL saat modal dibuka
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#recap-${entry.id}`);
  }

  const recapModal = window.Bonivera.setupModal(recapModalOverlay, {
    onClose: () => history.replaceState(null, "", window.location.pathname + window.location.search),
  });

  /* ==========================================================
     10. DEEP LINK (#recap-<id>) & INISIALISASI
     ========================================================== */
  function openFromHash() {
    const match = window.location.hash.match(/^#recap-(\d+)/);
    if (match) openRecapDetail(Number(match[1]));
  }

  document.addEventListener("DOMContentLoaded", () => {
    initFilter();
    initDateFilter();
    initReset();
    initSort();
    applyUrlSetlist();
    renderTimeline();
    openFromHash();
  });
})();