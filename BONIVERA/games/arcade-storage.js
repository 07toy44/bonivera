/* Penyimpanan bersama (localStorage). Satu key, data dipisah per game, divalidasi saat dibaca. */
(function () {
  'use strict';
  var NS = (window.BoniveraArcade = window.BoniveraArcade || {});
  var KEY = 'bonivera.arcade.v1', VERSION = 1;
  var LIM = { score: 1e7, coins: 1e6, qty: 99, level: 50, count: 1e6, time: 1e6, ts: 4e12, stage: 999 };
  var ITEM_IDS = ['fire_shield', 'stone_shield', 'protection_charm'];
  var memory = null; // fallback bila localStorage tidak tersedia

  function n(v, max) { v = Math.floor(Number(v)); return isFinite(v) ? Math.min(Math.max(v, 0), max) : 0; }
  function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }

  function cleanRun(r) {
    r = obj(r); var inv = obj(r.inventory), st = obj(r.statistics), out = { inventory: {} };
    out.highscore = n(r.highscore, LIM.score); out.walletCoins = n(r.walletCoins, LIM.coins);
    ITEM_IDS.forEach(function (id) { out.inventory[id] = n(inv[id], LIM.qty); });
    out.equipped = null; // tidak dipakai lagi (item diaktifkan saat run)
    var sp = obj(r.spin); out.spin = { lastClaimAt: n(sp.lastClaimAt, LIM.ts), nextAt: n(sp.nextAt, LIM.ts) };
    out.statistics = { runs: n(st.runs, LIM.count), totalCoins: n(st.totalCoins, LIM.count), bestDistance: n(st.bestDistance, LIM.score), spins: n(st.spins, LIM.count) };
    return out;
  }
  var CHAR_IDS = ['bella', 'bonbon', 'ivera', 'noir'], BUFF_IDS = ['power', 'guard', 'heal'], GAME_IDS = ['bella-run', 'find-bella-word', 'bella-fight', 'tic-tac-bell'], DIFFS = ['easy', 'normal', 'hard'];
  function cleanFight(f) {
    f = obj(f); var ow = obj(f.owned), bf = obj(f.buffs), st = obj(f.statistics), out = { owned: {}, buffs: {} };
    out.highestStage = Math.max(1, n(f.highestStage, LIM.stage)); out.coins = n(f.coins, LIM.coins);
    CHAR_IDS.forEach(function (id) { out.owned[id] = id === 'bella' || !!ow[id]; });
    out.selected = CHAR_IDS.indexOf(f.selected) >= 0 && out.owned[f.selected] ? f.selected : 'bella';
    BUFF_IDS.forEach(function (id) { out.buffs[id] = n(bf[id], LIM.qty); });
    out.statistics = { matches: n(st.matches, LIM.count), wins: n(st.wins, LIM.count), losses: n(st.losses, LIM.count) };
    return out;
  }
  function cleanName(s) { return typeof s === 'string' ? s.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12) : ''; }
  function cleanTTB(t) {
    t = obj(t); var so = obj(t.solo), out = { pairs: [] }, ids = {};
    out.solo = { wins: n(so.wins, LIM.count), draws: n(so.draws, LIM.count), losses: n(so.losses, LIM.count), streak: n(so.streak, LIM.count), bestStreak: n(so.bestStreak, LIM.count) };
    (Array.isArray(t.pairs) ? t.pairs : []).slice(0, 8).forEach(function (p, i) {
      p = obj(p); var a = cleanName(p.p1), b = cleanName(p.p2); if (!a || !b || a.toLowerCase() === b.toLowerCase()) return;
      var id = typeof p.id === 'string' ? p.id.replace(/[^a-z0-9_]/gi, '').slice(0, 16) : ''; if (!id || ids[id]) id = 'p' + i + Math.random().toString(36).slice(2, 6); ids[id] = 1;
      out.pairs.push({ id: id, p1: a, p2: b, p1Wins: n(p.p1Wins, LIM.count), p2Wins: n(p.p2Wins, LIM.count), draws: n(p.draws, LIM.count) });
    });
    out.difficulty = DIFFS.indexOf(t.difficulty) >= 0 ? t.difficulty : 'normal'; return out;
  }
  function cleanWord(w) {
    w = obj(w); var st = obj(w.statistics), rec = obj(w.bestRecords), out = { bestRecords: {} };
    out.unlockedLevel = Math.max(1, n(w.unlockedLevel, LIM.level)); out.bestScore = n(w.bestScore, LIM.score); out.points = n(w.points, LIM.score);
    Object.keys(rec).slice(0, LIM.level).forEach(function (k) {
      var lv = n(k, LIM.level), x = obj(rec[k]); if (lv < 1) return;
      out.bestRecords[lv] = { time: n(x.time, LIM.time), attempts: n(x.attempts, LIM.count), score: n(x.score, LIM.score) };
    });
    out.statistics = { solved: n(st.solved, LIM.count), attempts: n(st.attempts, LIM.count), hintsUsed: n(st.hintsUsed, LIM.count) };
    return out;
  }
  function sanitizeGame(key, v) { return key === 'bellaRun' ? cleanRun(v) : key === 'findBellaWord' ? cleanWord(v) : key === 'bellaFight' ? cleanFight(v) : key === 'ticTacBell' ? cleanTTB(v) : null; }
  function tut(t) { t = obj(t); var o = {}; GAME_IDS.forEach(function (id) { o[id] = !!t[id]; }); return o; }
  function sanitize(d) {
    d = obj(d);
    return { version: VERSION, profileId: typeof d.profileId === 'string' ? d.profileId.slice(0, 32) : 'p_' + Math.random().toString(36).slice(2, 10),
      bellaRun: cleanRun(d.bellaRun), findBellaWord: cleanWord(d.findBellaWord), bellaFight: cleanFight(d.bellaFight), ticTacBell: cleanTTB(d.ticTacBell), settings: { muted: !!obj(d.settings).muted, lastExportAt: n(obj(d.settings).lastExportAt, LIM.ts), tutorials: tut(obj(d.settings).tutorials) } };
  }
  function fail(msg) { window.dispatchEvent(new CustomEvent('arcade:storage-error', { detail: msg })); }
  function read() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { if (memory) return sanitize(memory); fail('Penyimpanan browser tidak tersedia. Progres tidak akan bertahan.'); return sanitize(null); }
    if (!raw) return sanitize(null);
    try { return sanitize(JSON.parse(raw)); } catch (e) { // data rusak: simpan salinan, mulai bersih
      try { window.localStorage.setItem(KEY + '.corrupt', raw); } catch (_) {}
      fail('Data tersimpan rusak dan direset. Salinan rusak disimpan terpisah.'); return sanitize(null);
    }
  }
  function write(d) {
    memory = d;
    try { window.localStorage.setItem(KEY, JSON.stringify(d)); return true; }
    catch (e) { fail('Gagal menyimpan data (penyimpanan penuh atau diblokir).'); return false; }
  }
  NS.Storage = {
    ITEM_IDS: ITEM_IDS, LIM: LIM, VERSION: VERSION, sanitizeGame: sanitizeGame,
    get: function () { return read(); },
    /* commit: baca data TERBARU, ubah via mutator, validasi, tulis. Aman terhadap tab/game lain. */
    commit: function (mutator) { var d = read(); mutator(d); d = sanitize(d); return write(d) ? d : null; }
  };
})();