import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readStickerFile, readStickerLibrary, writeStickerFile, writeStickerLibrary } from './durable.mjs';

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_PER_USER = 40;
const ID = /^stk-[a-f0-9]{16}$/;

let chain = Promise.resolve();

function exclusive(task) {
  const run = chain.then(task, task);
  chain = run.then(() => undefined, () => undefined);
  return run;
}

export function stickerMediaUrl(value) {
  const url = String(value ?? '');
  const match = /^\/api\/stickers\/(stk-[a-f0-9]{16})$/.exec(url);
  return match ? `/api/stickers/${match[1]}` : '';
}

export function detectImage(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12 || bytes.length > MAX_BYTES) return '';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes.toString('ascii', 1, 4) === 'PNG') return 'image/png';
  if (bytes.toString('ascii', 0, 6) === 'GIF87a' || bytes.toString('ascii', 0, 6) === 'GIF89a') return 'image/gif';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return '';
}

function safeUser(userId) {
  const id = String(userId ?? '');
  return /^[A-Za-z0-9_-]{1,40}$/.test(id) ? id : '';
}

function libraryFile(dir) {
  return path.join(dir, 'stickers.json');
}

function imageFile(dir, id) {
  return path.join(dir, 'stickers', id);
}

function readLocal(dir) {
  try {
    const parsed = JSON.parse(fs.readFileSync(libraryFile(dir), 'utf8'));
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeLocal(dir, items) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(libraryFile(dir), JSON.stringify({ items }));
}

async function loadItems(dir) {
  const remote = await readStickerLibrary();
  if (remote.mode === 'blob') {
    if (!remote.ok) return null;
    return remote.items ?? [];
  }
  return readLocal(dir);
}

async function storeItems(dir, items) {
  const saved = await writeStickerLibrary(items);
  if (saved.mode === 'blob') return saved.ok;
  writeLocal(dir, items);
  return true;
}

async function storeBytes(dir, id, bytes, mime) {
  const remote = await writeStickerFile(id, bytes, mime);
  if (remote) return true;
  const library = await readStickerLibrary();
  if (library.mode === 'blob') return false;
  fs.mkdirSync(path.join(dir, 'stickers'), { recursive: true });
  fs.writeFileSync(imageFile(dir, id), bytes);
  return true;
}

async function loadBytes(dir, id) {
  const remote = await readStickerFile(id);
  if (remote.mode === 'blob') return remote.ok ? remote.bytes : null;
  try {
    return fs.readFileSync(imageFile(dir, id));
  } catch {
    return null;
  }
}

export function listStickers(items, userId) {
  const owner = safeUser(userId);
  return items
    .filter((item) => item?.userId === owner && ID.test(item.id))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((item) => ({ id: item.id, url: `/api/stickers/${item.id}`, createdAt: item.createdAt }));
}

export async function saveSticker(dir, userId, bytes) {
  const owner = safeUser(userId);
  const mime = detectImage(bytes);
  if (!owner || !mime) return { status: 400, body: { error: 'file' } };
  return exclusive(async () => {
    const items = await loadItems(dir);
    if (!items) return { status: 503, body: { error: 'unavailable' } };
    const mine = items.filter((item) => item.userId === owner);
    if (mine.length >= MAX_PER_USER) return { status: 400, body: { error: 'limit' } };
    const id = `stk-${randomBytes(8).toString('hex')}`;
    const stored = await storeBytes(dir, id, bytes, mime);
    if (!stored) return { status: 503, body: { error: 'unavailable' } };
    const item = { id, userId: owner, mime, createdAt: new Date().toISOString() };
    const saved = await storeItems(dir, [item, ...items]);
    if (!saved) return { status: 503, body: { error: 'unavailable' } };
    return { status: 201, body: { sticker: { id, url: `/api/stickers/${id}`, createdAt: item.createdAt } } };
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readLimited(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > max) {
        reject(new Error('size'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function handleStickerRequest(req, res, url, dir, user) {
  const imageId = /^\/api\/stickers\/(stk-[a-f0-9]{16})$/.exec(url)?.[1] ?? '';
  if (req.method === 'GET' && imageId) {
    const image = await stickerBytes(dir, imageId);
    if (!image) {
      send(res, 404, { error: 'missing' });
      return true;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', image.mime);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.end(image.bytes);
    return true;
  }
  if (url !== '/api/stickers') return false;
  if (!user?.id) {
    send(res, 401, { error: 'unauthorized' });
    return true;
  }
  if (req.method === 'GET') {
    const items = await loadItems(dir);
    if (!items) {
      send(res, 503, { error: 'unavailable' });
      return true;
    }
    send(res, 200, { stickers: listStickers(items, user.id) });
    return true;
  }
  if (req.method === 'POST') {
    let encoded = '';
    try {
      const raw = await readLimited(req, 2_900_000);
      encoded = String(JSON.parse(raw.toString('utf8') || '{}').data ?? '');
    } catch {
      send(res, 400, { error: 'file' });
      return true;
    }
    if (!encoded || encoded.length > 2_900_000) {
      send(res, 400, { error: 'file' });
      return true;
    }
    const result = await saveSticker(dir, user.id, Buffer.from(encoded, 'base64'));
    send(res, result.status, result.body);
    return true;
  }
  send(res, 405, { error: 'method' });
  return true;
}

export async function stickerBytes(dir, id) {
  if (!ID.test(id)) return null;
  const items = await loadItems(dir);
  if (!items?.some((item) => item.id === id)) return null;
  const bytes = await loadBytes(dir, id);
  if (!bytes) return null;
  const mime = items.find((item) => item.id === id)?.mime || detectImage(bytes) || 'application/octet-stream';
  return { bytes, mime };
}
