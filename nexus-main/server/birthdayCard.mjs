import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const UNLIMITED_USER_ID = '1';
const STICKER_FILE = /^(?:png|svg)-(?:0|[1-9]\d?)(?:b|_1)?\.(?:png|svg)$|^2400_3104(?:---(?:[1-9]|1\d|2[0-6]))?\.svg$/;
const PERSON_ID = /^[a-z0-9-]{1,80}$/;

function empty() {
  return { stickers: [] };
}

function read(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { stickers: Array.isArray(parsed.stickers) ? parsed.stickers : [] };
  } catch {
    return empty();
  }
}

function write(file, store) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2));
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function canPlaceSticker(userId, stickers) {
  if (userId === UNLIMITED_USER_ID) return true;
  return stickers.filter((item) => item.authorId === userId).length < 1;
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function cleanMessage(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function publicSticker(item) {
  return {
    id: item.id,
    personId: item.personId,
    stickerId: item.stickerId,
    x: item.x,
    y: item.y,
    width: item.width,
    rotation: item.rotation,
    message: item.message,
    open: Boolean(item.open),
    authorId: item.authorId,
    authorName: item.authorName,
  };
}

function mine(store, userId) {
  const sticker = store.stickers.find((item) => item.authorId === userId);
  return sticker ? { id: sticker.id, personId: sticker.personId } : null;
}

export async function handleBirthdayCard(req, res, url, user, dir) {
  const file = path.join(dir, 'birthday-cards.json');
  const store = read(file);
  const unlimited = user.id === UNLIMITED_USER_ID;

  if (req.method === 'GET' && url === '/api/birthday-card') {
    const personId = new URL(req.url ?? '', 'http://internal').searchParams.get('personId') ?? '';
    if (!PERSON_ID.test(personId)) return send(res, 400, { error: 'person' });
    send(res, 200, {
      stickers: store.stickers.filter((item) => item.personId === personId).map(publicSticker),
      viewer: { id: user.id, unlimited },
      mine: mine(store, user.id),
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/birthday-card') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const personId = String(body.personId ?? '');
    const stickerId = String(body.stickerId ?? '');
    if (!PERSON_ID.test(personId) || !STICKER_FILE.test(stickerId)) return send(res, 400, { error: 'fields' });
    if (!canPlaceSticker(user.id, store.stickers)) return send(res, 409, { error: 'limit' });
    const sticker = {
      id: randomBytes(8).toString('hex'),
      personId,
      stickerId,
      x: clamp(body.x, 8, 92, 50),
      y: clamp(body.y, 12, 88, 46),
      width: clamp(body.width, 14, 46, 24),
      rotation: clamp(body.rotation, -180, 180, 0),
      message: cleanMessage(body.message),
      open: false,
      authorId: user.id,
      authorName: user.name,
      createdAt: new Date().toISOString(),
    };
    store.stickers.push(sticker);
    write(file, store);
    send(res, 201, { sticker: publicSticker(sticker), mine: { id: sticker.id, personId } });
    return;
  }

  const match = /^\/api\/birthday-card\/([^/]+)$/.exec(url);
  if (match && req.method === 'PATCH') {
    const sticker = store.stickers.find((item) => item.id === match[1]);
    if (!sticker) return send(res, 404, { error: 'missing' });
    if (sticker.authorId !== user.id) return send(res, 403, { error: 'forbidden' });
    const body = JSON.parse((await readBody(req)) || '{}');
    if (body.x !== undefined) sticker.x = clamp(body.x, 8, 92, sticker.x);
    if (body.y !== undefined) sticker.y = clamp(body.y, 12, 88, sticker.y);
    if (body.width !== undefined) sticker.width = clamp(body.width, 14, 46, sticker.width);
    if (body.rotation !== undefined) sticker.rotation = clamp(body.rotation, -180, 180, sticker.rotation);
    if (body.message !== undefined) sticker.message = cleanMessage(body.message);
    if (body.open !== undefined) sticker.open = Boolean(body.open);
    write(file, store);
    send(res, 200, { sticker: publicSticker(sticker) });
    return;
  }

  send(res, 404, { error: 'missing' });
}
