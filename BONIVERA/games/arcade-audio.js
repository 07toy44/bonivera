/* Audio bersama. SFX: disintesis lewat Web Audio (tanpa file, tanpa jaringan).
   Musik: URL audio online ATAU YouTube (IFrame API) — tidak ada file audio lokal. Tanpa konfigurasi → loop chiptune sintetis.
   Tidak ada autoplay: musik baru mulai setelah interaksi pertama pemain. */
(function () {
  'use strict';
  var NS = (window.BoniveraArcade = window.BoniveraArcade || {}), S = NS.Storage;
  var cfg = NS.audio || { tracks: {} }, game = '', muted = false, wanted = false, ac = null, master = null, last = {};
  var yt = null, ytReady = false, ytLoading = false, ytFailed = false, urlAudio = null, fbTimer = 0, fbStep = 0;

  function ctx() {
    if (!ac) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination); }
    if (ac.state === 'suspended') ac.resume(); return ac;
  }
  function toneAt(f, d, type, v, to, t) {
    var c = ctx(); if (!c || muted) return; var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(v || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.03);
  }
  function tone(f, d, type, v, to, delay) { var c = ctx(); if (c) toneAt(f, d, type, v, to, c.currentTime + (delay || 0)); }
  function noiseAt(t, d, v) {
    var c = ctx(); if (!c || muted) return; var n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), x = b.getChannelData(0), i;
    for (i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n); var s = c.createBufferSource(), g = c.createGain(); g.gain.value = v || 0.25; s.buffer = b; s.connect(g); g.connect(master); s.start(t);
  }
  function noise(d, v) { var c = ctx(); if (c) noiseAt(c.currentTime, d, v); }
  var arp = function (notes, step, type, v) { notes.forEach(function (f, i) { tone(f, 0.16, type || 'square', v || 0.16, null, i * step); }); };
  var SFX = {
    click: function () { tone(660, 0.05, 'square', 0.08); },
    jump: function () { tone(320, 0.14, 'square', 0.12, 720); },
    coin: function () { tone(988, 0.06, 'square', 0.12); tone(1319, 0.12, 'square', 0.12, null, 0.06); },
    power: function () { arp([523, 659, 784, 1047], 0.06, 'triangle', 0.18); },
    shield: function () { tone(500, 0.22, 'triangle', 0.2, 1000); noise(0.08, 0.1); },
    item: function () { tone(440, 0.18, 'sawtooth', 0.12, 880); },
    buy: function () { arp([784, 1047], 0.07, 'square', 0.12); },
    die: function () { noise(0.35, 0.3); tone(260, 0.45, 'sawtooth', 0.18, 50); },
    wrong: function () { tone(190, 0.22, 'square', 0.14, 120); },
    sel: function (n) { tone(400 + (n || 1) * 70, 0.05, 'triangle', 0.1); },
    bonus: function () { arp([784, 1047, 1319], 0.07, 'triangle', 0.16); },
    win: function () { arp([523, 659, 784, 1047, 1319], 0.09, 'square', 0.14); },
    timeup: function () { arp([440, 370, 311, 220], 0.12, 'sawtooth', 0.14); },
    punch: function () { noise(0.05, 0.12); tone(240, 0.08, 'square', 0.14, 120); },
    kick: function () { noise(0.09, 0.18); tone(170, 0.14, 'sawtooth', 0.16, 70); },
    block: function () { tone(900, 0.06, 'triangle', 0.14); noise(0.04, 0.08); },
    ko: function () { noise(0.3, 0.3); arp([330, 262, 196, 130], 0.12, 'sawtooth', 0.16); },
    ready: function () { arp([392, 523], 0.12, 'square', 0.14); },
    mark: function (n) { tone(n === 1 ? 520 : 392, 0.1, 'square', 0.14, n === 1 ? 700 : 300); },
    draw: function () { arp([392, 392, 330], 0.12, 'triangle', 0.14); },
    tick: function () { tone(880, 0.04, 'square', 0.1); },
    spintick: function () { tone(1300, 0.025, 'square', 0.06); },
    reward: function (cat) { arp({ Common: [660], Rare: [660, 880], Epic: [660, 880, 1100], Legend: [523, 659, 784, 1047, 1319, 1568] }[cat] || [660], 0.1, 'triangle', 0.18); }
  };
  function sfx(name, arg) { var now = Date.now(); if (last[name] && now - last[name] < 35) return; last[name] = now; if (SFX[name]) { try { SFX[name](arg); } catch (e) {} } }

  /* ---- musik ---- */
  function track() { return (cfg.tracks && cfg.tracks[game]) || {}; }
  function vol() { return (cfg.musicVolume == null ? 35 : cfg.musicVolume); }
  /* Musik sintetis (dijadwalkan lewat jam audio, bukan timer kasar): bass + arpeggio + lead + drum. Tema berbeda per game. */
  var PENT = [0, 3, 5, 7, 10, 12, 15, 17], ROOTS = [0, -4, 3, -2], INTS = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]];
  var NOTE = function (n) { return 220 * Math.pow(2, n / 12); };
  var THEMES = {
    'bella-run': { bpm: 138, drums: 1, fast: 1, arpVol: 0.035, leadVol: 0.07, lead: [
      [5, -1, -1, 4, -1, 3, -1, -1, 4, -1, -1, -1, 2, -1, 3, -1], [3, -1, -1, 2, -1, 3, -1, -1, 5, -1, 4, -1, 3, -1, -1, -1],
      [6, -1, 5, -1, 4, -1, -1, 3, 4, -1, -1, -1, 5, -1, -1, -1], [4, -1, 3, -1, 2, -1, -1, -1, 3, -1, 4, -1, 2, -1, -1, -1]] },
    'bella-fight': { bpm: 150, drums: 1, fast: 1, arpVol: 0.04, leadVol: 0.075, lead: [
      [5, -1, 5, -1, 4, -1, 3, -1, 5, -1, -1, 4, -1, 3, -1, -1], [3, -1, 3, -1, 2, -1, 1, -1, 3, -1, -1, 2, -1, 1, -1, -1],
      [6, -1, 6, -1, 5, -1, 4, -1, 6, -1, -1, 5, -1, 4, -1, -1], [4, -1, 4, -1, 3, -1, 2, -1, 4, -1, -1, 3, -1, 2, -1, -1]] },
    'tic-tac-bell': { bpm: 104, drums: 0, fast: 0, arpVol: 0.045, leadVol: 0.055, lead: [
      [3, -1, -1, 4, -1, -1, 2, -1, 3, -1, -1, -1, 1, -1, -1, -1], [2, -1, -1, 3, -1, -1, 1, -1, 2, -1, -1, -1, 0, -1, -1, -1],
      [4, -1, -1, 5, -1, -1, 3, -1, 4, -1, -1, -1, 2, -1, -1, -1], [3, -1, -1, 2, -1, -1, 1, -1, 2, -1, -1, -1, 0, -1, -1, -1]] },
    'find-bella-word': { bpm: 92, drums: 0, fast: 0, arpVol: 0.05, leadVol: 0.06, lead: [
      [4, -1, -1, -1, 3, -1, -1, -1, 2, -1, -1, -1, 3, -1, -1, -1], [2, -1, -1, -1, 3, -1, -1, -1, 5, -1, -1, -1, 4, -1, -1, -1],
      [5, -1, -1, -1, 4, -1, -1, -1, 3, -1, -1, -1, 4, -1, -1, -1], [3, -1, -1, -1, 2, -1, -1, -1, 1, -1, -1, -1, 2, -1, -1, -1]] }
  };
  var nextT = 0, step = 0;
  function playStep(th, st, t) {
    var bar = Math.floor(st / 16) % 4, k = st % 16, root = ROOTS[bar], ints = INTS[bar], sd = 60 / th.bpm / 4;
    if (k % 4 === 0) toneAt(NOTE(root - 12), sd * 3.5, 'triangle', 0.16, null, t);
    if (th.fast || k % 2 === 0) toneAt(NOTE(root + ints[[0, 1, 2, 1][(th.fast ? k : k / 2) % 4]] + 12), sd * 1.6, th.fast ? 'square' : 'triangle', th.arpVol, null, t);
    var lv = th.lead[bar][k]; if (lv >= 0) toneAt(NOTE(PENT[lv] + 12), sd * 3, 'triangle', th.leadVol, null, t);
    if (th.drums) {
      if (k % 4 === 0) toneAt(150, 0.12, 'sine', 0.24, 45, t);
      if (k === 4 || k === 12) noiseAt(t, 0.1, 0.1);
      if (k % 2 === 1) noiseAt(t, 0.03, 0.04);
    }
  }
  function sched() {
    var c = ctx(); if (!c || muted || document.hidden) return; var th = THEMES[game] || THEMES['bella-run'], sd = 60 / th.bpm / 4;
    if (nextT < c.currentTime) nextT = c.currentTime + 0.05;
    while (nextT < c.currentTime + 0.3) { playStep(th, step, nextT); nextT += sd; step++; }
  }
  function fbStart() { if (fbTimer) return; var c = ctx(); nextT = c ? c.currentTime + 0.1 : 0; step = 0; fbTimer = setInterval(sched, 60); }
  function fbStop() { clearInterval(fbTimer); fbTimer = 0; }
  function ytHost(on) { var h = document.getElementById('arcade-yt-host'); if (h) h.style.display = on ? 'block' : 'none'; }
  function ytFail() { ytFailed = true; ytHost(false); if (wanted && !muted) fbStart(); }
  function ytStart(id) {
    if (ytReady) { ytHost(true); yt.playVideo(); return; } if (ytLoading || ytFailed) return; ytLoading = true;
    var host = document.createElement('div'); host.id = 'arcade-yt-host'; // pemain TETAP terlihat (mini player) sesuai kebijakan YouTube
    host.style.cssText = 'position:fixed;left:8px;bottom:8px;width:200px;height:113px;z-index:4;border-radius:10px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.35);background:#000';
    var inner = document.createElement('div'); inner.id = 'arcade-yt'; host.appendChild(inner); document.body.appendChild(host);
    window.onYouTubeIframeAPIReady = function () {
      yt = new YT.Player('arcade-yt', { width: '200', height: '113', videoId: id, playerVars: { autoplay: 1, controls: 1, loop: 1, playlist: id, playsinline: 1, rel: 0 },
        events: { onReady: function (e) { ytReady = true; ytLoading = false; e.target.setVolume(vol()); if (wanted && !muted) e.target.playVideo(); }, onError: ytFail } });
    };
    if (window.YT && YT.Player) window.onYouTubeIframeAPIReady(); else { var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = ytFail; document.head.appendChild(s); }
  }
  function musicOn() {
    var t = track();
    if (t.url) { if (!urlAudio) { urlAudio = new Audio(t.url); urlAudio.loop = true; urlAudio.volume = vol() / 100; urlAudio.onerror = function () { urlAudio = null; t.url = ''; if (wanted && !muted) musicOn(); }; } var p = urlAudio.play(); if (p && p.catch) p.catch(function () {}); }
    else if (t.youtube && !ytFailed) ytStart(t.youtube); else fbStart();
  }
  function musicOff() { fbStop(); if (urlAudio) urlAudio.pause(); if (ytReady) { yt.pauseVideo(); } ytHost(false); }
  function start() { wanted = true; if (!muted) musicOn(); }
  function startOnGesture() { var go = function () { document.removeEventListener('pointerdown', go); document.removeEventListener('keydown', go); start(); }; document.addEventListener('pointerdown', go); document.addEventListener('keydown', go); }
  function setMuted(m) { muted = m; S.commit(function (d) { d.settings.muted = m; }); if (m) musicOff(); else if (wanted) musicOn(); }
  function bindToggle(btn) {
    function ui() { btn.textContent = muted ? '🔇' : '🔊'; btn.setAttribute('aria-pressed', String(muted)); btn.setAttribute('aria-label', muted ? 'Nyalakan suara' : 'Matikan suara'); }
    btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); }); btn.addEventListener('click', function () { setMuted(!muted); ui(); }); ui();
  }
  function init(g) {
    game = g; muted = !!S.get().settings.muted;
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.arcade-btn')) sfx('click'); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) musicOff(); else if (wanted && !muted) musicOn(); });
    ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { // iOS/Chrome: coba ulang jika pemutaran YouTube diblokir
      if (wanted && !muted && ytReady && yt.getPlayerState && yt.getPlayerState() !== 1) yt.playVideo(); }); });
  }
  NS.Audio = { init: init, sfx: sfx, bindToggle: bindToggle, startOnGesture: startOnGesture, isMuted: function () { return muted; } };
})();
