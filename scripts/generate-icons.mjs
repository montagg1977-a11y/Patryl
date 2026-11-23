// Renders the traffic-light app icons to PNG without native dependencies.
// Run: node scripts/generate-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT_DIR = fileURLToPath(new URL('../public/icons/', import.meta.url));

const BACKGROUND = [9, 9, 11];
const HOUSING = [39, 39, 42];
const HOUSING_EDGE = [63, 63, 70];
const LIGHTS = [
  { y: -0.215, color: [239, 68, 68] },
  { y: 0, color: [234, 179, 8] },
  { y: 0.215, color: [34, 197, 94] },
];

// Geometry in units of icon size, centered at 0. Everything stays inside the
// maskable safe zone (circle of radius 0.4).
const HOUSING_HALF_W = 0.165;
const HOUSING_HALF_H = 0.345;
const HOUSING_RADIUS = 0.09;
const EDGE_WIDTH = 0.012;
const LIGHT_RADIUS = 0.082;
const GLOW_RADIUS = 0.13;

function roundedRectSdf(x, y, hw, hh, r) {
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function blend(base, top, alpha) {
  return base.map((c, i) => c + (top[i] - c) * alpha);
}

function shade(x, y) {
  let color = BACKGROUND;
  const housing = roundedRectSdf(x, y, HOUSING_HALF_W, HOUSING_HALF_H, HOUSING_RADIUS);
  if (housing <= 0) {
    color = housing > -EDGE_WIDTH ? HOUSING_EDGE : HOUSING;
  }
  for (const light of LIGHTS) {
    const d = Math.hypot(x, y - light.y);
    if (d <= LIGHT_RADIUS) {
      const highlight = Math.max(0, 1 - Math.hypot(x + 0.025, y - light.y + 0.025) / LIGHT_RADIUS);
      color = blend(light.color, [255, 255, 255], highlight * 0.35);
    } else if (d <= GLOW_RADIUS && housing <= -EDGE_WIDTH) {
      const t = 1 - (d - LIGHT_RADIUS) / (GLOW_RADIUS - LIGHT_RADIUS);
      color = blend(color, light.color, t * t * 0.28);
    }
  }
  return color;
}

function render(size, samples = 4) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    const row = py * (size * 4 + 1);
    raw[row] = 0;
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size - 0.5;
          const y = (py + (sy + 0.5) / samples) / size - 0.5;
          const c = shade(x, y);
          acc[0] += c[0];
          acc[1] += c[1];
          acc[2] += c[2];
        }
      }
      const n = samples * samples;
      const o = row + 1 + px * 4;
      raw[o] = Math.round(acc[0] / n);
      raw[o + 1] = Math.round(acc[1] / n);
      raw[o + 2] = Math.round(acc[2] / n);
      raw[o + 3] = 255;
    }
  }
  return encodePng(size, size, raw);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
]) {
  writeFileSync(OUT_DIR + name, render(size));
  console.log(`generated public/icons/${name}`);
}
