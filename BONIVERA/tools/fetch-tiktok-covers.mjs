// ============================================================
// BONIVERA — unduh cover video TikTok (jalankan sekali, ulangi tiap ada video baru)
//
//   node tools/fetch-tiktok-covers.mjs            unduh cover yang belum ada / rusak
//   node tools/fetch-tiktok-covers.mjs --force    unduh ulang SEMUA cover
//
// Yang dilakukan:
//   1) baca semua link TikTok (…/video/<id>) di folder data/
//      (bella-gallery.js, recap.js, dst.; tiktok-posters.js sendiri dilewati)
//   2) cari cover tiap video. Dicoba berurutan: oEmbed resmi TikTok -> noembed ->
//      halaman videonya. Dijalankan dari komputermu (bukan browser), jadi tidak kena CORS.
//      Permintaan yang gagal sementara (429 / 5xx / jaringan) dicoba ulang otomatis.
//   3) simpan ke assets/images/gallery/tiktok/<id>.<jpg|webp|png>
//      (format dideteksi dari isi file; file yang bukan gambar / terlalu kecil ditolak)
//   4) tulis data/tiktok-posters.js -> dipakai otomatis oleh documentation.js
//
// Setelah selesai: upload folder assets/images/gallery/tiktok/ DAN data/tiktok-posters.js
// ke hosting. Tanpa itu, website tetap jalan tapi memakai thumbnail otomatis (kurang stabil).
//
// Butuh Node.js 18+ (https://nodejs.org). Cover yang sudah ada dilewati.
// ============================================================
import { readFile, writeFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

if (typeof fetch !== "function") {
  console.error("Tool ini butuh Node.js 18 atau lebih baru (https://nodejs.org).");
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data");
const OUT_DIR = path.join(ROOT, "assets", "images", "gallery", "tiktok");
const OUT_REL = "assets/images/gallery/tiktok";
const OUT_JS = path.join(DATA_DIR, "tiktok-posters.js");

const FORCE = process.argv.includes("--force");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const KNOWN_EXTS = ["jpg", "jpeg", "webp", "png"];
const MIN_BYTES = 800;     // lebih kecil dari ini = bukan cover sungguhan
const GAP_MS = 500;        // jeda antar video supaya tidak kena batas TikTok
const TRIES = 3;           // percobaan per sumber untuk kegagalan sementara
const TIMEOUT_MS = 15000;  // batas waktu per permintaan

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const idOf = (u) => (String(u).match(/\/(?:video|photo)\/(\d+)/) || [])[1];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* ---------- 1) kumpulkan link TikTok dari file data ---------- */
// File data dijalankan di sandbox kecil (tanpa akses ke komputermu).
// `window` = sandbox itu sendiri, jadi `window.BoniveraData` dan `BoniveraData` sama.
async function collectUrls() {
  const ctx = vm.createContext({});
  ctx.window = ctx;
  ctx.self = ctx;

  let files = [];
  try {
    files = (await readdir(DATA_DIR)).filter((f) => f.endsWith(".js") && f !== "tiktok-posters.js").sort();
  } catch (e) {
    console.error(`Folder data/ tidak ditemukan di ${DATA_DIR}`);
    process.exit(1);
  }

  const read = [];
  for (const f of files) {
    try {
      vm.runInContext(await readFile(path.join(DATA_DIR, f), "utf8"), ctx, { filename: f, timeout: 5000 });
      read.push(f);
    } catch (e) {
      console.log(`(lewati data/${f}: ${e.message})`);
    }
  }
  console.log(`File data dibaca: ${read.join(", ") || "-"}`);

  const found = new Map();   // id -> link bersih (urutan = urutan di data)
  const short = new Set();   // link pendek tanpa ID

  const seen = new Set();
  (function walk(value) {
    if (typeof value === "string") {
      if (!/tiktok\.com/i.test(value)) return;
      const clean = value.split(/[?#]/)[0];
      const id = idOf(clean);
      if (id) {
        if (!found.has(id)) found.set(id, clean);
      } else if (/\/\/(?:vm|vt)\.tiktok\.com\//i.test(clean)) {
        short.add(clean);
      }
      return;
    }
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    for (const v of Array.isArray(value) ? value : Object.values(value)) walk(v);
  })(ctx.BoniveraData || {});

  return { found, short };
}

/* ---------- jaringan ---------- */
async function http(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status}`);
  return res;
}

// Coba ulang HANYA untuk kegagalan sementara (jaringan / 408 / 429 / 5xx).
// 400 / 403 / 404 dst. = percuma diulang (video privat / dihapus / diblokir).
async function retry(fn) {
  let lastErr;
  for (let i = 0; i < TRIES; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const s = e && e.status;
      const permanent = s >= 400 && s < 500 && s !== 408 && s !== 429;
      if (permanent || i === TRIES - 1) break;
      await sleep(1000 * 2 ** i + Math.random() * 300);
    }
  }
  throw lastErr;
}

/* ---------- 2) sumber cover (dicoba berurutan) ---------- */
const decodeHtml = (s) => s.replace(/&amp;/g, "&").replace(/&#x2F;/gi, "/").replace(/&quot;/g, '"');

const SOURCES = [
  [
    "oEmbed TikTok",
    async (url) => {
      const res = await http("https://www.tiktok.com/oembed?url=" + encodeURIComponent(url));
      return (await res.json()).thumbnail_url;
    },
  ],
  [
    "noembed",
    async (url) => {
      const res = await http("https://noembed.com/embed?url=" + encodeURIComponent(url));
      const json = await res.json();
      if (json.error) throw new Error(String(json.error));
      return json.thumbnail_url;
    },
  ],
  [
    "halaman video",
    async (url) => {
      const res = await http(url, { "accept-language": "en-US,en;q=0.9", accept: "text/html" });
      const html = await res.text();
      const og =
        html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      if (og) return decodeHtml(og[1]);
      const m = html.match(/"(?:originCover|cover|dynamicCover)"\s*:\s*"(https:[^"]+)"/);
      if (m) {
        try {
          return JSON.parse(`"${m[1]}"`);
        } catch (e) {
          return m[1].replace(/\\u002F/gi, "/");
        }
      }
      throw new Error("cover tidak ditemukan di halaman");
    },
  ],
];

/* ---------- 3) simpan gambar ---------- */
function sniffExt(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return "";
}

function extFromType(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("webp")) return "webp";
  if (t.includes("png")) return "png";
  return "";
}

async function saveImage(thumbUrl, id) {
  const res = await http(thumbUrl, { referer: "https://www.tiktok.com/", accept: "image/*,*/*;q=0.8" });
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) throw new Error(`gambar terlalu kecil (${buf.length} B)`);

  const type = res.headers.get("content-type");
  const ext = sniffExt(buf) || extFromType(type);
  if (!ext) throw new Error(`bukan gambar yang dikenal (content-type: ${type || "?"})`);

  await writeFile(path.join(OUT_DIR, `${id}.${ext}`), buf);

  // satu video = satu file: hapus sisa cover lama dengan ekstensi lain
  for (const other of KNOWN_EXTS) {
    if (other !== ext) await unlink(path.join(OUT_DIR, `${id}.${other}`)).catch(() => {});
  }
  return `${OUT_REL}/${id}.${ext}`;
}

async function findExisting(id) {
  for (const ext of KNOWN_EXTS) {
    try {
      const s = await stat(path.join(OUT_DIR, `${id}.${ext}`));
      if (s.size >= MIN_BYTES) return `${OUT_REL}/${id}.${ext}`;
    } catch (e) { /* belum ada */ }
  }
  return "";
}

async function fetchCover(url, id) {
  const problems = [];
  for (const [name, getThumb] of SOURCES) {
    try {
      const thumb = await retry(() => getThumb(url));
      if (!thumb) throw new Error("tidak ada thumbnail_url (video privat / dihapus?)");
      return await retry(() => saveImage(thumb, id));
    } catch (e) {
      problems.push(`${name}: ${e.message}`);
    }
  }
  throw new Error(problems.join(" | "));
}

/* ---------- jalankan ---------- */
const { found, short } = await collectUrls();
console.log(`Ditemukan ${found.size} link video TikTok${FORCE ? " (mode --force: unduh ulang semua)" : ""}.\n`);

short.forEach((u) => console.log("LEWATI (link pendek, tidak ada ID):", u));

await mkdir(OUT_DIR, { recursive: true });

const posters = {};
const failed = [];
let downloaded = 0;
let kept = 0;

for (const [id, url] of found) {
  if (!FORCE) {
    const existing = await findExisting(id);
    if (existing) {
      posters[id] = existing;
      kept++;
      continue;
    }
  }

  try {
    posters[id] = await fetchCover(url, id);
    downloaded++;
    console.log("OK    ", id);
  } catch (e) {
    // jangan kehilangan cover lama hanya karena unduh ulang gagal
    const old = await findExisting(id);
    if (old) {
      posters[id] = old;
      kept++;
      console.log("GAGAL ", id, "- cover lama dipertahankan");
    } else {
      failed.push({ id, url, reason: e.message });
      console.log("GAGAL ", id, "-", e.message);
    }
  }
  await sleep(GAP_MS);
}

/* ---------- 4) tulis data/tiktok-posters.js ---------- */
await writeFile(
  OUT_JS,
  "/*\n" +
    " * Dibuat otomatis oleh tools/fetch-tiktok-covers.mjs\n" +
    " * Jangan diedit manual — jalankan ulang tool-nya.\n" +
    " *\n" +
    " * Pemetaan: ID video TikTok -> lokasi cover\n" +
    " */\n" +
    "window.BoniveraData = window.BoniveraData || {};\n" +
    "window.BoniveraData.tiktokPosters = " + JSON.stringify(posters, null, 2) + ";\n"
);

console.log(
  `\nSelesai: ${downloaded} cover baru, ${kept} sudah ada, ${failed.length} gagal ` +
    `(total siap: ${Object.keys(posters).length}/${found.size}).`
);
if (failed.length) {
  console.log("\nYang gagal (website tetap menampilkan thumbnail otomatis / kartu bergaya untuk ini):");
  failed.forEach((f) => console.log(` - ${f.url}\n   ${f.reason}`));
  console.log("\nJalankan lagi nanti untuk mencoba ulang yang gagal.");
}
console.log("\nLangkah berikutnya: upload assets/images/gallery/tiktok/ dan data/tiktok-posters.js, lalu muat ulang galeri.");
