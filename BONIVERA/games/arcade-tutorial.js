/* Tutorial per game: tampil otomatis kecuali pemain mencentang "Saya paham". Bisa disembunyikan sementara & dibuka lagi lewat tombol ❓. */
(function () {
  'use strict';
  var NS = (window.BoniveraArcade = window.BoniveraArcade || {}), S = NS.Storage;
  var cfg = null, ov = null, box = null, lastFocus = null;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function seen() { return !!S.get().settings.tutorials[cfg.id]; }
  function close() {
    if (!ov || ov.hidden) return; var cb = ov.querySelector('input'); S.commit(function (d) { d.settings.tutorials[cfg.id] = cb.checked; }); // dicentang = tidak otomatis lagi; tidak dicentang = muncul lagi
    ov.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); if (cfg.onClose) cfg.onClose();
  }
  function open() {
    if (!cfg) return; lastFocus = document.activeElement; if (cfg.onOpen) cfg.onOpen();
    if (!ov) { ov = el('div', 'arcade-overlay arcade-tutorial'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.hidden = true; box = el('div', 'arcade-dialog'); ov.appendChild(box); document.body.appendChild(ov);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden) { e.stopPropagation(); close(); } }, true); }
    box.textContent = ''; var h = el('h2', '', 'Tutorial — ' + cfg.title); h.id = 'arcade-tut-title'; ov.setAttribute('aria-labelledby', h.id); box.appendChild(h);
    var ol = el('ol', 'arcade-steps'); cfg.steps.forEach(function (s) { var li = el('li'); li.appendChild(el('b', '', s[0] + ' ')); li.appendChild(document.createTextNode(s[1])); ol.appendChild(li); }); box.appendChild(ol);
    var lab = el('label', 'arcade-check'), cb = el('input'); cb.type = 'checkbox'; cb.checked = seen(); lab.appendChild(cb); lab.appendChild(el('span', '', 'Saya paham — jangan tampilkan otomatis lagi'));
    box.appendChild(lab); var row = el('div', 'arcade-row'), btn = el('button', 'arcade-btn', ''); btn.type = 'button';
    function ui() { btn.textContent = cb.checked ? 'SAYA PAHAM, MULAI' : 'SEMBUNYIKAN SEMENTARA'; } cb.onchange = ui; ui(); btn.onclick = close; row.appendChild(btn); box.appendChild(row);
    box.appendChild(el('p', 'arcade-note', 'Buka lagi kapan saja lewat tombol ❓ Tutorial.')); ov.hidden = false; btn.focus();
  }
  NS.Tutorial = {
    init: function (id, c) { cfg = { id: id, title: c.title, steps: c.steps, onOpen: c.onOpen, onClose: c.onClose }; },
    open: open, autoShow: function () { if (cfg && !seen()) open(); },
    bind: function (b) { b.addEventListener('click', open); }
  };
})();
