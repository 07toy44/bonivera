/* Bella Fight — duel 2D ringan (terinspirasi Shadow Fight). Loop rAF + delta time. Siluet digambar prosedural (placeholder). */
(function () {
  'use strict';
  var NS = window.BoniveraArcade, S = NS.Storage, A = NS.Audio, T = NS.Tutorial;
  var $ = function (id) { return document.getElementById(id); };

  var W = 560, H = 360, GY = 300, XL = 30, XR = 530;
  var reduce = window.matchMedia &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  var clamp = function (v, a, b) {
    return Math.max(a, Math.min(b, v));
  };

  var CHARS = {
    bella: {
      name: 'Bella', price: 0, hp: 100, atk: 1, spd: 1, rate: 1,
      col: '#3E5E8C', acc: '#BFD7F1',
      desc: 'Seimbang. Karakter awal.'
    },
    bonbon: {
      name: 'Bonbon', price: 150, hp: 85, atk: 0.9, spd: 1.25, rate: 1.25,
      col: '#5b7fa8', acc: '#f2b632',
      desc: 'Gesit: bergerak & menyerang lebih cepat, tenaga lebih kecil.'
    },
    ivera: {
      name: 'Ivera', price: 300, hp: 130, atk: 1.25, spd: 0.85, rate: 0.9,
      col: '#2a3f63', acc: '#e86f5b',
      desc: 'Berat: HP besar dan pukulan kuat, tapi lambat.'
    },
    noir: {
      name: 'Noir Bella', price: 600, hp: 115, atk: 1.3, spd: 1.15, rate: 1.1,
      col: '#16233a', acc: '#c9a7ff',
      desc: 'Elit: kuat sekaligus cepat.'
    }
  };

  var CORDER = ['bella', 'bonbon', 'ivera', 'noir'];
  var ELOOK = ['ninja', 'brawler', 'knight', 'phantom'];
  var ENAME = ['Ninja Bayangan', 'Brawler', 'Ksatria Besi', 'Phantom'];

  var BUFFS = {
    power: {
      name: 'Power Up', price: 30, tag: 'P', dur: 15,
      desc: 'Damage seranganmu ×1.35 selama 15 detik.'
    },
    guard: {
      name: 'Iron Skin', price: 30, tag: 'I', dur: 15,
      desc: 'Damage yang kamu terima ×0.6 selama 15 detik.'
    },
    heal: {
      name: 'Medkit', price: 40, tag: 'H', dur: 0,
      desc: 'Langsung memulihkan 40% HP (tidak dipakai jika HP penuh).'
    }
  };

  var BORDER = ['power', 'guard', 'heal'];

  var ATK = {
    punch: { su: 0.07, act: 0.1, rec: 0.14, range: 56, dmg: 6, kb: 70 },
    kick: { su: 0.15, act: 0.1, rec: 0.24, range: 64, dmg: 11, kb: 150 }
  };

  var canvas = $('bf-canvas');
  var ctx = canvas.getContext('2d');

  var state = 'menu', G = null;
  var keys = { l: 0, r: 0, j: 0, b: 0 };
  var last = 0, clock = 0, prevOv = 'bf-menu';

  function show(id, on) {
    var el = $(id);
    if (el) el.hidden = !on;
  }

  function toast(m) {
    var t = document.createElement('div');
    t.className = 'arcade-toast is-error';
    t.textContent = m;
    document.body.appendChild(t);

    setTimeout(function () {
      t.remove();
    }, 3500);
  }

  window.addEventListener('arcade:storage-error', function (e) {
    toast(e.detail);
  });

  /* Next Stage disembunyikan dengan hidden + display:none !important
     agar CSS lain tidak menampilkannya saat pemain kalah. */
  function setNextStageVisible(visible) {
    var next = $('bf-next');
    if (!next) return;

    next.hidden = !visible;

    if (visible) {
      next.style.removeProperty('display');
      next.disabled = false;
      next.setAttribute('aria-hidden', 'false');
    } else {
      next.style.setProperty('display', 'none', 'important');
      next.disabled = true;
      next.setAttribute('aria-hidden', 'true');
    }
  }

  /* ---------- panel ---------- */

  function openPanel(id) {
    prevOv = state === 'over' ? 'bf-over'
           : state === 'paused' ? 'bf-pause-menu'
           : 'bf-menu';

    ['bf-menu', 'bf-over', 'bf-shop', 'bf-pause-menu'].forEach(function (i) {
      show(i, false);
    });

    show(id, true);
  }

  function closePanel() {
    show('bf-shop', false);
    show(prevOv, true);
  }

  /* ---------- menu & shop ---------- */

  function refreshMenu() {
    var b = S.get().bellaFight;
    var sel = $('bf-stage-pick');

    $('bf-m-char').textContent = CHARS[b.selected].name;
    $('bf-m-coins').textContent = b.coins;
    $('bf-s-coins').textContent = b.coins;

    sel.textContent = '';

    for (var i = 1; i <= b.highestStage; i++) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = 'Stage ' + i +
        (i === b.highestStage ? ' (terbaru)' : ' (ulang)');
      sel.appendChild(o);
    }

    sel.value = b.highestStage;
    updateItems();
  }

  function row(title, sub, desc, btns) {
    var d = document.createElement('div');
    d.className = 'bf-row';

    var h = document.createElement('b');
    h.textContent = title;

    var q = document.createElement('span');
    q.textContent = sub;

    var p = document.createElement('p');
    p.textContent = desc;

    d.appendChild(h);
    d.appendChild(q);
    d.appendChild(p);

    var r = document.createElement('div');
    r.className = 'arcade-row';

    btns.forEach(function (b) {
      r.appendChild(b);
    });

    d.appendChild(r);
    return d;
  }

  function mkBtn(label, ghost, fn, dis) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'arcade-btn' + (ghost ? ' is-ghost' : '');
    b.textContent = label;
    b.disabled = !!dis;
    b.onclick = fn;
    return b;
  }

  function renderShop() {
    var b = S.get().bellaFight;
    var cl = $('bf-char-list');
    var bl = $('bf-buff-list');

    cl.textContent = '';
    bl.textContent = '';
    $('bf-s-coins').textContent = b.coins;

    CORDER.forEach(function (id) {
      var c = CHARS[id];
      var own = b.owned[id];
      var sel = b.selected === id;
      var st = 'HP ' + c.hp + ' · Atk ×' + c.atk + ' · Speed ×' + c.spd;

      cl.appendChild(row(
        c.name + (c.price ? ' — ' + c.price + ' coin' : ' — gratis'),
        own ? (sel ? 'TERPILIH' : 'Dimiliki') : 'Belum dimiliki',
        c.desc + ' (' + st + ')',
        [
          own
            ? mkBtn(
                sel ? 'TERPILIH' : 'PILIH',
                sel,
                function () {
                  S.commit(function (d) {
                    if (d.bellaFight.owned[id]) {
                      d.bellaFight.selected = id;
                    }
                  });

                  A.sfx('buy');
                  renderShop();
                  refreshMenu();
                },
                sel
              )
            : mkBtn(
                'BELI',
                false,
                function () {
                  buy('char', id);
                },
                b.coins < c.price
              )
        ]
      ));
    });

    BORDER.forEach(function (id) {
      var f = BUFFS[id];

      bl.appendChild(row(
        f.name + ' — ' + f.price + ' coin',
        'Dimiliki: ' + b.buffs[id],
        f.desc,
        [
          mkBtn(
            'BELI',
            false,
            function () {
              buy('buff', id);
            },
            b.coins < f.price || b.buffs[id] >= S.LIM.qty
          )
        ]
      ));
    });
  }

  function buy(kind, id) {
    var ok = false;
    var price = kind === 'char' ? CHARS[id].price : BUFFS[id].price;

    S.commit(function (d) {
      var b = d.bellaFight;

      if (b.coins < price) return;

      if (kind === 'char') {
        if (b.owned[id]) return;
        b.owned[id] = true;
      } else {
        if (b.buffs[id] >= S.LIM.qty) return;
        b.buffs[id]++;
      }

      b.coins -= price;
      ok = true;
    });

    A.sfx(ok ? 'buy' : 'wrong');

    if (!ok) toast('Coin tidak cukup.');

    /* Shop dibuka saat jeda: sinkronkan stok buff ke duel yang berjalan. */
    if (ok && kind === 'buff' && G) {
      G.inv[id] = S.get().bellaFight.buffs[id];
      updateItems();
    }

    renderShop();
    refreshMenu();
  }

  /* ================================================================
     SHOP CONTROLS — tombol scroll ▲ ▼, label petunjuk, dan tombol
     SHOP di menu jeda.
     Semua pengaturan yang mungkin sering diubah ada di SHOP_UI di
     bawah ini. Fungsi initShopControls() dipanggil sekali di bagian
     inisialisasi (paling bawah file).
     ================================================================ */

  /* ---------- [A] PENGATURAN (ubah di sini) ---------- */
  var SHOP_UI = {
    tipText:     'Gunakan tombol ini untuk scroll', /* teks label petunjuk   */
    tipWidth:    84,                                /* lebar label (px)      */
    tipFontSize: '.6rem',                           /* ukuran huruf label    */
    btnSize:     60,                                /* ukuran tombol ▲ ▼ (px)*/
    btnGap:      14,                                /* jarak antar elemen    */
    rightOffset: 10,                                /* jarak dari tepi kanan */
    scrollStep:  50,                                /* px per langkah scroll */
    repeatMs:    40,                                /* interval saat ditahan */
    pauseLabel:  'SHOP'                             /* teks tombol di jeda   */
  };

  function initShopControls() {
    var shop = $('bf-shop');

    /* ---------- [B] CSS ---------- */
    var st = document.createElement('style');
    st.id = 'bf-shop-controls-style';
    st.textContent =
      /* Dialog Shop tidak bisa digeser dengan jari; scroll lewat tombol. */
      '#bf-shop{overflow:hidden!important;touch-action:none!important;max-height:none!important}' +
      '#bf-shop .arcade-dialog{max-height:calc(100vh - 24px)!important;max-height:calc(100dvh - 24px)!important;' +
        'overflow-y:auto!important;overflow-x:hidden!important;touch-action:none!important;margin:auto}' +
      /* Kolom tombol scroll + label. */
      '#bf-sc{position:fixed;right:calc(' + SHOP_UI.rightOffset + 'px + env(safe-area-inset-right));top:50%;' +
        'transform:translateY(-50%);display:none;flex-direction:column;align-items:center;' +
        'gap:' + SHOP_UI.btnGap + 'px;z-index:9999}' +
      '.bf-scb{width:' + SHOP_UI.btnSize + 'px;height:' + SHOP_UI.btnSize + 'px;padding:0;font-size:1.4rem;' +
        'touch-action:none;-webkit-touch-callout:none}' +
      /* Label petunjuk. */
      '.bf-sc-tip{width:' + SHOP_UI.tipWidth + 'px;padding:6px 4px;box-sizing:border-box;text-align:center;' +
        'font:700 ' + SHOP_UI.tipFontSize + '/1.3 var(--ui,sans-serif);color:#eaf3ff;background:#07101f;' +
        'border:2px solid #7A9BBE;border-radius:6px;pointer-events:none}';
    document.head.appendChild(st);

    /* ---------- [C] Kolom tombol + label ---------- */
    var wrap = document.createElement('div');
    wrap.id = 'bf-sc';

    var tip = document.createElement('div');
    tip.className = 'bf-sc-tip';
    tip.textContent = SHOP_UI.tipText;
    wrap.appendChild(tip);

    document.body.appendChild(wrap);

    /* ---------- [D] Logika scroll (tekan / tahan) ---------- */
    var timer = null;

    function step(dir) {
      var d = shop.querySelector('.arcade-dialog');
      if (d) d.scrollTop += dir * SHOP_UI.scrollStep;
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function mkScroll(label, dir) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'arcade-btn bf-scb';
      b.textContent = label;
      b.setAttribute('aria-label', dir < 0 ? 'Scroll ke atas' : 'Scroll ke bawah');

      b.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();

        try {
          b.setPointerCapture(e.pointerId);
        } catch (_) {}

        stop();
        step(dir);
        timer = setInterval(function () {
          step(dir);
        }, SHOP_UI.repeatMs);
      });

      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) {
        b.addEventListener(ev, stop);
      });

      b.addEventListener('contextmenu', function (e) {
        e.preventDefault();
      });

      wrap.appendChild(b);
    }

    mkScroll('▲', -1);
    mkScroll('▼', 1);

    /* ---------- [E] Tampil/sembunyi mengikuti panel Shop ---------- */
    function sync() {
      wrap.style.display = shop.hidden ? 'none' : 'flex';

      if (!shop.hidden) {
        var d = shop.querySelector('.arcade-dialog');
        if (d) d.scrollTop = 0;
      }

      stop();
    }

    new MutationObserver(sync).observe(shop, {
      attributes: true,
      attributeFilter: ['hidden']
    });
    sync();

    /* ---------- [F] Tombol SHOP di menu jeda ---------- */
    var pm = $('bf-pause-menu');
    var rw = pm && pm.querySelector('.arcade-row');

    if (rw && !rw.querySelector('[data-shop-pause]')) {
      var sb = document.createElement('button');
      sb.type = 'button';
      sb.className = 'arcade-btn is-ghost';
      sb.setAttribute('data-shop-pause', '');
      sb.textContent = SHOP_UI.pauseLabel;

      sb.addEventListener('click', function () {
        renderShop();
        openPanel('bf-shop');
      });

      rw.insertBefore(sb, $('bf-quit'));
    }
  }

  /* ---------- buff bar (dipakai saat duel) ---------- */

  function buildItems() {
    var box = $('bf-items');
    box.textContent = '';

    BORDER.forEach(function (id, i) {
      var b = document.createElement('button');

      b.type = 'button';
      b.className = 'bf-ib';
      b.dataset.buff = id;
      b.title = BUFFS[id].name + ' (tombol ' + (i + 1) + ')';
      b.setAttribute('aria-label', BUFFS[id].name + ', tombol ' + (i + 1));

      ['k:' + (i + 1), 'ic:' + BUFFS[id].tag, 'q:', 'c:'].forEach(function (s) {
        var p = s.split(':');
        var sp = document.createElement('span');

        if (p[0] !== 'ic') sp.className = p[0];

        sp.textContent = p[1];
        b.appendChild(sp);
      });

      b.addEventListener('click', function () {
        activate(id);
      });

      box.appendChild(b);
    });
  }

  function updateItems() {
    var inv = G ? G.inv : S.get().bellaFight.buffs;

    document.querySelectorAll('.bf-ib').forEach(function (b) {
      var id = b.dataset.buff;
      var left = G && G.buff[id] > 0 ? Math.ceil(G.buff[id]) : 0;

      b.querySelector('.q').textContent = '×' + inv[id];
      b.querySelector('.c').textContent = left || '';
      b.querySelector('.c').hidden = !left;
      b.classList.toggle('is-active', !!left);

      b.disabled = !(G && G.phase === 'fight' && state === 'fight') ||
        inv[id] <= 0 || !!left;
    });
  }

  function activate(id) {
    if (
      !G ||
      state !== 'fight' ||
      G.phase !== 'fight' ||
      G.inv[id] <= 0 ||
      (BUFFS[id].dur && G.buff[id] > 0)
    ) return;

    if (id === 'heal' && G.p.hp >= G.p.max) return;

    var ok = false;

    S.commit(function (d) {
      var b = d.bellaFight;

      if (b.buffs[id] > 0) {
        b.buffs[id]--;
        ok = true;
      }
    });

    if (!ok) {
      G.inv[id] = 0;
      return updateItems();
    }

    G.inv[id]--;

    if (id === 'heal') {
      G.p.hp = Math.min(G.p.max, G.p.hp + G.p.max * 0.4);
    } else {
      G.buff[id] = BUFFS[id].dur;
    }

    A.sfx('item');
    updateItems();
  }

  /* ---------- match ---------- */

  function mk(x, face, st, col, acc, name) {
    return {
      x: x, y: GY, vx: 0, vy: 0, face: face,
      hp: st.hp, max: st.hp, atk: st.atk, spd: st.spd,
      rate: st.rate, col: col, acc: acc, name: name,
      st: 'idle', t: 0, stun: 0, hit: false, hurt: 0,
      bp: 0, bk: 0, ko: false, dmgMul: 1, takeMul: 1,
      inp: { l: 0, r: 0, j: 0, b: 0 },
      think: 0.5, holdB: 0
    };
  }

  function newMatch(stage) {
    var d = S.get().bellaFight;
    var c = CHARS[d.selected];
    var s = stage;
    var accs = ['#e86f5b', '#f2b632', '#6fd0a0', '#c9a7ff'];

    var p = mk(150, 1, c, c.col, c.acc, c.name);
    p.look = d.selected;

    var e = mk(
      410,
      -1,
      {
        hp: Math.min(500, 75 + s * 18),
        atk: Math.min(2.2, 0.85 + s * 0.09),
        spd: Math.min(1.25, 0.9 + s * 0.02),
        rate: Math.min(1.3, 0.95 + s * 0.03)
      },
      '#262b36',
      accs[s % 4],
      ENAME[(s - 1) % 4] + ' ' + s
    );

    e.look = ELOOK[(s - 1) % 4];

    e.ai = {
      aggr: Math.min(0.92, 0.5 + s * 0.05),
      blockP: Math.min(0.7, 0.15 + s * 0.05),
      think: Math.max(0.1, 0.4 - s * 0.03)
    };

    G = {
      p: p, e: e, stage: s, time: 60,
      phase: 'ready', pt: 1.3, endT: 0, committed: false,
      buff: { power: 0, guard: 0 },
      inv: {
        power: d.buffs.power,
        guard: d.buffs.guard,
        heal: d.buffs.heal
      },
      firstClear: s === d.highestStage,
      win: false, shake: 0, shown: false
    };
  }

  function startMatch(stage) {
    var de = document.documentElement;

    if (de.requestFullscreen && !document.fullscreenElement) {
      try {
        de.requestFullscreen().catch(function () {});
      } catch (_) {}
    }

    newMatch(stage);
    state = 'fight';

    ['bf-menu', 'bf-over', 'bf-shop', 'bf-pause-menu'].forEach(function (i) {
      show(i, false);
    });

    /* Stage baru dimulai: sembunyikan Next Stage langsung. */
    setNextStageVisible(false);

    $('bf-stage').classList.add('bf-playing');
    updateItems();
  }

  function startAtk(f, n) {
    f.st = n;
    f.t = 0;
    f.hit = false;
    f.bp = f.bk = 0;
    f.vx = 0;
  }

  function stepF(f, o, dt) {
    var a, k;
    var onG = f.y >= GY;

    f.t += dt;
    f.hurt = Math.max(0, f.hurt - dt);
    f.bp = Math.max(0, f.bp - dt);
    f.bk = Math.max(0, f.bk - dt);

    if (f.ko) {
      f.vx *= 0.9;
    } else if (f.st === 'hit') {
      f.vx *= Math.max(0, 1 - 5 * dt);

      if (f.t >= f.stun) {
        f.st = 'idle';
        f.t = 0;
      }
    } else if (f.st === 'punch' || f.st === 'kick') {
      a = ATK[f.st];
      k = 1 / f.rate;
      f.vx *= Math.max(0, 1 - 8 * dt);

      if (f.t >= (a.su + a.act + a.rec) * k) {
        f.st = 'idle';
        f.t = 0;
      }
    } else {
      f.face = o.x >= f.x ? 1 : -1;

      if (f.inp.b && onG) {
        f.st = 'block';
        f.vx = 0;
      } else {
        var dir = (f.inp.r ? 1 : 0) - (f.inp.l ? 1 : 0);

        f.vx = dir * 150 * f.spd;

        if (f.inp.j && onG) f.vy = -420;

        f.st = f.y < GY ? 'jump' : (dir ? 'walk' : 'idle');

        if (f.bk > 0) startAtk(f, 'kick');
        else if (f.bp > 0) startAtk(f, 'punch');
      }
    }

    f.vy += 1200 * dt;
    f.y += f.vy * dt;

    if (f.y >= GY) {
      f.y = GY;
      f.vy = 0;
    }

    f.x = clamp(f.x + f.vx * dt, XL, XR);
  }

  function resolve(f, o) {
    if (
      (f.st !== 'punch' && f.st !== 'kick') ||
      f.hit || o.ko
    ) return;

    var a = ATK[f.st];
    var k = 1 / f.rate;
    var su = a.su * k;
    var act = a.act * k;

    if (f.t < su || f.t > su + act) return;

    var dx = (o.x - f.x) * f.face;

    if (dx < -8 || dx > a.range + 14 || Math.abs(o.y - f.y) > 55) {
      return;
    }

    f.hit = true;

    var dmg = a.dmg * f.atk * f.dmgMul;

    if (o.st === 'block' && (f.x - o.x) * o.face > 0) {
      o.hp -= dmg * 0.15 * o.takeMul;
      o.vx = f.face * 60;
      A.sfx('block');
    } else {
      o.hp -= dmg * o.takeMul;
      o.st = 'hit';
      o.t = 0;
      o.stun = f.st === 'kick' ? 0.38 : 0.24;
      o.vx = f.face * a.kb;

      if (f.st === 'kick') o.vy = -160;

      o.hurt = 0.12;
      A.sfx(f.st);
      G.shake = reduce ? 0 : 0.12;
    }

    if (o.hp <= 0) {
      o.hp = 0;
      o.ko = true;
      o.st = 'ko';
      A.sfx('ko');
    }
  }

  function aiThink(e, p, dt) {
    if (e.holdB > 0) {
      e.holdB -= dt;

      if (e.holdB <= 0) e.inp.b = 0;
    }

    e.think -= dt;

    if (e.think > 0 || G.phase !== 'fight') return;

    var P = e.ai;
    var d = Math.abs(p.x - e.x);
    var toward = p.x > e.x;

    e.think = P.think * (0.7 + Math.random() * 0.6);

    if (
      (p.st === 'punch' || p.st === 'kick') &&
      d < 85 && Math.random() < P.blockP
    ) {
      e.inp.b = 1;
      e.holdB = 0.35 + Math.random() * 0.25;
      return;
    }

    if (e.holdB > 0) return;

    e.inp.l = e.inp.r = e.inp.j = 0;

    if (d > 58) {
      if (toward) e.inp.r = 1;
      else e.inp.l = 1;

      if (d > 150 && Math.random() < 0.06) e.inp.j = 1;
    } else if (Math.random() < P.aggr) {
      if (Math.random() < 0.65) e.bp = 0.15;
      else e.bk = 0.15;
    } else if (Math.random() < 0.35) {
      if (toward) e.inp.l = 1;
      else e.inp.r = 1;
    }
  }

  function update(dt) {
    var g = G, p = g.p, e = g.e;

    clock += dt;
    g.shake = Math.max(0, g.shake - dt);

    if (g.phase === 'ready') {
      g.pt -= dt;

      if (g.pt <= 0) {
        g.phase = 'fight';
        A.sfx('ready');
        updateItems();
      }

      stepF(p, e, dt);
      stepF(e, p, dt);
      return;
    }

    if (g.phase === 'end') {
      stepF(p, e, dt);
      stepF(e, p, dt);

      g.endT += dt;

      if (g.endT > 1.5 && !g.shown) showResult();

      return;
    }

    g.time -= dt;

    ['power', 'guard'].forEach(function (k) {
      if (g.buff[k] > 0) {
        g.buff[k] -= dt;

        if (g.buff[k] <= 0) {
          g.buff[k] = 0;
          updateItems();
        }
      }
    });

    p.dmgMul = g.buff.power > 0 ? 1.35 : 1;
    p.takeMul = g.buff.guard > 0 ? 0.6 : 1;

    p.inp.l = keys.l;
    p.inp.r = keys.r;
    p.inp.j = keys.j;
    p.inp.b = keys.b;

    aiThink(e, p, dt);

    stepF(p, e, dt);
    stepF(e, p, dt);

    resolve(p, e);
    resolve(e, p);

    var dx = e.x - p.x;

    if (Math.abs(dx) < 36 && p.y >= GY && e.y >= GY) {
      var push = (36 - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);

      p.x = clamp(p.x - push, XL, XR);
      e.x = clamp(e.x + push, XL, XR);
    }

    if (p.ko || e.ko || g.time <= 0) {
      g.phase = 'end';

      g.win = e.ko && !p.ko
        ? true
        : p.ko
          ? false
          : (p.hp / p.max) > (e.hp / e.max);

      /* Kalah: Next Stage langsung disembunyikan. */
      if (!g.win) setNextStageVisible(false);

      g.endT = 0;
      updateItems();
    }
  }

  function showResult() {
    var g = G;

    g.shown = true;

    if (g.committed) return;

    g.committed = true;

    var gain = 0;

    if (g.win) {
      gain = 20 + g.stage * 8 +
        (g.p.hp / g.p.max >= 0.7 ? 10 : 0);

      if (!g.firstClear) gain = Math.round(gain / 3);
    } else {
      gain = 3;
    }

    var coins = 0;

    S.commit(function (d) {
      var b = d.bellaFight;

      b.coins += gain;
      b.statistics.matches++;

      if (g.win) {
        b.statistics.wins++;

        if (g.firstClear) {
          b.highestStage = Math.min(
            b.highestStage + 1,
            S.LIM.stage
          );
        }
      } else {
        b.statistics.losses++;
      }

      coins = b.coins;
    });

    state = 'over';

    $('bf-stage').classList.remove('bf-playing');

    A.sfx(g.win ? 'win' : 'timeup');

    $('bf-o-title').textContent = g.win ? 'YOU WIN!' : 'YOU LOSE';

    $('bf-o-sub').textContent = 'Stage ' + g.stage +
      (g.win
        ? (g.firstClear
          ? ' selesai — stage berikutnya terbuka.'
          : ' (ulang: hadiah 1/3).')
        : ' gagal. Coba lagi atau perkuat karakter di Shop.');

    $('bf-o-gain').textContent = '+' + gain;
    $('bf-o-coins').textContent = coins;

    /* Menang -> Next Stage muncul. Kalah -> disembunyikan & dinonaktifkan. */
    setNextStageVisible(g.win);

    show('bf-over', true);

    refreshMenu();
  }

  function pause(on) {
    if (on && state === 'fight') {
      state = 'paused';
      show('bf-pause-menu', true);

      keys.l = keys.r = keys.j = keys.b = 0;
    } else if (!on && state === 'paused') {
      state = 'fight';
      show('bf-pause-menu', false);
      show('bf-shop', false);
      last = performance.now();
    }
  }

  /* ---------- render ---------- */

  function resize() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var dpr = window.devicePixelRatio || 1;
    var sc = Math.min(vw / W, vh / H);
    var cw = Math.floor(W * sc);
    var ch = Math.floor(H * sc);

    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';

    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);

    ctx.setTransform(
      canvas.width / W, 0, 0,
      canvas.height / H, 0, 0
    );
  }

  function drawF(f) {
    var a = ATK[f.st];
    var k = a ? 1 / f.rate : 1;
    var ext = 0;
    var pose = f.ko ? 'ko' : f.st;

    if (a) {
      var su = a.su * k;
      var act = a.act * k;
      var rec = a.rec * k;

      ext = f.t < su + act
        ? Math.min(1, f.t / su)
        : Math.max(0, 1 - (f.t - su - act) / rec);
    }

    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(f.x, GY + 5, 28, 6, 0, 0, 6.3);
    ctx.fill();

    NS.Sprites.draw(ctx, f.x, f.y, {
      look: f.look,
      face: f.face,
      pose: pose,
      t: f.t,
      clock: clock,
      ext: ext,
      flash: f.hurt > 0.04,
      u: 3.4
    });
  }

  function bar(x, y, w, v, m, col, rtl, label) {
    ctx.fillStyle = '#07101f';
    ctx.fillRect(x - 3, y - 3, w + 6, 20);

    ctx.fillStyle = '#0a1b36';
    ctx.fillRect(x, y, w, 14);

    var fw = Math.round(w * clamp(v / m, 0, 1));
    var fx = rtl ? x + w - fw : x;

    ctx.fillStyle = col;
    ctx.fillRect(fx, y, fw, 14);

    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.fillRect(fx, y, fw, 4);

    ctx.fillStyle = '#07101f';

    for (var i = 1; i < 10; i++) {
      ctx.fillRect(x + Math.round(w * i / 10) - 1, y, 2, 14);
    }

    ctx.fillStyle = '#eaf3ff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = rtl ? 'right' : 'left';
    ctx.fillText(label, rtl ? x + w : x, y + 31);
    ctx.textAlign = 'left';
  }

  function draw() {
    var sky = ctx.createLinearGradient(0, 0, 0, H);

    sky.addColorStop(0, '#1d3560');
    sky.addColorStop(0.65, '#5d82b3');
    sky.addColorStop(1, '#BFD7F1');

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff6d6';
    ctx.beginPath();
    ctx.arc(W - 90, 62, 24, 0, 6.3);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.5)';

    for (var si = 0; si < 14; si++) {
      ctx.fillRect((si * 97) % W, 14 + (si * 37) % 80, 2, 2);
    }

    ctx.fillStyle = 'rgba(14,28,56,.55)';

    [
      [20, 150, 60], [100, 120, 70], [190, 160, 50],
      [260, 110, 80], [360, 140, 60], [440, 125, 70],
      [510, 155, 50]
    ].forEach(function (b) {
      ctx.fillRect(
        b[0], b[1] + 60,
        b[2], 300 - b[1] - 60
      );
    });

    ctx.save();

    if (G && G.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      );
    }

    ctx.fillStyle = '#1d3a66';
    ctx.fillRect(0, GY, W, H - GY);

    ctx.fillStyle = '#3E5E8C';

    for (var gx = 0; gx < W; gx += 40) {
      ctx.fillRect(gx + 4, GY + 18, 28, 6);
      ctx.fillRect(gx + 22, GY + 38, 28, 6);
    }

    ctx.fillStyle = '#7A9BBE';
    ctx.fillRect(0, GY, W, 8);

    ctx.fillStyle = '#BFD7F1';
    ctx.fillRect(0, GY, W, 3);

    if (G) {
      var p = G.p;
      var e = G.e;

      drawF(e);
      drawF(p);

      if (G.buff.power > 0) {
        ctx.fillStyle = '#ffd24a';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('P', p.x - 4, p.y - 118);
      }

      if (G.buff.guard > 0) {
        ctx.strokeStyle = '#7a4fd1';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 45, 52, 0, 6.3);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffd24a';
        ctx.fillText('I', p.x + 8, p.y - 118);
      }

      var bw = W / 2 - 60;

      bar(16, 16, bw, p.hp, p.max, '#3E5E8C', false, p.name);
      bar(W - 16 - bw, 16, bw, e.hp, e.max, '#e86f5b', true, e.name);

      ctx.fillStyle = '#ffd24a';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';

      ctx.fillText(Math.max(0, Math.ceil(G.time)), W / 2, 30);

      ctx.fillStyle = '#9db4d6';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('STAGE ' + G.stage, W / 2, 46);

      ctx.strokeStyle = '#07101f';
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#ffd24a';

      if (G.phase === 'ready') {
        ctx.font = 'bold 38px monospace';

        var rt = G.pt > 0.5 ? 'SIAP…' : 'FIGHT!';

        ctx.strokeText(rt, W / 2, 150);
        ctx.fillText(rt, W / 2, 150);
      }

      if (G.phase === 'end') {
        ctx.font = 'bold 42px monospace';

        var et = G.p.ko || G.e.ko ? 'K.O.' : 'WAKTU HABIS';

        ctx.strokeText(et, W / 2, 150);
        ctx.fillText(et, W / 2, 150);
      }

      ctx.textAlign = 'left';
    }

    ctx.restore();
  }

  var tickAcc = 0;

  function updateItemsTick() {
    if ((tickAcc = (tickAcc + 1) % 15) === 0) {
      updateItems();
    }
  }

  function loop(ts) {
    requestAnimationFrame(loop);

    var dt = Math.min(0.033, (ts - last) / 1000 || 0);
    last = ts;

    if (state === 'fight' && G) {
      update(dt);

      if (G.phase === 'fight') {
        updateItemsTick();
      }
    }

    draw();
  }

  /* ---------- input ---------- */

  var KM = {
    ArrowLeft: 'l', KeyA: 'l',
    ArrowRight: 'r', KeyD: 'r',
    ArrowUp: 'j', KeyW: 'j', Space: 'j',
    ArrowDown: 'b', KeyS: 'b', KeyL: 'b'
  };

  var BK = {
    Digit1: 0, Digit2: 1, Digit3: 2,
    Numpad1: 0, Numpad2: 1, Numpad3: 2
  };

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Escape') {
      if (state === 'fight') pause(true);
      else if (state === 'paused') pause(false);
      return;
    }

    if (state !== 'fight' || !G) return;

    var k = KM[e.code];

    if (k) {
      e.preventDefault();
      keys[k] = 1;
    } else if (e.code === 'KeyJ') {
      e.preventDefault();
      if (!e.repeat) G.p.bp = 0.15;
    } else if (e.code === 'KeyK') {
      e.preventDefault();
      if (!e.repeat) G.p.bk = 0.15;
    } else if (BK[e.code] != null && !e.repeat) {
      activate(BORDER[BK[e.code]]);
    }
  });

  window.addEventListener('keyup', function (e) {
    var k = KM[e.code];

    if (k) keys[k] = 0;
  });

  document.querySelectorAll('[data-k]').forEach(function (b) {
    var k = b.dataset.k;

    b.addEventListener('pointerdown', function (e) {
      e.preventDefault();

      try {
        b.setPointerCapture(e.pointerId);
      } catch (_) {}

      if (state !== 'fight' || !G) return;

      if (k === 'p') G.p.bp = 0.15;
      else if (k === 'k') G.p.bk = 0.15;
      else keys[k] = 1;
    });

    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) {
      b.addEventListener(ev, function () {
        if (k !== 'p' && k !== 'k') keys[k] = 0;
      });
    });

    b.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  });

  $('bf-stage').addEventListener('touchmove', function (e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(true);
  });

  window.addEventListener('blur', function () {
    pause(true);
  });

  window.addEventListener('beforeunload', function (e) {
    if (state === 'fight' || state === 'paused') {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  document.querySelectorAll('[data-nav]').forEach(function (a) {
    a.href = a.dataset.nav === 'game'
      ? NS.config.arcadeHome
      : NS.config.websiteHome;

    a.addEventListener('click', function (e) {
      if (state === 'fight' || state === 'paused') {
        if (!window.confirm('Duel sedang berlangsung. Keluar dan dianggap kalah?')) {
          e.preventDefault();
        }
      }
    });
  });

  document.querySelectorAll('[data-shop]').forEach(function (b) {
    b.addEventListener('click', function () {
      renderShop();
      openPanel('bf-shop');
    });
  });

  $('bf-shop-close').onclick = function () {
    closePanel();
    refreshMenu();
  };

  $('bf-start').onclick = function () {
    startMatch(parseInt($('bf-stage-pick').value, 10) || 1);
  };

  $('bf-retry').onclick = function () {
    if (G) startMatch(G.stage);
  };

  /* Next Stage hanya berfungsi jika duel dimenangkan. */
  $('bf-next').onclick = function () {
    if (!G || !G.win || !G.shown) {
      setNextStageVisible(false);
      return;
    }

    var progress = S.get().bellaFight;

    if (G.stage >= progress.highestStage) {
      setNextStageVisible(false);
      return;
    }

    startMatch(Math.min(G.stage + 1, progress.highestStage));
  };

  $('bf-tomenu').onclick = function () {
    show('bf-over', false);
    show('bf-menu', true);
    state = 'menu';
    setNextStageVisible(false);
    refreshMenu();
  };

  $('bf-pause').onclick = function () {
    pause(state === 'fight');
  };

  $('bf-resume').onclick = function () {
    pause(false);
  };

  $('bf-quit').onclick = function () {
    show('bf-pause-menu', false);
    state = 'fight';

    if (G && G.phase !== 'end') {
      G.p.hp = 0;
      G.p.ko = true;
      G.p.st = 'ko';
      G.phase = 'end';
      G.win = false;
      G.endT = 2;

      /* Menyerah tidak boleh membuka Next Stage. */
      setNextStageVisible(false);
    }
  };

  /* ---------- inisialisasi ---------- */

  initShopControls();

  A.init('bella-fight');
  A.bindToggle($('bf-mute'));
  A.startOnGesture();

  buildItems();
  refreshMenu();
  resize();

  /* Sembunyikan Next Stage sejak game pertama kali dibuka. */
  setNextStageVisible(false);

  requestAnimationFrame(loop);

  T.init('bella-fight', {
    title: 'Bella Fight',

    onOpen: function () {
      if (state === 'fight') pause(true);
    },

    steps: [
      [
        'Tujuan.',
        'Kosongkan HP lawan sebelum HP-mu habis. Jika 60 detik habis, yang HP-nya lebih banyak menang.'
      ],
      [
        'Kontrol keyboard.',
        'A/D atau ←/→ bergerak · W/↑/Spasi lompat · J pukul (cepat) · K tendang (kuat, lambat) · L/S/↓ tahan untuk blok · 1/2/3 pakai buff · Esc jeda.'
      ],
      [
        'Kontrol HP.',
        'Pakai tombol di layar (◀ ▶ ⬆ 🛡 👊 🦵). Disarankan memutar HP ke landscape.'
      ],
      [
        'Blok & timing.',
        'Blok mengurangi damage 85% jika menghadap penyerang. Tendangan lambat tapi mematikan — jangan asal spam saat lawan memblok.'
      ],
      [
        'Buff.',
        'Ikon P / I / H di kiri atas: Power Up (+35% damage), Iron Skin (−40% damage diterima), Medkit (+40% HP). Dibeli di Shop; jumlah stok tampil di ikon.'
      ],
      [
        'Stage & Shop.',
        'Menang membuka stage berikutnya dan memberi coin (ulang stage = 1/3 hadiah). Beli dan ganti karakter di Shop: Bella, Bonbon, Ivera, Noir Bella.'
      ]
    ]
  });

  document.querySelectorAll('[data-help]').forEach(T.bind);
  T.autoShow();
})();