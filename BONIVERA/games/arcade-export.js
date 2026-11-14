/* Export/Import terenkripsi: AES-GCM (kunci dari PIN via PBKDF2). Mengubah 1 karakter kode ATAU PIN salah → gagal.
   Catatan jujur: PIN melindungi kerahasiaan & mendeteksi perubahan, tetapi limit 24 jam & data di localStorage tetap bisa dimanipulasi di sisi klien. */
(function () {
  'use strict';
  var NS = (window.BoniveraArcade = window.BoniveraArcade || {}), S = NS.Storage;
  var HEAD = 'BNVA1', MAX_BYTES = 200 * 1024, KEYS = ['bellaRun', 'findBellaWord', 'bellaFight', 'ticTacBell'], DAY = 864e5, ITER = 250000;
  var enc = new TextEncoder(), dec = new TextDecoder();
  var NAMES = { bellaRun: 'Bella Run', findBellaWord: 'Find Bella Word', bellaFight: 'Bella Fight', ticTacBell: 'Tic Tac Bell' };

  function hasCrypto() { return !!(window.crypto && crypto.subtle); }
  function okPin(p) { return /^\d{6,12}$/.test(p || ''); }
  function b64(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64(t) { var s = atob(t.replace(/-/g, '+').replace(/_/g, '/')), o = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; }
  function deriveKey(pin, salt) {
    return crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']).then(function (k) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: ITER, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function cooldownLeft() { var t = S.get().settings.lastExportAt; return Math.max(0, t + DAY - Date.now()); }

  function build(game, pin) {
    if (!hasCrypto()) return Promise.reject(new Error('Export butuh koneksi aman (HTTPS atau localhost).'));
    if (!okPin(pin)) return Promise.reject(new Error('PIN harus 6–12 digit angka.'));
    if (cooldownLeft() > 0) return Promise.reject(new Error('Export hanya bisa 1x per 24 jam.'));
    var d = S.get(), payload = {}; (game === 'all' ? KEYS : [game]).forEach(function (k) { payload[k] = d[k]; });
    var plain = enc.encode(JSON.stringify({ format: 'bonivera-arcade-backup', formatVersion: 1, game: game, payload: payload, exportedAt: Date.now() }));
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(pin, salt).then(function (key) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: enc.encode(HEAD) }, key, plain);
    }).then(function (ct) {
      var ctb = new Uint8Array(ct), all = new Uint8Array(28 + ctb.length); all.set(salt, 0); all.set(iv, 16); all.set(ctb, 28);
      return (HEAD + '-' + b64(all)).replace(/(.{72})/g, '$1\n');
    });
  }
  var lastFile = null; // simpan 15 menit agar unduhan gagal tidak menghabiskan jatah 24 jam
  function saveBlob(code, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function getLast() { return lastFile && Date.now() - lastFile.at < 15 * 60 * 1000 ? lastFile : null; }
  function download(game, pin) {
    return build(game, pin).then(function (code) {
      lastFile = { code: code, name: 'bonivera-arcade-' + game + '-' + new Date().toISOString().slice(0, 10) + '.bnva', at: Date.now() };
      saveBlob(lastFile.code, lastFile.name);
      S.commit(function (dd) { dd.settings.lastExportAt = Date.now(); }); // cooldown mulai setelah file dibuat
      return lastFile;
    });
  }

  function bellaLines(g) { return ['Highscore: ' + g.highscore, 'Wallet: ' + g.walletCoins + ' coin', 'Item: Fire Shield ' + g.inventory.fire_shield + ', Stone Shield ' + g.inventory.stone_shield + ', Protection Charm ' + g.inventory.protection_charm, 'Total run: ' + g.statistics.runs]; }
  function wordLines(g) { return ['Level terbuka: ' + g.unlockedLevel, 'Best score: ' + g.bestScore, 'Poin hint: ' + g.points, 'Rekor level tersimpan: ' + Object.keys(g.bestRecords).length]; }
  function fightLines(g) { return ['Stage tertinggi: ' + g.highestStage, 'Coin: ' + g.coins, 'Karakter: ' + Object.keys(g.owned).filter(function (k) { return g.owned[k]; }).join(', '), 'Buff: Power ' + g.buffs.power + ', Iron Skin ' + g.buffs.guard + ', Medkit ' + g.buffs.heal, 'Menang/kalah: ' + g.statistics.wins + '/' + g.statistics.losses]; }
  function ttbLines(g) { return ['Solo: menang ' + g.solo.wins + ', seri ' + g.solo.draws + ', kalah ' + g.solo.losses, 'Profil mabar: ' + (g.pairs.length ? g.pairs.map(function (p) { return p.p1 + ' vs ' + p.p2; }).join(', ') : '-')]; }
  function lines(k, g) { return k === 'bellaRun' ? bellaLines(g) : k === 'bellaFight' ? fightLines(g) : k === 'ticTacBell' ? ttbLines(g) : wordLines(g); }
  function hasProgress(k, g) { return k === 'ticTacBell' ? (g.solo.wins + g.solo.draws + g.solo.losses > 0 || g.pairs.length > 0) : k === 'bellaFight' ? (g.highestStage > 1 || g.coins > 0 || g.statistics.matches > 0 || Object.keys(g.owned).some(function (c) { return c !== 'bella' && g.owned[c]; })) : k === 'bellaRun' ? (g.highscore > 0 || g.walletCoins > 0 || g.statistics.runs > 0 || g.inventory.fire_shield + g.inventory.stone_shield + g.inventory.protection_charm > 0) : (g.unlockedLevel > 1 || g.bestScore > 0 || g.points > 0); }

  function open(file, pin) {
    var bad = function (m) { return { ok: false, error: m }; };
    if (!hasCrypto()) return Promise.resolve(bad('Import butuh koneksi aman (HTTPS atau localhost).'));
    if (!file) return Promise.resolve(bad('Tidak ada file.'));
    if ((typeof file === 'string' ? file.length : file.size) > MAX_BYTES) return Promise.resolve(bad('File terlalu besar (maks 200 KB).'));
    if (!okPin(pin)) return Promise.resolve(bad('PIN harus 6–12 digit angka.'));
    return new Promise(function (res) { if (typeof file === 'string') return res(file); var fr = new FileReader(); fr.onerror = function () { res(null); }; fr.onload = function () { res(String(fr.result)); }; fr.readAsText(file); }).then(function (text) {
      if (text === null) return bad('File tidak bisa dibaca.');
      var t = text.replace(/\s+/g, ''), fail = bad('Gagal membuka: PIN salah, atau kode rusak/diubah.');
      if (t.indexOf(HEAD + '-') !== 0) return fail;
      var body = t.slice(HEAD.length + 1), bytes;
      try { bytes = unb64(body); } catch (e) { return fail; }
      if (b64(bytes) !== body || bytes.length < 28 + 16) return fail; // kanonik: 1 karakter berubah pun ditolak
      return deriveKey(pin, bytes.slice(0, 16)).then(function (key) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(16, 28), additionalData: enc.encode(HEAD) }, key, bytes.slice(28));
      }).then(function (pt) {
        var f; try { f = JSON.parse(dec.decode(pt)); } catch (e) { return fail; }
        if (!f || f.format !== 'bonivera-arcade-backup' || f.formatVersion !== 1 || !f.payload || typeof f.payload !== 'object') return bad('Isi file tidak dikenali.');
        var keys = Object.keys(f.payload);
        if (!keys.length || keys.some(function (k) { return KEYS.indexOf(k) < 0; }) || (f.game !== 'all' && (keys.length !== 1 || keys[0] !== f.game))) return bad('Isi file tidak valid.');
        var cur = S.get(), clean = {}, items = [];
        keys.forEach(function (k) { clean[k] = S.sanitizeGame(k, f.payload[k]); items.push({ key: k, name: NAMES[k], incoming: lines(k, clean[k]), overwrite: hasProgress(k, cur[k]) ? lines(k, cur[k]) : null }); });
        return { ok: true, keys: keys, clean: clean, items: items, exportedAt: f.exportedAt };
      }, function () { return fail; });
    });
  }
  /* apply: highscore/rekor digabung (terbaik). Wallet, inventory, level DIGANTI. Cooldown spin tidak bisa di-reset lewat import. */
  function apply(parsed, selected) {
    var picked = parsed.keys.filter(function (k) { return selected.indexOf(k) >= 0; });
    if (!picked.length) return false;
    return !!S.commit(function (d) {
      picked.forEach(function (k) {
        var inc = parsed.clean[k], cur = d[k];
        if (k === 'bellaRun') {
          inc.highscore = Math.max(inc.highscore, cur.highscore); inc.statistics.bestDistance = Math.max(inc.statistics.bestDistance, cur.statistics.bestDistance);
          inc.spin = { lastClaimAt: Math.max(inc.spin.lastClaimAt, cur.spin.lastClaimAt), nextAt: Math.max(inc.spin.nextAt, cur.spin.nextAt) };
        } else if (k === 'ticTacBell') {
          // catatan menang/seri/kalah diganti utuh oleh isi file
        } else if (k === 'bellaFight') {
          inc.highestStage = Math.max(inc.highestStage, cur.highestStage);
        } else {
          inc.unlockedLevel = Math.max(inc.unlockedLevel, cur.unlockedLevel); inc.bestScore = Math.max(inc.bestScore, cur.bestScore);
          Object.keys(cur.bestRecords).forEach(function (lv) { var a = inc.bestRecords[lv], b = cur.bestRecords[lv]; if (!a || b.score > a.score) inc.bestRecords[lv] = b; });
        }
        d[k] = inc;
      });
    });
  }
  NS.Export = { build: build, download: download, open: open, apply: apply, cooldownLeft: cooldownLeft, getLast: getLast, saveBlob: saveBlob, lines: lines, okPin: okPin, hasCrypto: hasCrypto, NAMES: NAMES };
})();