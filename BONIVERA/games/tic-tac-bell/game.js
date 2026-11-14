/* Tic Tac Bell — XOXO: lawan bot (3 kesulitan) atau berdua di satu perangkat. Tanpa level; fokus catatan Menang/Seri/Kalah. */
(function () {
  'use strict';
  var NS = window.BoniveraArcade, S = NS.Storage, A = NS.Audio, T = NS.Tutorial;
  var $ = function (id) { return document.getElementById(id); };
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var DNAME = { easy: 'Mudah', normal: 'Sedang', hard: 'Sulit' };

  /* ---------- logika & AI ---------- */
  function check(b) {
    for (var i = 0; i < 8; i++) { var L = LINES[i]; if (b[L[0]] && b[L[0]] === b[L[1]] && b[L[0]] === b[L[2]]) return { m: b[L[0]], line: L }; }
    return b.every(Boolean) ? { m: 'draw' } : null;
  }
  function empties(b) { var e = []; for (var i = 0; i < 9; i++) if (!b[i]) e.push(i); return e; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function findWin(b, m) { var e = empties(b); for (var i = 0; i < e.length; i++) { b[e[i]] = m; var w = check(b); b[e[i]] = ''; if (w && w.m === m) return e[i]; } return -1; }
  function minimax(b, turn, me, d) {
    var w = check(b); if (w) return w.m === 'draw' ? 0 : (w.m === me ? 10 - d : d - 10);
    var nt = turn === 'X' ? 'O' : 'X', best = turn === me ? -99 : 99, e = empties(b);
    for (var k = 0; k < e.length; k++) { b[e[k]] = turn; var s = minimax(b, nt, me, d + 1); b[e[k]] = ''; if (turn === me ? s > best : s < best) best = s; }
    return best;
  }
  function aiMove(b, me, diff) {
    var opp = me === 'X' ? 'O' : 'X', e = empties(b), w, bl;
    if (diff === 'easy') { if (Math.random() < 0.3) { w = findWin(b, me); if (w >= 0) return w; bl = findWin(b, opp); if (bl >= 0) return bl; } return pick(e); }
    if (diff === 'normal') {
      if (Math.random() < 0.12) return pick(e); w = findWin(b, me); if (w >= 0) return w; bl = findWin(b, opp); if (bl >= 0) return bl;
      if (!b[4]) return 4; var cs = [0, 2, 6, 8].filter(function (i) { return !b[i]; }); return cs.length ? pick(cs) : pick(e);
    }
    if (e.length === 9) return pick([0, 2, 4, 6, 8]); // langkah pertama optimal tanpa pencarian (hemat waktu di HP)
    var best = -99, moves = []; // sulit: minimax sempurna (tidak pernah kalah)
    e.forEach(function (i) { b[i] = me; var s = minimax(b, opp, me, 1); b[i] = ''; if (s > best) { best = s; moves = [i]; } else if (s === best) moves.push(i); });
    return pick(moves);
  }
  /* ---------- UI ---------- */
  var mode = 'solo', diff = 'normal', human = 'X', pairId = null, guest = { p1: 'Pemain 1', p2: 'Pemain 2', a: 0, b: 0, d: 0 };
  var board = [], turn = 'X', over = true, busy = false, committed = false, last = -1, cells = [], xName = '', oName = '', botTimer = 0, guestGames = 0;

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function toast(m) { var t = el('div', 'arcade-toast is-error', m); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3500); }
  window.addEventListener('arcade:storage-error', function (e) { toast(e.detail); });
  function show(id, on) { $(id).hidden = !on; }
  function pairOf(id) { var ps = S.get().ticTacBell.pairs; for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i]; return null; }
  function seg(id, attr, val) { document.querySelectorAll('#' + id + ' button').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset[attr] === val)); }); }

  function buildBoard() {
    var bd = $('tb-board'); bd.textContent = ''; cells = [];
    for (var i = 0; i < 9; i++) (function (i) {
      var c = el('button', 'tb-cell'); c.type = 'button'; c.setAttribute('role', 'gridcell'); c.setAttribute('aria-label', 'Kotak ' + (Math.floor(i / 3) + 1) + '-' + (i % 3 + 1) + ', kosong');
      c.addEventListener('click', function () { humanPlay(i); }); bd.appendChild(c); cells.push(c);
    })(i);
  }
  function renderScore() {
    var box = $('tb-score'), d = S.get().ticTacBell; box.textContent = '';
    function chip(l, v) { var s = el('span', '', l); s.appendChild(el('b', '', String(v))); box.appendChild(s); }
    if (mode === 'solo') { var s = d.solo; chip('MENANG', s.wins); chip('SERI', s.draws); chip('KALAH', s.losses); chip('STREAK', s.streak); }
    else if (pairId) { var p = pairOf(pairId); if (p) { chip(p.p1.toUpperCase(), p.p1Wins); chip('SERI', p.draws); chip(p.p2.toUpperCase(), p.p2Wins); } }
    else { chip(guest.p1.toUpperCase(), guest.a); chip('SERI', guest.d); chip(guest.p2.toUpperCase(), guest.b); }
    $('tb-mode-note').textContent = mode === 'solo' ? 'Vs Bot · ' + DNAME[diff] + ' · progres pribadi' : pairId ? 'Mabar · progres tersimpan' : 'Mabar · tanpa simpan (hanya sesi ini)';
  }
  function nameOf(m) { return m === 'X' ? xName : oName; }
  function renderTurn() {
    if (over) return;
    var who = nameOf(turn), you = mode === 'solo' && turn === human ? ' (kamu)' : mode === 'solo' ? ' (bot)' : '';
    $('tb-turn').textContent = 'Giliran ' + turn + ' — ' + who + you;
  }
  function paintCell(i) {
    var c = cells[i], m = board[i]; c.textContent = ''; if (!m) { c.disabled = over || busy || (mode === 'solo' && turn !== human); return; }
    c.disabled = true; c.appendChild(el('span', 'm ' + (m === 'X' ? 'mx' : 'mo'))); c.setAttribute('aria-label', 'Kotak ' + (Math.floor(i / 3) + 1) + '-' + (i % 3 + 1) + ', ' + m);
  }
  function paintAll() { for (var i = 0; i < 9; i++) { paintCell(i); cells[i].classList.toggle('is-last', i === last && !over); } }

  function newGame() {
    clearTimeout(botTimer); board = ['', '', '', '', '', '', '', '', '']; turn = 'X'; over = false; busy = false; committed = false; last = -1; show('tb-result', false); show('tb-menu', false); show('tb-duo', false);
    if (mode === 'solo') { xName = human === 'X' ? 'Kamu' : 'Bot'; oName = human === 'O' ? 'Kamu' : 'Bot'; }
    else { var p = pairId ? pairOf(pairId) : null, n1 = p ? p.p1 : guest.p1, n2 = p ? p.p2 : guest.p2, g = p ? p.p1Wins + p.p2Wins + p.draws : guestGames; if (g % 2 === 0) { xName = n1; oName = n2; } else { xName = n2; oName = n1; } } // X bergantian tiap game
    cells.forEach(function (c) { c.classList.remove('is-win', 'is-last'); }); renderScore(); paintAll(); renderTurn();
    if (mode === 'solo' && turn !== human) botTurn();
  }
  function botTurn() { busy = true; paintAll(); botTimer = setTimeout(function () { busy = false; place(aiMove(board, turn, diff)); }, 450 + Math.random() * 250); }
  function humanPlay(i) { if (over || busy || board[i] || (mode === 'solo' && turn !== human)) return; place(i); }
  function place(i) {
    if (over || board[i]) return; board[i] = turn; last = i; A.sfx('mark', turn === 'X' ? 1 : 2); var w = check(board);
    if (w) return finish(w); turn = turn === 'X' ? 'O' : 'X'; paintAll(); renderTurn(); if (mode === 'solo' && turn !== human) botTurn();
  }
  function finish(w) {
    over = true; paintAll(); if (w.line) w.line.forEach(function (i) { cells[i].classList.add('is-win'); }); cells.forEach(function (c) { c.disabled = true; });
    var res = w.m === 'draw' ? 'draw' : (mode === 'solo' ? (w.m === human ? 'win' : 'lose') : w.m);
    if (!committed) { committed = true; commit(w.m); }
    $('tb-turn').textContent = w.m === 'draw' ? 'SERI!' : (mode === 'solo' ? (res === 'win' ? 'KAMU MENANG!' : 'KAMU KALAH') : nameOf(w.m).toUpperCase() + ' MENANG!');
    A.sfx(res === 'draw' ? 'draw' : res === 'lose' ? 'wrong' : 'win'); renderScore(); setTimeout(function () { showResult(w.m, res); }, 1000);
  }
  function commit(m) {
    if (mode === 'solo') {
      S.commit(function (d) { var s = d.ticTacBell.solo; if (m === 'draw') { s.draws++; s.streak = 0; } else if (m === human) { s.wins++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); } else { s.losses++; s.streak = 0; } });
    } else if (pairId) {
      S.commit(function (d) {
        var p = null; d.ticTacBell.pairs.forEach(function (x) { if (x.id === pairId) p = x; }); if (!p) return;
        if (m === 'draw') p.draws++; else if (nameOf(m) === p.p1) p.p1Wins++; else p.p2Wins++;
      });
    } else { guestGames++; if (m === 'draw') guest.d++; else if (nameOf(m) === guest.p1) guest.a++; else guest.b++; }
  }
  function showResult(m, res) {
    if (!over) return; var box = $('tb-r-stats'); box.textContent = '';
    $('tb-r-title').textContent = res === 'draw' ? 'SERI' : mode === 'solo' ? (res === 'win' ? 'KAMU MENANG!' : 'KAMU KALAH') : nameOf(m).toUpperCase() + ' MENANG!';
    $('tb-r-sub').textContent = mode === 'solo' ? 'Vs Bot · ' + DNAME[diff] : 'Mabar' + (pairId ? '' : ' (tidak disimpan)');
    function kv(l, v) { var r = el('div', 'arcade-kv'); r.appendChild(el('span', '', l)); r.appendChild(el('b', '', String(v))); box.appendChild(r); }
    var d = S.get().ticTacBell;
    if (mode === 'solo') { kv('Menang', d.solo.wins); kv('Seri', d.solo.draws); kv('Kalah', d.solo.losses); kv('Streak menang', d.solo.streak + ' (terbaik ' + d.solo.bestStreak + ')'); }
    else if (pairId) { var p = pairOf(pairId); kv(p.p1 + ' menang', p.p1Wins); kv('Seri', p.draws); kv(p.p2 + ' menang', p.p2Wins); }
    else { kv(guest.p1 + ' menang', guest.a); kv('Seri', guest.d); kv(guest.p2 + ' menang', guest.b); }
    show('tb-result', true);
  }

  /* ---------- menu ---------- */
  function refreshMenu() {
    var d = S.get().ticTacBell; diff = d.difficulty; seg('tb-diff', 'd', diff); seg('tb-mark', 'm', human);
    $('tb-solo-stat').textContent = 'M ' + d.solo.wins + ' · S ' + d.solo.draws + ' · K ' + d.solo.losses;
  }
  function openMenu() { if (!over && board.some(Boolean) && !window.confirm('Permainan belum selesai. Keluar ke menu? Game ini tidak akan dihitung.')) return; clearTimeout(botTimer); busy = false; over = true; refreshMenu(); show('tb-result', false); show('tb-duo', false); show('tb-menu', true); }
  function renderPairs() {
    var box = $('tb-pairs'), ps = S.get().ticTacBell.pairs; box.textContent = '';
    if (!ps.length) box.appendChild(el('p', 'arcade-note', 'Belum ada progres mabar. Buat baru di bawah.'));
    ps.forEach(function (p) {
      var r = el('div', 'tb-pair'), b = el('button', 'arcade-btn', p.p1 + ' vs ' + p.p2); b.type = 'button'; b.onclick = function () { startDuo(p.id); };
      var x = el('button', 'arcade-iconbtn', '🗑'); x.type = 'button'; x.setAttribute('aria-label', 'Hapus progres ' + p.p1 + ' vs ' + p.p2);
      x.onclick = function () { if (window.confirm('Hapus progres ' + p.p1 + ' vs ' + p.p2 + '? Catatan menang/seri/kalah akan hilang.')) { S.commit(function (d) { d.ticTacBell.pairs = d.ticTacBell.pairs.filter(function (q) { return q.id !== p.id; }); }); renderPairs(); refreshMenu(); } };
      r.appendChild(b); r.appendChild(x); r.appendChild(el('small', '', p.p1 + ' ' + p.p1Wins + ' · Seri ' + p.draws + ' · ' + p.p2 + ' ' + p.p2Wins)); box.appendChild(r);
    });
  }
  function startDuo(id) { mode = 'duo'; pairId = id; newGame(); }
  $('tb-diff').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; diff = b.dataset.d; S.commit(function (d) { d.ticTacBell.difficulty = diff; }); seg('tb-diff', 'd', diff); A.sfx('click'); });
  $('tb-mark').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; human = b.dataset.m; seg('tb-mark', 'm', human); });
  $('tb-start-solo').onclick = function () { mode = 'solo'; pairId = null; newGame(); };
  $('tb-open-duo').onclick = function () { renderPairs(); show('tb-menu', false); show('tb-duo', true); };
  $('tb-duo-back').onclick = function () { show('tb-duo', false); show('tb-menu', true); };
  $('tb-guest').onclick = function () { var a = $('tb-n1').value.trim(), b = $('tb-n2').value.trim(); guest.p1 = a || 'Pemain 1'; guest.p2 = b || 'Pemain 2'; if (guest.p1.toLowerCase() === guest.p2.toLowerCase()) guest.p2 += ' 2'; guest.a = guest.b = guest.d = 0; guestGames = 0; mode = 'duo'; pairId = null; newGame(); };
  $('tb-create').onclick = function () {
    var a = $('tb-n1').value.replace(/[<>]/g, '').trim().slice(0, 12), b = $('tb-n2').value.replace(/[<>]/g, '').trim().slice(0, 12);
    if (!a || !b) return toast('Isi nama kedua pemain.'); if (a.toLowerCase() === b.toLowerCase()) return toast('Nama kedua pemain harus berbeda.');
    var ps = S.get().ticTacBell.pairs; if (ps.length >= 8) return toast('Maksimal 8 progres mabar. Hapus salah satu dulu.');
    var dupe = ps.filter(function (p) { return (p.p1.toLowerCase() === a.toLowerCase() && p.p2.toLowerCase() === b.toLowerCase()) || (p.p1.toLowerCase() === b.toLowerCase() && p.p2.toLowerCase() === a.toLowerCase()); })[0];
    if (dupe) return startDuo(dupe.id); var id = 'p' + Date.now().toString(36);
    S.commit(function (d) { d.ticTacBell.pairs.push({ id: id, p1: a, p2: b, p1Wins: 0, p2Wins: 0, draws: 0 }); });
    if (!pairOf(id)) return toast('Gagal membuat progres.'); $('tb-n1').value = $('tb-n2').value = ''; startDuo(id);
  };
  $('tb-again').onclick = newGame; $('tb-tomenu').onclick = function () { over = true; refreshMenu(); show('tb-result', false); show('tb-menu', true); };
  $('tb-menu-btn').onclick = openMenu;
  window.addEventListener('beforeunload', function (e) { if (!over && board.some(Boolean)) { e.preventDefault(); e.returnValue = ''; } });
  document.querySelectorAll('[data-nav]').forEach(function (a) {
    a.href = a.dataset.nav === 'game' ? NS.config.arcadeHome : NS.config.websiteHome;
    a.addEventListener('click', function (e) { if (!over && board.some(Boolean) && !window.confirm('Permainan belum selesai dan tidak akan dihitung. Keluar?')) e.preventDefault(); });
  });

  A.init('tic-tac-bell'); A.bindToggle($('tb-mute')); A.startOnGesture(); buildBoard(); refreshMenu(); renderScore(); paintAll();
  T.init('tic-tac-bell', { title: 'Tic Tac Bell', steps: [
    ['Tujuan.', 'Buat 3 tanda sejajar (mendatar, menurun, atau diagonal) sebelum lawan. X selalu jalan duluan.'],
    ['Lawan bot.', 'Pilih kesulitan: Mudah (sering asal), Sedang (cukup pintar tapi bisa salah), Sulit (hampir mustahil dikalahkan). Pilih bermain sebagai X atau O.'],
    ['Main berdua.', 'Satu perangkat, bergantian menyentuh papan. Pilih progres teman yang tersimpan, buat baru (maks. 8 pasangan), atau main tanpa simpan. Giliran X bergantian tiap game.'],
    ['Catatan.', 'Menang / Seri / Kalah tampil di papan skor. Progres pribadi hanya satu; progres mabar terpisah per pasangan. Game yang ditinggalkan di tengah tidak dihitung.'],
    ['Menu.', 'Tombol ☰ membuka menu untuk ganti mode atau kesulitan; ❓ membuka tutorial ini lagi.']] });
  document.querySelectorAll('[data-help]').forEach(T.bind); T.autoShow();
})();
