// Generates the app icons and iOS launch images from the offhours moon.
// Run: node tools/make-icons.cjs   (pure Node, no dependencies)
// The mark is the brand crescent with the blue-to-orange gradient on night ink.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets');
const INK = [10, 16, 38]; // #0A1026
const STOPS = [[0, [139, 160, 255]], [0.4, [214, 197, 214]], [0.7, [255, 214, 166]], [1, [255, 152, 87]]];

/* ---- the crescent, flattened from the brand path (viewBox origin 436,426) ---- */
const SEG = [
  [[677, 432], [540, 450], [438, 540], [438, 640]],
  [[438, 640], [438, 745], [530, 830], [632, 830]],
  [[632, 830], [713, 830], [785, 785], [823, 717]],
  [[823, 717], [790, 733], [765, 737], [745, 737]],
  [[745, 737], [650, 737], [580, 690], [580, 590]],
  [[580, 590], [580, 520], [625, 455], [677, 432]],
];
const poly = [];
for (const [p0, p1, p2, p3] of SEG) {
  for (let i = 0; i < 40; i++) {
    const t = i / 40, u = 1 - t;
    poly.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
}
const BX = [438, 823], BY = [430, 830];
const inside = (x, y) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const lerp = (a, b, t) => a + (b - a) * t;
function grad(t) {
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1], [t1, c1] = STOPS[i];
      const k = (t - t0) / (t1 - t0);
      return c0.map((v, n) => lerp(v, c1[n], k));
    }
  }
  return STOPS[STOPS.length - 1][1];
}

/** Raster an icon: night ink with a faint horizon glow, the moon at `scale` of the height. */
function icon(size, scale) {
  const buf = Buffer.alloc(size * size * 3);
  const h = scale * size;
  const w = h * ((BX[1] - BX[0]) / (BY[1] - BY[0]));
  const ox = (size - w) / 2, oy = (size - h) / 2 - size * 0.01;
  const SS = 3;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // background: ink with an orange glow rising from the bottom and a blue one top right
      const gx = px / size, gy = py / size;
      const glow = Math.max(0, 1 - Math.hypot((gx - 0.5) / 0.9, (gy - 1.12) / 0.62));
      const blue = Math.max(0, 1 - Math.hypot((gx - 0.9) / 0.8, (gy + 0.05) / 0.6));
      let r = INK[0] + glow * glow * 90 + blue * 14, g = INK[1] + glow * glow * 46 + blue * 22, b = INK[2] + glow * glow * 18 + blue * 52;
      let cov = 0, cr = 0, cg = 0, cb = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ux = BX[0] + ((px + (sx + 0.5) / SS - ox) / w) * (BX[1] - BX[0]);
          const uy = BY[0] + ((py + (sy + 0.5) / SS - oy) / h) * (BY[1] - BY[0]);
          if (ux >= BX[0] && ux <= BX[1] && uy >= BY[0] && uy <= BY[1] && inside(ux, uy)) {
            cov++;
            const c = grad((ux - BX[0]) / (BX[1] - BX[0]));
            cr += c[0]; cg += c[1]; cb += c[2];
          }
        }
      }
      if (cov) {
        const a = cov / (SS * SS);
        r = lerp(r, cr / cov, a); g = lerp(g, cg / cov, a); b = lerp(b, cb / cov, a);
      }
      const o = (py * size + px) * 3;
      buf[o] = Math.min(255, r); buf[o + 1] = Math.min(255, g); buf[o + 2] = Math.min(255, b);
    }
  }
  return { w: size, h: size, buf };
}

/* ---- a minimal PNG writer ---- */
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
function png(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const stride = w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgb(y).copy(raw, y * (stride + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const fromBuf = (img) => png(img.w, img.h, (y) => img.buf.subarray(y * img.w * 3, (y + 1) * img.w * 3));
/** Launch image: ink with a soft sunset at the bottom, so the splash continues from it. */
function launch(w, h) {
  return png(w, h, (y) => {
    const row = Buffer.alloc(w * 3);
    for (let x = 0; x < w; x++) {
      const gx = x / w, gy = y / h;
      const glow = Math.max(0, 1 - Math.hypot((gx - 0.5) / 0.9, (gy - 1.14) / 0.5));
      const blue = Math.max(0, 1 - Math.hypot((gx - 0.88) / 0.8, (gy + 0.06) / 0.42));
      row[x * 3] = Math.min(255, INK[0] + glow * glow * 70 + blue * 12);
      row[x * 3 + 1] = Math.min(255, INK[1] + glow * glow * 36 + blue * 18);
      row[x * 3 + 2] = Math.min(255, INK[2] + glow * glow * 14 + blue * 42);
    }
    return row;
  });
}

fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'splash'), { recursive: true });
[['icons/apple-touch-icon.png', 180, 0.6], ['icons/icon-192.png', 192, 0.6], ['icons/icon-512.png', 512, 0.6], ['icons/icon-maskable-512.png', 512, 0.46]]
  .forEach(([f, s, k]) => fs.writeFileSync(path.join(OUT, f), fromBuf(icon(s, k))));
[[1320, 2868], [1206, 2622], [1290, 2796], [1179, 2556], [1284, 2778], [1170, 2532], [1125, 2436], [828, 1792], [750, 1334]]
  .forEach(([w, h]) => fs.writeFileSync(path.join(OUT, 'splash', `splash-${w}x${h}.png`), launch(w, h)));

const d = 'M677 432C540 450 438 540 438 640c0 105 92 190 194 190 81 0 153-45 191-113-33 16-58 20-78 20-95 0-165-47-165-147 0-70 45-135 97-158z';
fs.writeFileSync(path.join(OUT, 'icons', 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#8BA0FF"/><stop offset=".4" stop-color="#D6C5D6"/><stop offset=".7" stop-color="#FFD6A6"/><stop offset="1" stop-color="#FF9857"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#0A1026"/><path transform="translate(-24.75 -24.7) scale(.09)" d="${d}" fill="url(#g)"/></svg>
`);
console.log('icons and launch images written');
