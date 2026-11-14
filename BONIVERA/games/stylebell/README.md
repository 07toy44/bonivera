# STYLEBELL — dress-up karakter (BONIVERA Arcade)

Buka dari menu arcade (kartu **StyleBell**) atau langsung `stylebell/index.html`. Tanpa build step; tidak memakai storage arcade (tidak ada progres yang disimpan).

## Isi folder
- `index.html`, `style.css`, `game.js` — UI + mesin layer.
- `assets/pack.js` — seluruh aset sebagai data-URI (canvas tidak *tainted*, jadi Download PNG aman walau dibuka via `file://`).
- `assets/cut/` — hasil cutting per elemen: `pose/` (`over`, `shirt`, `pants`, `face` per pose), `outfit/`, `fx/`, `bg/`.
- `thumb.png` — thumbnail kartu arcade.
- `tools/` — pipeline Python. Taruh 4 PNG sumber di `tools/src/`, lalu dari folder `tools/`: `python cut_chars.py && python cut_outfits.py && python build_assets.py` (butuh numpy, scipy, Pillow).

## Urutan layer (bawah → atas)
latar → bayangan → celana (diwarnai) → kaos dalam (diwarnai mengikuti outfit) → outfit → badan/rambut/tangan → wajah (ekspresi) → elemen → watermark `BoniveraArcade`.

## Anchor & penyesuaian
Setiap pose punya anchor sendiri (manifest di `pack.js`): pusat kepala `hc`, lebar rambut `hws`, garis mata `ey`, pusat/lebar torso `tc`/`tw`, garis kerah `cy`, bentuk area wajah. Outfit di-*warp* ke proporsi chibi (torso 180 px, lengan dipadatkan, rok dipendekkan); skala per pose = `tw` pose / 180.
Penyesuaian khusus kombinasi ada di `game.js`: `ADJ[outfit][pose] = [dx, dy, skala]` dan `CLIP` (pose lengan terangkat: lengan outfit dipotong, lengan asli berwarna senada yang tampil).
Ekspresi dipasang lewat garis mata + pusat kepala; pose 11 & 14 (mulut tertutup bantal/cup) hanya menerima/mengganti pita mata.
