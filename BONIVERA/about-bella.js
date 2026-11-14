/* ============================================================
   BONIVERA — ABOUT BELLA PAGE LOGIC
   Daftar isi:
   1.  Konstanta & helper
   2.  Filter statistik (Exclude JKT48 School)
   3.  CURRENT STATUS / TEAM — konfigurasi (EDIT DI SINI)
   4.  Counter perkenalan, umur, countdown umur 16
   5.  Statistik aktivitas (setlist -> recap.html?setlist=...)
   6.  Jikoshoukai player
   7.  Activity timeline (Per Month / Day / Date / Year)
   8.  Journey timers
   9.  Fakta & Trivia + Perjalanan Bella (+ lightbox foto)
   10. Slideshow biodata
   11. CURRENT STATUS / TEAM — logika & renderer
   12. Toggle baca selengkapnya, filter tombol, label bar lagu
   13. Inisialisasi
   ============================================================ */
(function () {
  "use strict";

  /* ==========================================================
     1. KONSTANTA & HELPER
     ========================================================== */
  const INTRO_DATE = "2026-02-14T00:00:00";
  const BIRTH_DATE = "2011-03-02";
  const AGE_16_DATE = "2027-03-02T00:00:00";
  const FALLBACK_LOGO = "assets/images/bonivera/bonivera-logo.png";

  const CAT_ORDER = ["THEATER", "OFF AIR EVENT", "ON AIR", "OFC EVENT", "JKT48 EVENT"];
  const PALETTE = ["#e08a5a", "#4fa38f", "#a77bd0", "#d9a82e", "#e0527a", "#3aa0d8", "#8a94a6", "#7bb04a"];
  /* warna garis titik-titik setlist (dibedakan dari warna kategori) */
  const SL_PALETTE = ["#d1495b", "#00798c", "#c9a227", "#5b8e7d", "#8d5fd3", "#2e4057", "#d65db1", "#a1683a", "#3c9d9b", "#7a8450"];
  const ALL_COLOR = "#3E5E8C";
  const categoryColors = new Map();

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  /* Judul umum: buang awalan "[1] " */
  const cleanSetlist = (t) => String(t || "").replace(/^\[\d+\]\s*/, "").replace(/\s+/g, " ").trim();

  /* Nama setlist theater: semua teks [ ... ] dibuang.
     HARUS sama dengan cleanSetlistName() di recap.js supaya
     link ?setlist=... cocok dengan opsi filter di halaman Recap. */
  const setlistName = (t) =>
    String(t || "").replace(/\[[^\]]*\]/g, "").replace(/\s{2,}/g, " ").trim();

  function categoryColor(cat) {
    if (!categoryColors.size) {
      const recaps = (window.BoniveraData && window.BoniveraData.recaps) || [];
      const list = [...CAT_ORDER];
      recaps.forEach((r) => {
        if (r && r.category && !list.includes(r.category)) list.push(r.category);
      });
      list.forEach((c, i) => categoryColors.set(c, PALETTE[i % PALETTE.length]));
    }
    return categoryColors.get(cat) || "#8a94a6";
  }

  function animateCount(el, target, opts = {}) {
    if (!el) return;
    const duration = opts.duration || 900;
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString("en-US");
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function animateBarFill(barEl, targetPercent, duration = 900) {
    if (!barEl) return;
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      barEl.style.width = `${targetPercent * eased}%`;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ==========================================================
     2. FILTER STATISTIK: EXCLUDE JKT48 SCHOOL
     ========================================================== */
  const SCHOOL_PATTERN = /jkt48\s*school/i;
  const SCHOOL_FIELDS = ["category", "title", "name", "event", "type", "series", "tag"];
  const statsFilter = { excludeSchool: false };
  let timelineReload = null;

  function isSchoolActivity(r) {
    if (!r) return false;
    const parts = SCHOOL_FIELDS.map((k) => r[k]).filter((v) => typeof v === "string");
    if (Array.isArray(r.tags)) parts.push(...r.tags.filter((v) => typeof v === "string"));
    return parts.some((s) => SCHOOL_PATTERN.test(s));
  }

  function getStatRecaps() {
    const all = (window.BoniveraData && window.BoniveraData.recaps) || [];
    return statsFilter.excludeSchool ? all.filter((r) => !isSchoolActivity(r)) : all;
  }

  function initStatsFilter() {
    const btn = document.getElementById("statsExcludeSchool");
    if (!btn) return;
    const note = document.getElementById("statsFilterNote");
    const schoolCount = ((window.BoniveraData && window.BoniveraData.recaps) || []).filter(isSchoolActivity).length;

    function paintNote() {
      if (!note) return;
      note.textContent = statsFilter.excludeSchool
        ? `${schoolCount} aktivitas JKT48 School disembunyikan`
        : `${schoolCount} aktivitas JKT48 School terdeteksi`;
    }
    paintNote();

    btn.addEventListener("click", () => {
      statsFilter.excludeSchool = !statsFilter.excludeSchool;
      btn.setAttribute("aria-pressed", String(statsFilter.excludeSchool));
      paintNote();
      initActivityStats();
      if (timelineReload) timelineReload();
    });
  }

  /* ==========================================================
     3. CURRENT STATUS / TEAM — KONFIGURASI
     ========================================================== */
  const bellaStatusConfig = {
    team: "TRAINEE",      // TRAINEE | PASSION | DREAM | LOVE
    status: "ACTIVE",     // ACTIVE | GRADUATED | RESIGN | HIATUS | PUNISHMENT
    dates: {
      startedAt: "",
      endsAt: "",
      effectiveAt: null,
    },
  };

  const teamPresets = {
    TRAINEE: { name: "Trainee",      label: "TRAINEE",      main: "#6a3fb5", sub: "#efe3ff", letter: "T", deco: "sparkle", logo: "assets/images/jkt48.png" },
    PASSION: { name: "Team Passion", label: "TEAM PASSION", main: "#a82a2a", sub: "#fbe9d0", letter: "P", deco: "flame",   logo: "assets/images/team-passion.png" },
    DREAM:   { name: "Team Dream",   label: "TEAM DREAM",   main: "#237a76", sub: "#dff5f1", letter: "D", deco: "stars",   logo: "assets/images/team-dream.png" },
    LOVE:    { name: "Team Love",    label: "TEAM LOVE",    main: "#d63c78", sub: "#ffe6f0", letter: "L", deco: "hearts",  logo: "assets/images/team-love.png" },
  };

  const statusDefs = {
    ACTIVE:     { label: "ACTIVE", color: "#2f8f5b", timer: "none" },
    GRADUATED:  { label: "GRADUATED", color: "#b98a10", timer: "stopwatch", dateKey: "effectiveAt", caption: "Sejak lulus", missing: "Tanggal kelulusan belum diisi" },
    RESIGN:     { label: "RESIGN", color: "#6b7280", timer: "stopwatch", dateKey: "effectiveAt", caption: "Sejak resign", missing: "Tanggal resign belum diisi" },
    HIATUS:     { label: "HIATUS", color: "#d9822b", timer: "countdown", dateKey: "endsAt", caption: "Hiatus berakhir dalam", ended: "Periode hiatus telah berakhir", missing: "Tanggal berakhir hiatus belum diisi" },
    PUNISHMENT: { label: "PUNISHMENT (BAN DAY)", color: "#c2493f", timer: "countdown", dateKey: "endsAt", caption: "Punishment berakhir dalam", ended: "Masa punishment telah berakhir", missing: "Tanggal berakhir punishment belum diisi" },
  };

  /* ==========================================================
     4. COUNTER PERKENALAN, UMUR, COUNTDOWN UMUR 16
     ========================================================== */
  function initIntroCounter() {
    const els = {
      years: document.getElementById("introYears"),
      days: document.getElementById("introDays"),
      hours: document.getElementById("introHours"),
      minutes: document.getElementById("introMinutes"),
      seconds: document.getElementById("introSeconds"),
    };
    if (!els.years) return;
    window.Bonivera.startCountdown({ targetDate: INTRO_DATE, els, mode: "up" });
  }

  function initAge() {
    const ageEl = document.getElementById("bellaAge");
    if (!ageEl) return;
    const update = () => { ageEl.textContent = window.Bonivera.calculateAge(BIRTH_DATE); };
    update();
    setInterval(update, 60 * 60 * 1000);
  }

  function initAge16Countdown() {
    const els = {
      years: document.getElementById("age16Years"),
      days: document.getElementById("age16Days"),
      hours: document.getElementById("age16Hours"),
      minutes: document.getElementById("age16Minutes"),
      seconds: document.getElementById("age16Seconds"),
    };
    if (!els.years) return;
    const wrapper = document.getElementById("age16Counter");
    window.Bonivera.startCountdown({
      targetDate: AGE_16_DATE,
      els,
      mode: "down",
      onComplete: () => wrapper && wrapper.classList.add("countdown--done"),
    });
  }

  /* ==========================================================
     5. STATISTIK AKTIVITAS
     Kartu setlist -> recap.html?setlist=<judul bersih>
     (recap.js membaca parameter itu dan memfilter otomatis)
     ========================================================== */
  function initActivityStats() {
    const totalActivitiesEl = document.getElementById("statTotalActivities");
    if (!totalActivitiesEl) return;

    const recaps = getStatRecaps();

    // ---- Hitung data ----
    const totalActivities = recaps.length;
    const theaterCount = recaps.filter((r) => r.category === "THEATER").length;

    const setlistMap = new Map();
    recaps
      .filter((r) => r.category === "THEATER")
      .forEach((r) => {
        const key = setlistName(r.title);
        if (!key) return;
        if (!setlistMap.has(key)) {
          setlistMap.set(key, { title: key, count: 0, logo: r.logo || FALLBACK_LOGO });
        }
        const bucket = setlistMap.get(key);
        bucket.count += 1;
        if (bucket.logo === FALLBACK_LOGO && r.logo) bucket.logo = r.logo;
      });
    const setlists = [...setlistMap.values()].sort((a, b) => b.count - a.count);

    const categoryMap = new Map();
    recaps.forEach((r) => categoryMap.set(r.category, (categoryMap.get(r.category) || 0) + 1));
    const categories = [...categoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const songMap = new Map();
    recaps.forEach((r) => {
      (r.songs || []).forEach((rawSong) => {
        const song = rawSong.replace(/⭐/g, "").replace(/\[BONUS SONG\]/gi, "").trim();
        if (!song) return;
        songMap.set(song, (songMap.get(song) || 0) + 1);
      });
    });
    const songs = [...songMap.entries()]
      .map(([song, count]) => ({ song, count }))
      .sort((a, b) => b.count - a.count);

    // ---- Kartu total ----
    animateCount(totalActivitiesEl, totalActivities);
    animateCount(document.getElementById("statTotalTheater"), theaterCount);
    animateCount(document.getElementById("statTotalSetlists"), setlists.length);
    animateCount(document.getElementById("statTotalSongs"), songs.length);

    // ---- Theater Setlist Breakdown ----
    const setlistGrid = document.getElementById("setlistGrid");
    if (setlistGrid) {
      setlistGrid.innerHTML = setlists.map((s) => {
        const href = `recap.html?setlist=${encodeURIComponent(s.title)}`;
        return `
        <a class="setlist-card" href="${href}" aria-label="Lihat recap setlist ${esc(s.title)} saja">
          <span class="setlist-card__thumb"><img src="${esc(s.logo)}" alt="" loading="lazy"></span>
          <span class="setlist-card__title">${esc(s.title)}</span>
          <span class="setlist-card__count"><span class="setlist-card__count-value" data-count="${s.count}">0</span>×</span>
        </a>`;
      }).join("");
      setlistGrid.querySelectorAll(".setlist-card__count-value").forEach((el) => {
        animateCount(el, Number(el.dataset.count));
      });
    }

    // ---- Activity by Category ----
    const categoryBars = document.getElementById("categoryBars");
    if (categoryBars) {
      const maxCategory = Math.max(...categories.map((c) => c.count), 1);
      categoryBars.innerHTML = categories.map((c) => `
        <div class="stat-bar-row">
          <span class="stat-bar-row__label">${esc(c.category)}</span>
          <div class="stat-bar-row__track">
            <div class="stat-bar-row__fill" style="--bar-c:${categoryColor(c.category)}" data-percent="${(c.count / maxCategory) * 100}"></div>
          </div>
          <span class="stat-bar-row__value" data-count="${c.count}">0</span>
        </div>
      `).join("");
      categoryBars.querySelectorAll(".stat-bar-row__fill").forEach((el) => animateBarFill(el, Number(el.dataset.percent)));
      categoryBars.querySelectorAll(".stat-bar-row__value").forEach((el) => animateCount(el, Number(el.dataset.count)));
    }

    // ---- Songs Performed (preview + show more) ----
    const songBars = document.getElementById("songBars");
    const songShowMoreBtn = document.getElementById("songShowMoreBtn");
    const songShowMoreLabel = document.getElementById("songShowMoreLabel");
    const SONG_PREVIEW_COUNT = 5;
    let songsExpanded = false;

    function renderSongBars() {
      if (!songBars) return;
      const maxSong = Math.max(...songs.map((s) => s.count), 1);
      const visibleSongs = songsExpanded ? songs : songs.slice(0, SONG_PREVIEW_COUNT);

      songBars.innerHTML = visibleSongs.map((s) => `
        <div class="stat-bar-row">
          <span class="stat-bar-row__label" title="${esc(s.song)}">${esc(s.song)}</span>
          <div class="stat-bar-row__track">
            <div class="stat-bar-row__fill" data-percent="${(s.count / maxSong) * 100}"></div>
          </div>
          <span class="stat-bar-row__value" data-count="${s.count}">0</span>
        </div>
      `).join("");
      songBars.querySelectorAll(".stat-bar-row__fill").forEach((el) => animateBarFill(el, Number(el.dataset.percent)));
      songBars.querySelectorAll(".stat-bar-row__value").forEach((el) => animateCount(el, Number(el.dataset.count)));

      if (!songShowMoreBtn) return;
      if (songs.length > SONG_PREVIEW_COUNT) {
        songShowMoreBtn.hidden = false;
        songShowMoreLabel.textContent = songsExpanded ? "Show Less" : `Show More (${songs.length - SONG_PREVIEW_COUNT} more)`;
        songShowMoreBtn.classList.toggle("is-expanded", songsExpanded);
        songShowMoreBtn.setAttribute("aria-expanded", String(songsExpanded));
      } else {
        songShowMoreBtn.hidden = true;
      }
    }

    renderSongBars();
    if (songShowMoreBtn) {
      songShowMoreBtn.onclick = () => {
        songsExpanded = !songsExpanded;
        renderSongBars();
      };
    }
  }

  /* ==========================================================
     6. JIKOSHOUKAI AUDIO PLAYER
     ========================================================== */
  function initJikoPlayer() {
    const audio = document.getElementById("jikoAudio");
    const btn = document.getElementById("jikoPlayBtn");
    const seek = document.getElementById("jikoSeek");
    const curEl = document.getElementById("jikoCurrent");
    const durEl = document.getElementById("jikoDuration");
    if (!audio || !btn || !seek) return;

    const fmt = (s) => {
      if (!isFinite(s)) return "0:00";
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60).toString().padStart(2, "0");
      return `${m}:${sec}`;
    };

    function paintSeek() {
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      seek.value = pct;
      seek.style.setProperty("--progress", pct + "%");
      curEl.textContent = fmt(audio.currentTime);
    }

    function setPlaying(on) {
      btn.classList.toggle("is-playing", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", on ? "Jeda jikoshoukai Bella" : "Putar jikoshoukai Bella");
    }

    btn.addEventListener("click", () => {
      if (audio.paused) audio.play().catch((err) => console.warn("Audio gagal diputar:", err));
      else audio.pause();
    });

    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("ended", () => {
      setPlaying(false);
      audio.currentTime = 0;
      paintSeek();
    });
    audio.addEventListener("loadedmetadata", () => {
      durEl.textContent = fmt(audio.duration);
      paintSeek();
    });
    audio.addEventListener("timeupdate", paintSeek);

    seek.addEventListener("input", () => {
      if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
      paintSeek();
    });

    audio.addEventListener("error", () => {
      const player = btn.closest(".jiko-player");
      if (player) player.hidden = true;
    }, true);
  }

  /* ==========================================================
     7. ACTIVITY TIMELINE
     Mode  : month | weekday (Per Day) | date (Per Date) | year
     Filter: tahun, bulan (kecuali Per Year)
     Seri  : All, kategori (garis solid), setlist THEATER (titik-titik)

     Interaksi baru:
     - Chip setlist HANYA muncul setelah chip THEATER diklik.
       Klik THEATER: (1) buka filter setlist, (2) klik lagi = matikan
       THEATER + tutup filter, (3) klik lagi = nyalakan THEATER.
     - Kartu "THEATER" di Totals bisa diklik untuk membuka/menutup
       statistik per setlist.
     ========================================================== */
  function initTimelineStats() {
    const chartEl = document.getElementById("tlChart");
    if (!chartEl) return;

    // ---------- Data dasar ----------
    const intro = new Date(INTRO_DATE);
    const introY = intro.getFullYear();
    const introM = intro.getMonth();
    const today = new Date();
    const rangeStart = new Date(introY, introM, 1);
    const rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const recaps = (window.BoniveraData && window.BoniveraData.recaps) || [];
    const allItems = recaps
      .filter((r) => r && r.date)
      .map((r) => {
        const [y, m, d] = r.date.split("-").map(Number);
        const cat = r.category;
        return {
          y,
          m: m - 1,
          d,
          wd: (new Date(y, m - 1, d).getDay() + 6) % 7, // Monday = 0
          cat,
          setlist: cat === "THEATER" ? setlistName(r.title) : "",
          title: cleanSetlist(r.title),
          date: r.date,
          school: isSchoolActivity(r),
          dt: new Date(y, m - 1, d),
        };
      })
      .filter((it) => it.dt >= rangeStart && it.dt <= rangeEnd);
    if (!allItems.length) return;

    const filterItems = () => (statsFilter.excludeSchool ? allItems.filter((it) => !it.school) : allItems);
    let items = filterItems();

    // ---------- Elemen ----------
    const tipEl = document.getElementById("tlTip");
    const chipsEl = document.getElementById("tlChips");
    const scopeEl = document.getElementById("tlScope");
    const summaryEl = document.getElementById("tlSummary");
    const tableEl = document.getElementById("tlTable");
    const detailEl = document.getElementById("tlTableDetail");
    const yearSel = document.getElementById("tlYear");
    const yearWrap = document.getElementById("tlYearWrap");
    const monthSel = document.getElementById("tlMonth");
    const monthWrap = document.getElementById("tlMonthWrap");
    const cmpA = document.getElementById("tlCmpA");
    const cmpB = document.getElementById("tlCmpB");
    const cmpOut = document.getElementById("tlCompare");
    const moreBtn = document.getElementById("tlShowMoreBtn");
    const moreLabel = document.getElementById("tlShowMoreLabel");
    const moreBox = document.getElementById("tlMore");
    const tabs = document.querySelectorAll(".tl-tab");

    // ---------- Konstanta & kunci seri ----------
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const ALL_KEY = "ALL";
    const SL = "SL::";
    const isSL = (k) => k.startsWith(SL);

    const cats = [...CAT_ORDER];
    allItems.forEach((it) => { if (!cats.includes(it.cat)) cats.push(it.cat); });
    const setlistNames = [...new Set(allItems.filter((i) => i.setlist).map((i) => i.setlist))];
    const years = [...new Set(allItems.map((i) => i.y))].sort((a, b) => a - b);

    const colorOf = { [ALL_KEY]: ALL_COLOR };
    cats.forEach((c) => { colorOf[c] = categoryColor(c); });
    setlistNames.forEach((n, i) => { colorOf[SL + n] = SL_PALETTE[i % SL_PALETTE.length]; });

    const matches = (it, key) =>
      key === ALL_KEY ? true : isSL(key) ? it.setlist === key.slice(SL.length) : it.cat === key;
    const keyName = (key) => (key === ALL_KEY ? "All" : isSL(key) ? key.slice(SL.length) : key);

    // slOpen  : filter chip setlist sedang ditampilkan
    // sumOpen : statistik setlist di kartu THEATER (Totals) sedang dibuka
    const state = {
      mode: "month",
      year: years[years.length - 1],
      month: -1,
      active: null,
      pin: false,
      slOpen: false,
      sumOpen: false,
    };
    let data = null;
    let geom = null;

    // ---------- Rentang bulan ----------
    function monthRange(year) {
      const start = year === introY ? introM : 0;
      const end = year === today.getFullYear() ? today.getMonth() : 11;
      return [start, Math.max(start, end)];
    }
    const inMonth = (it) => state.month < 0 || it.m === state.month;

    // ---------- Susun data per periode ----------
    function build() {
      let labels, idxOf;
      if (state.mode === "month") {
        if (state.month >= 0) {
          labels = [MONTHS[state.month]];
          idxOf = (it) => (it.y === state.year && it.m === state.month ? 0 : -1);
        } else {
          const [s, e] = monthRange(state.year);
          labels = MONTHS.slice(s, e + 1);
          idxOf = (it) => (it.y === state.year ? it.m - s : -1);
        }
      } else if (state.mode === "weekday") {
        labels = DAYS;
        idxOf = (it) => (it.y === state.year && inMonth(it) ? it.wd : -1);
      } else if (state.mode === "date") {
        let n = 31;
        if (state.month >= 0) {
          n = new Date(state.year, state.month + 1, 0).getDate();
          if (state.year === today.getFullYear() && state.month === today.getMonth()) n = Math.min(n, today.getDate());
        }
        labels = Array.from({ length: n }, (_, i) => String(i + 1));
        idxOf = (it) => (it.y === state.year && inMonth(it) && it.d <= n ? it.d - 1 : -1);
      } else {
        labels = years.map(String);
        idxOf = (it) => years.indexOf(it.y);
      }

      const n = labels.length;
      const mk = (key, label) => ({ key, label, values: Array.from({ length: n }, () => 0) });
      const series = [
        mk(ALL_KEY, "All"),
        ...cats.map((c) => mk(c, c)),
        ...setlistNames.map((s) => mk(SL + s, s)),
      ];
      const byKey = new Map(series.map((s) => [s.key, s]));
      items.forEach((it) => {
        const i = idxOf(it);
        if (i < 0 || i >= n) return;
        byKey.get(ALL_KEY).values[i] += 1;
        byKey.get(it.cat).values[i] += 1;
        if (it.setlist) byKey.get(SL + it.setlist).values[i] += 1;
      });
      series.forEach((s) => { s.total = s.values.reduce((a, b) => a + (b || 0), 0); });
      return { labels, series, idxOf };
    }

    function periodName(i) {
      const mName = state.month >= 0 ? MONTHS[state.month] : "";
      if (state.mode === "month") return `${data.labels[i]} ${state.year}`;
      if (state.mode === "weekday") return `${data.labels[i]} · ${mName ? mName + " " : ""}${state.year}`;
      if (state.mode === "date") return mName ? `${data.labels[i]} ${mName} ${state.year}` : `Date ${data.labels[i]} · ${state.year}`;
      return data.labels[i];
    }

    function scopeText() {
      if (state.mode === "year") return "All time";
      return state.month >= 0 ? `${MONTHS[state.month]} ${state.year}` : String(state.year);
    }

    function dotHTML(k) {
      return isSL(k)
        ? `<span class="tl-dot" style="width:14px;height:0;background:none;border-top:3px dotted ${colorOf[k]}"></span>`
        : `<span class="tl-dot" style="background:${colorOf[k]}"></span>`;
    }

    // ---------- Chip kategori & setlist ----------
    function chip(k, extra = "") {
      const on = state.active.has(k);
      const dot = isSL(k)
        ? `<span class="tl-dot" style="--sc:${colorOf[k]}"></span>`
        : `<span class="tl-dot" style="background:${colorOf[k]}"></span>`;
      return `<button type="button" class="tl-chip${extra}${on ? " is-on" : ""}" data-key="${esc(k)}" aria-pressed="${on}">${dot}${esc(keyName(k))}</button>`;
    }

    function drawChips() {
      let html = `<span class="tl-chips__sep">Kategori</span>`;
      html += [ALL_KEY, ...cats].map((k) => chip(k)).join("");
      if (setlistNames.length && state.slOpen) {
        html += `<span class="tl-chips__sep">Setlist (garis titik-titik)</span>`;
        html += setlistNames.map((n) => chip(SL + n, " tl-chip--sl")).join("");
      }
      chipsEl.innerHTML = html;
    }

    function onChipClick(key) {
      if (key === "THEATER" && setlistNames.length) {
        if (!state.active.has(key)) {          // mati -> nyala + buka filter setlist
          state.active.add(key);
          state.slOpen = true;
        } else if (!state.slOpen) {            // nyala -> buka filter setlist
          state.slOpen = true;
        } else {                               // klik lagi -> matikan THEATER + tutup filter
          state.active.delete(key);
          state.slOpen = false;
          setlistNames.forEach((n) => state.active.delete(SL + n));
        }
      } else if (state.active.has(key)) {
        state.active.delete(key);
      } else {
        state.active.add(key);
      }
    }

    // ---------- Grafik ----------
    function drawChart() {
      const W = 640, H = 280, L = 38, R = 18, T = 14, B = 30;
      const labels = data.labels;
      const n = labels.length;
      const shown = data.series.filter((s) => state.active.has(s.key));
      const max = Math.max(1, ...shown.flatMap((s) => s.values));
      const step = Math.max(1, Math.ceil(max / 4));
      const top = step * 4;

      const x = (i) => (n > 1 ? L + ((W - L - R) * i) / (n - 1) : L + (W - L - R) / 2);
      const y = (v) => T + (H - T - B) * (1 - v / top);
      geom = { W, x };

      if (!shown.length) {
        chartEl.innerHTML = `<p class="tl-empty">Select at least one category above.</p>`;
        return;
      }

      let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Activity line chart">`;

      for (let k = 0; k <= 4; k++) {
        const v = step * k;
        svg += `<line class="tl-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`;
        svg += `<text class="tl-axis-text" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
      }
      labels.forEach((lb, i) => {
        if (n > 20 && i % 2 === 1) return; // tanggal 1-31: tampilkan selang-seling
        svg += `<text class="tl-axis-text${n > 8 ? " tl-axis-text--sm" : ""}" x="${x(i)}" y="${H - 10}" text-anchor="middle">${esc(lb)}</text>`;
      });

      const slot = n > 1 ? (W - L - R) / (n - 1) : W - L - R;
      labels.forEach((_, i) => {
        svg += `<g class="tl-hit" data-i="${i}">
          <line class="tl-guide" x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - B}"/>
          <rect x="${x(i) - slot / 2}" y="${T}" width="${slot}" height="${H - T - B}"/>
        </g>`;
      });

      // urutan gambar: All (belakang) -> kategori -> setlist
      const rank = (s) => (s.key === ALL_KEY ? 0 : isSL(s.key) ? 2 : 1);
      const ordered = [...shown].sort((a, b) => rank(a) - rank(b));

      ordered.forEach((s) => {
        const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
        if (pts.length < 2) return;
        const cls = s.key === ALL_KEY ? " tl-line--all" : "";
        const dash = isSL(s.key) ? "stroke-dasharray:0.1 6;stroke-width:3.2;stroke-linecap:round;" : "";
        svg += `<polyline class="tl-line${cls}" style="stroke:${colorOf[s.key]};${dash}" points="${pts.join(" ")}"/>`;
      });

      ordered.forEach((s) => {
        const r = s.key === ALL_KEY ? 5 : isSL(s.key) ? 3.6 : 4.4;
        s.values.forEach((v, i) => {
          svg += `<circle class="tl-marker" data-key="${esc(s.key)}" data-i="${i}" style="fill:${colorOf[s.key]}" cx="${x(i)}" cy="${y(v)}" r="${r}"><title>${esc(keyName(s.key))} · ${esc(periodName(i))}: ${v}</title></circle>`;
        });
      });

      svg += `</svg>`;
      chartEl.innerHTML = svg;
    }

    // ---------- Tooltip ----------
    function placeTip(i) {
      const svgEl = chartEl.querySelector("svg");
      if (!svgEl || !geom) return;
      const sr = svgEl.getBoundingClientRect();
      const wr = tipEl.parentElement.getBoundingClientRect();
      const px = sr.left - wr.left + (geom.x(i) / geom.W) * sr.width;
      const w = tipEl.offsetWidth;
      tipEl.style.left = `${Math.min(Math.max(px, w / 2 + 4), wr.width - w / 2 - 4)}px`;
      tipEl.style.transform = "translateX(-50%)";
    }

    function showSummaryTip(i) {
      const rows = data.series
        .filter((s) => state.active.has(s.key))
        .map((s) => `<div>${dotHTML(s.key)}${esc(keyName(s.key))}: <b>${s.values[i]}</b></div>`)
        .join("");
      tipEl.classList.remove("tl-tip--detail");
      tipEl.innerHTML = `<strong>${esc(periodName(i))}</strong>${rows}`;
      tipEl.hidden = false;
      placeTip(i);
    }

    function showDetailTip(i, key) {
      const list = items
        .filter((it) => data.idxOf(it) === i && matches(it, key))
        .sort((a, b) => a.date.localeCompare(b.date));
      const rows = list.length
        ? list.map((it) => `<li><span>${esc(it.date)}</span> ${esc(it.title)}${key === ALL_KEY ? ` <em>· ${esc(it.cat)}</em>` : ""}</li>`).join("")
        : `<li>No activity</li>`;
      tipEl.classList.add("tl-tip--detail");
      tipEl.innerHTML = `<strong>${dotHTML(key)}${esc(keyName(key))} · ${esc(periodName(i))} (${list.length})</strong><ul>${rows}</ul>`;
      tipEl.hidden = false;
      placeTip(i);
    }

    function hideTip() {
      state.pin = false;
      tipEl.hidden = true;
    }

    // ---------- Ringkasan Totals (kartu THEATER bisa diklik) ----------
    function drawSummary() {
      scopeEl.textContent = `Totals · ${scopeText()}`;
      const slSeries = data.series.filter((s) => isSL(s.key) && s.total > 0).sort((a, b) => b.total - a.total);

      summaryEl.innerHTML = data.series.filter((s) => !isSL(s.key)).map((s) => {
        const clickable = s.key === "THEATER" && slSeries.length > 0;

        let sub = "";
        if (clickable && state.sumOpen) {
          sub = `<div class="tl-sum-card__sl">${slSeries.map((x) =>
            `<div><span title="${esc(x.label)}"><i style="--sc:${colorOf[x.key]}"></i>${esc(x.label)}</span><b>${x.total}</b></div>`).join("")}</div>`;
        }
        const attrs = clickable
          ? ` data-sum="1" role="button" tabindex="0" aria-expanded="${state.sumOpen}" title="Klik untuk melihat statistik setlist"`
          : "";
        const hint = clickable
          ? `<span class="tl-sum-card__hint">${state.sumOpen ? "Tutup ▴" : "Statistik setlist ▾"}</span>`
          : "";

        return `
        <div class="tl-sum-card${clickable ? " tl-sum-card--click" : ""}" style="--c:${colorOf[s.key]}"${attrs}>
          <span class="tl-sum-card__label">${s.key === ALL_KEY ? "Total" : esc(s.label)}</span>
          <span class="tl-sum-card__value">${s.total}</span>
          ${hint}
          ${sub}
        </div>`;
      }).join("");
    }

    // ---------- Tabel (header & sel bisa diklik) ----------
    function drawTable() {
      const catSeries = data.series.filter((s) => s.key !== ALL_KEY && !isSL(s.key));
      const head = `<tr><th>Period</th>${catSeries.map((s) => `<th data-col="${esc(s.key)}" title="Lihat statistik ${esc(s.label)}">${esc(s.label)}</th>`).join("")}<th data-col="${ALL_KEY}" title="Lihat statistik Total">Total</th></tr>`;
      const body = data.labels.map((_, i) => {
        const cells = catSeries.map((s) => `<td data-col="${esc(s.key)}" data-i="${i}" class="${s.values[i] ? "" : "is-zero"}">${s.values[i]}</td>`).join("");
        return `<tr><td>${esc(periodName(i))}</td>${cells}<td data-col="${ALL_KEY}" data-i="${i}">${data.series[0].values[i]}</td></tr>`;
      }).join("");
      tableEl.innerHTML = `<table class="tl-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
    }

    // Statistik dari kolom / sel tabel yang ditekan
    function showTableDetail(key, idx) {
      const n = data.labels.length;
      const list = items
        .filter((it) => {
          const ix = data.idxOf(it);
          return ix >= 0 && ix < n && (idx === null || ix === idx) && matches(it, key);
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      // periode paling ramai
      const per = new Map();
      list.forEach((it) => { const ix = data.idxOf(it); per.set(ix, (per.get(ix) || 0) + 1); });
      let busiest = "—";
      if (per.size) {
        const [bi, bc] = [...per.entries()].sort((a, b) => b[1] - a[1])[0];
        busiest = `${periodName(bi)} (${bc})`;
      }

      const catCount = new Map();
      const slCount = new Map();
      list.forEach((it) => {
        catCount.set(it.cat, (catCount.get(it.cat) || 0) + 1);
        if (it.setlist) slCount.set(it.setlist, (slCount.get(it.setlist) || 0) + 1);
      });

      const scope = idx === null ? scopeText() : periodName(idx);
      const stat = (label, val) => `<div class="tl-td__stat"><small>${label}</small><b>${val}</b></div>`;
      const stats = [
        stat("Total", list.length),
        stat("Periode aktif", per.size),
        stat("Paling ramai", esc(idx === null ? busiest : periodName(idx))),
        stat("Rentang", list.length ? `${esc(list[0].date)}${list.length > 1 ? " → " + esc(list[list.length - 1].date) : ""}` : "—"),
      ].join("");

      let chips = "";
      if (key === ALL_KEY) {
        chips += [...catCount.entries()].sort((a, b) => b[1] - a[1])
          .map(([c, v]) => `<span class="tl-td__chip" style="--sc:${colorOf[c]}"><em></em>${esc(c)} <b>${v}</b></span>`).join("");
      }
      chips += [...slCount.entries()].sort((a, b) => b[1] - a[1])
        .map(([s, v]) => `<span class="tl-td__chip" style="--sc:${colorOf[SL + s]}"><i></i>${esc(s)} <b>${v}</b></span>`).join("");

      const rows = list.length
        ? list.map((it) => `<li><span>${esc(it.date)}</span> ${esc(it.title)}${key === ALL_KEY ? ` <em>· ${esc(it.cat)}</em>` : ""}</li>`).join("")
        : `<li>Tidak ada aktivitas</li>`;

      detailEl.style.setProperty("--c", colorOf[key]);
      detailEl.innerHTML = `
        <div class="tl-td__head"><strong>${esc(key === ALL_KEY ? "Total" : keyName(key))} · ${esc(scope)}</strong>
          <button type="button" class="tl-td__close" aria-label="Tutup statistik">×</button></div>
        <div class="tl-td__stats">${stats}</div>
        ${chips ? `<div class="tl-td__chips">${chips}</div>` : ""}
        <ul>${rows}</ul>`;
      detailEl.hidden = false;

      tableEl.querySelectorAll(".is-picked").forEach((el) => el.classList.remove("is-picked"));
      tableEl.querySelectorAll("[data-col]").forEach((el) => {
        const sameCol = el.dataset.col === key;
        const sameCell = idx === null ? el.tagName === "TH" : el.dataset.i === String(idx);
        if (sameCol && sameCell) el.classList.add("is-picked");
      });
    }

    function hideTableDetail() {
      detailEl.hidden = true;
      tableEl.querySelectorAll(".is-picked").forEach((el) => el.classList.remove("is-picked"));
    }

    // ---------- Compare ----------
    function setupCompare() {
      const idx = data.labels.map((_, i) => i);
      const opts = idx.map((i) => `<option value="${i}">${esc(periodName(i))}</option>`).join("");
      cmpA.innerHTML = opts;
      cmpB.innerHTML = opts;
      const totals = data.series[0].values;
      const filled = idx.filter((i) => totals[i] > 0);
      const b = filled.length ? filled[filled.length - 1] : idx[idx.length - 1];
      const a = filled.length > 1 ? filled[filled.length - 2] : idx[Math.max(0, idx.indexOf(b) - 1)];
      cmpA.value = String(a);
      cmpB.value = String(b);
      drawCompare();
    }

    function drawCompare() {
      const a = Number(cmpA.value);
      const b = Number(cmpB.value);
      const rows = data.series.filter((s) => !isSL(s.key) && (s.key === ALL_KEY || s.values[a] > 0 || s.values[b] > 0));
      const max = Math.max(1, ...rows.flatMap((s) => [s.values[a] || 0, s.values[b] || 0]));

      if (rows.length === 1 && !rows[0].values[a] && !rows[0].values[b]) {
        cmpOut.innerHTML = `<p class="tl-empty">No activities in either period.</p>`;
        return;
      }

      const body = rows.map((s) => {
        const va = s.values[a] || 0;
        const vb = s.values[b] || 0;
        const d = vb - va;
        const cls = d > 0 ? "up" : d < 0 ? "down" : "flat";
        const txt = d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : "＝ 0";
        return `
        <div class="tl-cmp-row">
          <span class="tl-cmp-label">${s.key === ALL_KEY ? "Total" : esc(s.label)}</span>
          <div class="tl-cmp-bars">
            <div class="tl-cmp-bar tl-cmp-bar--a"><i style="width:${(va / max) * 100}%"></i><b>${va}</b></div>
            <div class="tl-cmp-bar tl-cmp-bar--b"><i style="width:${(vb / max) * 100}%"></i><b>${vb}</b></div>
          </div>
          <span class="tl-delta ${cls}">${txt}</span>
        </div>`;
      }).join("");

      cmpOut.innerHTML = `
        <p class="tl-cmp-head">${esc(periodName(a))} <span class="b">→ ${esc(periodName(b))}</span></p>
        ${body}`;
    }

    // ---------- Filter bulan ----------
    function fillMonths() {
      const [s, e] = monthRange(state.year);
      let html = `<option value="-1">All months</option>`;
      for (let m = s; m <= e; m++) html += `<option value="${m}">${MONTHS[m]}</option>`;
      monthSel.innerHTML = html;
      if (state.month < s || state.month > e) state.month = -1;
      monthSel.value = String(state.month);
    }

    // ---------- Render keseluruhan ----------
    function render() {
      data = build();
      if (!state.active) {
        // default: All + semua kategori yang punya data (garis setlist mati)
        state.active = new Set(data.series.filter((s) => s.key === ALL_KEY || (!isSL(s.key) && s.total > 0)).map((s) => s.key));
      }
      yearWrap.hidden = state.mode === "year";
      monthWrap.hidden = state.mode === "year";
      drawChips();
      drawChart();
      drawSummary();
      drawTable();
      hideTableDetail();
      setupCompare();
      hideTip();
    }

    // ---------- Event ----------
    yearSel.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
    yearSel.value = String(state.year);
    fillMonths();

    yearSel.addEventListener("change", () => {
      state.year = Number(yearSel.value);
      fillMonths();
      render();
    });
    monthSel.addEventListener("change", () => {
      state.month = Number(monthSel.value);
      render();
    });

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        state.mode = tab.dataset.mode;
        tabs.forEach((t) => {
          const on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", String(on));
        });
        render();
      });
    });

    chipsEl.addEventListener("click", (e) => {
      const c = e.target.closest(".tl-chip");
      if (!c) return;
      onChipClick(c.dataset.key);
      drawChips();
      drawChart();
      hideTip();
    });

    // kartu THEATER di Totals: buka/tutup statistik setlist
    const toggleSummary = () => { state.sumOpen = !state.sumOpen; drawSummary(); };
    summaryEl.addEventListener("click", (e) => {
      if (e.target.closest("[data-sum]")) toggleSummary();
    });
    summaryEl.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.closest("[data-sum]")) {
        e.preventDefault();
        toggleSummary();
      }
    });

    chartEl.addEventListener("pointermove", (e) => {
      if (state.pin || e.pointerType === "touch") return;
      const g = e.target.closest && e.target.closest(".tl-hit, .tl-marker");
      if (g) showSummaryTip(Number(g.dataset.i));
      else tipEl.hidden = true;
    });
    chartEl.addEventListener("pointerleave", () => { if (!state.pin) tipEl.hidden = true; });

    chartEl.addEventListener("click", (e) => {
      const m = e.target.closest && e.target.closest(".tl-marker");
      if (m) {
        state.pin = true;
        showDetailTip(Number(m.dataset.i), m.dataset.key);
        return;
      }
      const g = e.target.closest && e.target.closest(".tl-hit");
      if (g) {
        state.pin = false;
        showSummaryTip(Number(g.dataset.i));
      } else {
        hideTip();
      }
    });

    document.addEventListener("click", (e) => {
      if (chartEl.contains(e.target) || tipEl.contains(e.target)) return;
      hideTip();
    });

    // klik header kolom / sel tabel -> statistik
    tableEl.addEventListener("click", (e) => {
      const c = e.target.closest("[data-col]");
      if (!c) return;
      showTableDetail(c.dataset.col, c.dataset.i === undefined ? null : Number(c.dataset.i));
    });
    detailEl.addEventListener("click", (e) => {
      if (e.target.closest(".tl-td__close")) hideTableDetail();
    });

    cmpA.addEventListener("change", drawCompare);
    cmpB.addEventListener("change", drawCompare);

    if (moreBtn && moreBox && moreLabel) {
      moreBtn.addEventListener("click", () => {
        const open = moreBox.hidden;
        moreBox.hidden = !open;
        moreLabel.textContent = open ? "Show Less" : "Show More";
        moreBtn.classList.toggle("is-expanded", open);
        moreBtn.setAttribute("aria-expanded", String(open));
      });
    }

    // dipanggil saat filter "Exclude JKT48 School" berubah
    timelineReload = () => {
      items = filterItems();
      state.active = null;
      state.slOpen = false;
      state.sumOpen = false;
      render();
    };

    render();
  }

  /* ==========================================================
     8. JOURNEY TIMERS (first show | last show | next show)
     ========================================================== */
  function initJourneyTimers() {
    const root = document.getElementById("journeyTimers");
    if (!root) return;

    const FIRST_SHOW = new Date("2026-02-22T00:00:00");
    const FULL = [["y", "Years"], ["mo", "Months"], ["d", "Days"], ["h", "Hours"], ["mi", "Minutes"], ["s", "Seconds"]];
    const SHORT = FULL.slice(2);
    const ZERO = { y: 0, mo: 0, d: 0, h: 0, mi: 0, s: 0 };
    const data = window.BoniveraData || {};

    const fmtDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    function parseWhen(item) {
      if (!item) return null;
      const raw = item.date || item.start || item.startDate || item.datetime;
      if (!raw) return null;
      const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2})[:.](\d{2}))?/);
      if (!m) return null;
      let h = 0, mi = 0, hasTime = false;
      if (m[4]) { h = +m[4]; mi = +m[5]; hasTime = true; }
      else {
        const t = String(item.time || item.startTime || item.jam || "").match(/(\d{1,2})[:.](\d{2})/);
        if (t) { h = +t[1]; mi = +t[2]; hasTime = true; }
      }
      return { dt: new Date(+m[1], +m[2] - 1, +m[3], h, mi), hasTime };
    }

    function getSchedule() {
      for (const k of ["schedule", "schedules", "events", "shows"]) {
        if (Array.isArray(data[k])) return data[k];
      }
      if (Array.isArray(window.BoniveraSchedule)) return window.BoniveraSchedule;
      for (const [k, v] of Object.entries(data)) {
        if (k !== "recaps" && Array.isArray(v) && v.length && v[0] && (v[0].date || v[0].start)) return v;
      }
      return [];
    }

    const recapList = (Array.isArray(data.recaps) ? data.recaps : [])
      .map((r) => {
        const w = parseWhen(r);
        return w && { id: r.id, title: cleanSetlist(r.title), dt: w.dt, date: String(r.date || "") };
      })
      .filter(Boolean);

    const eventList = getSchedule()
      .map((ev) => {
        const w = parseWhen(ev);
        return w && {
          id: ev.id,
          title: cleanSetlist(ev.title || ev.name || ev.event || ""),
          dt: w.dt,
          hasTime: w.hasTime,
        };
      })
      .filter(Boolean);

    const recapHref = (r) => (r && r.id != null ? `recap.html#recap-${encodeURIComponent(r.id)}` : "recap.html");

    function diffParts(from, to) {
      if (to < from) return { ...ZERO };
      let y = to.getFullYear() - from.getFullYear();
      let mo = to.getMonth() - from.getMonth();
      let d = to.getDate() - from.getDate();
      let h = to.getHours() - from.getHours();
      let mi = to.getMinutes() - from.getMinutes();
      let s = to.getSeconds() - from.getSeconds();
      if (s < 0) { s += 60; mi--; }
      if (mi < 0) { mi += 60; h--; }
      if (h < 0) { h += 24; d--; }
      if (d < 0) { d += new Date(to.getFullYear(), to.getMonth(), 0).getDate(); mo--; }
      if (mo < 0) { mo += 12; y--; }
      return { y, mo, d: Math.max(0, d), h, mi, s };
    }

    function makePart(id, defs) {
      const el = document.getElementById(id);
      if (!el) return null;
      const unitsEl = el.querySelector(".jt-units");
      unitsEl.innerHTML = defs.map(([k, label]) => `
        <div class="jt-unit"><span class="jt-unit__value" data-u="${k}">--</span><span class="jt-unit__label">${label}</span></div>
      `).join("");
      return {
        el,
        dateEl: el.querySelector(".jt-part__date"),
        metaEl: el.querySelector(".jt-part__meta"),
        valueEls: [...unitsEl.querySelectorAll("[data-u]")],
        key: null,
      };
    }

    function setInfo(p, dt, title, href) {
      p.dateEl.textContent = dt ? fmtDate(dt) : "—";
      p.dateEl.setAttribute("href", href);
      p.metaEl.textContent = title || "";
    }

    function paint(p, diff) {
      p.valueEls.forEach((el) => {
        el.textContent = diff ? String(diff[el.dataset.u]).padStart(2, "0") : "--";
      });
    }

    const first = makePart("jtFirst", FULL);
    const last = makePart("jtLast", FULL);
    const next = makePart("jtNext", SHORT);
    if (!first || !last || !next) return;

    const firstRecap =
      recapList.find((r) => r.date.slice(0, 10) === "2026-02-22") ||
      [...recapList].sort((a, b) => a.dt - b.dt)[0] ||
      null;
    setInfo(first, FIRST_SHOW, firstRecap && firstRecap.title, recapHref(firstRecap));

    function tick() {
      const now = new Date();

      let lastItem = null;
      recapList.forEach((r) => { if (r.dt <= now && (!lastItem || r.dt >= lastItem.dt)) lastItem = r; });

      let nextItem = null;
      eventList.forEach((e) => {
        const endOfDay = new Date(e.dt.getFullYear(), e.dt.getMonth(), e.dt.getDate(), 23, 59, 59);
        const upcoming = e.hasTime ? e.dt > now : endOfDay >= now;
        if (upcoming && (!nextItem || e.dt < nextItem.dt)) nextItem = e;
      });

      const lastKey = lastItem ? `${lastItem.dt.getTime()}|${lastItem.id}` : "none";
      if (last.key !== lastKey) {
        last.key = lastKey;
        setInfo(last, lastItem && lastItem.dt, lastItem && lastItem.title, recapHref(lastItem));
      }
      const nextKey = nextItem ? `${nextItem.dt.getTime()}|${nextItem.id}` : "none";
      if (next.key !== nextKey) {
        next.key = nextKey;
        setInfo(next, nextItem && nextItem.dt, nextItem ? nextItem.title : "No upcoming show", "schedule.html");
      }

      paint(first, diffParts(FIRST_SHOW, now));
      paint(last, lastItem ? diffParts(lastItem.dt, now) : null);
      paint(next, nextItem ? (nextItem.dt > now ? diffParts(now, nextItem.dt) : ZERO) : null);
    }

    tick();
    setInterval(tick, 1000);
  }

  /* ==========================================================
     9. FAKTA & TRIVIA + PERJALANAN BELLA (layout ringkas)
     3 item pertama tampil, sisanya di tombol "Lihat ... Lainnya".
     Tiap item: badge/tanggal, judul, ringkasan, foto.
     ========================================================== */
  const PREVIEW = 3;
  const NO_PHOTO_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.6"/><path d="M3 17l5-4 4 3 3-2.5 6 4.5"/><path d="M4 4l16 16"/></svg>`;
  const photoGroups = [];

  function emptyPhoto() {
    return `<span class="pbox pbox--empty" role="img" aria-label="Belum ada foto">${NO_PHOTO_ICON}</span>`;
  }

  function photoHTML(photos, title) {
    const list = (Array.isArray(photos) ? photos : [])
      .map((p) => (typeof p === "string" ? { src: p, caption: "" } : p))
      .filter((p) => p && p.src);
    if (!list.length) return emptyPhoto();
    const gi = photoGroups.push({ title, photos: list }) - 1;
    const imgs = list.slice(0, 3)
      .map((p) => `<img class="pstack__img" src="${esc(p.src)}" alt="" loading="lazy">`)
      .join("");
    const count = list.length > 1 ? `<span class="pstack__count">${list.length}</span>` : "";
    return `<button type="button" class="pstack" data-g="${gi}" aria-label="Lihat ${list.length} foto: ${esc(title)}">${imgs}${count}</button>`;
  }

  /* ---------- Lightbox foto ---------- */
  let lb = null;
  let lbGroup = null;
  let lbIndex = 0;

  function paintLightbox() {
    const p = lbGroup.photos[lbIndex];
    const img = lb.querySelector("img");
    img.src = p.src;
    img.alt = p.caption || lbGroup.title;
    lb.querySelector(".bv-lightbox__cap").textContent = p.caption || lbGroup.title;
    const multi = lbGroup.photos.length > 1;
    lb.querySelector(".bv-lightbox__count").textContent = multi ? `${lbIndex + 1} / ${lbGroup.photos.length}` : "";
    lb.querySelectorAll(".bv-lightbox__nav").forEach((b) => { b.hidden = !multi; });
  }

  function closeLightbox() {
    if (!lb) return;
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function stepLightbox(d) {
    if (!lbGroup) return;
    const n = lbGroup.photos.length;
    lbIndex = (lbIndex + d + n) % n;
    paintLightbox();
  }

  function openLightbox(gi) {
    if (!photoGroups[gi]) return;
    if (!lb) {
      lb = document.createElement("div");
      lb.className = "bv-lightbox";
      lb.setAttribute("role", "dialog");
      lb.setAttribute("aria-modal", "true");
      lb.innerHTML = `
        <button type="button" class="bv-lightbox__close" data-act="close" aria-label="Tutup foto">×</button>
        <button type="button" class="bv-lightbox__nav bv-lightbox__nav--prev" data-act="prev" aria-label="Foto sebelumnya">‹</button>
        <img src="" alt="">
        <button type="button" class="bv-lightbox__nav bv-lightbox__nav--next" data-act="next" aria-label="Foto berikutnya">›</button>
        <p class="bv-lightbox__cap"></p>
        <p class="bv-lightbox__count"></p>`;
      document.body.appendChild(lb);
      lb.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]");
        if (act) {
          if (act.dataset.act === "close") closeLightbox();
          else stepLightbox(act.dataset.act === "next" ? 1 : -1);
        } else if (e.target === lb) {
          closeLightbox();
        }
      });
      document.addEventListener("keydown", (e) => {
        if (!lb.classList.contains("is-open")) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowRight") stepLightbox(1);
        if (e.key === "ArrowLeft") stepLightbox(-1);
      });
    }
    lbGroup = photoGroups[gi];
    lbIndex = 0;
    paintLightbox();
    lb.classList.add("is-open");
    document.body.style.overflow = "hidden";
    lb.querySelector(".bv-lightbox__close").focus();
  }

  /* ---------- Daftar fakta & perjalanan ---------- */
  function moreBlock(more) {
    if (!more) return "";
    return `<div class="more-text" hidden><p>${esc(more)}</p></div>
            <button type="button" class="readmore-link" aria-expanded="false">Baca selengkapnya</button>`;
  }

  function mountList({ list, more, btn, label, items, render, openText }) {
    if (!list) return;
    if (!items.length) {
      list.innerHTML = `<p class="tl-empty">Belum ada data.</p>`;
      return;
    }
    list.innerHTML = items.slice(0, PREVIEW).map(render).join("");
    const rest = items.slice(PREVIEW);
    if (!rest.length || !more || !btn) return;

    more.innerHTML = rest.map(render).join("");
    const text = openText(rest.length);
    label.textContent = text;
    btn.hidden = false;

    btn.addEventListener("click", () => {
      const open = more.hidden;
      more.hidden = !open;
      label.textContent = open ? "Tutup" : text;
      btn.classList.toggle("is-expanded", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  }

  function initFactsAndJourney() {
    const data = window.BoniveraData || {};

    const fmtDate = (iso) => {
      const [y, m, d] = String(iso).split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    // ---- Fakta & Trivia ----
    const facts = Array.isArray(data.facts) ? data.facts : [];
    const catKey = (c) => {
      const k = String(c || "FAKTA").toLowerCase().replace(/[^a-z]/g, "");
      return ["prestasi", "fakta", "triva"].includes(k) ? k : "fakta";
    };

    mountList({
      list: document.getElementById("factsList"),
      more: document.getElementById("factsMore"),
      btn: document.getElementById("factsMoreBtn"),
      label: document.getElementById("factsMoreLabel"),
      items: facts,
      openText: (n) => `Lihat ${n} Fakta & Trivia Bella Lainnya`,
      render: (f) => {
        const c = catKey(f.category);
        const dateTxt = f.date && /^\d{4}-\d{2}-\d{2}$/.test(String(f.date)) ? fmtDate(f.date) : (f.date ? String(f.date) : "");
        return `
        <article class="fact fact--${c}">
          <div class="fact__body">
            <div class="fact__meta">
              <span class="cat-badge cat-badge--${c}">${esc(String(f.category || "FAKTA").toUpperCase())}</span>
              ${dateTxt ? `<span class="fact__date">${esc(dateTxt)}</span>` : ""}
            </div>
            <h3 class="fact__title">${esc(f.title)}</h3>
            ${f.text ? `<p class="fact__text">${esc(f.text)}</p>` : ""}
            ${moreBlock(f.more)}
          </div>
          ${photoHTML(f.photos, f.title)}
        </article>`;
      },
    });

    // ---- Perjalanan Bella ----
    const timeline = (Array.isArray(data.timeline) ? data.timeline : [])
      .filter((t) => t && t.date)
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    mountList({
      list: document.getElementById("tlineList"),
      more: document.getElementById("tlineMore"),
      btn: document.getElementById("tlineMoreBtn"),
      label: document.getElementById("tlineMoreLabel"),
      items: timeline,
      openText: (n) => `Lihat Selengkapnya (${n} momen lagi)`,
      render: (t) => `
        <li class="tl-item">
          <div class="tl-item__body">
            <span class="tl-item__date">${esc(fmtDate(t.date))}</span>
            <h3 class="tl-item__title">${esc(t.title)}</h3>
            ${t.text ? `<p class="tl-item__text">${esc(t.text)}</p>` : ""}
            ${moreBlock(t.more)}
          </div>
          ${photoHTML(t.photos, t.title)}
        </li>`,
    });

    // ---- Klik foto & "Baca selengkapnya" ----
    ["factsPanel", "journeyPanel"].forEach((id) => {
      const panel = document.getElementById(id);
      if (!panel) return;

      panel.addEventListener("click", (e) => {
        const stack = e.target.closest(".pstack");
        if (stack) { openLightbox(Number(stack.dataset.g)); return; }

        const link = e.target.closest(".readmore-link");
        if (link) {
          const box = link.parentElement.querySelector(".more-text");
          if (!box) return;
          const open = box.hidden;
          box.hidden = !open;
          link.textContent = open ? "Tutup" : "Baca selengkapnya";
          link.setAttribute("aria-expanded", String(open));
        }
      });

      panel.addEventListener("error", (e) => {
        if (e.target.tagName !== "IMG") return;
        const stack = e.target.closest(".pstack");
        if (stack) stack.outerHTML = emptyPhoto();
      }, true);
    });
  }

  /* ==========================================================
     10. BIODATA SLIDESHOW (foto -> video)
     ========================================================== */
  function initBiodataSlideshow() {
    const root = document.getElementById("bioMedia");
    if (!root) return;
    const photo = root.querySelector(".bio-slide--photo");
    const video = root.querySelector(".bio-slide--video");
    if (!photo || !video) return;

    const PHOTO_MS = 5000;
    let timer = null;
    let videoOk = true;

    const show = (el) => [photo, video].forEach((s) => s.classList.toggle("is-active", s === el));

    function showPhoto() {
      show(photo);
      clearTimeout(timer);
      timer = setTimeout(showVideo, PHOTO_MS);
    }

    function showVideo() {
      if (!videoOk) { showPhoto(); return; }
      video.currentTime = 0;
      const p = video.play();
      if (p && typeof p.then === "function") {
        p.then(() => show(video)).catch(() => { videoOk = false; showPhoto(); });
      } else {
        show(video);
      }
    }

    video.addEventListener("ended", showPhoto);
    video.addEventListener("error", () => { videoOk = false; });

    showPhoto();
  }

  /* ==========================================================
     11. CURRENT STATUS / TEAM — LOGIKA & RENDERER
     ========================================================== */
  function parseWib(value) {
    if (!value) return NaN;
    let s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += "T00:00:00";
    if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(s)) s += "+07:00";
    return Date.parse(s);
  }

  function splitDuration(ms) {
    const t = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
  }

  const statusJobs = new Set();
  let statusHandle = null;

  function stopStatusTicker() {
    if (statusHandle) { clearInterval(statusHandle); statusHandle = null; }
  }
  function runStatusJobs() {
    statusJobs.forEach((job) => { if (job() === false) statusJobs.delete(job); });
    if (!statusJobs.size) stopStatusTicker();
  }
  function addStatusJob(job) {
    if (job() === false) return;
    statusJobs.add(job);
    if (!statusHandle) statusHandle = setInterval(runStatusJobs, 1000);
  }
  function clearStatusJobs() {
    statusJobs.clear();
    stopStatusTicker();
  }

  const STATUS_UNITS = [["d", "Days"], ["h", "Hours"], ["m", "Minutes"], ["s", "Seconds"]];

  function statusTimerHTML() {
    return `<div class="bs__units">${STATUS_UNITS.map(([k, l]) =>
      `<div class="bs__unit"><b data-u="${k}">--</b><small>${l}</small></div>`).join("")}</div>`;
  }

  function paintStatusTimer(box, parts) {
    box.querySelectorAll("[data-u]").forEach((el) => {
      el.textContent = parts ? String(parts[el.dataset.u]).padStart(2, "0") : "--";
    });
  }

  function mountStatusTimer(root, def, config) {
    const slot = root.querySelector(".bs__timer");
    if (!slot || def.timer === "none") return;

    const ts = parseWib(config.dates && config.dates[def.dateKey]);
    if (Number.isNaN(ts)) {
      slot.innerHTML = `<p class="bs__note">${esc(def.missing || "Tanggal belum diisi")}</p>`;
      return;
    }

    slot.innerHTML = `<p class="bs__caption">${esc(def.caption || "")}</p>${statusTimerHTML()}`;
    const box = slot.querySelector(".bs__units");

    addStatusJob(() => {
      if (!root.isConnected) return false;
      const now = Date.now();
      if (def.timer === "stopwatch") {
        paintStatusTimer(box, splitDuration(now - ts));
        return true;
      }
      const left = ts - now;
      if (left <= 0) {
        slot.innerHTML = `<p class="bs__note bs__note--ended">${esc(def.ended || "Periode telah berakhir")}</p>`;
        return false;
      }
      paintStatusTimer(box, splitDuration(left));
      return true;
    });
  }

  function statusLogoHTML(team) {
    const fallback = `<span class="bs__letter" aria-hidden="true">${esc(team.letter || "?")}</span>`;
    if (!team.logo) return fallback;
    return `<img src="${esc(team.logo)}" alt="Logo ${esc(team.name)}" width="56" height="67" loading="lazy" data-fallback='${esc(fallback)}'>`;
  }

  function initBellaStatus() {
    const mount = document.getElementById("bellaStatusMount");
    if (!mount) return;

    clearStatusJobs();
    const team = teamPresets[String(bellaStatusConfig.team || "").toUpperCase()];
    const statusKey = String(bellaStatusConfig.status || "").toUpperCase();
    const def = statusDefs[statusKey];

    if (!team || !def) {
      mount.innerHTML = `<span class="bs__note">Konfigurasi status/team belum valid</span>`;
      return;
    }

    mount.innerHTML = `
      <div class="bs" data-deco="${esc(team.deco || "")}" data-status="${esc(statusKey.toLowerCase())}"
           style="--bs-main:${esc(team.main)};--bs-sub:${esc(team.sub)};--bs-status:${esc(def.color)}">
        <div class="bs__logo">${statusLogoHTML(team)}</div>
        <div class="bs__info">
          <div class="bs__row">
            <span class="bs__team">${esc(team.label)}</span>
            <span class="bs__badge"><i class="bs__dot" aria-hidden="true"></i>${esc(def.label)}</span>
          </div>
          <div class="bs__timer" aria-live="off"></div>
        </div>
      </div>`;

    const img = mount.querySelector(".bs__logo img");
    if (img) img.addEventListener("error", () => { img.parentElement.innerHTML = img.dataset.fallback; });

    mountStatusTimer(mount.querySelector(".bs"), def, bellaStatusConfig);
  }

  window.addEventListener("pagehide", clearStatusJobs);

  /* ==========================================================
     12. TOGGLE BACA SELENGKAPNYA & LABEL BAR LAGU
     ========================================================== */
  function initReadMoreToggles() {
    document.querySelectorAll(".read-more-btn").forEach((btn) => {
      const target = document.getElementById(btn.dataset.toggleTarget);
      const label = btn.querySelector("[data-toggle-label]");
      if (!target || !label) return;

      btn.addEventListener("click", () => {
        const isHidden = target.hidden;
        target.hidden = !isHidden;
        label.textContent = isHidden ? "Baca Lebih Sedikit" : "Baca Selengkapnya";
        btn.classList.toggle("is-expanded", isHidden);
        btn.setAttribute("aria-expanded", String(isHidden));
      });
    });
  }

  /* Label lagu panjang: geser otomatis saat di-hover */
  function initBarLabelScroll() {
    document.addEventListener("mouseover", (e) => {
      const el = e.target.closest(".stat-bar-row__label");
      if (el && el.scrollWidth > el.clientWidth) {
        el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      }
    });
    document.addEventListener("mouseout", (e) => {
      const el = e.target.closest(".stat-bar-row__label");
      if (el && !el.contains(e.relatedTarget)) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      }
    });
  }

  /* ==========================================================
     13. INISIALISASI
     (Filter ?setlist=... untuk halaman Recap kini ditangani langsung
      oleh recap.js, jadi tidak ada lagi di file ini.)
     ========================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    // Biodata
    initBiodataSlideshow();
    initBellaStatus();
    initIntroCounter();
    initAge();
    initAge16Countdown();
    initJikoPlayer();

    // Know more
    initFactsAndJourney();
    initReadMoreToggles();

    // Statistik
    initActivityStats();
    initJourneyTimers();
    initTimelineStats();
    initStatsFilter();
    initBarLabelScroll();
  });
})();