// Generates the app icons and iOS launch images.
// Run: NODE_PATH="$(npm root -g)" node tools/make-icons.cjs   (needs Playwright + Chromium)
// The icon is the product's face: two round eyes on Night Ink. No mouth.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'assets');
const INK = '#171816';
const SPLASH = [18, 19, 17]; // #121311
const EYE = '#F2EEE7';

function iconHTML(size, pad = 1) {
  const s = size * pad;
  const w = 0.2 * s;
  const h = 0.245 * s;
  const dx = 0.16 * s;
  const eye = (x) => `<div style="position:absolute;left:${size / 2 + x - w / 2}px;top:${size / 2 - h / 2}px;width:${w}px;height:${h}px;border-radius:50%;background:${EYE};box-shadow:0 0 ${0.1 * s}px rgba(250,248,244,.32)"></div>`;
  return `<html><body style="margin:0"><div style="position:relative;width:${size}px;height:${size}px;overflow:hidden;background:radial-gradient(circle at 50% 42%, #24251F 0%, ${INK} 62%)">${eye(-dx)}${eye(dx)}</div></body></html>`;
}

// Minimal PNG writer for solid-colour launch images.
function crc32(buf) {
  let c;
  const table = crc32.t || (crc32.t = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function solidPNG(w, h, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

(async () => {
  fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'splash'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shots = [
    ['icons/apple-touch-icon.png', 180, 1],
    ['icons/icon-192.png', 192, 1],
    ['icons/icon-512.png', 512, 1],
    ['icons/icon-maskable-512.png', 512, 0.82],
  ];
  for (const [file, size, pad] of shots) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(iconHTML(size, pad));
    await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: size, height: size } });
  }
  await browser.close();

  const splash = [[1320, 2868], [1206, 2622], [1290, 2796], [1179, 2556], [1284, 2778], [1170, 2532], [1125, 2436], [828, 1792], [750, 1334]];
  for (const [w, h] of splash) fs.writeFileSync(path.join(OUT, 'splash', `splash-${w}x${h}.png`), solidPNG(w, h, SPLASH));

  fs.writeFileSync(path.join(OUT, 'icons', 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${INK}"/><ellipse cx="21.8" cy="32" rx="6.4" ry="7.8" fill="${EYE}"/><ellipse cx="42.2" cy="32" rx="6.4" ry="7.8" fill="${EYE}"/></svg>\n`);
  console.log('icons and launch images written');
})();
