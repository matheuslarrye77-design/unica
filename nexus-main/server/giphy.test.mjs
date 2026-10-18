import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanGifQuery, sanitizeGifs, searchGifs } from './giphy.mjs';

test('a missing GIPHY key returns a controlled error and does not call the network', async () => {
  let called = false;
  const result = await searchGifs('risada', {}, () => {
    called = true;
    return Promise.reject(new Error('should not run'));
  });
  assert.equal(called, false);
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, { error: 'config' });
  assert.equal(JSON.stringify(result).includes('GIPHY_API_KEY'), false);
});

test('search terms are limited to short text', () => {
  assert.equal(cleanGifQuery('  risada   alta  '), 'risada alta');
  assert.equal(cleanGifQuery(''), '');
  assert.equal(cleanGifQuery('a'.repeat(80)).length, 50);
  assert.equal(cleanGifQuery('https://evil.example'), null);
});

test('only official GIPHY media addresses are returned', () => {
  const gifs = sanitizeGifs({
    data: [
      { id: 'abc123', title: 'Risada', images: { fixed_width: { url: 'https://media1.giphy.com/media/abc123/200w.gif?cid=abc&rid=200w.gif&ct=g' }, fixed_width_small: { url: 'https://media1.giphy.com/media/abc123/100w.gif?cid=abc' } } },
      { id: 'bad', title: 'Outro', images: { fixed_width: { url: 'https://evil.example/media/bad/200w.gif' } } },
    ],
  });
  assert.equal(gifs.length, 1);
  assert.equal(gifs[0].url, 'https://media1.giphy.com/media/abc123/200w.gif');
  assert.equal(gifs[0].preview, 'https://media1.giphy.com/media/abc123/100w.gif');
});

test('the search uses the official GIPHY endpoint and hides the key from the result', async () => {
  let requested = '';
  const result = await searchGifs('meme', { GIPHY_API_KEY: 'test-key' }, (url) => {
    requested = String(url);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'abc123', title: 'Meme', images: { fixed_width: { url: 'https://media.giphy.com/media/abc123/200w.gif' } } }] }),
    });
  });
  assert.match(requested, /^https:\/\/api\.giphy\.com\/v1\/gifs\/search\?/);
  assert.match(requested, /api_key=test-key/);
  assert.equal(JSON.stringify(result.body).includes('test-key'), false);
  assert.equal(result.body.gifs[0].id, 'abc123');
});
