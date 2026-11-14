/* Bella Run — auto-runner (gaya Geometry Dash): Bella lari otomatis, pemain hanya melompat + mengaktifkan item.
   Loop: requestAnimationFrame + delta time. Aset digambar prosedural (placeholder, bisa diganti assets/bella.png). */
(function () {
  'use strict';
  var NS = window.BoniveraArcade, S = NS.Storage, A = NS.Audio, DAY = 864e5;
  var $ = function (id) { return document.getElementById(id); };
  var W = 800, H = 450, GROUND = 370, GRAV = 1800, JUMP = 640, AIR = 0.711;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var speedAt = function (x) { return Math.min(430, 270 + x / 50); };

  var ITEMS = {
    fire_shield: { name: 'Fire Shield', price: 40, hazard: 'fire', charges: 2, tag: 'F', desc: 'Saat diaktifkan: menahan 2 sentuhan API. Tidak melindungi dari batu atau jurang.' },
    stone_shield: { name: 'Stone Shield', price: 40, hazard: 'stone', charges: 2, tag: 'S', desc: 'Saat diaktifkan: menahan 2 benturan BATU. Tidak melindungi dari api atau jurang.' },
    protection_charm: { name: 'Protection Charm', price: 70, hazard: 'pit', charges: 1, tag: 'C', desc: 'Saat diaktifkan: menyelamatkan Bella 1x dari JURANG. Tidak melindungi dari api atau batu.' }
  };
  var ORDER = ['fire_shield', 'stone_shield', 'protection_charm'], BYHAZ = { fire: 'fire_shield', stone: 'stone_shield', pit: 'protection_charm' };
  var SEG = [ // roda spin
    { cat: 'Common', coins: 1 }, { cat: 'Common', coins: 2 }, { cat: 'Common', coins: 3 },
    { cat: 'Rare', coins: 10 }, { cat: 'Rare', item: 'fire_shield', qty: 1 },
    { cat: 'Epic', coins: 40 }, { cat: 'Epic', item: 'stone_shield', qty: 2 },
    { cat: 'Legend', coins: 200 }, { cat: 'Legend', item: 'protection_charm', qty: 3 }
  ];
  var CATCOL = { Common: '#BFD7F1', Rare: '#7A9BBE', Epic: '#3E5E8C', Legend: '#f2b632' };

  var canvas = $('br-canvas'), ctx = canvas.getContext('2d');
  var state = 'menu', run = null, jumpHeld = false, jumpReq = 0, last = 0;
  var sprite = new Image(), spriteOk = false; sprite.onload = function () { spriteOk = true; }; sprite.src = '../../assets/bella.png';

  function show(id, on) { $(id).hidden = !on; }
  function toast(m) { var t = document.createElement('div'); t.className = 'arcade-toast is-error'; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3500); }
  window.addEventListener('arcade:storage-error', function (e) { toast(e.detail); });

  /* ---------- panel overlay: hanya satu tampil; tutup → kembali ke menu / game over ---------- */
  var prevOv = 'br-menu';
  function openPanel(id) { prevOv = state === 'over' ? 'br-over' : 'br-menu'; ['br-menu', 'br-over', 'br-shop', 'br-spin'].forEach(function (i) { show(i, false); }); show(id, true); }
  function closePanel() { show('br-shop', false); show('br-spin', false); show(prevOv, true); }

  /* ---------- menu / shop ---------- */
  function refreshMenu() {
    var b = S.get().bellaRun;
    $('br-best').textContent = $('br-m-best').textContent = b.highscore;
    $('br-m-wallet').textContent = $('br-s-wallet').textContent = b.walletCoins;
    $('br-m-items').textContent = ORDER.map(function (id) { return ITEMS[id].tag + '×' + b.inventory[id]; }).join('  ');
    if (state !== 'playing') updateItems(b.inventory);
  }
  function renderShop() {
    var b = S.get().bellaRun, box = $('br-shop-list'); box.textContent = ''; $('br-s-wallet').textContent = b.walletCoins;
    ORDER.forEach(function (id) {
      var it = ITEMS[id], d = document.createElement('div'); d.className = 'br-item';
      var h = document.createElement('b'); h.textContent = it.name + ' — ' + it.price + ' coin';
      var q = document.createElement('span'); q.textContent = 'Dimiliki: ' + b.inventory[id];
      var p = document.createElement('p'); p.textContent = it.desc;
      var buy = document.createElement('button'); buy.type = 'button'; buy.className = 'arcade-btn'; buy.textContent = 'BELI';
      buy.disabled = b.walletCoins < it.price || b.inventory[id] >= S.LIM.qty; buy.onclick = function () { buyItem(id); };
      d.appendChild(h); d.appendChild(q); d.appendChild(p); d.appendChild(buy); box.appendChild(d);
    });
  }
  function buyItem(id) {
    var it = ITEMS[id], ok = false;
    S.commit(function (d) { var b = d.bellaRun; if (b.walletCoins >= it.price && b.inventory[id] < S.LIM.qty) { b.walletCoins -= it.price; b.inventory[id]++; ok = true; } });
    if (!ok) { toast('Coin tidak cukup.'); A.sfx('wrong'); } else A.sfx('buy'); renderShop(); refreshMenu();
  }

  /* ---------- item bar (dipakai saat game berjalan) ---------- */
  function buildItems() {
    var box = $('br-items'); box.textContent = '';
    ORDER.forEach(function (id, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'br-ib'; b.dataset.item = id; b.title = ITEMS[id].name + ' (tombol ' + (i + 1) + ')';
      b.setAttribute('aria-label', ITEMS[id].name + ', tombol ' + (i + 1));
      ['k:' + (i + 1), 'ic:' + ITEMS[id].tag, 'q:', 'c:'].forEach(function (s) { var p = s.split(':'), sp = document.createElement('span'); if (p[0] !== 'ic') sp.className = p[0]; sp.textContent = p[1]; b.appendChild(sp); });
      b.addEventListener('click', function () { activate(id); }); box.appendChild(b);
    });
    box.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  }
  function updateItems(inv) {
    document.querySelectorAll('.br-ib').forEach(function (b) {
      var id = b.dataset.item, eff = run && run.eff[id], act = eff && eff.charges > 0;
      b.querySelector('.q').textContent = '×' + inv[id]; b.querySelector('.c').textContent = act ? eff.charges : ''; b.querySelector('.c').hidden = !act;
      b.classList.toggle('is-active', !!act); b.disabled = state !== 'playing' || inv[id] <= 0 || !!act;
    });
  }
  function activate(id) {
    if (state !== 'playing' || !run || run.inv[id] <= 0 || (run.eff[id] && run.eff[id].charges > 0)) return;
    var ok = false;
    S.commit(function (d) { var b = d.bellaRun; if (b.inventory[id] > 0) { b.inventory[id]--; ok = true; } }); // konsumsi 1 unit saat diaktifkan
    if (!ok) { run.inv[id] = 0; return updateItems(run.inv); }
    run.inv[id]--; run.eff[id] = { charges: ITEMS[id].charges }; run.flash = 0.25; A.sfx('item'); updateItems(run.inv);
  }
  function hud() { $('br-score').textContent = Math.floor(run.score); $('br-coins').textContent = run.coins; }

  /* ---------- world ---------- */
  function newRun() {
    run = { score: 0, coins: 0, x: 80, y: GROUND - 44, vy: 0, w: 28, h: 44, onGround: true, camX: 0, lastSafe: 80, committed: false, eff: {}, inv: S.get().bellaRun.inventory, boost: 0, t: 0, flash: 0,
      grounds: [{ x: -300, y: GROUND, w: 900, h: 80 }], hazards: [], coinsA: [], powers: [], genX: 600, lastType: 'flat' };
    gen(W * 2);
  }
  function gen(until) {
    var r = run;
    while (r.genX < until) {
      var x = r.genX, spd = speedAt(x), air = spd * AIR, d = Math.min(1, x / 8000), rnd = Math.random(), i;
      if (rnd < 0.2 + 0.12 * d && r.lastType !== 'gap') { // jurang, selalu dalam jangkauan lompatan
        var len = 80 + Math.random() * Math.max(10, air * 0.58 - 80 + 40 * d);
        len = Math.min(len, air * 0.62);
        for (i = 0; i < 5; i++) r.coinsA.push({ x: x + len * i / 4, y: GROUND - 70 - Math.sin(i / 4 * Math.PI) * 40, got: false });
        r.genX += len; r.lastType = 'gap';
      } else if (rnd < 0.45) { // platform melayang (opsional, berisi coin)
        var l2 = 440 + air * 0.4; r.grounds.push({ x: x, y: GROUND, w: l2, h: 80 });
        var p1 = { x: x + 120, y: GROUND - 90, w: 110, h: 14, plat: true }, p2 = { x: x + 230 + air * 0.3, y: GROUND - 150, w: 110, h: 14, plat: true };
        r.grounds.push(p1, p2);
        [p1, p2].forEach(function (p) { for (var k = 0; k < 3; k++) r.coinsA.push({ x: p.x + 20 + k * 35, y: p.y - 24, got: false }); });
        r.genX += l2; r.lastType = 'plat';
      } else { // tanah datar + bahaya (jarak antar bahaya mengikuti kecepatan)
        var l3 = 360 + air * 0.5 + Math.random() * 260; r.grounds.push({ x: x, y: GROUND, w: l3, h: 80 });
        for (var hx = x + 120 + air * 0.3; hx < x + l3 - air * 0.9; hx += air * 1.05 + Math.random() * 90) {
          if (Math.random() < 0.6 + 0.3 * d) { var fire = Math.random() < 0.5; r.hazards.push({ type: fire ? 'fire' : 'stone', x: hx, y: GROUND - (fire ? 34 : 28), w: fire ? 28 : 34, h: fire ? 34 : 28, dead: false }); }
          else r.coinsA.push({ x: hx, y: GROUND - 30, got: false });
        }
        if (Math.random() < 0.12) r.powers.push({ x: x + l3 / 2, y: GROUND - 80, got: false });
        r.genX += l3; r.lastType = 'flat';
      }
    }
    var cut = r.camX - 200;
    ['grounds', 'hazards', 'coinsA', 'powers'].forEach(function (k) { r[k] = r[k].filter(function (o) { return o.x + (o.w || 20) > cut; }); });
  }

  /* ---------- update ---------- */
  var overlap = function (a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; };
  function update(dt) {
    var r = run, i, vx = speedAt(r.x); r.t += dt; r.flash = Math.max(0, r.flash - dt); r.boost = Math.max(0, r.boost - dt); jumpReq = Math.max(0, jumpReq - dt);
    r.x += vx * dt; r.score += vx * dt / 10 * (r.boost > 0 ? 2 : 1);
    if ((jumpReq > 0 || jumpHeld) && r.onGround) { r.vy = -JUMP; r.onGround = false; jumpReq = 0; A.sfx('jump'); }
    var prev = r.y + r.h; r.vy += GRAV * dt; r.y += r.vy * dt; r.onGround = false;
    for (i = 0; i < r.grounds.length; i++) {
      var g = r.grounds[i];
      if (r.vy >= 0 && r.x + r.w > g.x && r.x < g.x + g.w && prev <= g.y + 2 && r.y + r.h >= g.y) { r.y = g.y - r.h; r.vy = 0; r.onGround = true; if (g.h > 20) r.lastSafe = r.x; }
    }
    r.camX = Math.max(r.camX, r.x - W * 0.25); gen(r.camX + W * 2);
    var pb = { x: r.x + 4, y: r.y + 4, w: r.w - 8, h: r.h - 6 };
    for (i = 0; i < r.grounds.length; i++) if (r.grounds[i].plat && overlap(pb, r.grounds[i])) return endRun('Bella menabrak platform (bawah/samping). Lompat ke atasnya sebelum menabrak!');
    r.coinsA.forEach(function (c) { if (!c.got && overlap(pb, { x: c.x - 10, y: c.y - 10, w: 20, h: 20 })) { c.got = true; r.coins++; A.sfx('coin'); r.score += 10 * (r.boost > 0 ? 2 : 1); } });
    r.powers.forEach(function (p) { if (!p.got && overlap(pb, { x: p.x - 14, y: p.y - 14, w: 28, h: 28 })) { p.got = true; r.boost = 8; A.sfx('power'); } });
    for (i = 0; i < r.hazards.length; i++) {
      var h = r.hazards[i];
      if (!h.dead && overlap(pb, { x: h.x + 3, y: h.y + 3, w: h.w - 6, h: h.h - 3 })) {
        var e = r.eff[BYHAZ[h.type]];
        if (e && e.charges > 0) { e.charges--; h.dead = true; r.flash = 0.35; A.sfx('shield'); updateItems(r.inv); }
        else return endRun(h.type === 'fire' ? 'Bella terkena api.' : 'Bella menabrak batu.');
      }
    }
    if (r.y > H + 80) {
      var ec = r.eff.protection_charm;
      if (ec && ec.charges > 0) { ec.charges--; r.flash = 0.35; A.sfx('shield'); r.x = r.lastSafe - 80; r.y = GROUND - r.h; r.vy = 0; r.onGround = true; updateItems(r.inv); }
      else return endRun('Bella jatuh ke jurang.');
    }
    hud();
  }

  /* ---------- render ---------- */
  function resize() { // layar HP portrait: area pandang lebih sempit (520) → tampilan ±1.5x lebih besar
    var vw = window.innerWidth, vh = window.innerHeight, dpr = window.devicePixelRatio || 1; W = vh > vw ? 520 : 800;
    var sc = Math.min(vw / W, vh / H), cw = Math.floor(W * sc), ch = Math.floor(H * sc);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'; canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  function hills(cx, par, base, amp, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); for (var x = 0; x <= W; x += 10) { var wx = x + cx * par; ctx.lineTo(x, base - amp * (Math.sin(wx / 90) + 0.6 * Math.sin(wx / 37 + 1))); } ctx.lineTo(W, H); ctx.fill(); }
  function draw() {
    var r = run, cx = r ? r.camX : 0, i;
    var sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#27406b'); sky.addColorStop(0.6, '#7A9BBE'); sky.addColorStop(1, '#BFD7F1'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    hills(cx, 0.12, 300, 34, '#3E5E8C'); hills(cx, 0.3, 335, 26, '#2a4a7a');
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (i = 0; i < 6; i++) { var px = (((i * 260 - cx * (reduce ? 0 : 0.2)) % (W + 200)) + W + 200) % (W + 200) - 100; ctx.fillRect(px, 60 + (i % 3) * 40, 90, 22); ctx.fillRect(px + 20, 48 + (i % 3) * 40, 50, 14); }
    if (!r) return;
    ctx.save(); ctx.translate(-cx, 0);
    r.grounds.forEach(function (g) {
      if (g.x + g.w < cx - 10 || g.x > cx + W + 10) return;
      if (g.h > 20) { ctx.fillStyle = '#1d3a66'; ctx.fillRect(g.x, g.y, g.w, g.h); ctx.fillStyle = '#3E5E8C'; for (var tx = Math.max(g.x, Math.floor(cx / 32) * 32); tx < Math.min(g.x + g.w, cx + W + 32); tx += 32) ctx.fillRect(tx + 2, g.y + 16, 28, 6), ctx.fillRect(tx + 18, g.y + 40, 28, 6); ctx.fillStyle = '#7A9BBE'; ctx.fillRect(g.x, g.y, g.w, 8); ctx.fillStyle = '#BFD7F1'; ctx.fillRect(g.x, g.y, g.w, 3); }
      else { ctx.fillStyle = '#07101f'; ctx.fillRect(g.x - 2, g.y - 2, g.w + 4, g.h + 4); ctx.fillStyle = '#3E5E8C'; ctx.fillRect(g.x, g.y, g.w, g.h); ctx.fillStyle = '#BFD7F1'; ctx.fillRect(g.x, g.y, g.w, 4); ctx.fillStyle = '#7A9BBE'; for (var bx = g.x + 8; bx < g.x + g.w - 8; bx += 20) ctx.fillRect(bx, g.y + 7, 10, 3); }
    });
    r.hazards.forEach(function (h) {
      if (h.dead) return;
      if (h.type === 'fire') { ctx.fillStyle = '#d9541e'; ctx.beginPath(); ctx.moveTo(h.x, h.y + h.h); ctx.lineTo(h.x + h.w / 2, h.y); ctx.lineTo(h.x + h.w, h.y + h.h); ctx.fill(); ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.moveTo(h.x + 8, h.y + h.h); ctx.lineTo(h.x + h.w / 2, h.y + 14); ctx.lineTo(h.x + h.w - 8, h.y + h.h); ctx.fill(); }
      else { ctx.fillStyle = '#6b6f78'; ctx.beginPath(); ctx.moveTo(h.x, h.y + h.h); ctx.lineTo(h.x + 6, h.y + 6); ctx.lineTo(h.x + h.w - 8, h.y); ctx.lineTo(h.x + h.w, h.y + h.h); ctx.fill(); ctx.strokeStyle = '#33363c'; ctx.lineWidth = 2; ctx.stroke(); }
    });
    r.coinsA.forEach(function (c) { if (c.got || c.x < cx - 30 || c.x > cx + W + 30) return; ctx.fillStyle = '#f2b632'; ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#a97a0c'; ctx.lineWidth = 2; ctx.stroke(); });
    r.powers.forEach(function (p) { if (p.got) return; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3E5E8C'; ctx.lineWidth = 3; ctx.beginPath(); for (var k = 0; k < 10; k++) { var rad = k % 2 ? 7 : 15, a = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); ctx.stroke(); });
    drawBella(r); ctx.restore();
    if (r.boost > 0) { ctx.fillStyle = '#16233a'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('★ SKOR ×2', W - 110, 28); }
    if (r.flash > 0 && !reduce) { ctx.fillStyle = 'rgba(255,255,255,' + r.flash + ')'; ctx.fillRect(0, 0, W, H); }
  }
  function drawBella(r) {
    var x = r.x, y = r.y, step = r.onGround ? Math.floor(r.t * 12) % 2 : 0;
    if (spriteOk) ctx.drawImage(sprite, x - 6, y - 6, 40, 52);
    else NS.Sprites.draw(ctx, x + 14, y + 44, { look: 'bella', pose: r.onGround ? 'run' : 'jump', clock: r.t, u: 1.45 });
    var n = 0; // aura + label (tidak hanya mengandalkan warna)
    ORDER.forEach(function (id) {
      var e = r.eff[id]; if (!e || e.charges <= 0) return;
      ctx.strokeStyle = { fire: '#d9541e', stone: '#6b6f78', pit: '#7a4fd1' }[ITEMS[id].hazard]; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.arc(x + 14, y + 22, 32 + n * 7, 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#16233a'; ctx.font = 'bold 13px monospace'; ctx.fillText(ITEMS[id].tag + '×' + e.charges, x + 40 + n * 4, y - 6 - n * 14); n++;
    });
  }

  /* ---------- loop & state ---------- */
  function loop(ts) { requestAnimationFrame(loop); var dt = Math.min(0.033, (ts - last) / 1000 || 0); last = ts; if (state === 'playing') update(dt); draw(); }
  function startRun() {
    var de = document.documentElement; if (de.requestFullscreen && !document.fullscreenElement) { try { de.requestFullscreen().catch(function () {}); } catch (_) {} }
    clearInterval(spinTimer); newRun(); state = 'playing'; jumpHeld = false; jumpReq = 0;
    ['br-menu', 'br-over', 'br-pause-menu', 'br-shop', 'br-spin'].forEach(function (i) { show(i, false); }); hud(); updateItems(run.inv);
  }
  function endRun(reason) {
    if (!run || run.committed) return; run.committed = true; state = 'over'; A.sfx('die');
    var r = run, isNew = false, best = 0;
    S.commit(function (d) { // coin masuk wallet SEKALI (guard committed)
      var b = d.bellaRun; b.walletCoins += r.coins; isNew = Math.floor(r.score) > b.highscore; b.highscore = Math.max(b.highscore, Math.floor(r.score));
      b.statistics.runs++; b.statistics.totalCoins += r.coins; b.statistics.bestDistance = Math.max(b.statistics.bestDistance, Math.floor(r.x / 10)); best = b.highscore;
    });
    $('br-over-reason').textContent = reason; $('br-o-score').textContent = Math.floor(r.score); $('br-o-best').textContent = best; $('br-o-coins').textContent = r.coins;
    $('br-o-new').hidden = !isNew; show('br-over', true); refreshMenu();
  }
  function pause(on) { if (on && state === 'playing') { state = 'paused'; jumpHeld = false; show('br-pause-menu', true); } else if (!on && state === 'paused') { state = 'playing'; show('br-pause-menu', false); last = performance.now(); } }

  /* ---------- spin harian ---------- */
  var wheel = $('br-wheel'), wctx = wheel.getContext('2d'), rot = 0, spinning = false, spinTimer = 0;
  function seg(i) { var s = SEG[i]; return s.coins ? s.coins + ' coin' : ITEMS[s.item].tag + '×' + s.qty + ' ' + ITEMS[s.item].name.split(' ')[0]; }
  function drawWheel() {
    var c = 160, R = 152, a = Math.PI * 2 / SEG.length; wctx.clearRect(0, 0, 320, 320);
    SEG.forEach(function (s, i) {
      var st = -Math.PI / 2 + i * a; wctx.beginPath(); wctx.moveTo(c, c); wctx.arc(c, c, R, st, st + a); wctx.closePath(); wctx.fillStyle = CATCOL[s.cat]; wctx.fill(); wctx.strokeStyle = '#fff'; wctx.lineWidth = 2; wctx.stroke();
      var mid = st + a / 2, flip = Math.cos(mid) < 0; wctx.save(); wctx.translate(c, c); wctx.rotate(mid + (flip ? Math.PI : 0));
      var tx = flip ? -R * 0.6 : R * 0.6; wctx.textAlign = 'center'; wctx.fillStyle = s.cat === 'Epic' ? '#fff' : '#16233a';
      wctx.font = 'bold 11px sans-serif'; wctx.fillText(s.cat.toUpperCase(), tx, -3); wctx.font = '12px sans-serif'; wctx.fillText(seg(i), tx, 12); wctx.restore();
    });
    wctx.beginPath(); wctx.arc(c, c, 16, 0, 6.3); wctx.fillStyle = '#fff'; wctx.fill(); wctx.strokeStyle = '#3E5E8C'; wctx.lineWidth = 3; wctx.stroke();
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function spinUI() {
    var nextAt = S.get().bellaRun.spin.nextAt, left = nextAt - Date.now(), ready = left <= 0;
    $('br-spin-go').disabled = !ready || spinning;
    if (spinning) return;
    if (ready) { $('br-spin-status').textContent = 'Spin harian siap diklaim!'; $('br-spin-reset').textContent = 'Setelah klaim, spin berikutnya tersedia 24 jam kemudian.'; }
    else {
      var s = Math.ceil(left / 1000); $('br-spin-status').textContent = 'Spin berikutnya dalam ' + pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60);
      $('br-spin-reset').textContent = 'Reset pada: ' + new Date(nextAt).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
  }
  function roll() { var r = Math.random() * 100, cat = r < 60 ? 'Common' : r < 85 ? 'Rare' : r < 96 ? 'Epic' : 'Legend', idx = []; SEG.forEach(function (s, i) { if (s.cat === cat) idx.push(i); }); return idx[Math.floor(Math.random() * idx.length)]; }
  function claimSpin() {
    if (spinning) return; var now = Date.now(), pick = -1;
    S.commit(function (d) { // hadiah & cooldown disimpan dalam 1 transaksi SEBELUM animasi → refresh tidak bisa mengulang
      var b = d.bellaRun; if (now < b.spin.nextAt) return; pick = roll(); var s = SEG[pick];
      if (s.coins) b.walletCoins += s.coins; else b.inventory[s.item] += s.qty;
      b.spin = { lastClaimAt: now, nextAt: now + DAY }; b.statistics.spins++;
    });
    if (pick < 0) return spinUI();
    spinning = true; $('br-spin-go').disabled = true; $('br-spin-result').textContent = '';
    var a = 360 / SEG.length, jitter = (Math.random() - 0.5) * a * 0.6, target = (((360 - (pick + 0.5) * a + jitter) % 360) + 360) % 360;
    rot += 360 * 5 + ((target - (rot % 360) + 360) % 360);
    wheel.style.transition = reduce ? 'none' : 'transform 4s cubic-bezier(.17,.67,.2,1)'; wheel.style.transform = 'rotate(' + rot + 'deg)';
    if (!reduce) for (var k = 1; k <= 26; k++) setTimeout(function () { A.sfx('spintick'); }, 4000 * (1 - Math.pow(1 - k / 26, 2)));
    setTimeout(function () {
      spinning = false; var s = SEG[pick]; A.sfx('reward', s.cat);
      $('br-spin-result').textContent = '[' + s.cat.toUpperCase() + '] ' + (s.coins ? '+' + s.coins + ' coin' : '+' + s.qty + ' ' + ITEMS[s.item].name) + '!';
      refreshMenu(); spinUI();
    }, reduce ? 50 : 4100);
  }
  function openSpin() { openPanel('br-spin'); $('br-spin-result').textContent = ''; spinUI(); clearInterval(spinTimer); spinTimer = setInterval(spinUI, 1000); }
  function closeSpin() { clearInterval(spinTimer); closePanel(); refreshMenu(); }

  /* ---------- input ---------- */
  var JUMPKEYS = { ArrowUp: 1, KeyW: 1, Space: 1 }, ITEMKEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Escape') { if (state === 'playing') pause(true); else if (state === 'paused') pause(false); return; }
    if (state !== 'playing') return;
    if (JUMPKEYS[e.code]) { e.preventDefault(); jumpHeld = true; if (!e.repeat) jumpReq = 0.12; }
    else if (ITEMKEYS[e.code] != null && !e.repeat) activate(ORDER[ITEMKEYS[e.code]]);
  });
  window.addEventListener('keyup', function (e) { if (JUMPKEYS[e.code]) jumpHeld = false; });
  function bindJump(node) {
    node.addEventListener('pointerdown', function (e) { if (state !== 'playing') return; e.preventDefault(); try { node.setPointerCapture(e.pointerId); } catch (_) {} jumpHeld = true; jumpReq = 0.12; });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { node.addEventListener(ev, function () { jumpHeld = false; }); });
    node.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  bindJump($('br-stage'));
  $('br-stage').addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  $('br-pause').addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(true); });
  window.addEventListener('blur', function () { pause(true); });
  window.addEventListener('beforeunload', function (e) { if (state === 'playing' || state === 'paused') { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', resize);

  document.querySelectorAll('[data-nav]').forEach(function (a) {
    a.href = a.dataset.nav === 'game' ? NS.config.arcadeHome : NS.config.websiteHome;
    a.addEventListener('click', function (e) {
      if (state === 'playing' || state === 'paused') { if (!window.confirm('Run sedang berlangsung. Keluar? Run diakhiri dan coin yang didapat disimpan.')) { e.preventDefault(); return; } endRun('Run diakhiri.'); }
    });
  });
  document.querySelectorAll('[data-shop]').forEach(function (b) { b.addEventListener('click', function () { renderShop(); openPanel('br-shop'); }); });
  document.querySelectorAll('[data-spin]').forEach(function (b) { b.addEventListener('click', openSpin); });
  $('br-shop-close').onclick = function () { closePanel(); refreshMenu(); };
  $('br-spin-close').onclick = closeSpin; $('br-spin-go').onclick = claimSpin;
  $('br-start').onclick = startRun; $('br-again').onclick = startRun;
  $('br-pause').onclick = function () { pause(state === 'playing'); };
  $('br-resume').onclick = function () { pause(false); };
  $('br-quit').onclick = function () { show('br-pause-menu', false); state = 'playing'; endRun('Run diakhiri pemain.'); };

  A.init('bella-run'); A.bindToggle($('br-mute')); A.startOnGesture(); buildItems(); drawWheel(); refreshMenu(); resize(); requestAnimationFrame(loop);
  var T = NS.Tutorial;
  T.init('bella-run', { title: 'Bella Run', onOpen: function () { if (state === 'playing') pause(true); }, steps: [
    ['Lari otomatis.', 'Bella berlari sendiri dan makin cepat. Tugasmu melompat: Spasi / W / ↑ / klik / ketuk layar. Tahan untuk lompat terus.'],
    ['Hindari bahaya.', 'Api, batu, dan jurang membuat kalah. Platform melayang juga mematikan jika ditabrak dari bawah atau samping — lompatlah ke atasnya sebelum menabrak.'],
    ['Kumpulkan coin.', 'Coin masuk wallet saat run berakhir. Bintang memberi skor ×2 selama 8 detik.'],
    ['Pakai item.', 'Ikon F / S / C di kiri atas: ketuk atau tekan 1 / 2 / 3. Tiap item hanya melindungi bahaya yang disebut (api / batu / jurang); jumlah stok dan sisa perlindungan tampil di ikon.'],
    ['Spin & Shop.', 'Spin harian bisa diklaim tiap 24 jam. Beli item di Shop memakai coin.']] });
  document.querySelectorAll('[data-help]').forEach(T.bind); T.autoShow();
})();
