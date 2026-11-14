/* ============================================================
   BONIVERA — LOADING SCREEN LOGIC (index.html)
   Intro tampil sekali per sesi browser, lalu fade out dan pindah
   ke home.html. Kunjungan ulang dalam sesi yang sama langsung lewat.
   ============================================================ */
(function () {
  "use strict";

  const SESSION_KEY = "bonivera_intro_seen";
  const loader = document.getElementById("loader");
  const progressFill = document.getElementById("progressFill");
  const percentEl = document.getElementById("loaderPercent");
  const statusEl = document.getElementById("loaderStatus");
  const particlesHost = document.getElementById("loaderParticles");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const alreadySeen = (() => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; }
    catch (e) { return false; }
  })();

  function goHome() {
    window.location.href = "home.html";
  }

  function markSeen() {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) { /* private mode — abaikan */ }
  }

  // Elemen loader tidak ada: jangan macet, langsung ke home.
  if (!loader) { goHome(); return; }

  // Kunjungan ulang dalam sesi yang sama: lewati animasi.
  if (alreadySeen) {
    loader.classList.add("is-hidden");
    setTimeout(goHome, reduced ? 0 : 150);
    return;
  }

  // Partikel es (dilewati jika reduced motion).
  if (!reduced && particlesHost) {
    const COUNT = 22;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement("span");
      p.className = "loader__particle";
      p.style.setProperty("--size", `${(Math.random() * 3 + 2).toFixed(1)}px`);
      p.style.left = `${(Math.random() * 100).toFixed(1)}%`;
      p.style.setProperty("--dur", `${(Math.random() * 4 + 5).toFixed(1)}s`);
      p.style.setProperty("--delay", `${(Math.random() * 5).toFixed(1)}s`);
      p.style.setProperty("--drift", `${(Math.random() * 60 - 30).toFixed(0)}px`);
      p.style.setProperty("--op", (Math.random() * 0.4 + 0.35).toFixed(2));
      frag.appendChild(p);
    }
    particlesHost.appendChild(frag);
  }

  // Tahap status berdasarkan persentase.
  const STAGES = [
    [0, "Initializing"],
    [30, "Loading assets"],
    [65, "Syncing fan data"],
    [95, "Ready"]
  ];

  let lastPct = -1;
  let lastStage = "";

  function setProgress(pct) {
    if (pct === lastPct) return;
    lastPct = pct;
    if (progressFill) progressFill.style.width = pct + "%";
    if (percentEl) percentEl.textContent = pct + "%";
    let stage = STAGES[0][1];
    for (const [min, label] of STAGES) if (pct >= min) stage = label;
    if (stage !== lastStage) {
      lastStage = stage;
      if (statusEl) statusEl.textContent = stage;
    }
  }

  const TOTAL_MS = reduced ? 900 : 2600;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let finished = false;
  let startTime = null;

  // rAF hanya untuk visual; setTimeout di bawah yang menentukan selesai.
  function tick(now) {
    if (finished) return;
    if (startTime === null) startTime = now;
    const t = Math.min((now - startTime) / TOTAL_MS, 1);
    setProgress(Math.min(99, Math.round(easeInOut(t) * 100)));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function finish() {
    if (finished) return;
    finished = true;
    setProgress(100);
    markSeen();
    loader.classList.add("is-hidden");
    setTimeout(goHome, reduced ? 50 : 650);
  }

  setTimeout(finish, TOTAL_MS);
})();