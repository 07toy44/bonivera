
/* Find Bella Word — word search dengan swipe/drag (mouse + sentuh via Pointer Events). */
(function () {
  'use strict';

  var NS = window.BoniveraArcade, S = NS.Storage, A = NS.Audio;
  var $ = function (id) { return document.getElementById(id); };

  var MAIN = 'BELLA';
  var DIRS = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  var sizeOf = function (lv) {
    return Math.min(4 + lv, 12);
  };

  var extrasOf = function (lv) {
    var e = [];
    if (lv >= 3) e.push('BONBON');
    if (lv >= 4) e.push('BONIVERA');
    return e;
  };

  var lv = 1, n = 5, grid = [], extras = [], foundExtra = {};
  var attempts = 0, t0 = 0, limit = 0, deadline = 0;
  var pausedLeft = 0, solved = false, timer = 0;
  var sel = [], start = null, cells = [];
  var levelWon = false;

  var gridEl = $('fw-grid');

  /*
   * FIX UTAMA:
   * Sembunyikan tombol Next Stage dengan CSS !important,
   * agar aturan display dari stylesheet tidak bisa memunculkannya.
   */
  function setNextStageVisible(visible) {
    var next = $('fw-next');
    if (!next) return;

    next.hidden = !visible;

    if (visible) {
      next.style.removeProperty('display');
    } else {
      next.style.setProperty('display', 'none', 'important');
    }
  }

  function setRetryVisible(visible) {
    var retry = $('fw-retry');
    if (!retry) return;

    retry.hidden = !visible;

    if (visible) {
      retry.style.removeProperty('display');
    } else {
      retry.style.setProperty('display', 'none', 'important');
    }
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

  var fb = function (m) {
    $('fw-feedback').textContent = m;
  };

  /* ---------- Generator ---------- */

  function place(g, word, size) {
    for (var tries = 0; tries < 300; tries++) {
      var d = DIRS[Math.floor(Math.random() * 8)];
      var r = Math.floor(Math.random() * size);
      var c = Math.floor(Math.random() * size);

      var er = r + d[0] * (word.length - 1);
      var ec = c + d[1] * (word.length - 1);

      if (er < 0 || er >= size || ec < 0 || ec >= size) {
        continue;
      }

      var ok = true;
      var i;

      for (i = 0; i < word.length; i++) {
        var ch = g[r + d[0] * i][c + d[1] * i];

        if (ch && ch !== word[i]) {
          ok = false;
          break;
        }
      }

      if (!ok) continue;

      var cellsArr = [];

      for (i = 0; i < word.length; i++) {
        g[r + d[0] * i][c + d[1] * i] = word[i];

        cellsArr.push({
          r: r + d[0] * i,
          c: c + d[1] * i
        });
      }

      return cellsArr;
    }

    return null;
  }

  function count(g, size, word) {
    var total = 0;

    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        DIRS.forEach(function (d) {
          var er = r + d[0] * (word.length - 1);
          var ec = c + d[1] * (word.length - 1);

          if (er < 0 || er >= size || ec < 0 || ec >= size) {
            return;
          }

          for (var i = 0; i < word.length; i++) {
            if (g[r + d[0] * i][c + d[1] * i] !== word[i]) {
              return;
            }
          }

          total++;
        });
      }
    }

    return total;
  }

  function makeGrid(level) {
    var size = sizeOf(level);
    var ex = extrasOf(level).filter(function (w) {
      return w.length <= size;
    });

    for (var attempt = 0; attempt < 80; attempt++) {
      var g = [];
      var r, c;

      for (r = 0; r < size; r++) {
        g.push([]);

        for (c = 0; c < size; c++) {
          g[r].push('');
        }
      }

      var sol = null;

      var okAll = ex.concat([MAIN]).every(function (w) {
        var p = place(g, w, size);

        if (w === MAIN) sol = p;

        return !!p;
      });

      if (!okAll) continue;

      var pool = 'BELAONIVRT' + 'BELBELLA' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      for (r = 0; r < size; r++) {
        for (c = 0; c < size; c++) {
          if (!g[r][c]) {
            g[r][c] = pool[Math.floor(Math.random() * pool.length)];
          }
        }
      }

      if (count(g, size, MAIN) === 1) {
        return {
          g: g,
          size: size,
          ex: ex,
          sol: sol
        };
      }
    }

    var f = [];

    for (var i = 0; i < size; i++) {
      f.push([]);

      for (var j = 0; j < size; j++) {
        f[i].push('XQZ'[(i + j) % 3]);
      }
    }

    for (var k = 0; k < 5; k++) {
      f[0][k] = MAIN[k];
    }

    return {
      g: f,
      size: size,
      ex: [],
      sol: [0, 1, 2, 3, 4].map(function (k) {
        return {
          r: 0,
          c: k
        };
      })
    };
  }

  /* ---------- Level ---------- */

  var HINT_COST = 2500;
  var HINT_MAX = 3;
  var sol = [];
  var hinted = 0;

  function hintUI() {
    var pts = S.get().findBellaWord.points;

    $('fw-points').textContent = pts;
    $('fw-hint').textContent = '💡 ' + HINT_COST;

    $('fw-hint').disabled =
      solved || hinted >= HINT_MAX || pts < HINT_COST;

    $('fw-hint').title =
      'Hint 1 huruf (' + HINT_COST +
      ' poin, sisa ' + (HINT_MAX - hinted) +
      'x di level ini)';
  }

  function useHint() {
    if (solved || pausedLeft || hinted >= HINT_MAX) {
      return;
    }

    var ok = false;

    S.commit(function (d) {
      var w = d.findBellaWord;

      if (w.points >= HINT_COST) {
        w.points -= HINT_COST;
        w.statistics.hintsUsed++;
        ok = true;
      }
    });

    if (!ok) {
      A.sfx('wrong');
      fb('Poin belum cukup. Hint butuh ' + HINT_COST + ' poin.');
      return hintUI();
    }

    var p = sol[hinted++];

    cells[p.r * n + p.c].classList.add('is-hint');

    A.sfx('bonus');

    fb(
      '💡 Hint: huruf ke-' + hinted +
      ' dari BELLA (“' + MAIN[hinted - 1] +
      '”) ditandai ★'
    );

    hintUI();
  }

  function loadLevel(level) {
    clearInterval(timer);

    $('fw-pausemenu').hidden = true;

    lv = level;
    levelWon = false;
    solved = false;

    /*
     * FIX: Setiap level baru dimulai, Next Stage wajib tersembunyi.
     * Retry tetap tersedia.
     */
    setNextStageVisible(false);
    setRetryVisible(true);

    var m = makeGrid(level);

    grid = m.g;
    n = m.size;
    sol = m.sol;
    hinted = 0;
    extras = m.ex;
    foundExtra = {};
    attempts = 0;
    sel = [];
    start = null;

    $('fw-result').hidden = true;

    $('fw-level').textContent = lv;
    $('fw-size').textContent = n + '×' + n;
    $('fw-att').textContent = 0;
    $('fw-time').textContent = 0;

    var rec = S.get().findBellaWord.bestRecords[lv];

    $('fw-best').textContent = rec ? rec.score : 0;

    $('fw-target').textContent =
      'Target utama: ' + MAIN +
      (extras.length
        ? ' · Bonus (opsional, +150): ' + extras.join(', ')
        : '') +
      '. Level selesai saat BELLA ditemukan.';

    fb('Geser dari huruf pertama ke huruf terakhir.');

    hintUI();

    gridEl.style.gridTemplateColumns = 'repeat(' + n + ',1fr)';
    gridEl.textContent = '';
    cells = [];

    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var d = document.createElement('div');

        d.className = 'arcade-cell';
        d.textContent = grid[r][c];
        d.setAttribute('role', 'gridcell');

        gridEl.appendChild(d);
        cells.push(d);
      }
    }

    limit = Math.max(25, 45 - (lv - 1) * 2);
    pausedLeft = limit * 1000;
    deadline = 0;

    $('fw-ready-lv').textContent = lv;

    $('fw-ready-info').textContent =
      'Grid ' + n + '×' + n +
      ' · Waktu ' + limit + ' detik';

    $('fw-ready').hidden = false;

    lastTick = 99;

    $('fw-bar').style.width = '100%';
    $('fw-bar').parentNode.classList.remove('is-low');

    $('fw-time').textContent = limit;
    $('fw-time').parentNode.classList.remove('is-low');

    $('fw-r-title').textContent = 'Level Selesai! ✔';

    /* Pastikan tombol tidak muncul saat level belum dimenangkan. */
    setNextStageVisible(false);
    setRetryVisible(true);

    timer = setInterval(tick, 200);

    var pick = $('fw-pick');
    var un = S.get().findBellaWord.unlockedLevel;

    pick.textContent = '';

    for (var i = 1; i <= un; i++) {
      var o = document.createElement('option');

      o.value = i;
      o.textContent =
        'Level ' + i + ' (' +
        sizeOf(i) + '×' + sizeOf(i) + ')';

      pick.appendChild(o);
    }

    pick.value = lv;
  }

  /* ---------- Input (swipe/drag) ---------- */

  function cellAt(e) {
    var b = gridEl.getBoundingClientRect();
    var pad = 8;
    var w = (b.width - pad * 2) / n;
    var h = (b.height - pad * 2) / n;

    return {
      r: Math.min(
        n - 1,
        Math.max(0, Math.floor((e.clientY - b.top - pad) / h))
      ),
      c: Math.min(
        n - 1,
        Math.max(0, Math.floor((e.clientX - b.left - pad) / w))
      )
    };
  }

  function line(a, b) {
    var dr = b.r - a.r;
    var dc = b.c - a.c;

    if (!dr && !dc) return [a];

    var ang = Math.round(
      Math.atan2(dr, dc) / (Math.PI / 4)
    );

    var sr = Math.round(Math.sin(ang * Math.PI / 4));
    var sc = Math.round(Math.cos(ang * Math.PI / 4));

    var len = Math.max(Math.abs(dr), Math.abs(dc));
    var out = [];

    for (var i = 0; i <= len; i++) {
      var r = a.r + sr * i;
      var c = a.c + sc * i;

      if (r < 0 || r >= n || c < 0 || c >= n) {
        break;
      }

      out.push({
        r: r,
        c: c
      });
    }

    return out;
  }

  var selLen = 0;

  function paint() {
    if (sel.length > selLen) {
      A.sfx('sel', sel.length);
    }

    selLen = sel.length;

    cells.forEach(function (d) {
      d.classList.remove('is-sel');
    });

    sel.forEach(function (p) {
      cells[p.r * n + p.c].classList.add('is-sel');
    });
  }

  gridEl.addEventListener('pointerdown', function (e) {
    if (solved || pausedLeft) return;

    e.preventDefault();

    gridEl.setPointerCapture(e.pointerId);

    start = cellAt(e);
    sel = [start];

    paint();
  });

  gridEl.addEventListener('pointermove', function (e) {
    if (!start) return;

    e.preventDefault();

    sel = line(start, cellAt(e));

    paint();
  });

  gridEl.addEventListener('touchmove', function (e) {
    e.preventDefault();
  }, {
    passive: false
  });

  function release() {
    if (!start || solved) {
      start = null;
      return;
    }

    var picked = sel.slice();

    start = null;

    if (picked.length < 2) {
      sel = [];
      paint();
      return;
    }

    var word = picked.map(function (p) {
      return grid[p.r][p.c];
    }).join('');

    if (word === MAIN) {
      return success(picked);
    }

    if (extras.indexOf(word) >= 0 && !foundExtra[word]) {
      foundExtra[word] = true;

      A.sfx('bonus');

      picked.forEach(function (p) {
        cells[p.r * n + p.c].classList.add('is-found');
      });

      fb(
        'Kata bonus "' + word +
        '" ditemukan! +150 poin. Lanjut cari BELLA.'
      );

      sel = [];
      paint();

      return;
    }

    attempts++;

    A.sfx('wrong');

    $('fw-att').textContent = attempts;

    fb('✗ Salah: "' + word + '". Coba lagi.');

    picked.forEach(function (p) {
      cells[p.r * n + p.c].classList.add('is-wrong');
    });

    setTimeout(function () {
      cells.forEach(function (d) {
        d.classList.remove('is-wrong');
      });
    }, 350);

    sel = [];
    paint();
  }

  ['pointerup', 'pointercancel'].forEach(function (ev) {
    gridEl.addEventListener(ev, release);
  });

  /* ---------- Pause ---------- */

  function pauseGame() {
    if (solved || pausedLeft) return;

    pausedLeft = Math.max(1, deadline - performance.now());

    start = null;
    sel = [];

    paint();

    $('fw-pausemenu').hidden = false;
  }

  function resumeGame() {
    if (pausedLeft) {
      deadline = performance.now() + pausedLeft;
      pausedLeft = 0;
    }

    $('fw-pausemenu').hidden = true;
    $('fw-ready').hidden = true;
  }

  $('fw-pause').onclick = pauseGame;
  $('fw-resume').onclick = resumeGame;
  $('fw-go').onclick = resumeGame;

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!$('fw-ready').hidden) return;

      if (pausedLeft) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
  });

  /* ---------- Countdown ---------- */

  var lastTick = 99;

  function tick() {
    if (solved || pausedLeft) return;

    var left = Math.max(
      0,
      Math.ceil((deadline - performance.now()) / 1000)
    );

    $('fw-time').textContent = left;

    $('fw-bar').style.width =
      Math.max(
        0,
        (deadline - performance.now()) / (limit * 10)
      ) + '%';

    $('fw-bar').parentNode.classList.toggle(
      'is-low',
      left <= 10
    );

    if (left > 0 && left <= 5 && left !== lastTick) {
      lastTick = left;
      A.sfx('tick');
    }

    $('fw-time').parentNode.classList.toggle(
      'is-low',
      left <= 10
    );

    if (left <= 0) {
      timeUp();
    }
  }

  function timeUp() {
    solved = true;
    levelWon = false;

    start = null;
    sel = [];

    paint();

    clearInterval(timer);

    A.sfx('timeup');

    $('fw-bar').style.width = '0%';

    S.commit(function (d) {
      d.findBellaWord.statistics.attempts += attempts;
    });

    fb('⏰ Waktu habis!');

    $('fw-r-title').textContent = 'Waktu Habis! ⏰';

    /*
     * FIX: KALAH = Next Stage disembunyikan secara paksa.
     * Retry tetap ditampilkan.
     */
    setNextStageVisible(false);
    setRetryVisible(true);

    $('fw-r-level').textContent = lv;
    $('fw-r-time').textContent = limit + ' dtk (habis)';
    $('fw-r-att').textContent = attempts;
    $('fw-r-score').textContent = 0;

    var rec = S.get().findBellaWord.bestRecords[lv];

    $('fw-r-best').textContent = rec ? rec.score : 0;

    $('fw-r-note').textContent =
      'BELLA belum ditemukan. Coba lagi dengan grid baru.';

    $('fw-result').hidden = false;
  }

  /* ---------- Hasil ---------- */

  function success(picked) {
    solved = true;
    levelWon = true;

    clearInterval(timer);

    attempts++;

    A.sfx('win');

    var left = Math.max(
      0,
      Math.ceil((deadline - performance.now()) / 1000)
    );

    var time = Math.max(1, limit - left);
    var bonus = Object.keys(foundExtra).length * 150;

    var score = Math.max(
      100,
      400 + left * 10 - (attempts - 1) * 50 - hinted * 200
    ) + lv * 100 + bonus;

    var firstClear = false;
    var best;
    var gain = 0;

    picked.forEach(function (p) {
      cells[p.r * n + p.c].classList.add('is-found');
    });

    fb('✔ Benar! BELLA ditemukan.');

    S.commit(function (d) {
      var w = d.findBellaWord;
      var old = w.bestRecords[lv];

      firstClear = !old;

      gain = firstClear
        ? score
        : Math.max(0, score - old.score);

      w.points += gain;

      if (!old || score > old.score) {
        w.bestRecords[lv] = {
          time: time,
          attempts: attempts,
          score: score
        };
      }

      best = w.bestRecords[lv].score;

      w.bestScore = Math.max(w.bestScore, score);

      w.unlockedLevel = Math.max(
        w.unlockedLevel,
        Math.min(lv + 1, S.LIM.level)
      );

      w.statistics.solved++;
      w.statistics.attempts += attempts;

      if (firstClear) {
        d.bellaRun.walletCoins += 10 + lv * 5;
      }
    });

    $('fw-r-level').textContent = lv;
    $('fw-r-time').textContent = time + ' dtk';
    $('fw-r-att').textContent = attempts;
    $('fw-r-score').textContent = score;
    $('fw-r-best').textContent = best;

    $('fw-r-note').textContent =
      '+' + gain + ' poin hint. ' +
      (firstClear
        ? '+' + (10 + lv * 5) +
          ' coin masuk ke wallet Bella Run (hadiah clear pertama).'
        : 'Retry tidak memberi coin; hanya rekor yang diperbarui.');

    hintUI();

    /*
     * FIX: Next Stage hanya muncul setelah BELLA ditemukan.
     * Pada level terakhir, tombol tampil tetapi dinonaktifkan.
     */
    setNextStageVisible(true);

    $('fw-next').disabled = lv >= S.LIM.level;

    setRetryVisible(true);

    $('fw-result').hidden = false;
    $('fw-best').textContent = best;
  }

  /* ---------- Tombol hasil ---------- */

  $('fw-next').onclick = function () {
    /*
     * Pengaman tambahan: tombol tidak bisa dipakai
     * sebelum level benar-benar dimenangkan.
     */
    if (!solved || !levelWon) {
      setNextStageVisible(false);
      return;
    }

    if (lv >= S.LIM.level) {
      setNextStageVisible(false);
      return;
    }

    loadLevel(lv + 1);
  };

  $('fw-retry').onclick = function () {
    loadLevel(lv);
  };

  $('fw-hint').onclick = useHint;

  $('fw-restart').onclick = function () {
    loadLevel(lv);
  };

  $('fw-pick').onchange = function () {
    loadLevel(parseInt(this.value, 10));
  };

  /* ---------- Navigasi ---------- */

  document.querySelectorAll('[data-nav]').forEach(function (a) {
    a.href = a.dataset.nav === 'game'
      ? NS.config.arcadeHome
      : NS.config.websiteHome;

    a.addEventListener('click', function (e) {
      if (
        !solved &&
        (attempts > 0 || Object.keys(foundExtra).length) &&
        !window.confirm(
          'Level belum selesai. Keluar? Progres level ini tidak disimpan.'
        )
      ) {
        e.preventDefault();
      }
    });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      pauseGame();
    }
  });

  /* ---------- Inisialisasi audio ---------- */

  A.init('find-bella-word');
  A.bindToggle($('fw-mute'));
  A.startOnGesture();

  loadLevel(S.get().findBellaWord.unlockedLevel);

  /* ---------- Tutorial ---------- */

  var T = NS.Tutorial;

  T.init('find-bella-word', {
    title: 'Find Bella Word',

    onOpen: function () {
      pauseGame();
    },

    steps: [
      [
        'Cari BELLA.',
        'Geser (swipe/drag) dari huruf B sampai huruf A. Arah boleh mendatar, menurun, atau diagonal ke segala arah.'
      ],
      [
        'Waktu.',
        'Hitung mundur baru berjalan setelah kamu menekan MULAI. Makin tinggi level, waktu makin singkat (minimal 25 detik).'
      ],
      [
        'Salah?',
        'Pilihan dibatalkan dan percobaan bertambah — skor berkurang sedikit, tapi kamu bisa mencoba lagi.'
      ],
      [
        'Hint 💡.',
        'Tombol 💡 menandai 1 huruf BELLA (berurutan: B, E, L, L, A) seharga 2500 poin, maksimal 3x per level. Poin didapat dari skor level yang kamu selesaikan; tiap hint mengurangi skor level 200.'
      ],
      [
        'Bonus.',
        'Mulai level 3 ada kata bonus (BONBON, BONIVERA): +150 poin, opsional. Level selesai saat BELLA ditemukan.'
      ],
      [
        'Hadiah.',
        'Coin hanya diberikan saat pertama kali menyelesaikan sebuah level. Tombol ⏸ untuk jeda, ❓ untuk tutorial.'
      ]
    ]
  });

  document.querySelectorAll('[data-help]').forEach(T.bind);

  T.autoShow();
})();
