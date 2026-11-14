/* ============================================================
   BONIVERA — HOME PAGE LOGIC
   ============================================================ */
(function () {
  "use strict";

  const reduced = window.Bonivera ? window.Bonivera.prefersReducedMotion : false;
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");

  /* ----------------------------------------------------------
     Hero — light parallax on decorative blobs
     ---------------------------------------------------------- */
  function initHeroParallax() {
    const blobs = document.querySelectorAll(".hero__blob");
    if (!blobs.length || reduced) return;

    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        blobs.forEach((b, i) => {
          b.style.transform = `translateY(${y * (0.06 + i * 0.03)}px)`;
        });
        ticking = false;
      });
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     NEW — Hero: foto "tembok retak 3D" miring mengikuti mouse
     CSS: home.css → ".hero__frame" (variabel --rx / --ry)
     Hanya untuk mouse; di HP frame tetap miring ringan (default CSS).
     ---------------------------------------------------------- */
  function initHeroTilt() {
    const hero = document.querySelector(".hero");
    const frame = $("heroFrame");
    if (!hero || !frame || reduced) return;

    let raf = 0;

    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = frame.getBoundingClientRect();
        const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
        frame.style.setProperty("--ry", (nx * 16).toFixed(2) + "deg");
        frame.style.setProperty("--rx", (-ny * 12).toFixed(2) + "deg");
      });
    });

    hero.addEventListener("pointerleave", () => {
      frame.style.removeProperty("--rx");   // kembali ke kemiringan default CSS
      frame.style.removeProperty("--ry");
    });
  }

  /* ----------------------------------------------------------
     Hero — scroll cue
     ---------------------------------------------------------- */
  function initScrollCue() {
    const cue = document.getElementById("scrollCue");
    const jiko = document.getElementById("jiko");
    if (!cue || !jiko) return;

    cue.addEventListener("click", () => {
      const headerH = document.getElementById("navbar")?.offsetHeight || 0;
      const top = jiko.getBoundingClientRect().top + window.scrollY - headerH;
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ----------------------------------------------------------
     NEW — Hero: efek ketikan "Kenalan sama Bella yuk!"
     ---------------------------------------------------------- */
  function initTyping() {
    const el = $("aboutTyping");
    if (!el) return;
    const text = el.dataset.text || "Kenalan sama Bella yuk!";
    if (reduced) { el.textContent = text; return; }

    let i = 0;
    let dir = 1;
    (function tick() {
      el.textContent = text.slice(0, i);
      let delay;
      if (dir === 1) {
        if (i < text.length) { i++; delay = 85; }
        else { dir = -1; delay = 2200; }           // jeda setelah selesai mengetik
      } else {
        if (i > 0) { i--; delay = 40; }
        else { dir = 1; delay = 600; }
      }
      setTimeout(tick, delay);
    })();
  }

  /* ----------------------------------------------------------
     NEW — Jiko: teks "Ding Dong! ..." diketik saat section terlihat
     - teks asli di HTML dibaca otomatis (<br> = baris baru)
     - sisa teks yang belum diketik tetap memakan ruang (disembunyikan),
       jadi tata letak tidak loncat-loncat
     - jalan sekali; reduced-motion → teks langsung tampil utuh
     ---------------------------------------------------------- */
  function initJikoTyping() {
    const el = $("jikoText");
    if (!el) return;

    const full = el.innerHTML.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
    el.setAttribute("aria-label", full.replace(/\n/g, " "));
    if (reduced) return;

    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
    function draw(i) {
      el.innerHTML =
        '<span aria-hidden="true">' + esc(full.slice(0, i)) +
        '<span class="jiko__caret"></span>' +
        '<span style="visibility:hidden">' + esc(full.slice(i)) + "</span></span>";
    }

    const PAUSE_MIN = 10000;   // jeda setelah selesai mengetik: 10–15 detik
    const PAUSE_MAX = 15000;

    // Mengetik maju sampai habis → tunggu → hapus cepat → ulang lagi
    function start() {
      let i = 0;

      function typeStep() {
        i++;
        draw(i);
        if (i >= full.length) {
          setTimeout(eraseStep, PAUSE_MIN + Math.random() * (PAUSE_MAX - PAUSE_MIN));
          return;
        }
        const ch = full[i - 1];
        const delay = ch === "\n" ? 450 : /[.,!]/.test(ch) ? 240 : 55;
        setTimeout(typeStep, delay);
      }

      function eraseStep() {
        i--;
        draw(Math.max(i, 0));
        if (i > 0) { setTimeout(eraseStep, 22); return; }
        setTimeout(typeStep, 600);
      }

      typeStep();
    }

    draw(0);
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setTimeout(start, 300);
      }, { threshold: 0.6 });
      io.observe(el);
    } else {
      start();
    }
  }

  /* ============================================================
     ★ TIMER ULANG TAHUN ★
     Countdown Until Bella Turn 16 (2 Maret 2027) + jam pasir mini
     Format: YEARS | DAYS | HOURS | MINUTES | SECONDS
     HTML: .sweet16 (kolom kiri)  ·  CSS: ".sweet16*", ".hourglass*"
     ============================================================ */
  const TURN16_TARGET = new Date(2027, 2, 2, 0, 0, 0);   // 2 Maret 2027 00:00 (bulan JS: 0-11)
  const HOURGLASS_START = new Date(2026, 2, 2, 0, 0, 0); // 2 Maret 2026 = ulang tahun ke-15
  const SHAKE_EVERY_MS = 7000;                           // jam pasir bergoyang tiap 7 detik

  function addYears(date, y) {
    const r = new Date(date.getTime());
    const day = r.getDate();
    r.setDate(1);                       // hindari loncat bulan (mis. 29 Feb)
    r.setFullYear(r.getFullYear() + y);
    const dim = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(day, dim));
    return r;
  }

  // Selisih berbasis kalender: tahun penuh + sisa hari/jam/menit/detik
  function calendarDiff(now, target) {
    if (target <= now) return null;
    let y = target.getFullYear() - now.getFullYear();
    let base = addYears(now, y);
    while (y > 0 && base > target) { y--; base = addYears(now, y); }
    let rest = target - base;
    const days = Math.floor(rest / 864e5); rest %= 864e5;
    const hours = Math.floor(rest / 36e5); rest %= 36e5;
    const minutes = Math.floor(rest / 6e4); rest %= 6e4;
    const seconds = Math.floor(rest / 1000);
    return { years: y, days, hours, minutes, seconds };
  }

  function initSweet16() {
    const timeBox = $("sweet16Time");
    if (!timeBox) return;

    const els = {
      years: $("s16Years"), days: $("s16Days"), hours: $("s16Hours"),
      minutes: $("s16Minutes"), seconds: $("s16Seconds"),
    };
    const done = $("sweet16Done");
    const hg = $("hourglass");
    const hgTop = $("hgTop");
    const hgBottom = $("hgBottom");
    const hgStream = $("hgStream");
    const H = 42;   // tinggi satu bulb di dalam SVG

    function setHourglass(now) {
      if (!hgTop || !hgBottom) return;
      const total = TURN16_TARGET - HOURGLASS_START;
      const p = Math.min(1, Math.max(0, (now - HOURGLASS_START) / total));  // 0 = penuh di atas, 1 = habis
      const topH = H * (1 - p);
      const botH = H * p;
      hgTop.setAttribute("y", String(50 - topH));
      hgTop.setAttribute("height", topH.toFixed(2));
      hgBottom.setAttribute("y", String(92 - botH));
      hgBottom.setAttribute("height", botH.toFixed(2));
      if (hgStream) {
        hgStream.setAttribute("y2", String(92 - botH));
        hgStream.style.display = p >= 1 ? "none" : "";
      }
    }

    function update() {
      const now = new Date();
      const d = calendarDiff(now, TURN16_TARGET);
      setHourglass(now);

      if (!d) {
        timeBox.hidden = true;
        if (done) done.hidden = false;
        return;
      }
      els.years.textContent = pad(d.years);
      els.days.textContent = pad(d.days);
      els.hours.textContent = pad(d.hours);
      els.minutes.textContent = pad(d.minutes);
      els.seconds.textContent = pad(d.seconds);
    }

    update();
    setInterval(update, 1000);

    // Efek goyang jam pasir (sedikit)
    if (hg && !reduced) {
      hg.addEventListener("animationend", () => hg.classList.remove("is-shaking"));
      setInterval(() => {
        hg.classList.remove("is-shaking");
        void hg.offsetWidth;
        hg.classList.add("is-shaking");
      }, SHAKE_EVERY_MS);
    }
  }

  /* ============================================================
     ★ TIMER UPCOMING SHOW ★
     Jadwal terdekat otomatis dari data/schedule.js + countdown-nya
     Format: HARI | JAM | MENIT | DETIK
     HTML: .show-bar (kolom kanan)  ·  CSS: ".show-bar*"
     ============================================================ */

  // Mencari array jadwal di berbagai kemungkinan nama variabel.
  // Kalau nama variabel di schedule.js kamu berbeda, tambahkan di daftar NAMES.
  function looksLikeSchedule(arr) {
    return Array.isArray(arr) && arr.length && arr[0] && typeof arr[0] === "object" && "date" in arr[0] && "title" in arr[0];
  }
  function readSchedule() {
    const NAMES = [
      "scheduleData", "SCHEDULE_DATA", "SCHEDULE", "schedule", "schedules", "scheduleEvents",
      "bellaSchedule", "BELLA_SCHEDULE", "events", "EVENTS", "scheduleList", "SCHEDULE_LIST",
    ];

    const B = window.BoniveraData;
    if (B && typeof B === "object") {
      for (const n of NAMES) if (looksLikeSchedule(B[n])) return B[n];
      for (const k of Object.keys(B)) if (looksLikeSchedule(B[k])) return B[k];
    }
    for (const n of NAMES) {
      if (looksLikeSchedule(window[n])) return window[n];
      try {   // menangkap `const xxx = [...]` di script klasik (tidak menempel di window)
        const v = new Function("return typeof " + n + ' !== "undefined" ? ' + n + " : undefined")();
        if (looksLikeSchedule(v)) return v;
      } catch (e) { /* abaikan */ }
    }
    return null;
  }

  function parseStart(e) {
    let t = e.time || "00:00";
    if (/^\d{1,2}:\d{2}$/.test(t)) t = t.padStart(5, "0") + ":00";
    return new Date(`${e.date}T${t}`);
  }

  function initUpcoming() {
    const card = $("upcomingShowCard");
    if (!card) return;

    const refs = {
      badge: $("upBadgeText"),
      logo: $("upLogo"),
      title: $("upTitle"),
      date: $("upDate"),
      loc: $("upLocation"),
      count: $("upCount"),
      live: $("upLive"),
      d: $("upDays"), h: $("upHours"), m: $("upMinutes"), s: $("upSeconds"),
    };

    const raw = readSchedule();
    if (!raw) console.warn("[Upcoming] Array jadwal tidak ditemukan. Pastikan data/schedule.js dimuat SEBELUM home.js, atau tambahkan nama variabelnya di readSchedule().");

    const events = (raw || [])
      .map((e) => {
        const start = parseStart(e);
        const end = new Date(start.getTime() + (Number(e.durationMinutes) || 120) * 60000);
        return { e, start, end };
      })
      .filter((x) => !isNaN(x.start.getTime()))
      .sort((a, b) => a.start - b.start);

    let shownId = null;

    function fill(item, now) {
      const key = item ? String(item.e.id ?? item.e.title + item.e.date) : "none";
      if (key !== shownId) {
        shownId = key;
        if (!item) {
          refs.title.textContent = "Belum ada jadwal terdekat";
          refs.date.textContent = "Lihat Schedule";
          refs.loc.textContent = "";
          refs.logo.hidden = true;
          refs.count.hidden = true;
          refs.live.hidden = true;
        } else {
          const e = item.e;
          refs.title.textContent = e.title;
          refs.date.textContent =
            item.start.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) +
            (e.time ? ` · ${e.time} WIB` : "");
          refs.loc.textContent = e.location || "";
          if (e.logo) {
            refs.logo.hidden = false;
            refs.logo.src = e.logo;
            refs.logo.alt = e.title;
            refs.logo.onerror = () => { refs.logo.hidden = true; };
          } else {
            refs.logo.hidden = true;
          }
        }
      }

      if (!item) return;

      const live = now >= item.start;
      card.classList.toggle("is-live", live);
      refs.badge.textContent = live ? "LIVE NOW" : "UPCOMING";
      refs.count.hidden = live;
      refs.live.hidden = !live;

      if (!live) {
        let ms = item.start - now;
        const days = Math.floor(ms / 864e5); ms %= 864e5;
        const hours = Math.floor(ms / 36e5); ms %= 36e5;
        const mins = Math.floor(ms / 6e4); ms %= 6e4;
        const secs = Math.floor(ms / 1000);
        refs.d.textContent = pad(days);
        refs.h.textContent = pad(hours);
        refs.m.textContent = pad(mins);
        refs.s.textContent = pad(secs);
      }
    }

    function tick() {
      const now = new Date();
      const next = events.find((x) => x.end > now) || null;   // terdekat yang belum selesai
      fill(next, now);
    }

    tick();
    setInterval(tick, 1000);
  }

  /* ----------------------------------------------------------
     Video — HTML5 (autoplay, play/pause, mute/unmute)
     ---------------------------------------------------------- */
  const VIDEO_CONFIG = {
    videoUrl: "assets/video/bella-video.mp4",
  };

  function initVideo() {
    const ratioBox = document.getElementById("videoContainer");
    const placeholder = document.getElementById("videoPlaceholder");
    const soundBtn = document.getElementById("soundToggle");
    const soundIcon = document.getElementById("soundIcon");
    const soundText = document.getElementById("soundText");

    if (!ratioBox || !VIDEO_CONFIG.videoUrl) return;

    const video = document.createElement("video");
    video.src = VIDEO_CONFIG.videoUrl;
    video.autoplay = true;
    video.muted = true;        // wajib agar lolos kebijakan autoplay browser
    video.playsInline = true;  // wajib untuk iOS
    video.loop = true;
    video.controls = false;
    video.id = "customVideoPlayer";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    ratioBox.appendChild(video);

    video.addEventListener("loadedmetadata", () => {
      if (placeholder) placeholder.style.display = "none";
      if (soundBtn) soundBtn.hidden = false;
    });

    video.addEventListener("error", () => {
      if (placeholder) {
        placeholder.style.display = "flex";
        const p = placeholder.querySelector("p");
        if (p) p.textContent = "Video unavailable";
      }
      video.style.display = "none";
      if (soundBtn) soundBtn.hidden = true;
    });

    // Klik area video = play / pause
    ratioBox.addEventListener("click", (e) => {
      if (e.target.closest("#soundToggle")) return;
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    });

    // Tombol suara = mute / unmute
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        video.muted = !video.muted;
        if (!video.muted && video.paused) video.play().catch(() => {});
        if (soundIcon) soundIcon.textContent = video.muted ? "🔇" : "🔊";
        if (soundText) soundText.textContent = "";
      });
    }
  }

  /* ----------------------------------------------------------
     BONIVERA On The Ground — card stack
     - 1 kartu di depan, ganti otomatis tiap INTERVAL
     - geser/drag kartu (mouse & touch), tombol prev/next, dots, keyboard
     - tombol pause/play; auto-pause saat hover, tab tersembunyi, atau di luar layar
     ---------------------------------------------------------- */
  function initBoniveraStack() {
    const stack = document.getElementById("boniveraStack");
    if (!stack) return;

    const stage = stack.closest(".bonivera-stack__stage");
    const docs = (window.BoniveraData && window.BoniveraData.boniveraDocs) || [];
    const items = docs.slice(0, 8);

    if (!items.length) {
      console.warn("[BoniveraStack] window.BoniveraData.boniveraDocs kosong. Pastikan data/bonivera-docs.js dimuat SEBELUM home.js");
      if (stage) stage.hidden = true;
      return;
    }

    const INTERVAL = 4500;  // ms antar kartu
    const SWIPE_DIST = 60;  // px minimal untuk dianggap swipe
    const n = items.length;

    stack.innerHTML = items.map((d) => `
      <figure class="stack__card">
        <img src="${d.src}" alt="${d.caption}" draggable="false" loading="lazy" width="320" height="400">
        <figcaption class="stack__note">${d.caption}</figcaption>
      </figure>
    `).join("");

    const cards = Array.from(stack.querySelectorAll(".stack__card"));
    const prevBtn = document.getElementById("stackPrev");
    const nextBtn = document.getElementById("stackNext");
    const toggleBtn = document.getElementById("stackToggle");
    const countEl = document.getElementById("stackCount");
    const dotsEl = document.getElementById("stackDots");
    const controls = document.getElementById("boniveraControls");

    // State
    let current = 0;
    let userPaused = reduced;   // reduced-motion: mulai dalam keadaan pause
    let hoverPaused = false;
    let dragging = false;
    let inView = true;
    let timer = null;

    // Dots
    const dots = items.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "stack__dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", `Go to photo ${i + 1}`);
      dot.addEventListener("click", () => go(i, i > current, -1));
      dotsEl.appendChild(dot);
      return dot;
    });

    if (n < 2) {
      if (controls) controls.hidden = true;
      if (dotsEl) dotsEl.hidden = true;
    }

    function render() {
      cards.forEach((card, i) => {
        const pos = (i - current + n) % n;
        card.dataset.pos = Math.min(pos, 3);
        card.setAttribute("aria-hidden", pos === 0 ? "false" : "true");
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle("is-active", i === current);
        dot.setAttribute("aria-selected", i === current ? "true" : "false");
      });
      if (countEl) {
        countEl.textContent = `${String(current + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
      }
    }

    function schedule() {
      clearTimeout(timer);
      if (n < 2 || userPaused || hoverPaused || dragging || !inView || document.hidden) return;
      timer = setTimeout(() => go((current + 1) % n, true, -1), INTERVAL);
    }

    // Pindah ke kartu `next`.
    // forward = kartu depan dilempar keluar (arah dir: -1 kiri / 1 kanan)
    // backward = kartu tujuan masuk dari samping ke depan
    function go(next, forward, dir) {
      if (n < 2 || next === current) return;

      if (forward) {
        const out = cards[current];
        out.style.transition = "";
        out.style.transform = "";
        out.style.setProperty("--dir", dir);
        out.classList.add("is-leaving");
        setTimeout(() => out.classList.remove("is-leaving"), 450);
        current = next;
        render();
      } else {
        const incoming = cards[next];
        incoming.style.setProperty("--dir", -1);
        incoming.style.transition = "none";
        incoming.classList.add("is-leaving");
        void incoming.offsetWidth;          // paksa reflow agar posisi awal tercatat
        incoming.style.transition = "";
        current = next;
        render();
        incoming.classList.remove("is-leaving");
      }
      schedule();
    }

    const goNext = () => go((current + 1) % n, true, -1);
    const goPrev = () => go((current - 1 + n) % n, false);

    /* ---- Tombol ---- */
    if (nextBtn) nextBtn.addEventListener("click", goNext);
    if (prevBtn) prevBtn.addEventListener("click", goPrev);

    function syncToggle() {
      if (!toggleBtn) return;
      toggleBtn.dataset.state = userPaused ? "paused" : "playing";
      toggleBtn.setAttribute("aria-label", userPaused ? "Play slideshow" : "Pause slideshow");
    }
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        userPaused = !userPaused;
        syncToggle();
        schedule();
      });
    }

    /* ---- Keyboard ---- */
    stack.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    });

    /* ---- Drag / swipe ---- */
    let active = false;
    let startX = 0;
    let startT = 0;
    let dx = 0;
    let front = null;

    stack.addEventListener("pointerdown", (e) => {
      if (n < 2 || (e.pointerType === "mouse" && e.button !== 0)) return;
      active = true;
      dragging = true;
      dx = 0;
      startX = e.clientX;
      startT = performance.now();
      front = cards[current];
      front.style.transition = "none";
      stack.classList.add("is-dragging");
      stack.setPointerCapture(e.pointerId);
      clearTimeout(timer);
    });

    stack.addEventListener("pointermove", (e) => {
      if (!active) return;
      dx = e.clientX - startX;
      front.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
    });

    function endDrag(cancelled) {
      if (!active) return;
      active = false;
      dragging = false;
      stack.classList.remove("is-dragging");

      const dist = Math.abs(dx);
      const velocity = dist / Math.max(performance.now() - startT, 1);
      const commit = !cancelled && (dist > SWIPE_DIST || (dist > 25 && velocity > 0.5));

      if (commit) {
        go((current + 1) % n, true, dx < 0 ? -1 : 1);
      } else {
        front.style.transition = "";
        front.style.transform = "";   // kembali ke posisi semula
        schedule();
      }
    }
    stack.addEventListener("pointerup", () => endDrag(false));
    stack.addEventListener("pointercancel", () => endDrag(true));

    /* ---- Auto-pause ---- */
    stage.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      hoverPaused = true;
      clearTimeout(timer);
    });
    stage.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      hoverPaused = false;
      schedule();
    });
    document.addEventListener("visibilitychange", schedule);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        schedule();
      }, { threshold: 0.25 }).observe(stack);
    }

    render();
    syncToggle();
    schedule();
  }

  /* ----------------------------------------------------------
     Init
     ---------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initHeroParallax();
    initHeroTilt();    // NEW
    initScrollCue();
    initTyping();      // NEW
    initJikoTyping();  // NEW
    initSweet16();     // NEW
    initUpcoming();    // NEW
    initVideo();
    initBoniveraStack();
  });
})();