import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { canPlaceSticker, handleBirthdayCard, UNLIMITED_USER_ID } from './birthdayCard.mjs';

function call(dir, method, url, user, body) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  let status = 0;
  let raw = '';
  const res = {
    setHeader() {},
    end(payload) { raw = String(payload ?? ''); },
  };
  Object.defineProperty(res, 'statusCode', {
    set(value) { status = value; },
    get() { return status; },
  });
  const done = handleBirthdayCard(req, res, url.split('?')[0], user, dir);
  queueMicrotask(() => {
    if (body !== undefined) req.emit('data', Buffer.from(JSON.stringify(body)));
    req.emit('end');
  });
  return done.then(() => ({ status, body: raw ? JSON.parse(raw) : {} }));
}

test('colaborador comum só coloca um adesivo', () => {
  const stickers = [];
  assert.equal(canPlaceSticker('helena', stickers), true);
  stickers.push({ authorId: 'helena', personId: 'ana-souza' });
  assert.equal(canPlaceSticker('helena', stickers), false);
  assert.equal(canPlaceSticker('caio', stickers), true);
});

test('a conta Matheus continua podendo colocar vários', () => {
  const stickers = [{ authorId: UNLIMITED_USER_ID, personId: 'ana-souza' }, { authorId: UNLIMITED_USER_ID, personId: 'caio-mendes' }];
  assert.equal(canPlaceSticker(UNLIMITED_USER_ID, stickers), true);
  assert.equal(canPlaceSticker('Matheus Larrie', stickers), true);
  stickers.push({ authorId: 'Matheus Larrie', personId: 'ana-souza' });
  assert.equal(canPlaceSticker('Matheus Larrie', stickers), false);
  assert.equal(canPlaceSticker(UNLIMITED_USER_ID, stickers), true);
});

test('o adesivo só entra com recado e o texto fica no cartão', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unica-birthday-'));
  const matheus = { id: '1', name: 'Matheus Larrie' };
  const helena = { id: 'helena', name: 'Helena Duarte' };
  try {
    const emptyNote = await call(dir, 'POST', '/api/birthday-card', matheus, { personId: 'ana-souza', stickerId: 'png-0.png', message: '   ' });
    assert.equal(emptyNote.status, 400);
    assert.equal(emptyNote.body.error, 'message');
    const placed = await call(dir, 'POST', '/api/birthday-card/text', matheus, {
      personId: 'ana-souza', body: 'Parabéns', x: 40, y: 30, size: 28, font: 'clash', effect: 'shadow', color: '#ffffff',
    });
    assert.equal(placed.status, 201);
    await call(dir, 'POST', '/api/birthday-card/color', matheus, { personId: 'ana-souza', color: '#224466' });
    const card = await call(dir, 'GET', '/api/birthday-card?personId=ana-souza', matheus);
    assert.equal(card.status, 200);
    assert.equal(card.body.color, '#224466');
    assert.equal(card.body.texts.length, 1);
    assert.equal(card.body.texts[0].body, 'Parabéns');
    const updated = await call(dir, 'PATCH', `/api/birthday-card/text/${placed.body.text.id}`, matheus, { effect: 'outline', size: 40 });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.text.effect, 'outline');
    assert.equal(updated.body.text.size, 40);
    assert.equal(updated.body.text.rotation, 0);
    const turned = await call(dir, 'PATCH', `/api/birthday-card/text/${placed.body.text.id}`, matheus, { rotation: 35, size: 80 });
    assert.equal(turned.status, 200);
    assert.equal(turned.body.text.rotation, 35);
    assert.equal(turned.body.text.size, 80);
    assert.equal(updated.body.text.outline, true);
    const styled = await call(dir, 'POST', '/api/birthday-card/text', matheus, {
      personId: 'ana-souza', body: 'Olá', font: 'playfair', bold: true, italic: true, opacity: 0.4, align: 'left', tracking: 4, color: '#ffffff',
    });
    assert.equal(styled.status, 201);
    assert.equal(styled.body.text.font, 'playfair');
    assert.equal(styled.body.text.bold, true);
    assert.equal(styled.body.text.italic, true);
    assert.equal(styled.body.text.opacity, 0.4);
    assert.equal(styled.body.text.align, 'left');
    assert.equal(styled.body.text.tracking, 4);
    const badFont = await call(dir, 'POST', '/api/birthday-card/text', matheus, { personId: 'ana-souza', body: 'X', font: 'comic' });
    assert.equal(badFont.status, 400);
    const lined = await call(dir, 'POST', '/api/birthday-card/text', matheus, { personId: 'ana-souza', body: 'Oi\nAna', font: 'vibes', color: '#ffffff' });
    assert.equal(lined.status, 201);
    assert.equal(lined.body.text.body, 'Oi\nAna');
    assert.equal(lined.body.text.font, 'vibes');
    const blocked = await call(dir, 'DELETE', `/api/birthday-card/text/${placed.body.text.id}`, helena);
    assert.equal(blocked.status, 403);
    const removed = await call(dir, 'DELETE', `/api/birthday-card/text/${placed.body.text.id}`, matheus);
    assert.equal(removed.status, 200);
    await call(dir, 'DELETE', `/api/birthday-card/text/${styled.body.text.id}`, matheus);
    await call(dir, 'DELETE', `/api/birthday-card/text/${lined.body.text.id}`, matheus);
    const after = await call(dir, 'GET', '/api/birthday-card?personId=ana-souza', matheus);
    assert.equal(after.body.texts.length, 0);
    const drawn = await call(dir, 'POST', '/api/birthday-card/mark', matheus, { personId: 'ana-souza', kind: 'heart', color: '#d8e7ff', x: 16, y: 24, size: 56 });
    assert.equal(drawn.status, 201);
    assert.equal(drawn.body.mark.kind, 'heart');
    const moved = await call(dir, 'PATCH', `/api/birthday-card/mark/${drawn.body.mark.id}`, matheus, { x: 84, color: '#123456', rotation: -20, size: 120 });
    assert.equal(moved.status, 200);
    assert.equal(moved.body.mark.x, 84);
    assert.equal(moved.body.mark.color, '#123456');
    assert.equal(moved.body.mark.rotation, -20);
    const mirrored = await call(dir, 'PATCH', `/api/birthday-card/mark/${drawn.body.mark.id}`, matheus, { flip: true });
    assert.equal(mirrored.status, 200);
    assert.equal(mirrored.body.mark.flip, true);
    assert.equal(moved.body.mark.size, 120);
    await call(dir, 'POST', '/api/birthday-card/color', matheus, { personId: 'ana-souza', color: '#224466' });
    const kept = await call(dir, 'GET', '/api/birthday-card?personId=ana-souza', matheus);
    assert.equal(kept.body.marks.length, 1);
    const denied = await call(dir, 'DELETE', `/api/birthday-card/mark/${drawn.body.mark.id}`, helena);
    assert.equal(denied.status, 403);
    const erased = await call(dir, 'DELETE', `/api/birthday-card/mark/${drawn.body.mark.id}`, matheus);
    assert.equal(erased.status, 200);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a foto vira adesivo por um clique só, fora do rótulo', () => {
  const ui = fs.readFileSync(new URL('../src/components/celebrations/BirthdayTicket.tsx', import.meta.url), 'utf8');
  assert.match(ui, /function openPhoto\(cut: boolean\)/);
  assert.match(ui, /\(cut \? cutRef : photoRef\)\.current\?\.click\(\)/);
  assert.equal((ui.match(/type="file"/g) || []).length, 2);
  assert.equal(ui.includes("left: '-100vw'"), false);
  const send = ui.indexOf('aria-label="Enviar figurinha"');
  const cut = ui.indexOf('aria-label="Criar figurinha sem fundo"');
  assert.equal(ui.slice(send, send + 180).includes('openPhoto(false)'), true);
  for (const start of [send, cut]) {
    const near = ui.slice(start, start + 700);
    assert.equal(near.includes('type="file"'), true);
    assert.equal(near.includes('absolute inset-0'), true);
  }
  assert.match(ui, /image\/\*/);
});
