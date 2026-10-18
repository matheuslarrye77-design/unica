import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeFeed } from './durable.mjs';

const seed = { id: 'post-ana', body: 'ana', likes: 56, comments: [], reactions: [], createdAt: '2026-10-09T00:30:16.917Z' };
const userPost = { id: 'post-user', body: 'meu post', likes: 0, comments: [], reactions: [], createdAt: '2026-10-18T01:00:00.000Z', updatedAt: '2026-10-18T01:00:00.000Z' };

test('an update keeps posts that already exist', () => {
  const kept = mergeFeed({ posts: [seed], reposts: [], saved: {} }, { posts: [userPost, seed], reposts: [], saved: {} });
  assert.deepEqual(kept.posts.map((post) => post.id), ['post-user', 'post-ana']);
});

test('a new post stays in front of the saved mural', () => {
  const added = mergeFeed({ posts: [{ id: 'post-new', body: 'novo', createdAt: '2026-10-18T02:00:00.000Z' }, seed], reposts: [], saved: {} }, { posts: [seed], reposts: [], saved: {} });
  assert.deepEqual(added.posts.map((post) => post.id), ['post-new', 'post-ana']);
});

test('a deleted post stays deleted after the merge', () => {
  const removed = mergeFeed(
    { posts: [seed], reposts: [], saved: {}, deletedIds: ['post-user'] },
    { posts: [userPost, seed], reposts: [], saved: {}, deletedIds: [] },
  );
  assert.deepEqual(removed.posts.map((post) => post.id), ['post-ana']);
  assert.deepEqual(removed.deletedIds, ['post-user']);
});

test('a saved reaction wins over the original copy', () => {
  const loved = { ...seed, reactions: [{ userId: 'helena', kind: 'love' }], updatedAt: '2026-10-18T03:00:00.000Z' };
  const preferred = mergeFeed({ posts: [seed], reposts: [], saved: {} }, { posts: [loved], reposts: [], saved: {} });
  assert.equal(preferred.posts[0].reactions.length, 1);
});
