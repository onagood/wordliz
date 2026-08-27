// Draws the Wordliz icon and writes real PNGs — no image library, no browser.
// The mark is one green tile with the 3D lip the board tiles have, on linen,
// carrying a W. The letter is drawn as four stroked segments rather than set in
// Rubik: a font W picks up hinting mush at 16px, and the geometry is the point.
const fs = require('fs');
const zlib = require('zlib');

const LINEN = [0xF8, 0xF2, 0xE4];
const FACE = [0x3E, 0x7C, 0x5F];
const LIP = [0x2A, 0x5A, 0x43];
const INK = [0xF6, 0xF9, 0xF0];

const SS = 4;                       // supersampling factor, for clean edges

// distance from p to segment ab
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
  const L = vx * vx + vy * vy;
  let t = L ? (wx * vx + wy * vy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = px - (ax + t * vx), dy = py - (ay + t * vy);
  return Math.hypot(dx, dy);
}
// signed distance to a rounded rectangle (negative inside)
function roundRect(px, py, x, y, w, h, r) {
  const cx = Math.abs(px - (x + w / 2)) - (w / 2 - r);
  const cy = Math.abs(py - (y + h / 2)) - (h / 2 - r);
  const ax = Math.max(cx, 0), ay = Math.max(cy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(cx, cy), 0) - r;
}

function render(N) {
  const buf = Buffer.alloc(N * N * 4);
  // tile geometry, as fractions of the canvas
  const inset = 0.085 * N;
  const tx = inset, tw = N - inset * 2;
  const lip = 0.075 * N;                 // thickness of the darker bottom edge
  const ty = inset, th = N - inset * 2;
  const rad = 0.22 * tw;
  // the W, in tile-local fractions
  const P = [[0.15, 0.26], [0.33, 0.75], [0.50, 0.42], [0.67, 0.75], [0.85, 0.26]];
  const stroke = 0.115 * tw;
  const pts = P.map(([a, b]) => [tx + a * tw, ty + b * (th - lip)]);

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
          let c = LINEN;
          // dark lip first, then the face shifted up over it
          if (roundRect(px, py, tx, ty, tw, th, rad) < 0) c = LIP;
          if (roundRect(px, py, tx, ty, tw, th - lip, rad) < 0) c = FACE;
          // the letter, only where it sits on the face
          if (c === FACE) {
            let d = Infinity;
            for (let i = 0; i < pts.length - 1; i++)
              d = Math.min(d, segDist(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
            if (d < stroke / 2) c = INK;
          }
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS, o = (y * N + x) * 4;
      buf[o] = Math.round(r / n); buf[o + 1] = Math.round(g / n); buf[o + 2] = Math.round(b / n); buf[o + 3] = 255;
    }
  }
  return buf;
}

// --- minimal PNG writer ---
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (const x of b) c = CRC[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, cr]);
}
function png(rgba, N) {
  const raw = Buffer.alloc((N * 4 + 1) * N);
  for (let y = 0; y < N; y++) {
    raw[y * (N * 4 + 1)] = 0;                                  // filter: none
    rgba.copy(raw, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))]);
}

const ROOT = 'C:/Users/AI/Documents/Wordliz';
for (const N of [192, 512]) {
  const out = png(render(N), N);
  fs.writeFileSync(`${ROOT}/icon-${N}.png`, out);
  console.log(`icon-${N}.png  ${Math.round(out.length / 1024 * 10) / 10} KB`);
}
