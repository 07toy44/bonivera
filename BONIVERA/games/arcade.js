/* Beranda arcade: kartu game, statistik, dan alur export/import ber-PIN. */
(function () {
  'use strict';
  var NS = window.BoniveraArcade, S = NS.Storage, E = NS.Export;
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }
  function toast(msg, err) { var t = el('div', 'arcade-toast' + (err ? ' is-error' : ''), msg); t.setAttribute('role', 'status'); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3800); }
  window.addEventListener('arcade:storage-error', function (e) { toast(e.detail, true); });

  function progressText(g, d) { // capaian ditampilkan DI DALAM kartu game masing-masing
    if (g.dataKey === 'bellaRun') return ['Highscore: ' + d.bellaRun.highscore, 'Wallet: ' + d.bellaRun.walletCoins + ' coin'];
    if (g.dataKey === 'findBellaWord') return ['Level terbuka: ' + d.findBellaWord.unlockedLevel + ' · Best: ' + d.findBellaWord.bestScore, 'Poin hint: ' + d.findBellaWord.points];
    if (g.dataKey === 'bellaFight') return ['Stage: ' + d.bellaFight.highestStage + ' · Coin: ' + d.bellaFight.coins, 'Menang/Kalah: ' + d.bellaFight.statistics.wins + '/' + d.bellaFight.statistics.losses];
    if (g.dataKey === 'ticTacBell') { var t = d.ticTacBell; return ['Solo → M ' + t.solo.wins + ' · S ' + t.solo.draws + ' · K ' + t.solo.losses, 'Mabar: ' + t.pairs.length + ' profil']; }
    return [];
  }
  /* thumbnail pixel-art digambar langsung (tanpa file gambar); jika assets/thumb-*.png ada, gambar itu menimpa */
  function thumb(cv, id) {
    var c = cv.getContext('2d'), Sp = NS.Sprites, i; c.imageSmoothingEnabled = false;
    function sky(a, b) { var gr = c.createLinearGradient(0, 0, 0, 80); gr.addColorStop(0, a); gr.addColorStop(1, b); c.fillStyle = gr; c.fillRect(0, 0, 160, 80); }
    if (id === 'bella-run') {
      sky('#27406b', '#BFD7F1'); c.fillStyle = '#3E5E8C'; c.beginPath(); c.moveTo(0, 80); for (i = 0; i <= 160; i += 8) c.lineTo(i, 52 - 10 * Math.sin(i / 22)); c.lineTo(160, 80); c.fill();
      c.fillStyle = '#1d3a66'; c.fillRect(0, 62, 160, 18); c.fillStyle = '#7A9BBE'; c.fillRect(0, 62, 160, 3); c.fillStyle = '#BFD7F1'; c.fillRect(0, 62, 160, 1);
      c.fillStyle = '#ffd24a'; [[70, 40], [80, 36], [90, 40]].forEach(function (p) { c.fillRect(p[0], p[1], 5, 5); });
      c.fillStyle = '#d9541e'; c.beginPath(); c.moveTo(118, 62); c.lineTo(125, 46); c.lineTo(132, 62); c.fill(); c.fillStyle = '#ffd36b'; c.beginPath(); c.moveTo(122, 62); c.lineTo(125, 53); c.lineTo(128, 62); c.fill();
      Sp.draw(c, 38, 62, { look: 'bella', pose: 'run', clock: 1.3, u: 0.95 });
    } else if (id === 'find-bella-word') {
      c.fillStyle = '#0a1326'; c.fillRect(0, 0, 160, 80); var L = 'QXMZTNRKEWVHDOPFCJSYGULIAMQXBZTN', k = 0; c.font = 'bold 9px monospace'; c.textAlign = 'center';
      for (var r = 0; r < 5; r++) for (var q = 0; q < 8; q++) { var hot = r === 2 && q >= 1 && q <= 5; c.fillStyle = hot ? '#ffd24a' : '#16305c'; c.fillRect(8 + q * 18, 5 + r * 14, 16, 12); c.fillStyle = hot ? '#1a1405' : '#BFD7F1'; c.fillText(hot ? 'BELLA'[q - 1] : L[k++ % L.length], 16 + q * 18, 14 + r * 14); }
    } else if (id === 'bella-fight') {
      sky('#1d3560', '#7A9BBE'); c.fillStyle = '#fff6d6'; c.fillRect(128, 10, 14, 14); c.fillStyle = 'rgba(14,28,56,.6)'; [[8, 34, 20], [34, 26, 24], [100, 30, 22]].forEach(function (b) { c.fillRect(b[0], b[1], b[2], 56 - b[1]); });
      c.fillStyle = '#1d3a66'; c.fillRect(0, 64, 160, 16); c.fillStyle = '#7A9BBE'; c.fillRect(0, 64, 160, 3);
      Sp.draw(c, 52, 66, { look: 'bella', pose: 'punch', ext: 1, u: 0.85 }); Sp.draw(c, 112, 66, { look: 'ninja', face: -1, pose: 'hit', u: 0.85 });
    } else if (id === 'tic-tac-bell') {
      c.fillStyle = '#0a1326'; c.fillRect(0, 0, 160, 80); c.fillStyle = '#3E5E8C'; c.fillRect(63, 6, 3, 68); c.fillRect(94, 6, 3, 68); c.fillRect(34, 28, 92, 3); c.fillRect(34, 50, 92, 3);
      function X(x, y) { c.fillStyle = '#BFD7F1'; for (var k = 0; k < 14; k += 2) { c.fillRect(x + k, y + k, 4, 4); c.fillRect(x + 12 - k, y + k, 4, 4); } }
      function O(x, y) { c.fillStyle = '#ffd24a'; c.fillRect(x + 3, y, 10, 3); c.fillRect(x + 3, y + 13, 10, 3); c.fillRect(x, y + 3, 3, 10); c.fillRect(x + 13, y + 3, 3, 10); }
      X(38, 8); O(70, 8); X(102, 8); O(38, 31); X(70, 31); O(102, 31); X(38, 54); O(70, 54); X(102, 54);
      c.fillStyle = '#6fe0a4'; for (i = 0; i < 6; i++) c.fillRect(44 + i * 20, 62 - i * 23, 4, 4);
    } else if (id === 'stylebell') {
      c.fillStyle = '#5b34c9'; c.fillRect(0, 0, 160, 80); c.fillStyle = '#9d7bf0'; c.fillRect(0, 58, 160, 22); // panggung ungu
      c.fillStyle = '#efe3ff'; c.fillRect(18, 5, 8, 4); c.fillRect(134, 5, 8, 4);                               // lampu sorot
      c.fillStyle = '#14101c'; c.fillRect(56, 7, 48, 42); c.fillRect(52, 22, 8, 34); c.fillRect(100, 22, 8, 34); // rambut
      c.fillStyle = '#ffe3d6'; c.fillRect(63, 24, 34, 24);                                                      // wajah
      c.fillStyle = '#14101c'; c.fillRect(68, 32, 5, 6); c.fillRect(87, 32, 5, 6);                              // mata
      c.fillStyle = '#ff8fb8'; c.fillRect(65, 41, 6, 3); c.fillRect(89, 41, 6, 3);                              // pipi
      c.fillStyle = '#f9a8d4'; c.fillRect(64, 50, 32, 16); c.fillStyle = '#ffffff'; c.fillRect(76, 50, 8, 5);   // baju
      c.fillStyle = '#b9a7ec'; c.fillRect(67, 66, 11, 12); c.fillRect(82, 66, 11, 12);                          // celana
    } else { c.fillStyle = '#0a1326'; c.fillRect(0, 0, 160, 80); c.fillStyle = '#3E5E8C'; c.font = 'bold 44px monospace'; c.textAlign = 'center'; c.fillText('?', 80, 56); }
  }
  

  
function renderGames() {
    var d = S.get(), grid = $('arcade-games'); grid.textContent = '';
    NS.games.forEach(function (g) {
      var soon = g.status === 'coming-soon',
          maintenance = g.status === 'maintenance',
          unavailable = soon || maintenance,
          card = el('article', 'arcade-card' + (unavailable ? ' is-soon' : ''));

      var th = el('div', 'arcade-thumb'), cv = document.createElement('canvas');
      cv.width = 160; cv.height = 80; cv.setAttribute('aria-hidden', 'true');
      th.appendChild(cv); thumb(cv, g.gameId);

      if (g.thumbnail) {
        var img = new Image();
        img.alt = '';
        img.onerror = function () { img.remove(); };
        img.src = NS.resolve(g.thumbnail);
        th.appendChild(img);
      }

      var body = el('div', 'arcade-card-body');
      body.appendChild(el('h3', '', g.title));

      var badgeText = maintenance ? 'Maintenance' : soon ? 'Coming Soon' : 'Available';
      var badgeClass = 'arcade-badge' + (unavailable ? ' is-soon' : '');
      if (maintenance) badgeClass += ' is-maintenance';

      body.appendChild(el('span', badgeClass, badgeText));
      body.appendChild(el('p', '', g.description));

      if (!unavailable) {
        var pr = el('div', 'arcade-progress');
        progressText(g, d).forEach(function (t) {
          pr.appendChild(el('span', '', t));
        });
        body.appendChild(pr);
      }

      var btn;

      if (maintenance) {
        btn = el('button', 'arcade-btn is-maintenance', 'MAINTENANCE');
        btn.disabled = true;
        btn.type = 'button';
      } else if (soon) {
        btn = el('button', 'arcade-btn', 'COMING SOON');
        btn.disabled = true;
        btn.type = 'button';
      } else {
        btn = el('a', 'arcade-btn', 'PLAY');
        btn.href = NS.resolve(g.route);
      }

      body.appendChild(btn);
      card.appendChild(th);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }


  /* ---- modal helper ---- */
  var lastFocus = null;
  function openModal(build) { lastFocus = document.activeElement; var b = $('arcade-modal-body'); b.textContent = ''; build(b); $('arcade-modal').hidden = false; var f = b.querySelector('input,button'); if (f) f.focus(); }
  function closeModal() { $('arcade-modal').hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  document.addEventListener('keydown', function (e) { if (e.key !== 'Escape') return; if (!$('arcade-modal').hidden) closeModal(); else if (!$('arcade-settings').hidden) closeSettings(); });
  /* ---- SETTING (popup) ---- */
  var setBtn = $('arcade-settings-btn'), setOv = $('arcade-settings');
  function openSettings() { setOv.hidden = false; setBtn.setAttribute('aria-expanded', 'true'); updateExportStatus(); $('arcade-settings-close').focus(); }
  function closeSettings() { setOv.hidden = true; setBtn.setAttribute('aria-expanded', 'false'); setBtn.focus(); }
  setBtn.addEventListener('click', openSettings); $('arcade-settings-close').addEventListener('click', closeSettings); setOv.addEventListener('click', function (e) { if (e.target === setOv) closeSettings(); });
  function btn(label, ghost, fn) { var b = el('button', 'arcade-btn' + (ghost ? ' is-ghost' : ''), label); b.type = 'button'; b.onclick = fn; return b; }
  function pinInput(id, label) { var w = el('div'), l = el('label', 'arcade-note', label); l.htmlFor = id; var i = el('input', 'arcade-input'); i.id = id; i.type = 'password'; i.inputMode = 'numeric'; i.autocomplete = 'off'; i.maxLength = 12; i.placeholder = '••••••'; w.appendChild(l); w.appendChild(i); return w; }
  function fmtLeft(ms) { var s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h + ' jam ' + m + ' menit'; }

  /* ---- EXPORT ---- */
  function updateExportStatus() {
    var left = E.cooldownLeft(), st = $('arcade-export-status');
    st.textContent = left > 0 ? 'Export berikutnya tersedia dalam ' + fmtLeft(left) + ' (' + new Date(Date.now() + left).toLocaleString('id-ID') + ').' : 'Export tersedia. Batas: 1x per 24 jam.';
    $('arcade-export-btn').disabled = left > 0;
  }
  $('arcade-export-btn').addEventListener('click', function () {
    var game = $('arcade-export-select').value;
    if (!E.hasCrypto()) return toast('Export butuh HTTPS atau localhost.', true);
    openModal(function (b) {
      var h = el('h2', '', 'Export ' + (game === 'all' ? 'All Games' : E.NAMES[game])); h.id = 'arcade-modal-title'; b.appendChild(h);
      b.appendChild(el('div', 'arcade-warn is-danger', '⚠ Jika PIN lupa, backup TIDAK BISA dipulihkan — tidak ada reset PIN. Catat PIN Anda.'));
      b.appendChild(el('div', 'arcade-warn', 'Export hanya bisa 1x per 24 jam untuk semua game.'));
      b.appendChild(pinInput('arcade-pin1', 'Buat PIN (6–12 digit angka)')); b.appendChild(pinInput('arcade-pin2', 'Ulangi PIN'));
      var row = el('div', 'arcade-row'), go = btn('BUAT FILE BACKUP', false, function () {
        var p1 = $('arcade-pin1').value, p2 = $('arcade-pin2').value;
        if (!E.okPin(p1)) return toast('PIN harus 6–12 digit angka.', true);
        if (p1 !== p2) return toast('Kedua PIN tidak sama.', true);
        if (!window.confirm('Pastikan PIN sudah dicatat. PIN yang lupa tidak bisa dipulihkan. Lanjut export?')) return;
        go.disabled = true;
        E.download(game, p1).then(function () { updateExportStatus(); exportDone(); }, function (e) { go.disabled = false; toast(e.message, true); });
      });
      row.appendChild(go); row.appendChild(btn('BATAL', true, closeModal)); b.appendChild(row);
    });
  });

  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, no) { var ta = el('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); var r = false; try { r = document.execCommand('copy'); } catch (_) {} ta.remove(); r ? ok() : no(); });
  }
  function exportDone() { // jika unduhan diblokir (browser dalam aplikasi/iOS), pemain masih bisa unduh ulang atau salin kode — jatah 24 jam tidak hangus sia-sia
    openModal(function (b) {
      var h = el('h2', '', 'Backup dibuat'); h.id = 'arcade-modal-title'; b.appendChild(h);
      b.appendChild(el('p', 'arcade-note', 'Cek folder Unduhan. Jika file tidak muncul, unduh ulang atau salin kodenya dan simpan sendiri (catat PIN-nya!). Tombol ini tersedia 15 menit.'));
      var row = el('div', 'arcade-row'); row.appendChild(btn('UNDUH ULANG', false, function () { var f = E.getLast(); if (f) E.saveBlob(f.code, f.name); else toast('Sudah lewat 15 menit.', true); }));
      row.appendChild(btn('SALIN KODE', true, function () { var f = E.getLast(); if (!f) return toast('Sudah lewat 15 menit.', true); copyText(f.code).then(function () { toast('Kode disalin.'); }, function () { toast('Gagal menyalin.', true); }); }));
      row.appendChild(btn('SELESAI', true, closeModal)); b.appendChild(row);
    });
  }

  /* ---- IMPORT: file → PIN → ringkasan → peringatan tertimpa → konfirmasi ---- */
  $('arcade-import-file').addEventListener('change', function (ev) {
    var file = ev.target.files[0]; ev.target.value = ''; if (!file) return;
    if (!E.hasCrypto()) return toast('Import butuh HTTPS atau localhost.', true);
    openModal(function (b) {
      var h = el('h2', '', 'Import Data'); h.id = 'arcade-modal-title'; b.appendChild(h);
      b.appendChild(el('p', 'arcade-note', 'File: ' + file.name)); b.appendChild(pinInput('arcade-pin-in', 'Masukkan PIN backup'));
      var row = el('div', 'arcade-row'), go = btn('BUKA & LIHAT ISI', false, function () {
        go.disabled = true;
        E.open(file, $('arcade-pin-in').value).then(function (r) { go.disabled = false; if (!r.ok) return toast(r.error, true); preview(r); });
      });
      row.appendChild(go); row.appendChild(btn('BATAL', true, closeModal)); b.appendChild(row);
    });
  });
  $('arcade-paste-btn').addEventListener('click', function () {
    if (!E.hasCrypto()) return toast('Import butuh HTTPS atau localhost.', true);
    openModal(function (b) {
      var h = el('h2', '', 'Import dari kode'); h.id = 'arcade-modal-title'; b.appendChild(h);
      var ta = el('textarea', 'arcade-input'); ta.id = 'arcade-paste'; ta.rows = 5; ta.placeholder = 'BNVA1-…'; ta.style.cssText = 'letter-spacing:0;font:400 .6rem var(--px);text-align:left'; b.appendChild(ta);
      b.appendChild(pinInput('arcade-pin-in', 'Masukkan PIN backup'));
      var row = el('div', 'arcade-row'), go = btn('BUKA & LIHAT ISI', false, function () { go.disabled = true; E.open(ta.value, $('arcade-pin-in').value).then(function (r) { go.disabled = false; if (!r.ok) return toast(r.error, true); preview(r); }); });
      row.appendChild(go); row.appendChild(btn('BATAL', true, closeModal)); b.appendChild(row);
    });
  });
  function preview(r) {
    openModal(function (b) {
      var h = el('h2', '', 'Progres yang akan diimpor'); h.id = 'arcade-modal-title'; b.appendChild(h);
      var anyOver = false;
      r.items.forEach(function (it) {
        var lab = el('label', 'arcade-row'), cb = el('input'); cb.type = 'checkbox'; cb.checked = true; cb.value = it.key; cb.className = 'arcade-pick';
        lab.appendChild(cb); lab.appendChild(el('b', '', it.name)); b.appendChild(lab);
        var ul = el('ul', 'arcade-list'); it.incoming.forEach(function (t) { ul.appendChild(el('li', '', t)); }); b.appendChild(ul);
        if (it.overwrite) { anyOver = true; var w = el('div', 'arcade-warn is-danger'); w.appendChild(el('b', '', '⚠ Progres ' + it.name + ' saat ini akan TERTIMPA:')); var u2 = el('ul', 'arcade-list'); it.overwrite.forEach(function (t) { u2.appendChild(el('li', '', t)); }); w.appendChild(u2); b.appendChild(w); }
      });
      b.appendChild(el('p', 'arcade-note', 'Highscore & rekor digabung (nilai terbaik). Wallet, inventory, dan level diganti oleh isi file. Cooldown spin tidak direset.'));
      var row = el('div', 'arcade-row'), go = btn('KONFIRMASI IMPORT', false, function () {
        var sel = Array.prototype.map.call(b.querySelectorAll('.arcade-pick:checked'), function (c) { return c.value; });
        if (!sel.length) return toast('Pilih minimal satu game.', true);
        if (!window.confirm((anyOver ? 'Progres saat ini akan ditimpa. ' : '') + 'Impor data ke: ' + sel.map(function (k) { return E.NAMES[k]; }).join(' & ') + '?')) return;
        if (E.apply(r, sel)) { closeModal(); toast('Import berhasil.'); renderGames(); } else toast('Import gagal.', true);
      });
      row.appendChild(go); row.appendChild(btn('BATAL', true, closeModal)); b.appendChild(row);
    });
  }

  /* ---- HAPUS PROGRES: pilih → ringkasan → ketik kata → centang → tunggu 3 dtk → konfirmasi akhir ---- */
  $('arcade-del-btn').addEventListener('click', function () {
    var key = $('arcade-del-select').value, keys = key === 'all' ? Object.keys(E.NAMES) : [key], word = key === 'all' ? 'HAPUS SEMUA' : 'HAPUS', names = keys.map(function (k) { return E.NAMES[k]; }).join(' & ');
    openModal(function (b) {
      var h = el('h2', '', 'Hapus progres?'); h.id = 'arcade-modal-title'; b.appendChild(h); var d = S.get();
      keys.forEach(function (k) { b.appendChild(el('b', '', E.NAMES[k])); var ul = el('ul', 'arcade-list'); E.lines(k, d[k]).forEach(function (t) { ul.appendChild(el('li', '', t)); }); b.appendChild(ul); });
      b.appendChild(el('div', 'arcade-warn is-danger', '⚠ Data di atas dihapus PERMANEN dari perangkat ini dan tidak bisa dikembalikan. Disarankan Export dulu.'));
      var lab = el('label', 'arcade-note', 'Ketik "' + word + '" untuk melanjutkan:'); lab.htmlFor = 'arcade-del-word'; b.appendChild(lab);
      var inp = el('input', 'arcade-input'); inp.id = 'arcade-del-word'; inp.autocomplete = 'off'; inp.style.letterSpacing = '.1em'; b.appendChild(inp);
      var ck = el('label', 'arcade-check'), cb = el('input'); cb.type = 'checkbox'; ck.appendChild(cb); ck.appendChild(el('span', '', 'Saya paham ini tidak bisa dibatalkan')); b.appendChild(ck);
      var left = 3, timer = setInterval(function () { left--; if (left <= 0) clearInterval(timer); refresh(); }, 1000), row = el('div', 'arcade-row');
      var go = btn('HAPUS PERMANEN', false, function () {
        if (go.disabled || !window.confirm('Terakhir: hapus progres ' + names + ' sekarang?')) return; clearInterval(timer);
        S.commit(function (dd) { keys.forEach(function (k) { var spin = k === 'bellaRun' ? dd.bellaRun.spin : null; dd[k] = S.sanitizeGame(k, {}); if (spin) dd[k].spin = spin; }); }); // cooldown spin tidak ikut direset
        closeModal(); toast('Progres ' + names + ' dihapus.'); renderGames();
      });
      go.classList.add('is-danger');
      function refresh() { go.disabled = left > 0 || inp.value.trim() !== word || !cb.checked; go.textContent = left > 0 ? 'TUNGGU ' + left + ' DTK' : 'HAPUS PERMANEN'; }
      inp.oninput = cb.onchange = refresh; refresh();
      row.appendChild(go); row.appendChild(btn('BATAL', true, function () { clearInterval(timer); closeModal(); })); b.appendChild(row);
    });
  });
  $('arcade-back-site').href = NS.config.websiteHome;
  renderGames(); updateExportStatus(); setInterval(updateExportStatus, 30000);
  window.addEventListener('pageshow', function () { renderGames(); updateExportStatus(); });
})();