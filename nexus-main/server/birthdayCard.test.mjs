import assert from 'node:assert/strict';
import test from 'node:test';
import { canPlaceSticker, UNLIMITED_USER_ID } from './birthdayCard.mjs';

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
