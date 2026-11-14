/* ==================================================
   BONIVERA — ANTI INSPECT ELEMENT
   ================================================== */

(function () {
  "use strict";

  // Blokir shortcut keyboard
  document.addEventListener("keydown", function (e) {
    const key = e.key.toLowerCase();

    // F12
    

    // Ctrl + Shift + I / J / C
    if (
      e.ctrlKey &&
      e.shiftKey &&
      ["i", "j", "c"].includes(key)
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + U (View Source)
    if (e.ctrlKey && key === "u") {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + S (Save Page)
    if (e.ctrlKey && key === "s") {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + P (Print)
    if (e.ctrlKey && key === "p") {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

  }, true);

  // Blokirkan klik kanan
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

})();