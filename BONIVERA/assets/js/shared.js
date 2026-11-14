/* ============================================================
   BONIVERA — SHARED JAVASCRIPT
   Utilities reused across every page: navbar, reveal animation,
   countdown engine, toast, modal + focus trap, clipboard.
   Exposed on a single `Bonivera` namespace so page scripts can
   use it without any bundler / module system.
   ============================================================ */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     NAVBAR: sticky shadow state + mobile menu + active link
     ---------------------------------------------------------- */
  function initNavbar() {
    const navbar = document.getElementById("navbar");
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("primaryNav");
    if (!navbar) return;

    const onScroll = () => {
      navbar.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        document.body.style.overflow = isOpen ? "hidden" : "";
      });

      nav.querySelectorAll(".navbar__link").forEach((link) => {
        link.addEventListener("click", () => {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        });
      });

      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nav.classList.contains("is-open")) {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        }
      });
    }

    // Active link based on body[data-page]
    const current = document.body.getAttribute("data-page");
    if (current) {
      document.querySelectorAll(".navbar__link").forEach((link) => {
        if (link.getAttribute("data-nav") === current) {
          link.classList.add("is-active");
          link.setAttribute("aria-current", "page");
        }
      });
    }
  }

  /* ----------------------------------------------------------
     SCROLL REVEAL: adds .in-view when element enters viewport
     ---------------------------------------------------------- */
  function initReveal() {
    const targets = document.querySelectorAll(".reveal, .trace-line");
    if (!targets.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -60px 0px" }
    );
    targets.forEach((el) => io.observe(el));

    // Safety net: guarantee nothing is left permanently invisible even if an
    // element never intersects (e.g. unusual layout / short page edge cases).
    setTimeout(() => {
      targets.forEach((el) => el.classList.add("in-view"));
    }, 2500);
  }

  /* ----------------------------------------------------------
     SMOOTH SCROLL for in-page anchor links
     ---------------------------------------------------------- */
  function initSmoothScroll() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const headerH = document.getElementById("navbar")?.offsetHeight || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
      window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* ----------------------------------------------------------
     COUNTDOWN ENGINE
     mode: "down" (countdown to targetDate) or "up" (elapsed since targetDate)
     els: { years, days, hours, minutes, seconds } element references
     onComplete: called once when a "down" countdown reaches zero
     ---------------------------------------------------------- */
  function startCountdown({ targetDate, els, mode = "down", onTick, onComplete, onLive }) {
    const target = new Date(targetDate).getTime();
    let completed = false;
    let timerId = null;

    function diffParts(fromMs, toMs) {
      let deltaSec = Math.floor(Math.abs(toMs - fromMs) / 1000);
      const YEAR_SEC = 365.25 * 24 * 3600;
      const years = Math.floor(deltaSec / YEAR_SEC);
      deltaSec -= Math.floor(years * YEAR_SEC);
      const days = Math.floor(deltaSec / 86400);
      deltaSec -= days * 86400;
      const hours = Math.floor(deltaSec / 3600);
      deltaSec -= hours * 3600;
      const minutes = Math.floor(deltaSec / 60);
      const seconds = deltaSec - minutes * 60;
      return { years, days, hours, minutes, seconds };
    }

    function pad(n) { return String(n).padStart(2, "0"); }

    function render() {
      const now = Date.now();

      if (mode === "down" && now >= target) {
        if (els) {
          els.years && (els.years.textContent = "00");
          els.days && (els.days.textContent = "00");
          els.hours && (els.hours.textContent = "00");
          els.minutes && (els.minutes.textContent = "00");
          els.seconds && (els.seconds.textContent = "00");
        }
        if (!completed) {
          completed = true;
          onComplete && onComplete();
        }
        if (timerId) clearInterval(timerId);
        return;
      }

      const parts = mode === "down" ? diffParts(now, target) : diffParts(target, now);

      if (els) {
        els.years && (els.years.textContent = pad(parts.years));
        els.days && (els.days.textContent = pad(parts.days));
        els.hours && (els.hours.textContent = pad(parts.hours));
        els.minutes && (els.minutes.textContent = pad(parts.minutes));
        els.seconds && (els.seconds.textContent = pad(parts.seconds));
      }
      onTick && onTick(parts);
    }

    render();
    timerId = setInterval(render, 1000);
    return () => clearInterval(timerId);
  }

  /* ----------------------------------------------------------
     AGE CALCULATOR — accurate whole-years-elapsed calculation
     ---------------------------------------------------------- */
  function calculateAge(birthDateStr, atDate) {
    const birth = new Date(birthDateStr);
    const now = atDate ? new Date(atDate) : new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /* ----------------------------------------------------------
     TOAST NOTIFICATIONS
     ---------------------------------------------------------- */
  function ensureToastStack() {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      stack.setAttribute("role", "status");
      document.body.appendChild(stack);
    }
    return stack;
  }

  function showToast(message, duration = 2600) {
    const stack = ensureToastStack();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  /* ----------------------------------------------------------
     CLIPBOARD HELPER (with graceful fallback)
     ---------------------------------------------------------- */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) { /* fall through to fallback */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ----------------------------------------------------------
     MODAL HELPERS — open/close with focus trap + ESC + backdrop
     ---------------------------------------------------------- */
  function setupModal(overlayEl, { onClose } = {}) {
    let lastFocused = null;

    function trapFocus(e) {
      if (e.key !== "Tab") return;
      const focusables = overlayEl.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    function open() {
      lastFocused = document.activeElement;
      overlayEl.classList.add("is-open");
      
      const closeBtn = overlayEl.querySelector(".modal__close, .lightbox-btn--close");
      closeBtn && closeBtn.focus();
      document.addEventListener("keydown", onKeydown);
    }

    function close() {
      overlayEl.classList.remove("is-open");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeydown);
      lastFocused && lastFocused.focus && lastFocused.focus();
      onClose && onClose();
    }

    function onKeydown(e) {
      if (e.key === "Escape") close();
      trapFocus(e);
    }

    overlayEl.addEventListener("click", (e) => {
      if (e.target === overlayEl) close();
    });
    overlayEl.querySelectorAll("[data-modal-close]").forEach((btn) => {
      btn.addEventListener("click", close);
    });

    return { open, close };
  }

  /* ----------------------------------------------------------
     EVENT STATUS — derives upcoming / today / live / completed /
     cancelled from a schedule entry's date + time, in real time.
     ---------------------------------------------------------- */
  function computeEventStatus(entry, now) {
    const nowMs = now ? now.getTime() : Date.now();
    if (entry.cancelled) return { status: "cancelled" };

    const start = new Date(`${entry.date}T${entry.time || "00:00"}:00`);
    const startMs = start.getTime();
    const duration = (entry.durationMinutes || 120) * 60 * 1000;
    const endMs = startMs + duration;

    const startOfDay = new Date(`${entry.date}T00:00:00`).getTime();
    const endOfDay = startOfDay + 24 * 3600 * 1000;

    if (nowMs > endMs) return { status: "completed", startMs, endMs };
    if (nowMs >= startMs && nowMs <= endMs) return { status: "live", startMs, endMs };
    if (nowMs >= startOfDay && nowMs < endOfDay) return { status: "today", startMs, endMs };
    return { status: "upcoming", startMs, endMs };
  }

  /* ----------------------------------------------------------
     LIGHTBOX CONTROLLER — fullscreen photo preview, reused by
     recap.html and documentation.html. Expects the overlay to
     contain elements marked with data-lightbox="img|event|date|
     counter|next|prev" plus a [data-modal-close] close button.
     ---------------------------------------------------------- */
  function createLightboxController(overlayEl) {
    const imgEl = overlayEl.querySelector('[data-lightbox="img"]');
    const eventEl = overlayEl.querySelector('[data-lightbox="event"]');
    const dateEl = overlayEl.querySelector('[data-lightbox="date"]');
    const counterEl = overlayEl.querySelector('[data-lightbox="counter"]');
    const nextBtn = overlayEl.querySelector('[data-lightbox="next"]');
    const prevBtn = overlayEl.querySelector('[data-lightbox="prev"]');

    let docs = [];
    let index = 0;
    let meta = {};

    const modal = setupModal(overlayEl);

    function render() {
      const doc = docs[index];
      if (!doc || !imgEl) return;
      imgEl.src = doc.src;
      imgEl.alt = doc.caption || meta.title || "Bella documentation photo";
      eventEl && (eventEl.textContent = doc.caption || meta.title || "");
      dateEl && (dateEl.textContent = meta.date || "");
      counterEl && (counterEl.textContent = `${index + 1} / ${docs.length}`);
    }

    function next() { index = (index + 1) % docs.length; render(); }
    function prev() { index = (index - 1 + docs.length) % docs.length; render(); }

    function open(list, startIndex, m) {
      docs = list;
      index = startIndex || 0;
      meta = m || {};
      render();
      modal.open();
    }

    nextBtn && nextBtn.addEventListener("click", next);
    prevBtn && prevBtn.addEventListener("click", prev);

    document.addEventListener("keydown", (e) => {
      if (!overlayEl.classList.contains("is-open")) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    });

    let touchStartX = null;
    overlayEl.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    overlayEl.addEventListener("touchend", (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
      touchStartX = null;
    }, { passive: true });

    return { open, close: modal.close };
  }

  /* ----------------------------------------------------------
     DATE HELPERS
     ---------------------------------------------------------- */
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function formatDateLong(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  function dayNameOf(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return DAY_NAMES[d.getDay()];
  }
  function formatTime12(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period} WIB`;
  }

  /* ----------------------------------------------------------
     ADD TO CALENDAR (.ics download — works with phone/Google/
     Apple/Outlook calendars, no server required)
     ---------------------------------------------------------- */
  function pad2(n) { return String(n).padStart(2, "0"); }

  // WIB (Asia/Jakarta) is UTC+7 year-round, no DST — safe to hardcode the offset.
  function toUtcIcsStamp(dateStr, timeStr) {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, mi] = (timeStr || "00:00").split(":").map(Number);
    // Build as if local WIB, then shift back 7 hours to get UTC.
    const utcMs = Date.UTC(y, mo - 1, d, h - 7, mi, 0);
    const dt = new Date(utcMs);
    return `${dt.getUTCFullYear()}${pad2(dt.getUTCMonth() + 1)}${pad2(dt.getUTCDate())}T${pad2(dt.getUTCHours())}${pad2(dt.getUTCMinutes())}00Z`;
  }

  function icsEscape(str) {
    return String(str || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function buildIcsContent({ title, description, location, date, time, durationMinutes }) {
    const dtStart = toUtcIcsStamp(date, time);
    const startMs = new Date(`${date}T${time || "00:00"}:00+07:00`).getTime();
    const endMs = startMs + (durationMinutes || 120) * 60000;
    const endDate = new Date(endMs);
    const dtEnd = toUtcIcsStamp(
      `${endDate.getUTCFullYear()}-${pad2(endDate.getUTCMonth() + 1)}-${pad2(endDate.getUTCDate())}`,
      `${pad2(endDate.getUTCHours())}:${pad2(endDate.getUTCMinutes())}`
    );
    const nowStamp = toUtcIcsStamp(
      new Date().toISOString().slice(0, 10),
      `${pad2(new Date().getUTCHours())}:${pad2(new Date().getUTCMinutes())}`
    );
    const uid = `bonivera-${date}-${(time || "0000").replace(":", "")}-${Math.random().toString(36).slice(2, 8)}@bonivera`;

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BONIVERA//Schedule//ID",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${icsEscape(title)}`,
      description ? `DESCRIPTION:${icsEscape(description)}` : "",
      location ? `LOCATION:${icsEscape(location)}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
  }

  function downloadIcsFile(entry) {
    const content = buildIcsContent(entry);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(entry.title || "event").replace(/[^\w\-]+/g, "-").slice(0, 60)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // Lighter-weight alternative: opens Google Calendar's "create event" page directly (no download).
  function buildGoogleCalendarUrl(entry) {
    const dtStart = toUtcIcsStamp(entry.date, entry.time);
    const startMs = new Date(`${entry.date}T${entry.time || "00:00"}:00+07:00`).getTime();
    const endMs = startMs + (entry.durationMinutes || 120) * 60000;
    const endDate = new Date(endMs);
    const dtEnd = toUtcIcsStamp(
      `${endDate.getUTCFullYear()}-${pad2(endDate.getUTCMonth() + 1)}-${pad2(endDate.getUTCDate())}`,
      `${pad2(endDate.getUTCHours())}:${pad2(endDate.getUTCMinutes())}`
    );
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: entry.title || "",
      dates: `${dtStart}/${dtEnd}`,
      details: entry.description || "",
      location: entry.location || "",
    });
    return `https://www.google.com/calendar/render?${params.toString()}`;
  }

    /* ==========================================================
     GLOBAL PINNED SCHEDULE
     Available on every page using shared.js
     ----------------------------------------------------------
     Features:
     - Appears on every page
     - Reads pinned schedule from localStorage
     - Drag / move
     - Resize from bottom-left corner
     - Saves position and size
     - Custom unpin confirmation popup
     - Unpin removes schedule from all pages
     ========================================================== */

  function initPinnedSchedule() {
    "use strict";

    const PINNED_SCHEDULE_KEY = "bonivera_pinned_schedule";
    const POSITION_KEY = "bonivera_pinned_schedule_position";

    let popup = null;
    let countdownCleanup = null;

    let isDragging = false;
    let isResizing = false;

    let dragPointerId = null;
    let resizePointerId = null;

    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartLeft = 0;
    let dragStartTop = 0;

    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartWidth = 0;
    let resizeStartHeight = 0;
    let resizeStartLeft = 0;

    /* ----------------------------------------------------------
       STORAGE — PINNED SCHEDULE
       ---------------------------------------------------------- */

    function getPinnedSchedule() {
      try {
        return (
          JSON.parse(
            localStorage.getItem(PINNED_SCHEDULE_KEY)
          ) || null
        );
      } catch (error) {
        console.warn(
          "BONIVERA: Failed to read pinned schedule.",
          error
        );
        return null;
      }
    }

    function clearPinnedSchedule() {
      localStorage.removeItem(PINNED_SCHEDULE_KEY);
    }

    /* ----------------------------------------------------------
       STORAGE — POSITION / SIZE
       ---------------------------------------------------------- */

    function getSavedPosition() {
      try {
        return (
          JSON.parse(
            localStorage.getItem(POSITION_KEY)
          ) || null
        );
      } catch (error) {
        return null;
      }
    }

    function savePosition() {
      if (!popup) return;

      const rect = popup.getBoundingClientRect();

      localStorage.setItem(
        POSITION_KEY,
        JSON.stringify({
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        })
      );
    }

    /* ----------------------------------------------------------
       CREATE PINNED SCHEDULE WIDGET
       ---------------------------------------------------------- */

    function createPopup() {
      popup = document.getElementById("pinnedSchedulePopup");

      if (popup) {
        return;
      }

      const wrapper = document.createElement("div");

      wrapper.innerHTML = `
        <div
          class="pinned-schedule-popup"
          id="pinnedSchedulePopup"
          hidden
          aria-hidden="true"
        >
          <div
            class="pinned-schedule-popup__card"
            id="pinnedScheduleCard"
          >

            <div
              class="pinned-schedule-popup__drag"
              id="pinnedScheduleDrag"
              title="Drag to move"
            >
              <span class="eyebrow">
                📌 PINNED SCHEDULE
              </span>
            </div>

            <button
              type="button"
              class="pinned-schedule-popup__close"
              id="closePinnedSchedule"
              aria-label="Unpin schedule"
              title="Unpin schedule"
            >
              ×
            </button>

            <h2
              class="pinned-schedule-popup__title"
              id="pinnedScheduleTitle"
            >
              Bella Schedule
            </h2>

            <div class="pinned-schedule-popup__meta">
              <p id="pinnedScheduleDate">—</p>
              <p id="pinnedScheduleTime">—</p>
              <p id="pinnedScheduleLocation">—</p>
            </div>

            <div class="pinned-schedule-popup__countdown">
              <p class="pinned-schedule-popup__countdown-label">
                Event Countdown
              </p>

              <div
                class="countdown countdown--4 countdown--mini"
                id="pinnedScheduleCountdown"
              >
                <div class="countdown__tile">
                  <span
                    class="countdown__value"
                    id="pinnedDays"
                  >00</span>

                  <span class="countdown__label">
                    Days
                  </span>
                </div>

                <div class="countdown__tile">
                  <span
                    class="countdown__value"
                    id="pinnedHours"
                  >00</span>

                  <span class="countdown__label">
                    Hours
                  </span>
                </div>

                <div class="countdown__tile">
                  <span
                    class="countdown__value"
                    id="pinnedMinutes"
                  >00</span>

                  <span class="countdown__label">
                    Minutes
                  </span>
                </div>

                <div class="countdown__tile">
                  <span
                    class="countdown__value"
                    id="pinnedSeconds"
                  >00</span>

                  <span class="countdown__label">
                    Seconds
                  </span>
                </div>
              </div>
            </div>

            <a
              href="schedule.html"
              class="btn btn--primary btn--block"
            >
              View Schedule
            </a>

            <div
              class="pinned-schedule-popup__resize"
              id="pinnedScheduleResize"
              aria-hidden="true"
            ></div>

          </div>
        </div>
      `;

      document.body.appendChild(
        wrapper.firstElementChild
      );

      popup =
        document.getElementById(
          "pinnedSchedulePopup"
        );
    }

    /* ----------------------------------------------------------
       CREATE CUSTOM UNPIN CONFIRMATION
       ---------------------------------------------------------- */

    function createConfirmPopup() {
      if (
        document.getElementById(
          "pinnedScheduleConfirm"
        )
      ) {
        return;
      }

      const wrapper = document.createElement("div");

      wrapper.innerHTML = `
        <div
          class="pinned-confirm"
          id="pinnedScheduleConfirm"
          hidden
          aria-hidden="true"
        >
          <div
            class="pinned-confirm__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pinnedConfirmTitle"
          >

            <div class="pinned-confirm__icon">
              📌
            </div>

            <h2
              class="pinned-confirm__title"
              id="pinnedConfirmTitle"
            >
              Unpin schedule?
            </h2>

            <p class="pinned-confirm__text">
              This schedule will disappear from all
              BONIVERA pages. You will need to pin it
              again from the Schedule page.
            </p>

            <div class="pinned-confirm__actions">

              <button
                type="button"
                class="pinned-confirm__btn pinned-confirm__btn--cancel"
                id="pinnedConfirmCancel"
              >
                Cancel
              </button>

              <button
                type="button"
                class="pinned-confirm__btn pinned-confirm__btn--danger"
                id="pinnedConfirmUnpin"
              >
                Unpin
              </button>

            </div>

          </div>
        </div>
      `;

      document.body.appendChild(
        wrapper.firstElementChild
      );
    }

    /* ----------------------------------------------------------
       POSITION
       ---------------------------------------------------------- */

    function setPosition(left, top) {
      if (!popup) return;

      const rect =
        popup.getBoundingClientRect();

      const maxLeft = Math.max(
        8,
        window.innerWidth -
          rect.width -
          8
      );

      const maxTop = Math.max(
        8,
        window.innerHeight -
          rect.height -
          8
      );

      const safeLeft = Math.max(
        8,
        Math.min(left, maxLeft)
      );

      const safeTop = Math.max(
        8,
        Math.min(top, maxTop)
      );

      popup.style.left =
        `${safeLeft}px`;

      popup.style.top =
        `${safeTop}px`;

      popup.style.right = "auto";
      popup.style.bottom = "auto";
    }

    function applySavedPosition() {
      if (!popup) return;

      const saved =
        getSavedPosition();

      if (!saved) return;

      if (
        Number.isFinite(saved.width) &&
        saved.width >= 240
      ) {
        const width = Math.min(
          saved.width,
          window.innerWidth - 16
        );

        popup.style.width =
          `${width}px`;
      }

      requestAnimationFrame(() => {
        if (
          Number.isFinite(saved.left) &&
          Number.isFinite(saved.top)
        ) {
          setPosition(
            saved.left,
            saved.top
          );
        }
      });
    }

    /* ----------------------------------------------------------
       SHOW PINNED SCHEDULE
       ---------------------------------------------------------- */

    function showPinnedSchedule(entry) {
      if (!popup || !entry) return;

      const title =
        document.getElementById(
          "pinnedScheduleTitle"
        );

      const date =
        document.getElementById(
          "pinnedScheduleDate"
        );

      const time =
        document.getElementById(
          "pinnedScheduleTime"
        );

      const location =
        document.getElementById(
          "pinnedScheduleLocation"
        );

      const days =
        document.getElementById(
          "pinnedDays"
        );

      const hours =
        document.getElementById(
          "pinnedHours"
        );

      const minutes =
        document.getElementById(
          "pinnedMinutes"
        );

      const seconds =
        document.getElementById(
          "pinnedSeconds"
        );

      if (title) {
        title.textContent =
          entry.title ||
          "Bella Schedule";
      }

      if (date) {
        date.textContent =
          entry.date
            ? formatDateLong(entry.date)
            : "—";
      }

      if (time) {
        time.textContent =
          entry.time
            ? formatTime12(entry.time)
            : "—";
      }

      if (location) {
        location.textContent =
          entry.location ||
          "—";
      }

      popup.hidden = false;

      popup.setAttribute(
        "aria-hidden",
        "false"
      );

      requestAnimationFrame(() => {
        if (getSavedPosition()) {
          applySavedPosition();
        }
      });

      /* --------------------------------------------------------
         COUNTDOWN
         -------------------------------------------------------- */

      if (countdownCleanup) {
        countdownCleanup();
        countdownCleanup = null;
      }

      if (
        entry.date &&
        entry.time
      ) {
        const target =
          new Date(
            `${entry.date}T${entry.time}:00`
          ).getTime();

        if (Date.now() < target) {
          countdownCleanup =
            startCountdown({
              targetDate:
                `${entry.date}T${entry.time}:00`,

              els: {
                days,
                hours,
                minutes,
                seconds,
              },

              mode: "down",
            });
        }
      }
    }

    /* ----------------------------------------------------------
       HIDE
       ---------------------------------------------------------- */

    function hidePinnedSchedule() {
      if (!popup) return;

      popup.hidden = true;

      popup.setAttribute(
        "aria-hidden",
        "true"
      );

      if (countdownCleanup) {
        countdownCleanup();
        countdownCleanup = null;
      }
    }

    /* ----------------------------------------------------------
       CONFIRM POPUP
       ---------------------------------------------------------- */

    function openUnpinConfirm() {
      const confirmPopup =
        document.getElementById(
          "pinnedScheduleConfirm"
        );

      if (!confirmPopup) return;

      confirmPopup.hidden = false;

      confirmPopup.setAttribute(
        "aria-hidden",
        "false"
      );
    }

    function closeUnpinConfirm() {
      const confirmPopup =
        document.getElementById(
          "pinnedScheduleConfirm"
        );

      if (!confirmPopup) return;

      confirmPopup.hidden = true;

      confirmPopup.setAttribute(
        "aria-hidden",
        "true"
      );
    }

    function unpinSchedule() {
      clearPinnedSchedule();
      closeUnpinConfirm();
      hidePinnedSchedule();
    }

    /* ----------------------------------------------------------
       DRAG
       ---------------------------------------------------------- */

    function initDrag() {
      if (!popup) return;

      const dragArea =
        document.getElementById(
          "pinnedScheduleDrag"
        );

      if (!dragArea) return;

      dragArea.addEventListener(
        "pointerdown",
        (event) => {

          if (
            event.button !== undefined &&
            event.button !== 0
          ) {
            return;
          }

          isDragging = true;

          dragPointerId =
            event.pointerId;

          const rect =
            popup.getBoundingClientRect();

          dragStartX =
            event.clientX;

          dragStartY =
            event.clientY;

          dragStartLeft =
            rect.left;

          dragStartTop =
            rect.top;

          popup.style.left =
            `${rect.left}px`;

          popup.style.top =
            `${rect.top}px`;

          popup.style.right = "auto";
          popup.style.bottom = "auto";

          dragArea.setPointerCapture?.(
            event.pointerId
          );

          document.body.style.userSelect =
            "none";

          event.preventDefault();
        }
      );

      dragArea.addEventListener(
        "pointermove",
        (event) => {

          if (
            !isDragging ||
            event.pointerId !==
              dragPointerId
          ) {
            return;
          }

          const deltaX =
            event.clientX -
            dragStartX;

          const deltaY =
            event.clientY -
            dragStartY;

          setPosition(
            dragStartLeft + deltaX,
            dragStartTop + deltaY
          );

          event.preventDefault();
        }
      );

      dragArea.addEventListener(
        "pointerup",
        (event) => {

          if (
            !isDragging ||
            event.pointerId !==
              dragPointerId
          ) {
            return;
          }

          isDragging = false;

          dragArea.releasePointerCapture?.(
            event.pointerId
          );

          document.body.style.userSelect =
            "";

          savePosition();

          dragPointerId = null;
        }
      );

      dragArea.addEventListener(
        "pointercancel",
        () => {
          isDragging = false;
          dragPointerId = null;
          document.body.style.userSelect =
            "";
        }
      );
    }

    /* ----------------------------------------------------------
       RESIZE — BOTTOM LEFT
       ---------------------------------------------------------- */

    function initResize() {
      if (!popup) return;

      const handle =
        document.getElementById(
          "pinnedScheduleResize"
        );

      if (!handle) return;

      handle.addEventListener(
        "pointerdown",
        (event) => {

          isResizing = true;

          resizePointerId =
            event.pointerId;

          const rect =
            popup.getBoundingClientRect();

          resizeStartX =
            event.clientX;

          resizeStartY =
            event.clientY;

          resizeStartWidth =
            rect.width;

          resizeStartHeight =
            rect.height;

          resizeStartLeft =
            rect.left;

          popup.style.left =
            `${rect.left}px`;

          popup.style.top =
            `${rect.top}px`;

          popup.style.right = "auto";
          popup.style.bottom = "auto";

          handle.setPointerCapture?.(
            event.pointerId
          );

          document.body.style.userSelect =
            "none";

          event.preventDefault();
          event.stopPropagation();
        }
      );

      handle.addEventListener(
        "pointermove",
        (event) => {

          if (
            !isResizing ||
            event.pointerId !==
              resizePointerId
          ) {
            return;
          }

          const deltaX =
            event.clientX -
            resizeStartX;

          const deltaY =
            event.clientY -
            resizeStartY;

          const MIN_WIDTH = 240;

          const MAX_WIDTH =
            Math.min(
              700,
              window.innerWidth - 16
            );

          const MIN_HEIGHT = 150;

          const MAX_HEIGHT =
            Math.min(
              800,
              window.innerHeight - 16
            );

          let newWidth =
            resizeStartWidth -
            deltaX;

          let newHeight =
            resizeStartHeight +
            deltaY;

          newWidth = Math.max(
            MIN_WIDTH,
            Math.min(
              newWidth,
              MAX_WIDTH
            )
          );

          newHeight = Math.max(
            MIN_HEIGHT,
            Math.min(
              newHeight,
              MAX_HEIGHT
            )
          );

          const rightEdge =
            resizeStartLeft +
            resizeStartWidth;

          popup.style.width =
            `${newWidth}px`;

          popup.style.height =
            `${newHeight}px`;

          setPosition(
            rightEdge - newWidth,
            popup.getBoundingClientRect().top
          );

          event.preventDefault();
        }
      );

      handle.addEventListener(
        "pointerup",
        (event) => {

          if (
            !isResizing ||
            event.pointerId !==
              resizePointerId
          ) {
            return;
          }

          isResizing = false;

          handle.releasePointerCapture?.(
            event.pointerId
          );

          document.body.style.userSelect =
            "";

          savePosition();

          resizePointerId = null;
        }
      );

      handle.addEventListener(
        "pointercancel",
        () => {
          isResizing = false;
          resizePointerId = null;
          document.body.style.userSelect =
            "";
        }
      );
    }

    /* ----------------------------------------------------------
       EVENTS
       ---------------------------------------------------------- */

    function initPinnedEvents() {
      const closeButton =
        document.getElementById(
          "closePinnedSchedule"
        );

      const cancelButton =
        document.getElementById(
          "pinnedConfirmCancel"
        );

      const unpinButton =
        document.getElementById(
          "pinnedConfirmUnpin"
        );

      const confirmPopup =
        document.getElementById(
          "pinnedScheduleConfirm"
        );

      closeButton?.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          openUnpinConfirm();
        }
      );

      cancelButton?.addEventListener(
        "click",
        closeUnpinConfirm
      );

      unpinButton?.addEventListener(
        "click",
        unpinSchedule
      );

      confirmPopup?.addEventListener(
        "click",
        (event) => {
          if (
            event.target === confirmPopup
          ) {
            closeUnpinConfirm();
          }
        }
      );

      document.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape") {
            closeUnpinConfirm();
          }
        }
      );
    }

    /* ----------------------------------------------------------
       INITIALIZE
       ---------------------------------------------------------- */

    createPopup();
    createConfirmPopup();

    initDrag();
    initResize();
    initPinnedEvents();

    const pinned =
      getPinnedSchedule();

    if (pinned) {
      showPinnedSchedule(pinned);
    }

    window.addEventListener(
      "resize",
      () => {
        if (!popup || popup.hidden) {
          return;
        }

        const rect =
          popup.getBoundingClientRect();

        setPosition(
          rect.left,
          rect.top
        );

        savePosition();
      }
    );
  }


  /* ----------------------------------------------------------
     INIT ON EVERY PAGE
     ---------------------------------------------------------- */

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      initNavbar();
      initReveal();
      initSmoothScroll();
      initPinnedSchedule();
    }
  );


  /* ----------------------------------------------------------
     PUBLIC NAMESPACE
     ---------------------------------------------------------- */

  window.Bonivera = Object.assign(
    window.Bonivera || {},
    {
      startCountdown,
      calculateAge,
      computeEventStatus,
      showToast,
      copyText,
      setupModal,
      createLightboxController,
      formatDateLong,
      dayNameOf,
      formatTime12,
      prefersReducedMotion,
      initReveal,
      downloadIcsFile,
      buildGoogleCalendarUrl,
      initPinnedSchedule,
    }
  );


})();


/* ============================================================
   BONIVERA — SKIP INTRO BUTTON
   ============================================================ */
(function () {
  "use strict";

  const loader = document.getElementById("loader");
  if (!loader) return;

  const skip = document.createElement("a");
  skip.href = "home.html";
  skip.className = "loader__skip";
  skip.textContent = "SKIP INTRO";

  loader.appendChild(skip);

  skip.addEventListener("click", function (e) {
    e.preventDefault();

    try {
      sessionStorage.setItem("bonivera_intro_seen", "1");
    } catch (err) {}

    window.location.replace("home.html");
  });
})();

