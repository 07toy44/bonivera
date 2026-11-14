/* ============================================================
   BONIVERA — BONIVERA (IDENTITY) PAGE LOGIC
   ============================================================ */
(function () {
  "use strict";

  // Edit teks "desc" di sini kalau mau mengubah penjelasan tiap hashtag
  const OFFICIAL_HASHTAGS = [
    {
      tag: "#SkateToDream",
      desc: "Hashtag utama BONIVERA. Simbol perjalanan meluncur bersama menuju mimpi Bella, dengan setiap langkah menjadi bukti dedikasi, loyalitas, dan harapan."
    },
    {
      tag: "#BellaGasTerus",
      desc: "Ajakan untuk selalu menyemangati Bella agar terus melangkah maju tanpa menyerah. Dipakai untuk dukungan di setiap pencapaian dan tantangan."
    },
    {
      tag: "#BellMorning",
      desc: "Sapaan pagi untuk Bella. Cara BONIVERA memulai hari dengan semangat dan mengirim energi positif sejak pagi."
    },
    {
      tag: "#BonNight",
      desc: "Sapaan malam untuk Bella. “Bon” diambil dari nama “Bonita”, sebagai ucapan selamat malam dan selamat beristirahat setelah hari yang panjang."
    },
    {
      tag: "#BellDaily",
      desc: "Untuk membagikan keseharian dan momen-momen Bella, supaya setiap kebersamaan dengannya terdokumentasi dan mudah dikenang."
    },
        {
      tag: "#BellNGreat",
      desc: "Merayakan momen pertemuan langsung antara Bella dan penggemarnya, dari sapaan hangat, obrolan singkat, sampai senyum yang tak terlupakan. Digunakan ketika Bella sedang melakukan sesi Meet & Greet dengan fans."
    },
    {
      tag: "#Bell2Gether",
      desc: "Melambangkan kedekatan dan kebersamaan di setiap foto yang diambil bersama Bella, dengan setiap pose menyimpan kenangan yang bisa dikenang selamanya. Digunakan ketika Bella sedang melakukan sesi 2shoot dengan fans."
    },
    {
      tag: "#ChrisTalkBella",
      desc: "Ruang obrolan dan diskusi hangat tentang Bella, tempat penggemar bisa berbicara langsung, bertukar cerita, dan saling mengenal lebih dekat. Digunakan ketika sedang video call (VC) dengan Bella."
    },
    {
      tag: "#BellCerita",
      desc: "Wadah untuk membagikan cerita, kenangan, dan pengalaman bersama Bella, dari momen kecil sampai yang paling berkesan, digunakan ketika bella sedang live streaming"
    },
    {
      tag: "#BellAnswer",
      desc: "Untuk sesi tanya jawab dan jawaban dari Bella, agar penggemar bisa lebih dekat dan saling mengenal, digunakan ketika membalas pesan PM bella"
    }
  ];

  function renderHashtagList() {
    const list = document.getElementById("hashtagList");
    if (!list) return;

    list.innerHTML = "";
    OFFICIAL_HASHTAGS.forEach((item) => {
      const card = document.createElement("div");
      card.className = "hashtag-item";

      const head = document.createElement("div");
      head.className = "hashtag-item__head";

      const tag = document.createElement("span");
      tag.className = "tag hashtag-chip";
      tag.textContent = item.tag;

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "hashtag-item__copy";
      copy.textContent = "Copy";
      copy.setAttribute("aria-label", "Salin " + item.tag);
      copy.addEventListener("click", async () => {
        const ok = await window.Bonivera.copyText(item.tag);
        window.Bonivera.showToast(ok ? item.tag + " copied!" : "Couldn't copy — please copy manually.");
      });

      head.appendChild(tag);
      head.appendChild(copy);

      const desc = document.createElement("p");
      desc.className = "hashtag-item__desc";
      desc.textContent = item.desc;

      card.appendChild(head);
      card.appendChild(desc);
      list.appendChild(card);
    });
  }

  function initHashtagCopy() {
    const btn = document.getElementById("copyHashtagsBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const ok = await window.Bonivera.copyText(OFFICIAL_HASHTAGS.map((h) => h.tag).join(" "));
      window.Bonivera.showToast(ok ? "Hashtags copied!" : "Couldn't copy — please copy manually.");
    });
  }

  function init() {
    renderHashtagList();
    initHashtagCopy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();