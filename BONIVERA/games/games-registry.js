/* Registry + konfigurasi route. Tambah game baru cukup dengan menambah 1 objek di BoniveraArcade.games. */
(function () {
  'use strict';
  var NS = (window.BoniveraArcade = window.BoniveraArcade || {});
  var base = new URL('.', document.currentScript.src); // folder games/ (route aman walau halaman beda direktori)
  NS.config = {
    arcadeHome: new URL('arcade.html', base).href,
    websiteHome: new URL('../home.html', base).href // ubah jika home website berada di path lain
  };
  NS.games = [
    { gameId: 'bella-run', dataKey: 'bellaRun', title: 'Bella Run', status: 'available',
      description: 'Platformer 2D: lompati api, batu, dan jurang. Kumpulkan coin & beli perisai.',
      thumbnail: '../assets/thumb-bella-run.png', route: 'bella-run/index.html',
      supportedFeatures: ['highscore', 'coins', 'shop', 'export'] },
    { gameId: 'find-bella-word', dataKey: 'findBellaWord', title: 'Find Bella Word', status: 'available',
      description: 'Geser huruf untuk menemukan kata BELLA. Grid makin besar tiap level.',
      thumbnail: '../assets/thumb-find-bella-word.png', route: 'find-bella-word/index.html',
      supportedFeatures: ['levels', 'records', 'export'] },
    { gameId: 'bella-fight', dataKey: 'bellaFight', title: 'Bella Fight', status: 'available',
      description: 'Duel ala Shadow Fight versi ringan: ganti karakter, beli buff, naiki stage.',
      thumbnail: '../assets/thumb-bella-fight.png', route: 'bella-fight/index.html',
      supportedFeatures: ['stages', 'characters', 'buffs', 'shop', 'export'] },
    { gameId: 'tic-tac-bell', dataKey: 'ticTacBell', title: 'Tic Tac Bell', status: 'available',
      description: 'XOXO klasik lawan bot (3 tingkat kesulitan) atau main berdua di satu perangkat.',
      thumbnail: '../assets/thumb-tic-tac-bell.png', route: 'tic-tac-bell/index.html',
      supportedFeatures: ['difficulty', 'multiplayer', 'records', 'export'] },
    { gameId: 'stylebell', dataKey: null, title: 'StyleBell', status: 'available',
      description: 'Dress-up Bella: ganti ekspresi, pose, outfit & warna celana, pilih latar theater, lalu unduh PNG.',
      thumbnail: 'stylebell/thumb.png', route: 'stylebell/index.html',
      supportedFeatures: ['customize', 'outfits', 'backgrounds', 'download'] },
    { gameId: 'next-game', dataKey: null, title: 'Game Berikutnya', status: 'coming-soon',
      description: 'Mini game baru sedang disiapkan.', thumbnail: '', route: '', supportedFeatures: [] }
  ];
  /* Audio: isi salah satu per game. url = file audio online (mp3/ogg, CORS tidak diperlukan); youtube = ID video (pilih video yang boleh di-embed dan hak pakainya jelas).
     Kosong = musik chiptune sintetis bawaan. SFX selalu disintesis, tanpa file. */
  NS.audio = { musicVolume: 35, tracks: { 'bella-run': { url: '', youtube: '' }, 'find-bella-word': { url: '', youtube: '' }, 'bella-fight': { url: '', youtube: '' }, 'tic-tac-bell': { url: '', youtube: '' } } };
  NS.resolve = function (route) { return new URL(route, base).href; };
})();