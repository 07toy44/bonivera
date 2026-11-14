/* ============================================================
   BONIVERA — SCHEDULE PAGE LOGIC
   ============================================================ */
(function () {
  "use strict";

  const schedules = (window.BoniveraData && window.BoniveraData.schedules) || [];
  const recaps = (window.BoniveraData && window.BoniveraData.recaps) || [];

  const grid = document.getElementById("scheduleGrid");
  const emptyState = document.getElementById("emptyState");
  const modalOverlay = document.getElementById("eventModal");

  const filterRoot = document.getElementById("scheduleFilter");
  const filterToggle = document.getElementById("scheduleFilterToggle");
  const filterPanel = document.getElementById("scheduleFilterPanel");
  const filterLabel = document.getElementById("scheduleFilterLabel");

  // Set kosong = semua kategori ditampilkan ("All")
  const activeFilters = new Set();
  let activeCleanups = []; // countdown interval cleanups for currently-rendered cards
  let modalCleanup = null;

  /* ============================================================
     PINNED SCHEDULE
     ============================================================ */

  const PINNED_SCHEDULE_KEY = "bonivera_pinned_schedule";

  function getPinnedSchedule() {
    try {
      return JSON.parse(localStorage.getItem(PINNED_SCHEDULE_KEY)) || null;
    } catch {
      return null;
    }
  }

  function setPinnedSchedule(entry) {
    try {
      localStorage.setItem(PINNED_SCHEDULE_KEY, JSON.stringify(entry));
    } catch {}
  }

  function clearPinnedSchedule() {
    try {
      localStorage.removeItem(PINNED_SCHEDULE_KEY);
    } catch {}
  }

  /* ============================================================
     STREAMING PLATFORMS
     Tiap event bisa punya field `streams` di data/schedule.js:
       streams: ["showroom", "idn", "youtube"]
       streams: ["youtube"]
       streams: ["showroom", { platform: "idn", url: "https://..." }]
     Link default = halaman JKT48 di platform tsb. Pakai bentuk objek
     {platform, url} untuk link live spesifik per event.
     ============================================================ */

  const STREAM_ICON_PATH = "assets/images/iconlive/";

  const STREAM_PLATFORMS = {
    showroom: {
      label: "SHOWROOM",
      icon: STREAM_ICON_PATH + "showroom.png",
      url: "https://www.showroom-live.com/r/officialJKT48", // cek lagi
    },
    idn: {
      label: "IDN Live",
      icon: STREAM_ICON_PATH + "idn.png",
      url: "https://www.idn.app/jkt48-official", // cek lagi
    },
    youtube: {
      label: "YouTube",
      icon: STREAM_ICON_PATH + "yt.png",
      url: "https://www.youtube.com/channel/UCaIbbu5Xg3DpHsn_3Zw2m9w", // cek lagi
    },
  };

  function normalizeStreams(entry) {
    if (!Array.isArray(entry.streams)) return [];
    return entry.streams
      .map((s) => {
        const key = typeof s === "string" ? s : s && s.platform;
        const base = STREAM_PLATFORMS[key];
        if (!base) return null;
        return {
          label: base.label,
          icon: base.icon,
          url: (typeof s === "object" && s.url) || base.url,
        };
      })
      .filter(Boolean);
  }

  function renderStreamLinks(container, entry) {
    if (!container) return;
    const streams = normalizeStreams(entry);
    container.innerHTML = "";

    if (!streams.length) {
      container.hidden = true;
      return;
    }
    container.hidden = false;

    const label = document.createElement("p");
    label.className = "stream-links__label";
    label.textContent = "Watching theater streaming on";
    container.appendChild(label);

    const row = document.createElement("div");
    row.className = "stream-links__row";

    streams.forEach((s) => {
      const a = document.createElement("a");
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "stream-links__item";
      a.title = s.label;
      a.setAttribute("aria-label", `Watch on ${s.label}`);
      a.innerHTML = `<img src="${s.icon}" alt="" width="36" height="36" loading="lazy">`;
      row.appendChild(a);
    });

    container.appendChild(row);
  }

  const STATUS_LABEL = {
    upcoming: "UPCOMING",
    today: "TODAY",
    live: "LIVE / ONGOING",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
  };
  const STATUS_BADGE_CLASS = {
    upcoming: "badge--upcoming",
    today: "badge--today",
    live: "badge--live",
    completed: "badge--completed",
    cancelled: "badge--cancelled",
  };

  function clearActiveCleanups() {
    activeCleanups.forEach((fn) => fn && fn());
    activeCleanups = [];
  }

  function findRecapFor(id) {
    return recaps.find((r) => r.id === id);
  }

  /* ----------------------------------------------------------
     CARD RENDERING
     ---------------------------------------------------------- */
  function buildCard(entry) {
    const { status } = window.Bonivera.computeEventStatus(entry);
    const card = document.createElement("article");
    card.className = "schedule-card card card--hover reveal in-view";
    card.dataset.id = entry.id;
    card.dataset.category = entry.category;
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View details for ${entry.title}`);

    const dateLong = window.Bonivera.formatDateLong(entry.date);
    const day = window.Bonivera.dayNameOf(entry.date);
    const time = window.Bonivera.formatTime12(entry.time);
    const logoSrc = entry.logo || "assets/images/bonivera/bonivera-logo.png";

    card.innerHTML = `
      <div class="schedule-card__top">
        <span class="badge ${STATUS_BADGE_CLASS[status]}">${STATUS_LABEL[status]}</span>
        <span class="tag">${entry.category}</span>
      </div>
      <div class="schedule-card__heading">
        <span class="schedule-card__thumb"><img src="${logoSrc}" alt="" loading="lazy"></span>
        <h3 class="schedule-card__title">${entry.title}</h3>
      </div>
      <dl class="schedule-card__meta">
        <div><dt>Date</dt><dd>${dateLong}</dd></div>
        <div><dt>Day</dt><dd>${day}</dd></div>
        <div><dt>Time</dt><dd>${time}</dd></div>
        <div><dt>Location</dt><dd>${entry.location}</dd></div>
      </dl>
      ${(status === "upcoming" || status === "today") ? `
      <div class="schedule-card__countdown">
        <p class="schedule-card__countdown-label">Event Countdown</p>
        <div class="countdown countdown--4 countdown--mini">
          <div class="countdown__tile"><span class="countdown__value" data-role="days">00</span><span class="countdown__label">Days</span></div>
          <div class="countdown__tile"><span class="countdown__value" data-role="hours">00</span><span class="countdown__label">Hours</span></div>
          <div class="countdown__tile"><span class="countdown__value" data-role="minutes">00</span><span class="countdown__label">Minutes</span></div>
          <div class="countdown__tile"><span class="countdown__value" data-role="seconds">00</span><span class="countdown__label">Seconds</span></div>
        </div>
      </div>` : ""}
      ${status === "live" ? `<div class="schedule-card__countdown"><p class="schedule-card__countdown-label">Happening right now</p></div>` : ""}
    `;

    /* Streaming icons di kartu (klik icon tidak membuka modal) */
    const cardStreams = document.createElement("div");
    cardStreams.className = "stream-links stream-links--card";
    renderStreamLinks(cardStreams, entry);
    cardStreams.addEventListener("click", (e) => e.stopPropagation());
    cardStreams.addEventListener("keydown", (e) => e.stopPropagation());
    card.appendChild(cardStreams);

    if (status === "upcoming" || status === "today") {
      const els = {
        days: card.querySelector('[data-role="days"]'),
        hours: card.querySelector('[data-role="hours"]'),
        minutes: card.querySelector('[data-role="minutes"]'),
        seconds: card.querySelector('[data-role="seconds"]'),
      };
      const stop = window.Bonivera.startCountdown({
        targetDate: `${entry.date}T${entry.time}:00`,
        els,
        mode: "down",
        onComplete: () => renderGrid(), // status flips to live/completed — re-render to reflect it
      });
      activeCleanups.push(stop);
    }

    card.addEventListener("click", () => openEventDetail(entry.id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEventDetail(entry.id);
      }
    });

    return card;
  }

  function renderGrid() {
    clearActiveCleanups();
    grid.innerHTML = "";

    const filtered = schedules.filter(
      (s) => activeFilters.size === 0 || activeFilters.has(s.category)
    );
    // Soonest first: upcoming/today/live ahead of completed, newest-first within completed.
    const sorted = [...filtered].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

    if (!sorted.length) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const frag = document.createDocumentFragment();
    sorted.forEach((entry) => frag.appendChild(buildCard(entry)));
    grid.appendChild(frag);
  }

  /* ----------------------------------------------------------
     FILTER DROPDOWN (checkbox, multi-select)
     ---------------------------------------------------------- */
  function setFilterOpen(open) {
    filterRoot.classList.toggle("is-open", open);
    filterToggle.setAttribute("aria-expanded", String(open));
  }

  // Sinkronkan checkbox + label tombol dengan state activeFilters
  function syncFilterUI() {
    filterPanel.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = cb.value === "ALL" ? activeFilters.size === 0 : activeFilters.has(cb.value);
    });

    const n = activeFilters.size;
    if (n === 0) {
      filterLabel.textContent = "All categories";
    } else if (n === 1) {
      const [only] = activeFilters;
      filterLabel.textContent = Array.from(
        filterPanel.querySelectorAll('input[type="checkbox"]')
      ).find((cb) => cb.value === only).nextElementSibling.textContent;
    } else {
      filterLabel.textContent = `${n} categories`;
    }
  }

  function initFilters() {
    if (!filterRoot || !filterToggle || !filterPanel) return;

    filterToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setFilterOpen(!filterRoot.classList.contains("is-open"));
    });

    filterPanel.addEventListener("change", (e) => {
      const cb = e.target;
      if (cb.type !== "checkbox") return;

      if (cb.value === "ALL") {
        activeFilters.clear();
      } else if (cb.checked) {
        activeFilters.add(cb.value);
      } else {
        activeFilters.delete(cb.value);
      }

      syncFilterUI();
      renderGrid();
    });

    // klik di luar -> tutup
    document.addEventListener("click", (e) => {
      if (!filterRoot.contains(e.target)) setFilterOpen(false);
    });

    // Escape -> tutup
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && filterRoot.classList.contains("is-open")) {
        setFilterOpen(false);
        filterToggle.focus();
      }
    });

    syncFilterUI();
  }

  /* ----------------------------------------------------------
     DETAIL MODAL
     ---------------------------------------------------------- */
  function openEventDetail(id) {
    const entry = schedules.find((s) => s.id === id);
    if (!entry) return;

    const { status } = window.Bonivera.computeEventStatus(entry);

    /* ---------------- PIN SCHEDULE ---------------- */
    const pinButton = document.getElementById("modalPinSchedule");

    if (pinButton) {
      const pinned = getPinnedSchedule();
      const isPinned = pinned && pinned.id === entry.id;

      pinButton.textContent = isPinned ? "📌 Unpin Schedule" : "📌 Pin Schedule";

      pinButton.onclick = () => {
        const currentPinned = getPinnedSchedule();

        if (currentPinned && currentPinned.id === entry.id) {
          clearPinnedSchedule();
          pinButton.textContent = "📌 Pin Schedule";
        } else {
          setPinnedSchedule(entry);
          pinButton.textContent = "📌 Unpin Schedule";
        }
      };
    }

    /* ---------------- MODAL BASIC INFORMATION ---------------- */
    document.getElementById("modalLogo").src =
      entry.logo || "assets/images/bonivera/bonivera-logo.png";

    document.getElementById("modalCategory").textContent = entry.category;
    document.getElementById("eventModalTitle").textContent = entry.title;

    const statusBadge = document.getElementById("modalStatus");
    statusBadge.textContent = STATUS_LABEL[status];
    statusBadge.className = `badge ${STATUS_BADGE_CLASS[status]}`;

    /* ---------------- EVENT META ---------------- */
    document.getElementById("modalDate").textContent =
      window.Bonivera.formatDateLong(entry.date);
    document.getElementById("modalDay").textContent =
      window.Bonivera.dayNameOf(entry.date);
    document.getElementById("modalTime").textContent =
      window.Bonivera.formatTime12(entry.time);
    document.getElementById("modalLocation").textContent = entry.location;
    document.getElementById("modalDescription").textContent = entry.description || "";

    /* ---------------- STREAMING LINKS ---------------- */
    renderStreamLinks(document.getElementById("modalStreamLinks"), entry);

    /* ---------------- COUNTDOWN ---------------- */
    if (modalCleanup) {
      modalCleanup();
      modalCleanup = null;
    }

    const countdownWrap = document.getElementById("modalCountdownWrap");

    if (status === "upcoming" || status === "today") {
      countdownWrap.hidden = false;

      const els = {
        days: document.getElementById("modalDays"),
        hours: document.getElementById("modalHours"),
        minutes: document.getElementById("modalMinutes"),
        seconds: document.getElementById("modalSeconds"),
      };

      modalCleanup = window.Bonivera.startCountdown({
        targetDate: `${entry.date}T${entry.time}:00`,
        els,
        mode: "down",
      });
    } else {
      countdownWrap.hidden = true;
    }

    /* ---------------- RECAP LINK ---------------- */
    const recapLink = document.getElementById("modalRecapLink");
    const recap = findRecapFor(entry.id);

    if (status === "completed" && recap) {
      recapLink.hidden = false;
      recapLink.href = `recap.html#recap-${entry.id}`;
    } else {
      recapLink.hidden = true;
    }

    /* ---------------- ADD TO CALENDAR ---------------- */
    const calendarActions = document.getElementById("modalCalendarActions");
    const addToCalendarBtn = document.getElementById("modalAddToCalendar");
    const googleCalendarLink = document.getElementById("modalGoogleCalendarLink");

    if ((status === "upcoming" || status === "today") && !entry.cancelled) {
      calendarActions.hidden = false;

      addToCalendarBtn.onclick = () => window.Bonivera.downloadIcsFile(entry);
      googleCalendarLink.href = window.Bonivera.buildGoogleCalendarUrl(entry);
    } else {
      calendarActions.hidden = true;
    }

    /* ---------------- OPEN MODAL ---------------- */
    modal.open();

    history.replaceState(null, "", `#event-${entry.id}`);
  }

  /* ----------------------------------------------------------
     MODAL CONTROLLER
     ---------------------------------------------------------- */
  const modal = window.Bonivera.setupModal(modalOverlay, {
    onClose: () => {
      if (modalCleanup) {
        modalCleanup();
        modalCleanup = null;
      }
      history.replaceState(null, "", window.location.pathname);
    },
  });

  /* ----------------------------------------------------------
     DEEP LINK on load: #event-<id>
     ---------------------------------------------------------- */
  function openFromHash() {
    const match = window.location.hash.match(/^#event-(\d+)/);
    if (match) openEventDetail(Number(match[1]));
  }

  document.addEventListener("DOMContentLoaded", () => {
    initFilters();
    renderGrid();
    openFromHash();
  });
})();