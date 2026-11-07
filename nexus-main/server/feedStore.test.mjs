import assert from 'node:assert/strict';
import test from 'node:test';
import { createFeedStore, emptyFeed, feedDocumentId, normalizeFeed } from './feedStore.mjs';

function thenable(result) {
  const pending = Promise.resolve(result);
  pending.select = () => pending;
  pending.eq = () => pending;
  pending.maybeSingle = () => pending;
  return pending;
}

function memoryClient(rows = {}) {
  const table = { ...rows };
  return {
    from() {
      return {
        select() {
          return {
            eq(_column, id) {
              return {
                maybeSingle() {
                  return thenable({ data: table[id] ?? null, error: null });
                },
                eq() {
                  return { select: () => thenable({ data: [], error: null }) };
                },
              };
            },
          };
        },
        insert(row) {
          if (table[row.id]) return thenable({ data: null, error: { code: '23505', message: 'duplicate' } });
          table[row.id] = { payload: row.payload, updated_at: row.updated_at };
          return thenable({ data: [{ id: row.id }], error: null });
        },
        upsert(row) {
          table[row.id] = { payload: row.payload, updated_at: row.updated_at };
          return thenable({ error: null });
        },
        update(row) {
          return {
            eq(_column, id) {
              return {
                eq(_field, version) {
                  return {
                    select() {
                      const current = table[id];
                      if (!current || current.updated_at !== version) return thenable({ data: [], error: null });
                      table[id] = { payload: row.payload, updated_at: row.updated_at };
                      return thenable({ data: [{ id }], error: null });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

test('production keeps the shared mural document', () => {
  assert.equal(feedDocumentId({ VERCEL: '1', VERCEL_ENV: 'production' }), 'feed');
  assert.equal(feedDocumentId({ VERCEL_ENV: 'preview' }), 'feed-preview');
  assert.equal(feedDocumentId({ VERCEL_ENV: 'development' }), 'feed-development');
});

test('a missing mural becomes empty instead of demo posts', () => {
  const store = normalizeFeed(null);
  assert.deepEqual(store.posts, []);
  assert.equal(emptyFeed().posts.length, 0);
});

test('existing mural posts are loaded from supabase', async () => {
  const post = { id: 'post-real', body: 'permanece', createdAt: '2026-11-07T12:00:00.000Z' };
  const mural = createFeedStore({
    remote: true,
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.e30', VERCEL: '1', VERCEL_ENV: 'production' },
    client: memoryClient({ feed: { payload: { posts: [post], reposts: [] }, updated_at: 'v1' } }),
    migrateBlob: async () => ({ ok: true, payload: null }),
  });
  const loaded = await mural.load();
  assert.equal(loaded.error, undefined);
  assert.deepEqual(loaded.store.posts.map((item) => item.id), ['post-real']);
});

test('a failed read does not write an empty mural', async () => {
  const mural = createFeedStore({
    remote: true,
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.e30', VERCEL: '1', VERCEL_ENV: 'production' },
    client: {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: null, error: { code: '57014' } };
                  },
                };
              },
            };
          },
        };
      },
    },
  });
  const loaded = await mural.load();
  assert.equal(loaded.kind, 'storage');
  assert.equal(loaded.store, undefined);
});

test('creating a post only reports success after the write', async () => {
  const mural = createFeedStore({
    remote: true,
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.e30', VERCEL: '1', VERCEL_ENV: 'production' },
    client: memoryClient(),
    migrateBlob: async () => ({ ok: true, payload: null }),
  });
  const saved = await mural.mutate((store) => ({
    store: { ...store, posts: [{ id: 'post-new', body: 'novo', createdAt: '2026-11-07T13:00:00.000Z' }, ...store.posts] },
  }));
  assert.equal(saved.error, undefined);
  assert.equal(saved.store.posts[0].id, 'post-new');
  const loaded = await mural.load();
  assert.equal(loaded.store.posts[0].id, 'post-new');
});

test('a blob outage does not block an empty mural in supabase', async () => {
  const mural = createFeedStore({
    remote: true,
    dir: 'missing-feed-dir',
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.e30', VERCEL: '1', VERCEL_ENV: 'production' },
    migrateBlob: async () => ({ ok: false, detail: 'network' }),
    client: memoryClient(),
  });
  const loaded = await mural.load();
  assert.equal(loaded.kind, undefined);
  assert.deepEqual(loaded.store.posts, []);
});

test('demo posts from the local file are not migrated', async () => {
  let written = null;
  const mural = createFeedStore({
    remote: true,
    dir: 'missing-feed-dir',
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.e30', VERCEL: '1', VERCEL_ENV: 'production' },
    migrateBlob: async () => ({ ok: true, payload: { posts: [{ id: 'post-ana', body: 'seed' }], reposts: [] } }),
    client: {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: written ? { payload: written, updated_at: 'v2' } : null, error: null };
                  },
                };
              },
            };
          },
          async upsert(row) {
            written = row.payload;
            return { error: null };
          },
          async insert(row) {
            written = row.payload;
            return { error: null, select() { return { data: [{ id: row.id }], error: null }; } };
          },
        };
      },
    },
  });
  const loaded = await mural.load();
  assert.equal(loaded.store.posts.some((post) => post.id === 'post-ana'), true);
  assert.equal(loaded.store.posts.some((post) => post.id === 'post-texto'), false);
});
