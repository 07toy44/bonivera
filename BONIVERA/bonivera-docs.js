/* ============================================================
   BONIVERA — BONIVERA GALLERY PAGE LOGIC
   Menampilkan foto kegiatan BONIVERA (meetup, nobar, gathering)
   dari data/bonivera-docs.js dengan pola masonry + lightbox yang
   sama seperti documentation.js.

   Bergantung pada:
   - assets/js/shared.js        → window.Bonivera
                                   (createLightboxController, formatDateLong)
   - data/bonivera-docs.js      → window.BoniveraData.boniveraDocs
   ============================================================ */
(function () {
  "use strict";

  /* ----------------------------------------------------------
     Konfigurasi
  ---------------------------------------------------------- */
  const NEWEST_FIRST = true; // false = ikuti urutan di file data

  /* ----------------------------------------------------------
     Elemen DOM
  ---------------------------------------------------------- */
  const grid = document.getElementById("masonryGrid");
  const emptyState = document.getElementById("docEmptyState");
  const lightboxOverlay = document.getElementById("lightbox");

  if (!grid || !emptyState || !lightboxOverlay) return;

  /* ----------------------------------------------------------
     Helper
  ---------------------------------------------------------- */
  const shared = window.Bonivera || {};
  const lightbox = shared.createLightboxController
    ? shared.createLightboxController(lightboxOverlay)
    : null;

  function formatDate(value) {
    if (!value) return "";
    if (typeof shared.formatDateLong === "function") {
      return shared.formatDateLong(value);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  /* ----------------------------------------------------------
     Data
  ---------------------------------------------------------- */
  function getDocs() {
    const list = window.BoniveraData && window.BoniveraData.boniveraDocs;
    return Array.isArray(list) ? list.filter((d) => d && d.src) : [];
  }

  function buildItems() {
    const docs = getDocs();

    if (NEWEST_FIRST) {
      docs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }

    return docs.map((d) => ({
      src: d.src,
      caption: d.caption || "BONIVERA moment",
      event: d.caption || "BONIVERA moment",
      date: formatDate(d.date),
    }));
  }

  /* ----------------------------------------------------------
     Render
  ---------------------------------------------------------- */
  function createCard(item, index, items) {
    const card = createEl("button", "masonry__item reveal in-view");
    card.type = "button";
    card.setAttribute("aria-label", "Open photo: " + item.caption);
    // Dipakai CSS untuk mengisi ruang kosong bingkai dengan foto blur
    card.style.setProperty("--photo", "url(" + JSON.stringify(item.src) + ")");

    const img = createEl("img");
    img.src = item.src;
    img.alt = item.caption;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 600;
    img.height = 750;
    // Foto gagal dimuat → sembunyikan kartu agar grid tidak berlubang
    img.addEventListener("error", () => card.remove());

    const zoom = createEl("span", "masonry__zoom", "⤢");
    zoom.setAttribute("aria-hidden", "true");

    const overlay = createEl("span", "masonry__overlay");
    overlay.appendChild(createEl("span", "masonry__caption", item.caption));
    if (item.date) {
      overlay.appendChild(createEl("span", "masonry__date", item.date));
    }

    card.append(img, zoom, overlay);

    card.addEventListener("click", () => {
      if (lightbox) lightbox.open(items, index, { title: item.event });
    });

    return card;
  }

  function renderGrid() {
    const items = buildItems();

    grid.replaceChildren();
    emptyState.hidden = items.length > 0;
    if (!items.length) return;

    const fragment = document.createDocumentFragment();
    items.forEach((item, i) => fragment.appendChild(createCard(item, i, items)));
    grid.appendChild(fragment);
  }

  function setFooterYear() {
    const el = document.getElementById("bonivera-year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ----------------------------------------------------------
     Init
  ---------------------------------------------------------- */
  function init() {
    renderGrid();
    setFooterYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();