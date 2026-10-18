import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { serverSecretKey, supabaseConfigError } from './auth/supabaseStore.mjs';

const FILES = [
  ['feed', 'feed.json'],
  ['institution', 'institution.json'],
  ['celebrations', 'celebrations.json'],
  ['events', 'events.json'],
];

function blobToken() {
  return String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
}

function storeIdFromToken(token) {
  if (!token.startsWith('eyJ')) {
    const parts = token.split('_');
    if (parts.length >= 4 && parts[3]) return parts[3].replace(/^store_/, '');
  }
  const segment = token.split('.')[1];
  if (!segment) return '';
  try {
    const payload = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
    return String(payload.storeId || payload.store_id || '').replace(/^store_/, '');
  } catch {
    return '';
  }
}

function blobHeaders(token, storeId, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
    'x-api-version': '13',
    'x-vercel-blob-store-id': storeId,
    ...extra,
  };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function timeOf(item) {
  const value = Date.parse(item?.updatedAt || '');
  return Number.isNaN(value) ? 0 : value;
}

function richness(post) {
  const comments = Array.isArray(post?.comments) ? post.comments.length : 0;
  const reactions = Array.isArray(post?.reactions) ? post.reactions.length : 0;
  return comments * 100 + reactions * 10 + (Number(post?.shares) || 0);
}

function preferPost(local, remote) {
  const localTime = timeOf(local);
  const remoteTime = timeOf(remote);
  if (localTime !== remoteTime) return localTime > remoteTime ? local : remote;
  return richness(local) >= richness(remote) ? local : remote;
}

export function mergeFeed(local, remote) {
  const current = local && typeof local === 'object' ? local : {};
  const base = remote && typeof remote === 'object' ? remote : {};
  const deleted = new Set([...(base.deletedIds || []), ...(current.deletedIds || [])]);
  const deletedReposts = new Set([...(base.deletedRepostIds || []), ...(current.deletedRepostIds || [])]);
  const remoteIds = new Set((base.posts || []).filter((post) => post?.id).map((post) => post.id));
  const localById = new Map((current.posts || []).filter((post) => post?.id).map((post) => [post.id, post]));
  const fresh = (current.posts || []).filter((post) => post?.id && !remoteIds.has(post.id) && !deleted.has(post.id));
  const rest = (base.posts || []).filter((post) => post?.id && !deleted.has(post.id)).map((post) => {
    const newer = localById.get(post.id);
    return newer ? preferPost(newer, post) : post;
  });
  const remoteRepostIds = new Set((base.reposts || []).filter((item) => item?.id).map((item) => item.id));
  const freshReposts = (current.reposts || []).filter((item) => item?.id && !remoteRepostIds.has(item.id) && !deletedReposts.has(item.id));
  const restReposts = (base.reposts || []).filter((item) => item?.id && !deletedReposts.has(item.id));
  const saved = { ...(base.saved || {}) };
  for (const [userId, ids] of Object.entries(current.saved || {})) saved[userId] = ids;
  return {
    posts: [...fresh, ...rest],
    reposts: [...freshReposts, ...restReposts],
    saved,
    deletedIds: [...deleted],
    deletedRepostIds: [...deletedReposts],
  };
}

function supabaseClient() {
  return createClient(process.env.SUPABASE_URL, serverSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function readDocument(id) {
  if (blobToken()) return readBlob(id);
  if (supabaseConfigError()) return { ok: false, payload: null };
  const { data, error } = await supabaseClient().from('unica_documents').select('payload').eq('id', id).maybeSingle();
  if (error) {
    console.error('[unica] document read', error.code || 'unknown');
    return { ok: false, payload: null };
  }
  return { ok: true, payload: data?.payload ?? null };
}

async function readBlob(id) {
  const token = blobToken();
  const storeId = storeIdFromToken(token);
  if (!token || !storeId) return { ok: false, payload: null };
  try {
    const response = await fetch(`https://${storeId}.private.blob.vercel-storage.com/unica/${id}.json?cache=0`, {
      headers: blobHeaders(token, storeId),
    });
    if (response.status === 404) return { ok: true, payload: null };
    if (!response.ok) {
      console.error('[unica] document read', response.status);
      return { ok: false, payload: null };
    }
    return { ok: true, payload: await response.json() };
  } catch {
    console.error('[unica] document read', 'network');
    return { ok: false, payload: null };
  }
}

async function writeDocument(id, payload) {
  if (blobToken()) return writeBlob(id, payload);
  if (supabaseConfigError()) return false;
  const { error } = await supabaseClient().from('unica_documents').upsert({ id, payload, updated_at: new Date().toISOString() });
  if (error) {
    console.error('[unica] document write', error.code || 'unknown');
    return false;
  }
  return true;
}

async function writeBlob(id, payload) {
  const token = blobToken();
  const storeId = storeIdFromToken(token);
  if (!token || !storeId) return false;
  try {
    const response = await fetch(`https://vercel.com/api/blob/?pathname=unica/${id}.json`, {
      method: 'PUT',
      headers: blobHeaders(token, storeId, {
        'x-vercel-blob-access': 'private',
        'x-content-type': 'application/json',
        'x-add-random-suffix': '0',
        'x-allow-overwrite': '1',
      }),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error('[unica] document write', response.status);
      return false;
    }
    return true;
  } catch {
    console.error('[unica] document write', 'network');
    return false;
  }
}

const STICKER_FILE = /^stk-[a-f0-9]{16}$/;

export async function readStickerLibrary() {
  if (!blobToken()) return { mode: 'local', ok: true, items: null };
  const remote = await readBlob('stickers');
  return { mode: 'blob', ok: remote.ok, items: Array.isArray(remote.payload?.items) ? remote.payload.items : [] };
}

export async function writeStickerLibrary(items) {
  if (!blobToken()) return { mode: 'local', ok: true };
  return { mode: 'blob', ok: await writeBlob('stickers', { items }) };
}

export async function readStickerFile(id) {
  if (!STICKER_FILE.test(id)) return { ok: false, bytes: null, type: '' };
  const token = blobToken();
  const storeId = storeIdFromToken(token);
  if (!token || !storeId) return { mode: 'local', ok: false, bytes: null, type: '' };
  try {
    const response = await fetch(`https://${storeId}.private.blob.vercel-storage.com/unica/stickers/${id}?cache=0`, {
      headers: blobHeaders(token, storeId),
    });
    if (!response.ok) return { mode: 'blob', ok: false, bytes: null, type: '' };
    return { mode: 'blob', ok: true, bytes: Buffer.from(await response.arrayBuffer()), type: response.headers.get('content-type') || '' };
  } catch {
    console.error('[unica] sticker read', 'network');
    return { mode: 'blob', ok: false, bytes: null, type: '' };
  }
}

export async function writeStickerFile(id, bytes, contentType) {
  if (!STICKER_FILE.test(id)) return false;
  const token = blobToken();
  const storeId = storeIdFromToken(token);
  if (!token || !storeId) return false;
  try {
    const response = await fetch(`https://vercel.com/api/blob/?pathname=unica/stickers/${id}`, {
      method: 'PUT',
      headers: blobHeaders(token, storeId, {
        'x-vercel-blob-access': 'private',
        'x-content-type': contentType,
        'x-add-random-suffix': '0',
        'x-allow-overwrite': '0',
      }),
      body: bytes,
    });
    if (!response.ok) console.error('[unica] sticker write', response.status);
    return response.ok;
  } catch {
    console.error('[unica] sticker write', 'network');
    return false;
  }
}

export async function openDocuments(dir) {
  const ready = new Set();
  const missing = new Set();
  const snapshot = new Map();
  if (!blobToken() && supabaseConfigError()) {
    return { async flush() {} };
  }
  for (const [id, file] of FILES) {
    const remote = await readDocument(id);
    if (!remote.ok) continue;
    if (!remote.payload) {
      missing.add(id);
      continue;
    }
    const local = readJson(path.join(dir, file));
    const payload = id === 'feed' ? mergeFeed(local, remote.payload) : remote.payload;
    fs.mkdirSync(dir, { recursive: true });
    const full = path.join(dir, file);
    fs.writeFileSync(full, JSON.stringify(payload));
    ready.add(id);
  }
  for (const [id, file] of FILES) {
    const full = path.join(dir, file);
    snapshot.set(id, fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '');
  }
  return {
    async flush() {
      for (const [id, file] of FILES) {
        const full = path.join(dir, file);
        if (!fs.existsSync(full)) continue;
        const text = fs.readFileSync(full, 'utf8');
        if (text === snapshot.get(id) && !missing.has(id)) continue;
        const local = readJson(full);
        if (!local) continue;
        const remote = await readDocument(id);
        if (!remote.ok) continue;
        if (id !== 'feed' && remote.payload && !ready.has(id)) continue;
        let payload = id === 'feed' ? mergeFeed(local, remote.payload) : local;
        let saved = await writeDocument(id, payload);
        if (saved && id === 'feed') {
          const again = await readDocument(id);
          if (again.ok && again.payload) {
            const joined = mergeFeed(payload, again.payload);
            const before = new Set(payload.posts.map((post) => post.id));
            const after = joined.posts.map((post) => post.id);
            if (before.size !== after.length || after.some((postId) => !before.has(postId)) || joined.deletedIds.length !== payload.deletedIds.length) {
              payload = joined;
              saved = await writeDocument(id, payload);
            }
          }
          if (saved) fs.writeFileSync(full, JSON.stringify(payload));
        }
      }
    },
  };
}
