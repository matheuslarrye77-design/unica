import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const UNLIMITED_USER_ID = '1';
const STICKER_FILE = /^(?:png|svg)-(?:0|[1-9]\d?)(?:b|_1)?\.(?:png|svg)$|^2400_3104(?:---(?:[1-9]|1\d|2[0-6]))?\.svg$|^figurinha-(?:aplauso|festa|joinha|parabens|risada|surpresa|vergonha|desespero)$|^stk-[a-f0-9]{16}$/;
const PERSON_ID = /^[a-z0-9-]{1,80}$/;
const DEFAULT_COLOR = '#8c4632';
const HEX_COLOR = /^#[0-9a-f]{6}$/;

const TEXT_FONTS = new Set(['arial', 'general', 'clash', 'dm', 'poppins', 'montserrat', 'playfair', 'cormorant', 'lora', 'baskerville', 'sora', 'manrope', 'outfit', 'grotesk', 'vibes', 'pacifico', 'lobster', 'caveat', 'sacramento', 'abril', 'bebas', 'cinzel', 'bungee', 'unbounded', 'fredoka', 'yeseva', 'comfortaa']);
const TEXT_EFFECTS = new Set(['plain', 'shadow', 'outline', 'highlight']);
const TEXT_ALIGNS = new Set(['left', 'center', 'right']);
const TEXT_GLYPHS = new Set(['none', 'heart', 'star', 'spark']);

function empty() {
  return { stickers: [], colors: {}, texts: [] };
}

function read(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      stickers: Array.isArray(parsed.stickers) ? parsed.stickers : [],
      colors: parsed.colors && typeof parsed.colors === 'object' ? parsed.colors : {},
      texts: Array.isArray(parsed.texts) ? parsed.texts : [],
    };
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

function cleanLetter(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').replace(/[^\S\n]+/g, ' ').trim().slice(0, 80);
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

function readStyle(body, previous = {}) {
  const font = TEXT_FONTS.has(String(body.font ?? previous.font ?? '')) ? String(body.font ?? previous.font) : 'arial';
  const effect = TEXT_EFFECTS.has(String(body.effect ?? previous.effect ?? '')) ? String(body.effect ?? previous.effect) : 'plain';
  const colorRaw = String(body.color ?? previous.color ?? '#ffffff').toLowerCase();
  const align = TEXT_ALIGNS.has(body.align) ? body.align : (TEXT_ALIGNS.has(previous.align) ? previous.align : 'center');
  const flag = (key) => (body[key] !== undefined ? Boolean(body[key]) : Boolean(previous[key]));
  return {
    font,
    effect,
    color: HEX_COLOR.test(colorRaw) ? colorRaw : '#ffffff',
    size: clamp(body.size ?? previous.size, 18, 72, 36),
    bold: flag('bold'),
    italic: flag('italic'),
    underline: flag('underline'),
    strike: flag('strike'),
    align,
    glyph: TEXT_GLYPHS.has(body.glyph) ? body.glyph : (TEXT_GLYPHS.has(previous.glyph) ? previous.glyph : 'none'),
    upper: flag('upper'),
    tracking: clamp(body.tracking ?? previous.tracking, -2, 24, 0),
    shadow: flag('shadow') || effect === 'shadow',
    outline: flag('outline') || effect === 'outline',
    opacity: clamp(body.opacity ?? previous.opacity, 0.15, 1, 1),
  };
}

function publicText(item) {
  return {
    id: item.id,
    personId: item.personId,
    body: item.body,
    x: item.x,
    y: item.y,
    authorId: item.authorId,
    authorName: item.authorName,
    ...readStyle({}, item),
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
      texts: store.texts.filter((item) => item.personId === personId).map(publicText),
      color: HEX_COLOR.test(String(store.colors?.[personId] ?? '')) ? String(store.colors[personId]) : DEFAULT_COLOR,
      viewer: { id: user.id, unlimited },
      mine: mine(store, user.id),
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/birthday-card/color') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const personId = String(body.personId ?? '');
    const color = String(body.color ?? '').toLowerCase();
    if (!PERSON_ID.test(personId) || !HEX_COLOR.test(color)) return send(res, 400, { error: 'fields' });
    store.colors[personId] = color;
    write(file, store);
    send(res, 200, { color });
    return;
  }

  if (req.method === 'POST' && url === '/api/birthday-card') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const personId = String(body.personId ?? '');
    const stickerId = String(body.stickerId ?? '');
    if (!PERSON_ID.test(personId) || !STICKER_FILE.test(stickerId)) return send(res, 400, { error: 'fields' });
    if (!canPlaceSticker(user.id, store.stickers)) return send(res, 409, { error: 'limit' });
    const message = cleanMessage(body.message);
    if (!message) return send(res, 400, { error: 'message' });
    const sticker = {
      id: randomBytes(8).toString('hex'),
      personId,
      stickerId,
      x: clamp(body.x, 8, 92, 50),
      y: clamp(body.y, 12, 88, 46),
      width: clamp(body.width, 14, 46, 24),
      rotation: clamp(body.rotation, -180, 180, 0),
      message,
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

  if (req.method === 'POST' && url === '/api/birthday-card/text') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const personId = String(body.personId ?? '');
    const textBody = cleanLetter(body.body);
    if (!PERSON_ID.test(personId) || !textBody || (body.font !== undefined && !TEXT_FONTS.has(String(body.font)))) return send(res, 400, { error: 'fields' });
    const text = {
      id: randomBytes(8).toString('hex'),
      personId,
      body: textBody,
      x: clamp(body.x, 8, 92, 50),
      y: clamp(body.y, 12, 88, 46),
      ...readStyle(body),
      authorId: user.id,
      authorName: user.name,
      createdAt: new Date().toISOString(),
    };
    store.texts.push(text);
    write(file, store);
    send(res, 201, { text: publicText(text) });
    return;
  }

  const textMatch = /^\/api\/birthday-card\/text\/([^/]+)$/.exec(url);
  if (textMatch && req.method === 'DELETE') {
    const index = store.texts.findIndex((item) => item.id === textMatch[1]);
    if (index < 0) return send(res, 404, { error: 'missing' });
    if (store.texts[index].authorId !== user.id) return send(res, 403, { error: 'forbidden' });
    store.texts.splice(index, 1);
    write(file, store);
    send(res, 200, { ok: true });
    return;
  }

  if (textMatch && req.method === 'PATCH') {
    const text = store.texts.find((item) => item.id === textMatch[1]);
    if (!text) return send(res, 404, { error: 'missing' });
    if (text.authorId !== user.id) return send(res, 403, { error: 'forbidden' });
    const body = JSON.parse((await readBody(req)) || '{}');
    if (body.body !== undefined) {
      const next = cleanLetter(body.body);
      if (!next) return send(res, 400, { error: 'fields' });
      text.body = next;
    }
    if (body.font !== undefined && !TEXT_FONTS.has(String(body.font))) return send(res, 400, { error: 'fields' });
    if (body.x !== undefined) text.x = clamp(body.x, 8, 92, text.x);
    if (body.y !== undefined) text.y = clamp(body.y, 12, 88, text.y);
    Object.assign(text, readStyle(body, text));
    write(file, store);
    send(res, 200, { text: publicText(text) });
    return;
  }

  const match = /^\/api\/birthday-card\/([^/]+)$/.exec(url);
  if (match && req.method === 'DELETE') {
    const index = store.stickers.findIndex((item) => item.id === match[1]);
    if (index < 0) return send(res, 404, { error: 'missing' });
    if (store.stickers[index].authorId !== user.id) return send(res, 403, { error: 'forbidden' });
    store.stickers.splice(index, 1);
    write(file, store);
    send(res, 200, { mine: mine(store, user.id) });
    return;
  }

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
