#!/usr/bin/env node
// Gera os ícones PNG do PWA (fundo noite + sparkle dourado) sem depender de
// ferramenta de imagem: desenha por amostragem e codifica PNG na mão.
// Uso: node scripts/gen-icons.mjs  →  public/icons/*.png

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

// ── encoder PNG mínimo (RGBA 8-bit, sem filtro) ──

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── desenho ──

const BG_TOP = [0x07, 0x0b, 0x26];
const BG_BOT = [0x1d, 0x15, 0x50];
const GOLD = [0xf6, 0xc4, 0x53];
const GOLD_LIGHT = [0xff, 0xd9, 0x7a];
const LILAC = [0x8f, 0x7b, 0xff];

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// sparkle de 4 pontas: |x|^½ + |y|^½ ≤ r^½
const inSparkle = (dx, dy, r) => Math.sqrt(Math.abs(dx)) + Math.sqrt(Math.abs(dy)) <= Math.sqrt(r);

function sample(u, v) {
  // u,v em [0,1]; fundo em gradiente vertical com brilho suave atrás da estrela
  let c = mix(BG_TOP, BG_BOT, v);
  const gd = Math.hypot(u - 0.5, v - 0.5);
  c = mix(c, GOLD, Math.max(0, 0.16 * (1 - gd / 0.42)));

  if (inSparkle(u - 0.5, v - 0.5, 0.34)) {
    // leve gradiente interno pro dourado não ficar chapado
    return mix(GOLD_LIGHT, GOLD, Math.min(1, Math.hypot(u - 0.5, v - 0.45) / 0.34));
  }
  if (inSparkle(u - 0.76, v - 0.22, 0.075)) return GOLD_LIGHT;
  if (Math.hypot(u - 0.24, v - 0.76) <= 0.028) return LILAC;
  return c;
}

function draw(size) {
  const SS = 3; // supersampling 3×3
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [cr, cg, cb] = sample((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
          r += cr; g += cg; b += cb;
        }
      }
      const i = (y * size + x) * 4;
      rgba[i] = r / (SS * SS);
      rgba[i + 1] = g / (SS * SS);
      rgba[i + 2] = b / (SS * SS);
      rgba[i + 3] = 255;
    }
  }
  return encodePNG(size, rgba);
}

mkdirSync("public/icons", { recursive: true });
for (const [nome, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  writeFileSync(`public/icons/${nome}`, draw(size));
  console.log(`public/icons/${nome} (${size}×${size})`);
}
