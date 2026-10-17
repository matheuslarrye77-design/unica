import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let cached = '';

export function dataDir() {
  if (cached) return cached;
  if (!process.env.VERCEL) {
    cached = path.resolve(process.cwd(), 'data');
    return cached;
  }
  const writable = path.join(os.tmpdir(), 'unica-data');
  fs.mkdirSync(writable, { recursive: true });
  const bundled = path.resolve(process.cwd(), 'data');
  if (fs.existsSync(bundled)) {
    for (const name of fs.readdirSync(bundled)) {
      const from = path.join(bundled, name);
      const to = path.join(writable, name);
      if (name === 'auth.json' || fs.existsSync(to) || !fs.statSync(from).isFile()) continue;
      fs.copyFileSync(from, to);
    }
  }
  cached = writable;
  return cached;
}
