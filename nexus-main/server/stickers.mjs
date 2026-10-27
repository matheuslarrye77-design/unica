import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { blobReadState, readStickerFile, readStickerLibrary, writeStickerFile, writeStickerLibrary } from './durable.mjs';
import { gifMediaUrl } from './giphy.mjs';

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
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      gifs: Array.isArray(parsed.gifs) ? parsed.gifs : [],
    };
  } catch {
    return { items: [], gifs: [] };
  }
}

function writeLocal(dir, items, gifs) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(libraryFile(dir), JSON.stringify({ items, gifs }));
}

async function loadLibrary(dir) {
  const remote = await readStickerLibrary();
  if (remote.mode === 'blob') {
    if (!remote.ok) return null;
    return { items: remote.items ?? [], gifs: remote.gifs ?? [] };
  }
  return readLocal(dir);
}

async function storeLibrary(dir, items, gifs) {
  const saved = await writeStickerLibrary(items, gifs);
  if (saved.mode === 'blob') return saved.ok;
  writeLocal(dir, items, gifs);
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

function compareStickers(a, b) {
  return (Number(b.priority) || 0) - (Number(a.priority) || 0)
    || (Number(b.uses) || 0) - (Number(a.uses) || 0)
    || String(b.usedAt || '').localeCompare(String(a.usedAt || ''))
    || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
}

function stickerBody(item) {
  return {
    id: item.id,
    url: `/api/stickers/${item.id}`,
    createdAt: item.createdAt,
    uses: Number(item.uses) || 0,
    priority: Number(item.priority) || 0,
    usedAt: typeof item.usedAt === 'string' ? item.usedAt : '',
  };
}

export function listStickers(items, userId) {
  const owner = safeUser(userId);
  return items
    .filter((item) => item?.userId === owner && ID.test(item.id))
    .sort(compareStickers)
    .map((item) => stickerBody(item));
}

export async function saveSticker(dir, userId, bytes) {
  const owner = safeUser(userId);
  const mime = detectImage(bytes);
  if (!owner || !mime) return { status: 400, body: { error: 'file' } };
  return exclusive(async () => {
    const library = await loadLibrary(dir);
    if (!library) return { status: 503, body: { error: 'unavailable' } };
    const mine = library.items.filter((item) => item.userId === owner);
    if (mine.length >= MAX_PER_USER) return { status: 400, body: { error: 'limit' } };
    const id = `stk-${randomBytes(8).toString('hex')}`;
    const stored = await storeBytes(dir, id, bytes, mime);
    if (!stored) return { status: 503, body: { error: 'unavailable' } };
    const item = { id, userId: owner, mime, createdAt: new Date().toISOString() };
    const saved = await storeLibrary(dir, [item, ...library.items], library.gifs);
    if (!saved) return { status: 503, body: { error: 'unavailable' } };
    return { status: 201, body: { sticker: stickerBody(item) } };
  });
}

export async function forgetSticker(dir, userId, sourceId) {
  const owner = safeUser(userId);
  if (!owner || !ID.test(sourceId)) return { status: 400, body: { error: 'file' } };
  return exclusive(async () => {
    const library = await loadLibrary(dir);
    if (!library) return { status: 503, body: { error: 'unavailable' } };
    const next = library.items.filter((item) => !(item.userId === owner && item.id === sourceId));
    if (next.length === library.items.length) return { status: 200, body: { removed: true } };
    const saved = await storeLibrary(dir, next, library.gifs);
    if (!saved) return { status: 503, body: { error: 'unavailable' } };
    return { status: 200, body: { removed: true } };
  });
}

function updateOwnSticker(dir, userId, sourceId, change) {
  const owner = safeUser(userId);
  if (!owner || !ID.test(sourceId)) return Promise.resolve({ status: 400, body: { error: 'file' } });
  return exclusive(async () => {
    const library = await loadLibrary(dir);
    if (!library) return { status: 503, body: { error: 'unavailable' } };
    const current = library.items.find((item) => item.userId === owner && item.id === sourceId);
    if (!current) return { status: 404, body: { error: 'missing' } };
    const nextItem = change(current);
    const next = library.items.map((item) => (item.userId === owner && item.id === sourceId ? nextItem : item));
    const saved = await storeLibrary(dir, next, library.gifs);
    if (!saved) return { status: 503, body: { error: 'unavailable' } };
    return { status: 200, body: { sticker: stickerBody(nextItem) } };
  });
}

export function useSticker(dir, userId, sourceId) {
  return updateOwnSticker(dir, userId, sourceId, (item) => ({
    ...item,
    uses: (Number(item.uses) || 0) + 1,
    usedAt: new Date().toISOString(),
  }));
}

export function prioritizeSticker(dir, userId, sourceId) {
  return updateOwnSticker(dir, userId, sourceId, (item) => ({ ...item, priority: Date.now() }));
}

export async function keepSticker(dir, userId, sourceId) {
  const owner = safeUser(userId);
  if (!owner || !ID.test(sourceId)) return { status: 400, body: { error: 'file' } };
  return exclusive(async () => {
    const library = await loadLibrary(dir);
    if (!library) return { status: 503, body: { error: 'unavailable' } };
    const found = library.items.find((item) => item.id === sourceId);
    if (!found) return { status: 404, body: { error: 'missing' } };
    const existing = library.items.find((item) => item.userId === owner && item.id === sourceId);
    if (existing) return { status: 200, body: { sticker: stickerBody(existing) } };
    const mine = library.items.filter((item) => item.userId === owner);
    if (mine.length >= MAX_PER_USER) return { status: 400, body: { error: 'limit' } };
    const item = { id: sourceId, userId: owner, mime: found.mime, createdAt: new Date().toISOString() };
    const saved = await storeLibrary(dir, [item, ...library.items], library.gifs);
    if (!saved) return { status: 503, body: { error: 'unavailable' } };
    return { status: 201, body: { sticker: stickerBody(item) } };
  });
}

export function listGifs(gifs, userId) {
  const owner = safeUser(userId);
  return gifs
    .filter((item) => item?.userId === owner && gifMediaUrl(item.url))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, MAX_PER_USER)
    .map((item) => ({ id: String(item.id), title: String(item.title || 'GIF'), url: gifMediaUrl(item.url), createdAt: item.createdAt }));
}

export async function saveGif(dir, userId, url, title) {
  const owner = safeUser(userId);
  const media = gifMediaUrl(url);
  if (!owner || !media) return { status: 400, body: { error: 'file' } };
  return exclusive(async () => {
    const library = await loadLibrary(dir);
    if (!library) return { status: 503, body: { error: 'unavailable' } };
    const existing = library.gifs.find((item) => item.userId === owner && item.url === media);
    if (existing) return { status: 200, body: { gif: listGifs([existing], owner)[0] } };
    const mine = library.gifs.filter((item) => item.userId === owner);
    const next = mine.slice(0, MAX_PER_USER - 1);
    const item = { id: createHash('sha256').update(media).digest('hex').slice(0, 16), userId: owner, title: String(title || 'GIF').slice(0, 80), url: media, createdAt: new Date().toISOString() };
    const saved = await storeLibrary(dir, library.items, [item, ...next, ...library.gifs.filter((entry) => entry.userId !== owner)]);
    if (!saved) return { status: 503, body: { error: 'unavailable' } };
    return { status: 201, body: { gif: listGifs([item], owner)[0] } };
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
    const library = await loadLibrary(dir);
    if (!library) {
      send(res, 503, { error: 'unavailable', detail: blobReadState() });
      return true;
    }
    send(res, 200, { stickers: listStickers(library.items, user.id), gifs: listGifs(library.gifs, user.id) });
    return true;
  }
  if (req.method === 'POST') {
    let body = {};
    try {
      const raw = await readLimited(req, 2_900_000);
      body = JSON.parse(raw.toString('utf8') || '{}');
    } catch {
      send(res, 400, { error: 'file' });
      return true;
    }
    if (body.forget) {
      const result = await forgetSticker(dir, user.id, String(body.forget));
      send(res, result.status, result.body);
      return true;
    }
    if (body.source) {
      const result = await keepSticker(dir, user.id, String(body.source));
      send(res, result.status, result.body);
      return true;
    }
    if (body.use) {
      const result = await useSticker(dir, user.id, String(body.use));
      send(res, result.status, result.body);
      return true;
    }
    if (body.priority) {
      const result = await prioritizeSticker(dir, user.id, String(body.priority));
      send(res, result.status, result.body);
      return true;
    }
    if (body.gif) {
      const result = await saveGif(dir, user.id, String(body.gif), body.title);
      send(res, result.status, result.body);
      return true;
    }
    const encoded = String(body.data ?? '');
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
  const library = await loadLibrary(dir);
  if (!library?.items.some((item) => item.id === id)) return null;
  const bytes = await loadBytes(dir, id);
  if (!bytes) return null;
  const mime = library.items.find((item) => item.id === id)?.mime || detectImage(bytes) || 'application/octet-stream';
  return { bytes, mime };
}
