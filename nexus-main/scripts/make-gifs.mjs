import fs from 'node:fs';
import path from 'node:path';

const W = 64;
const H = 64;

function lzw(indices, minCodeSize) {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let next = eoi + 1;
  let dict = new Map();
  const init = () => {
    dict = new Map();
    for (let index = 0; index < clear; index += 1) dict.set(String(index), index);
    codeSize = minCodeSize + 1;
    next = eoi + 1;
  };
  const bytes = [];
  let acc = 0;
  let bits = 0;
  const emit = (code) => {
    acc |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      bytes.push(acc & 255);
      acc >>= 8;
      bits -= 8;
    }
  };
  init();
  emit(clear);
  let current = '';
  for (const color of indices) {
    const nextKey = current === '' ? String(color) : `${current},${color}`;
    if (dict.has(nextKey)) current = nextKey;
    else {
      emit(dict.get(current));
      if (next < 4096) {
        dict.set(nextKey, next);
        next += 1;
        if (next > 1 << codeSize && codeSize < 12) codeSize += 1;
      } else {
        emit(clear);
        init();
      }
      current = String(color);
    }
  }
  if (current !== '') emit(dict.get(current));
  emit(eoi);
  if (bits) bytes.push(acc & 255);
  return bytes;
}

function subBlocks(bytes) {
  const out = [];
  for (let index = 0; index < bytes.length; index += 255) {
    const slice = bytes.slice(index, index + 255);
    out.push(slice.length, ...slice);
  }
  out.push(0);
  return out;
}

function gif(palette, frames, delay) {
  const header = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, W, 0, H, 0, 0xf3, 0, 0];
  const colors = [];
  for (let index = 0; index < 16; index += 1) {
    const [r, g, b] = palette[index] ?? [0, 0, 0];
    colors.push(r, g, b);
  }
  const loop = [0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0'), 0x03, 0x01, 0, 0, 0];
  const images = frames.flatMap((frame) => {
    const packed = lzw(frame, 4);
    return [
      0x21, 0xf9, 0x04, 0x09, delay & 255, (delay >> 8) & 255, 0, 0,
      0x2c, 0, 0, 0, 0, W, 0, H, 0, 0,
      4,
      ...subBlocks(packed),
    ];
  });
  return Buffer.from([...header, ...colors, ...loop, ...images, 0x3b]);
}

function blank() {
  return new Uint8Array(W * H);
}

function paint(draw) {
  const pixels = blank();
  const set = (x, y, color) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= W || py >= H) return;
    pixels[py * W + px] = color;
  };
  const disc = (cx, cy, radius, color) => {
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        if (x * x + y * y <= radius * radius) set(cx + x, cy + y, color);
      }
    }
  };
  const rect = (x, y, w, h, color) => {
    for (let py = y; py < y + h; py += 1) for (let px = x; px < x + w; px += 1) set(px, py, color);
  };
  draw({ set, disc, rect });
  return pixels;
}

const palette = [
  [0, 0, 0],
  [248, 234, 251],
  [255, 214, 232],
  [142, 53, 184],
  [255, 196, 86],
  [88, 168, 255],
  [255, 120, 150],
  [64, 42, 78],
  [255, 255, 255],
  [120, 200, 120],
  [255, 90, 70],
  [255, 236, 170],
  [186, 140, 255],
  [40, 30, 50],
  [255, 160, 60],
  [90, 70, 110],
];

function face(mouth, blush = false, sweat = 0) {
  return paint(({ disc, rect, set }) => {
    disc(32, 34, 18, 2);
    disc(24, 30, 2, 7);
    disc(40, 30, 2, 7);
    if (mouth === 'wide') disc(32, 40, 6, 6);
    if (mouth === 'smile') rect(26, 40, 12, 2, 6);
    if (mouth === 'o') disc(32, 40, 3, 10);
    if (mouth === 'flat') rect(26, 41, 12, 2, 15);
    if (blush) {
      disc(20, 36, 3, 6);
      disc(44, 36, 3, 6);
    }
    if (sweat) disc(48, 18 + sweat, 2, 5);
  });
}

function party(tick) {
  return paint(({ disc, rect }) => {
    disc(28, 40, 14, 2);
    disc(22, 36, 2, 7);
    disc(34, 36, 2, 7);
    rect(24, 42, 8, 2, 6);
    rect(22, 18, 12, 8, 4);
    disc(18 + (tick % 4) * 6, 14, 2, tick % 2 ? 3 : 5);
    disc(46 - tick * 3, 20, 2, 12);
  });
}

function cake(flicker) {
  return paint(({ disc, rect }) => {
    disc(32, 44, 16, 5);
    disc(32, 36, 12, 12);
    disc(32, 28, 8, 2);
    rect(31, 16, 2, 10, 4);
    if (flicker) disc(32, 14, 3, 14);
  });
}

function confetti(tick) {
  return paint(({ rect, disc }) => {
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 17 + tick * 5) % 60;
      const y = (index * 11 + tick * 7) % 60;
      if (index % 2) rect(x, y, 3, 2, (index % 5) + 3);
      else disc(x, y, 2, (index % 4) + 4);
    }
  });
}

const clips = {
  risada: [0, 1, 2, 1].map((step) => face(step % 2 ? 'wide' : 'smile')),
  vergonha: [0, 1, 2, 1].map(() => face('flat', true)),
  comemoracao: [0, 1, 2, 3].map((step) => confetti(step)),
  desespero: [0, 1, 2, 3].map((step) => face(step % 2 ? 'o' : 'flat', false, step)),
  parabens: [0, 1, 0, 1].map((step) => cake(step === 0)),
  festa: [0, 1, 2, 3].map((step) => party(step)),
};

const out = path.resolve('public/gifs');
fs.mkdirSync(out, { recursive: true });
for (const [name, frames] of Object.entries(clips)) {
  fs.writeFileSync(path.join(out, `${name}.gif`), gif(palette, frames, 14));
}
console.log(`wrote ${Object.keys(clips).length} gifs`);
