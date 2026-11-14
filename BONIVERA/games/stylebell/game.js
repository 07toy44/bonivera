/* StyleBell — dress-up karakter Bella.
   Urutan layer (bawah → atas): latar → bayangan → celana (diwarnai) → kaos dalam (diwarnai mengikuti outfit) → outfit luar
   → badan/rambut/tangan → wajah (ekspresi) → elemen tambahan → watermark.
   Setiap pose punya anchor sendiri (pusat kepala, lebar torso, garis kerah, bentuk wajah); outfit dan ekspresi disesuaikan dari anchor itu. */
(function () {
  'use strict';
  var NS = window.BoniveraArcade || {}, P = window.StyleBellPack, M = P && P.m;
  var $ = function (id) { return document.getElementById(id); };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function toast(msg, err) { var t = el('div', 'arcade-toast' + (err ? ' is-error' : ''), msg); t.setAttribute('role', 'status'); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200); }

  var CW = M.canvas[0], CH = M.canvas[1], G = 1.22, GROUND = 0.955 * CH, OTOP = -10, ORIG = '#b9a7ec', WM = 'BoniveraArcade';
  var PANTS = [['Lavender', '#b9a7ec'], ['Hitam', '#2a2a33'], ['Putih', '#f6f6fb'], ['Navy', '#25376f'], ['Biru Langit', '#7fb4ea'], ['Jeans', '#4b6fa6'], ['Merah', '#d7424f'], ['Pink', '#f29cc2'], ['Mint', '#7fd2b2'], ['Army', '#5d7a4b'], ['Kuning', '#f3cd58'], ['Khaki', '#cdb78c'], ['Abu', '#8f91a2'], ['Cokelat', '#7b5339']];
  /* Penyesuaian per kombinasi outfit × pose: [dx, dy, skala]. Default [0,0,1]. CLIP = pose dengan lengan terangkat → lengan outfit dipotong, lengan asli (berwarna senada) yang tampil. */
  var ADJ = {}, CLIP = { 1: 1, 3: 1 };
  var DEF = { pose: 0, expr: -1, outfit: -1, pants: ORIG, bg: 'theater', plain: '#e9e1ff', fx: -1, clear: false };
  var S = {}, IM = {}, TC = {}, FC = {}, tab = 'pose', ready = false;
  function reset() { for (var k in DEF) S[k] = DEF[k]; }

  /* ---------- aset ---------- */
  function loadAll(prog) {
    var keys = Object.keys(P.i), n = 0;
    return new Promise(function (ok, bad) {
      keys.forEach(function (k) { var im = new Image(); im.onload = function () { IM[k] = im; prog(++n, keys.length); if (n === keys.length) ok(); }; im.onerror = function () { bad(new Error('Aset gagal dimuat: ' + k)); }; im.src = P.i[k]; });
    });
  }
  function tint(key, hex) { // kalikan sprite abu-abu (putih = warna dasar) dengan warna target
    var id = key + hex; if (TC[id]) return TC[id];
    if (Object.keys(TC).length > 90) TC = {};
    var im = IM[key], c = mk(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0);
    var d = x.getImageData(0, 0, c.width, c.height), p = d.data, r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255;
    for (var i = 0; i < p.length; i += 4) { p[i] *= r; p[i + 1] *= g; p[i + 2] *= b; }
    x.putImageData(d, 0, 0); return (TC[id] = c);
  }
  function faceLayer(pi, ei) { // wajah target dikosongkan (kulit polos) lalu ekspresi sumber dipasang menurut anchor kepala masing-masing
    var key = pi + ':' + ei; if (FC[key]) return FC[key];
    if (Object.keys(FC).length > 60) FC = {};
    var p = M.poses[pi], e = M.poses[ei], c = mk(p.w, p.h), x = c.getContext('2d'), r = p.hws / e.hws, fe = IM['p' + ei + '_face'];
    x.drawImage(IM['p' + pi + '_face'], p.face[0], p.face[1]);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgb(' + p.skin.join(',') + ')'; x.fillRect(0, 0, p.w, p.h);
    x.globalCompositeOperation = 'source-atop';
    x.drawImage(fe, p.hc - (e.hc - e.face[0]) * r, p.ey - (e.ey - e.face[1]) * r, fe.width * r, fe.height * r);
    if (!(p.lo && e.lo)) { // mulut tertutup bantal/cup: hanya pita mata yang diganti, memudar halus ke bawah
      var gr = x.createLinearGradient(0, p.ey + 30, 0, p.ey + 48); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalCompositeOperation = 'destination-in'; x.fillStyle = gr; x.fillRect(0, 0, p.w, p.h);
    }
    return (FC[key] = c);
  }

  /* ---------- render ---------- */
  function drawChar(x, o, ox, oy, g) {
    var p = M.poses[o.pose], at = function (c) { x.drawImage(c, ox, oy, c.width * g, c.height * g); }, oc = o.outfit >= 0 ? M.outfits[o.outfit] : null;
    at(tint('p' + o.pose + '_pants', o.pants));
    at(tint('p' + o.pose + '_shirt', oc ? oc.inner : ORIG));
    if (oc) {
      var ad = (ADJ[oc.id] && ADJ[oc.id][o.pose]) || [0, 0, 1], s = p.tw / 180 * g * ad[2], cx = ox + (p.tc + ad[0]) * g;
      var top = oy + (p.cy + OTOP + ad[1]) * g, wy = top + oc.wy * s;
      x.save();
      if (CLIP[o.pose]) { x.beginPath(); x.rect(cx - (p.tw / 2 + 14) * g, 0, (p.tw + 28) * g, wy); x.rect(0, wy, 4000, 4000); x.clip(); } // lengan terangkat: lengan outfit dipotong, rok tetap utuh
      x.drawImage(IM['o' + oc.id], cx - oc.cx * s, top, oc.w * s, oc.h * s); x.restore();
    }
    at(IM['p' + o.pose + '_over']);
    if (o.expr >= 0 && o.expr !== o.pose) at(faceLayer(o.pose, o.expr));
  }
  function render(x, st, clear) {
    var p = M.poses[st.pose], ox = CW / 2 - p.hc * G, oy = GROUND - p.h * G;
    x.clearRect(0, 0, CW, CH); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; // sama untuk pratinjau & ekspor
    if (!clear) {
      if (st.bg === 'plain') { x.fillStyle = st.plain; x.fillRect(0, 0, CW, CH); }
      else x.drawImage(IM['bg_' + st.bg], 0, 0, CW, CH);
      var sh = x.createRadialGradient(ox + p.feet * G, GROUND - 6, 4, ox + p.feet * G, GROUND - 6, 0.2 * CH);
      sh.addColorStop(0, 'rgba(10,5,30,.38)'); sh.addColorStop(1, 'rgba(10,5,30,0)');
      x.save(); x.translate(0, GROUND - 6); x.scale(1, 0.16); x.translate(0, -(GROUND - 6)); x.fillStyle = sh; x.fillRect(0, GROUND - 6 - 0.2 * CH, CW, 0.4 * CH); x.restore();
    }
    drawChar(x, st, ox, oy, G);
    if (st.fx >= 0) {
      var f = M.fx[st.fx], w = f.ratio * p.hws * G, h = w * f.h / f.w;
      x.drawImage(IM['fx' + f.id], ox + (p.hc + f.rel[0] * p.hws) * G - w / 2, oy + (p.ft + f.rel[1] * p.hws) * G - h / 2, w, h);
    }
    x.save(); x.font = '600 ' + Math.round(CH * 0.021) + 'px Rubik,Arial,sans-serif'; x.textAlign = 'right'; x.textBaseline = 'bottom';
    x.lineJoin = 'round'; x.lineWidth = Math.max(3, CH * 0.004); x.strokeStyle = 'rgba(25,10,50,.55)'; x.fillStyle = 'rgba(255,255,255,.88)';
    x.strokeText(WM, CW * 0.985, CH * 0.985); x.fillText(WM, CW * 0.985, CH * 0.985); x.restore();
  }
  var cv, cx2;
  function draw() { if (!ready) return; render(cx2, S, S.clear); $('sb-canvas').parentNode.classList.toggle('is-clear', S.clear); }

  /* ---------- UI ---------- */
  function thumbPose(pi) { var c = mk(120, 120), x = c.getContext('2d'), p = M.poses[pi], g = 108 / 800; drawChar(x, { pose: pi, expr: -1, outfit: -1, pants: ORIG }, 60 - p.hc * g, 114 - p.h * g, g); return c; }
  function thumbExpr(ei) { var c = mk(120, 120), x = c.getContext('2d'), e = M.poses[ei], im = IM['p' + ei + '_face'], k = 110 / Math.max(im.width, im.height); x.fillStyle = 'rgb(' + e.skin.join(',') + ')'; x.fillRect(0, 0, 120, 120); x.drawImage(im, 60 - im.width * k / 2, 60 - im.height * k / 2, im.width * k, im.height * k); return c; }
  function thumbImg(key, bgc) { var c = mk(120, 120), x = c.getContext('2d'), im = IM[key], k = Math.min(112 / im.width, 112 / im.height); if (bgc) { x.fillStyle = bgc; x.fillRect(0, 0, 120, 120); } x.drawImage(im, 60 - im.width * k / 2, 60 - im.height * k / 2, im.width * k, im.height * k); return c; }
  var TH = {};
  function opt(label, canvas, on, fn) {
    var b = el('button', 'sb-opt' + (on ? ' is-on' : '')); b.type = 'button'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = label;
    if (canvas) b.appendChild(canvas); b.appendChild(el('span', '', label)); b.onclick = function () { fn(); renderPanel(); }; return b;
  }
  var TABS = [['expr', 'Ekspresi'], ['pose', 'Pose'], ['outfit', 'Pakaian'], ['pants', 'Celana'], ['bg', 'Latar'], ['fx', 'Elemen']];
  function cached(k, f) { return TH[k] || (TH[k] = f()); }
  function clone(c) { var d = mk(c.width, c.height); d.getContext('2d').drawImage(c, 0, 0); return d; }
  function renderPanel() {
    var box = $('sb-opts'), i; box.textContent = '';
    if (tab === 'expr') {
      box.appendChild(opt('Asli', clone(cached('eN', function () { return thumbExpr(0); })), S.expr < 0, function () { S.expr = -1; draw(); }));
      M.expr.forEach(function (e) { box.appendChild(opt(e.name, clone(cached('e' + e.id, function () { return thumbExpr(e.id); })), S.expr === e.id, function () { S.expr = e.id; draw(); })); });
    } else if (tab === 'pose') {
      M.poses.forEach(function (p) { box.appendChild(opt(p.name, clone(cached('p' + p.id, function () { return thumbPose(p.id); })), S.pose === p.id, function () { S.pose = p.id; draw(); })); });
    } else if (tab === 'outfit') {
      box.appendChild(opt('Piyama Asli', clone(cached('oN', function () { return thumbPose(0); })), S.outfit < 0, function () { S.outfit = -1; draw(); }));
      M.outfits.forEach(function (o) { box.appendChild(opt(o.name, clone(cached('o' + o.id, function () { return thumbImg('o' + o.id, '#0b1a36'); })), S.outfit === o.id, function () { S.outfit = o.id; draw(); })); });
    } else if (tab === 'pants') {
      box.appendChild(el('p', 'sb-sub', 'Warna celana berlaku untuk semua pose & outfit.'));
      PANTS.forEach(function (c) {
        var w = el('div', 'sb-swcell'), b = el('button', 'sb-sw' + (S.pants === c[1] ? ' is-on' : '')); b.type = 'button'; b.style.background = c[1]; b.title = c[0]; b.setAttribute('aria-label', 'Celana ' + c[0]); b.setAttribute('aria-pressed', S.pants === c[1] ? 'true' : 'false');
        b.onclick = function () { S.pants = c[1]; draw(); renderPanel(); }; w.appendChild(b); w.appendChild(el('span', '', c[0])); box.appendChild(w);
      });
      var row = el('label', 'sb-color'), inp = el('input'); inp.type = 'color'; inp.value = S.pants; inp.setAttribute('aria-label', 'Warna celana bebas');
      inp.oninput = function () { S.pants = inp.value; draw(); lab.textContent = 'Warna bebas: ' + inp.value.toUpperCase(); };
      var lab = el('span', '', 'Warna bebas: ' + S.pants.toUpperCase()); row.appendChild(inp); row.appendChild(lab); box.appendChild(row);
    } else if (tab === 'bg') {
      M.bg.forEach(function (b) { box.appendChild(opt(b.name, clone(cached('b' + b.id, function () { return thumbImg(b.img); })), S.bg === b.id, function () { S.bg = b.id; draw(); })); });
      box.appendChild(opt('Polos', clone(cached('bP', function () { var c = mk(120, 120), x = c.getContext('2d'); x.fillStyle = S.plain; x.fillRect(0, 0, 120, 120); return c; })), S.bg === 'plain', function () { S.bg = 'plain'; draw(); }));
      var r2 = el('label', 'sb-color'), i2 = el('input'); i2.type = 'color'; i2.value = S.plain; i2.setAttribute('aria-label', 'Warna latar polos');
      i2.oninput = function () { S.plain = i2.value; S.bg = 'plain'; draw(); }; r2.appendChild(i2); r2.appendChild(el('span', '', 'Warna latar polos')); box.appendChild(r2);
    } else if (tab === 'fx') {
      box.appendChild(opt('Tanpa', clone(cached('xN', function () { var c = mk(120, 120), x = c.getContext('2d'); x.fillStyle = '#9fb4d8'; x.font = '700 64px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('✕', 60, 62); return c; })), S.fx < 0, function () { S.fx = -1; draw(); }));
      M.fx.forEach(function (f) { box.appendChild(opt(f.name, clone(cached('f' + f.id, function () { return thumbImg('fx' + f.id, '#0b1a36'); })), S.fx === f.id, function () { S.fx = f.id; draw(); })); });
    }
  }
  function renderTabs() {
    var t = $('sb-tabs'); t.textContent = '';
    TABS.forEach(function (d) { var b = el('button', 'sb-tab', d[1]); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', d[0] === tab ? 'true' : 'false'); b.onclick = function () { tab = d[0]; renderTabs(); renderPanel(); }; t.appendChild(b); });
  }
  function download() {
    var o = mk(CW, CH); render(o.getContext('2d'), S, S.clear);
    var name = 'StyleBell-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '.png';
    function save(url, rev) { var a = el('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { if (rev) URL.revokeObjectURL(url); a.remove(); }, 1500); toast('PNG tersimpan: ' + name); }
    if (o.toBlob) o.toBlob(function (b) { if (b) save(URL.createObjectURL(b), true); else save(o.toDataURL('image/png')); }, 'image/png'); else save(o.toDataURL('image/png'));
  }
  function overlay(id, open) { var o = $(id); o.hidden = !open; if (open) { var b = o.querySelector('button'); if (b) b.focus(); } }

  function init() {
    cv = $('sb-canvas'); cx2 = cv.getContext('2d'); cx2.imageSmoothingQuality = 'high'; reset();
    $('sb-menu-btn').onclick = function () { overlay('sb-menu', true); }; $('sb-menu-close').onclick = function () { overlay('sb-menu', false); };
    $('sb-help-btn').onclick = function () { overlay('sb-help', true); }; $('sb-help-close').onclick = function () { overlay('sb-help', false); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { overlay('sb-menu', false); overlay('sb-help', false); } });
    ['sb-menu', 'sb-help'].forEach(function (id) { $(id).addEventListener('click', function (e) { if (e.target === this) overlay(id, false); }); });
    document.querySelectorAll('[data-nav]').forEach(function (a) { var c = NS.config; if (c) a.href = a.dataset.nav === 'game' ? c.arcadeHome : c.websiteHome; });
    $('sb-reset').onclick = function () { reset(); $('sb-transparent').checked = false; draw(); renderPanel(); toast('Kreasi di-reset'); };
    $('sb-transparent').onchange = function () { S.clear = this.checked; draw(); };
    $('sb-download').onclick = download;
    renderTabs();
    loadAll(function (n, t) { $('sb-loading').textContent = 'Memuat aset… ' + Math.round(n / t * 100) + '%'; }).then(function () {
      ready = true; $('sb-loading').hidden = true; $('sb-download').disabled = false; draw(); renderPanel();
    }).catch(function (e) { $('sb-loading').textContent = 'Gagal memuat: ' + e.message; });
  }
  window.StyleBell = { state: S, M: M, ADJ: ADJ, CLIP: CLIP, set: function (o) { for (var k in o) S[k] = o[k]; draw(); }, draw: draw, render: render, reset: reset, mk: mk, isReady: function () { return ready; } };
  init();
})();
