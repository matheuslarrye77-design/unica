import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { detectImage, forgetSticker, keepSticker, listGifs, listStickers, saveGif, saveSticker, stickerBytes, stickerMediaUrl } from './stickers.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('only real images become stickers', () => {
  assert.equal(detectImage(png), 'image/png');
  assert.equal(detectImage(Buffer.from('<html></html>')), '');
  assert.equal(stickerMediaUrl('https://evil.example/stk-0123456789abcdef'), '');
  assert.equal(stickerMediaUrl('/api/stickers/stk-0123456789abcdef'), '/api/stickers/stk-0123456789abcdef');
});

test('a saved sticker stays available for the same person', async () => {
  const previous = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unica-stickers-'));
  try {
    const first = await saveSticker(dir, '1', png);
    const again = await saveSticker(dir, '1', png);
    assert.equal(first.status, 201);
    assert.equal(again.status, 201);
    const items = JSON.parse(fs.readFileSync(path.join(dir, 'stickers.json'), 'utf8')).items;
    assert.deepEqual(listStickers(items, '1').map((item) => item.id), [again.body.sticker.id, first.body.sticker.id]);
    assert.equal(listStickers(items, 'helena').length, 0);
    const stored = await stickerBytes(dir, first.body.sticker.id);
    assert.equal(stored.mime, 'image/png');
    assert.equal(stored.bytes.equals(png), true);
    const kept = await keepSticker(dir, 'helena', first.body.sticker.id);
    assert.equal(kept.status, 201);
    const gif = await saveGif(dir, '1', 'https://media.giphy.com/media/abc123/200w.gif', 'Risada');
    assert.equal(gif.status, 201);
    const library = JSON.parse(fs.readFileSync(path.join(dir, 'stickers.json'), 'utf8'));
    assert.equal(listStickers(library.items, '1').length, 2);
    assert.equal(listStickers(library.items, 'helena').length, 1);
    assert.equal(listGifs(library.gifs, '1')[0].url, 'https://media.giphy.com/media/abc123/200w.gif');
    const forgotten = await forgetSticker(dir, 'helena', first.body.sticker.id);
    assert.equal(forgotten.status, 200);
    const after = JSON.parse(fs.readFileSync(path.join(dir, 'stickers.json'), 'utf8'));
    assert.equal(listStickers(after.items, 'helena').length, 0);
    assert.equal(listStickers(after.items, '1').length, 2);
    assert.equal(listGifs(after.gifs, '1').length, 1);
    const stillThere = await stickerBytes(dir, first.body.sticker.id);
    assert.equal(stillThere.bytes.equals(png), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    if (previous === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = previous;
  }
});
