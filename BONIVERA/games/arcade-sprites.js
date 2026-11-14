/* Sprite pixel-art prosedural (placeholder yang bisa diganti gambar). Dipakai Bella Run, Bella Fight, dan thumbnail beranda.
   Koordinat dalam "unit pixel": titik (0,0) = tengah kaki, y negatif = ke atas, menghadap +x. */
(function () {
  'use strict';
  var NS = (window.BoniveraArcade = window.BoniveraArcade || {});
  var OUT = '#0b1222';
  var LOOKS = {
    bella: { type: 'girl', skin: '#f1c9a5', hair: '#3b2a22', outfit: '#3E5E8C', outfit2: '#2f4a70', accent: '#BFD7F1', shoe: '#1c2a40' },
    bonbon: { type: 'girl', skin: '#f1c9a5', hair: '#e9b44c', outfit: '#e8789a', outfit2: '#c25a7c', accent: '#fff2b3', shoe: '#4a2b3a' },
    ivera: { type: 'girl', skin: '#e3b48e', hair: '#8c2f39', outfit: '#2a3f63', outfit2: '#1d2d4a', accent: '#ff7d66', shoe: '#111827', wx: 1.12, sc: 1.05 },
    noir: { type: 'girl', skin: '#f1d6c0', hair: '#14121f', outfit: '#2a2150', outfit2: '#171229', accent: '#c9a7ff', shoe: '#0c0a14' },
    ninja: { type: 'ninja', skin: '#e3b48e', hair: '#1b1f2b', outfit: '#2c3342', outfit2: '#1a1e27', accent: '#ff6b5a', shoe: '#0f1218' },
    brawler: { type: 'brawler', skin: '#d9a07a', hair: '#5a3a20', outfit: '#b7422f', outfit2: '#3a3f4d', accent: '#ffcf4a', shoe: '#2a1c14', wx: 1.16, sc: 1.05 },
    knight: { type: 'knight', skin: '#e3b48e', hair: '#9aa6b8', outfit: '#8996ad', outfit2: '#5b667e', accent: '#ffcf4a', shoe: '#3a4152' },
    phantom: { type: 'phantom', skin: '#b6a4e0', hair: '#3a2a66', outfit: '#5b3aa8', outfit2: '#2c1b57', accent: '#6fe0a4', shoe: '#1c1236' }
  };

  function draw(ctx, x, y, o) {
    var L = typeof o.look === 'string' ? LOOKS[o.look] : o.look, u = (o.u || 3.4) * (L.sc || 1), pose = o.pose || 'idle', clock = o.clock || 0, ext = o.ext || 0, T = L.type;
    var bob = pose === 'idle' ? (Math.sin(clock * 5) > 0 ? 0 : 1) : 0, b = bob;
    var walk = (pose === 'walk' || pose === 'run') ? Math.sin(clock * (pose === 'run' ? 20 : 14)) : 0, air = pose === 'jump';
    ctx.save(); ctx.translate(x, y); ctx.scale((o.face || 1) * (L.wx || 1), 1);
    if (pose === 'ko') { ctx.rotate(-Math.PI / 2 * 0.97); ctx.translate(0, u * 3); }
    else if (pose === 'hit') { ctx.translate(-u * 1.5, 0); ctx.rotate(-0.12); }
    else if (pose === 'run') ctx.rotate(0.07);
    var legc = T === 'girl' ? L.skin : L.outfit2;

    function parts(R, pass) {
      // ---- kaki ----
      var bl = -4 + walk * 2, fl = 1 - walk * 2, bh = 10 - Math.max(0, walk * 2.2), fh = 10 - Math.max(0, -walk * 2.2);
      if (T === 'phantom' && pose !== 'kick') { R(-6, -12, 12, 12, L.outfit2); R(-7, -4, 14, 4, L.outfit); }
      else if (air) { R(-4, -10, 3, 6, legc); R(-7, -5, 5, 3, L.shoe); R(1, -10, 3, 5, legc); R(3, -6, 5, 3, L.shoe); }
      else if (pose === 'kick') { R(-4, -10, 3, 7, legc); R(-5, -3, 5, 3, L.shoe); R(1, -13, 3 + 13 * ext, 3, legc); R(4 + 13 * ext, -14, 5, 5, L.shoe); }
      else { R(bl, -bh, 3, bh - 3, legc); R(bl - 1, -3, 5, 3, L.shoe); R(fl, -fh, 3, fh - 3, legc); R(fl, -3, 5, 3, L.shoe); }
      // ---- badan ----
      if (T === 'girl') { R(-6, -13, 12, 4, L.outfit2); R(-6, -10, 12, 1, L.accent); R(-4, -19 + b, 8, 6, L.outfit); R(-2, -19 + b, 4, 2, '#ffffff'); R(-4, -14 + b, 8, 1, L.accent); }
      else if (T === 'phantom') { R(-6, -19 + b, 12, 9, L.outfit); R(-2, -19 + b, 4, 2, L.accent); }
      else if (T === 'knight') { R(-5, -19 + b, 10, 9, L.outfit); R(-6, -20 + b, 12, 3, '#b8c2d4'); R(-5, -13 + b, 10, 1, L.accent); }
      else if (T === 'brawler') { R(-5, -19 + b, 10, 9, L.outfit); R(-5, -13 + b, 10, 1, L.accent); R(-5, -11, 10, 2, L.outfit2); }
      else { R(-4, -19 + b, 8, 9, L.outfit); R(-4, -13 + b, 8, 1, L.accent); }
      // ---- lengan ----
      var sl = T === 'brawler' || T === 'girl' ? L.skin : L.outfit, sv = T === 'knight' ? '#b8c2d4' : L.outfit;
      if (pose !== 'ko') R(-6, -18 + b, 3, 8, sl), R(-6, -18 + b, 3, 3, sv);
      if (pose === 'punch') { var len = 3 + 13 * ext; R(3, -18 + b, len, 3, sl); R(3 + len, -19 + b, 5, 5, L.accent); R(3, -18 + b, 3, 3, sv); }
      else if (pose === 'block') { R(3, -26 + b, 3, 10, sl); R(3, -23 + b, 4, 3, L.accent); R(9, -27 + b, 2, 15, pass ? OUT : 'rgba(191,215,241,.7)'); }
      else if (air) { R(3, -23 + b, 3, 8, sl); R(3, -23 + b, 3, 3, sv); }
      else { var sw = Math.round(walk * 2); R(3 + sw, -18 + b, 3, 8, sl); R(3 + sw, -18 + b, 3, 3, sv); R(3 + sw, -10 + b, 3, 2, L.accent === '#ffffff' ? sl : sl); }
      // ---- kepala ----
      R(-4, -28 + b, 8, 9, L.skin);
      if (T === 'girl') {
        R(-5, -30 + b, 10, 4, L.hair); R(-4, -27 + b, 8, 1, L.hair); R(-7, -28 + b, 3, 15, L.hair); R(-3, -26 + b, 1, 4, L.hair);
        R(-8, -32 + b, 5, 3, L.accent); R(-6, -31 + b, 1, 1, '#ffffff'); R(-3, -32 + b, 3, 3, L.accent);
        R(1, -24 + b, 2, 2, '#1b1f2b'); R(2, -21 + b, 1, 1, '#c97c7c');
      } else if (T === 'ninja') {
        R(-5, -30 + b, 10, 5, L.outfit); R(-5, -27 + b, 10, 1, L.accent); R(-9, -28 + b, 5, 2, L.accent); R(-4, -22 + b, 8, 3, L.outfit2); R(0, -25 + b, 4, 2, '#ffffff'); R(2, -25 + b, 2, 2, '#1b1f2b');
      } else if (T === 'brawler') {
        R(-4, -28 + b, 8, 9, L.skin); R(-5, -28 + b, 10, 2, L.accent); R(-9, -27 + b, 5, 2, L.accent); R(-4, -21 + b, 8, 2, L.hair); R(1, -25 + b, 3, 1, '#1b1f2b'); R(2, -24 + b, 2, 2, '#1b1f2b');
      } else if (T === 'knight') {
        R(-5, -31 + b, 10, 11, L.outfit); R(-1, -26 + b, 7, 1, '#10141c'); R(-3, -36 + b, 6, 5, L.accent); R(-5, -22 + b, 10, 2, L.outfit2);
      } else { // phantom
        R(-6, -31 + b, 12, 12, L.outfit); R(-3, -27 + b, 8, 7, '#120a24'); R(1, -25 + b, 3, 1, L.accent); R(-2, -25 + b, 2, 1, L.accent);
      }
    }
    var e = 0.9;
    parts(function (px, py, w, h) { ctx.fillStyle = OUT; ctx.fillRect(Math.round((px - e) * u), Math.round((py - e) * u), Math.round((w + e * 2) * u), Math.round((h + e * 2) * u)); }, 1);
    parts(function (px, py, w, h, c) { ctx.fillStyle = o.flash ? '#ffffff' : c; ctx.fillRect(Math.round(px * u), Math.round(py * u), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u))); }, 0);
    ctx.restore();
  }
  NS.Sprites = { draw: draw, LOOKS: LOOKS };
})();
