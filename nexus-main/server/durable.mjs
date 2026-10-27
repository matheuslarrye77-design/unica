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

function blobBearers() {
  const tokens = [];
  const oidc = String(process.env.VERCEL_OIDC_TOKEN || '').trim();
  const rw = blobToken();
  if (oidc) tokens.push(oidc);
  if (rw && rw !== oidc) tokens.push(rw);
  return tokens;
}

function blobStoreIds() {
  const ids = [];
  const fromEnv = String(process.env.BLOB_STORE_ID || '').trim().replace(/^store_/, '');
  const fromToken = storeIdFromToken(blobToken());
  if (fromEnv) ids.push(fromEnv);
  if (fromToken && !ids.includes(fromToken)) ids.push(fromToken);
  return ids;
}

async function fetchBlob(pathname) {
  const ids = blobStoreIds();
  const tokens = blobBearers();
  if (!ids.length || !tokens.length) return { ok: false, status: 0, bytes: null, type: '' };
  let saw404 = false;
  let sawDenied = false;
  for (const id of ids) {
    for (const host of [`${id}.private.blob.vercel-storage.com`, `store_${id}.private.blob.vercel-storage.com`]) {
      for (const token of tokens) {
        for (const headers of [{ authorization: `Bearer ${token}` }, blobHeaders(token, id)]) {
          try {
            const response = await fetch(`https://${host}/${pathname}`, { headers });
            if (response.status === 404) {
              saw404 = true;
              continue;
            }
            if (response.status === 401 || response.status === 403) {
              sawDenied = true;
              continue;
            }
            if (!response.ok) continue;
            return {
              ok: true,
              status: 200,
              bytes: Buffer.from(await response.arrayBuffer()),
              type: response.headers.get('content-type') || '',
            };
          } catch {
            /* tenta outro endereço ou credencial do armazenamento */
          }
        }
      }
    }
  }
  if (saw404 && !sawDenied) return { ok: true, status: 404, bytes: null, type: '' };
  console.error('[unica] document read', sawDenied ? 403 : 'network');
  return { ok: false, status: sawDenied ? 403 : 0, bytes: null, type: '' };
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

async function readSupabaseDocument(id) {
  if (!process.env.SUPABASE_URL || !serverSecretKey()) return { ok: false, payload: null };
  try {
    const { data, error } = await supabaseClient().from('unica_documents').select('payload').eq('id', id).maybeSingle();
    if (error) {
      console.error('[unica] document read', error.code || 'unknown');
      return { ok: false, payload: null };
    }
    return { ok: true, payload: data?.payload ?? null };
  } catch {
    console.error('[unica] document read', 'network');
    return { ok: false, payload: null };
  }
}

async function readDocument(id) {
  if (!blobToken()) return readSupabaseDocument(id);
  const blob = await readBlob(id);
  if (id !== 'feed') return blob;
  const backup = await readSupabaseDocument(id);
  if (blob.payload && backup.payload) return { ok: true, payload: mergeFeed(backup.payload, blob.payload) };
  if (blob.ok && blob.payload) return blob;
  if (backup.ok && backup.payload) return { ok: true, payload: backup.payload };
  return blob;
}

async function readBlob(id) {
  if (!blobStoreIds().length || !blobBearers().length) return { ok: false, payload: null };
  const result = await fetchBlob(`unica/${id}.json`);
  if (!result.ok) return { ok: false, payload: null };
  if (result.status === 404) return { ok: true, payload: null };
  try {
    return { ok: true, payload: JSON.parse(result.bytes.toString('utf8')) };
  } catch {
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

async function writeRaw(pathname, body, contentType) {
  const ids = blobStoreIds();
  const tokens = blobBearers();
  if (!ids.length || !tokens.length) return false;
  let status = 0;
  for (const storeId of ids) {
    for (const token of tokens) {
      try {
        const response = await fetch(`https://vercel.com/api/blob/?pathname=${pathname}`, {
          method: 'PUT',
          headers: blobHeaders(token, storeId, {
            'x-vercel-blob-access': 'private',
            'x-content-type': contentType,
            'x-add-random-suffix': '0',
            'x-allow-overwrite': '1',
          }),
          body,
        });
        if (response.ok) return true;
        status = response.status;
      } catch {
        status = 0;
      }
    }
  }
  console.error('[unica] document write', status || 'network');
  return false;
}

async function writeBlob(id, payload) {
  return writeRaw(`unica/${id}.json`, JSON.stringify(payload), 'application/json');
}

const STICKER_FILE = /^stk-[a-f0-9]{16}$/;

export async function readStickerLibrary() {
  if (!blobToken()) return { mode: 'local', ok: true, items: null, gifs: null };
  const remote = await readBlob('stickers');
  return {
    mode: 'blob',
    ok: remote.ok,
    items: Array.isArray(remote.payload?.items) ? remote.payload.items : [],
    gifs: Array.isArray(remote.payload?.gifs) ? remote.payload.gifs : [],
  };
}

export async function writeStickerLibrary(items, gifs = []) {
  if (!blobToken()) return { mode: 'local', ok: true };
  return { mode: 'blob', ok: await writeBlob('stickers', { items, gifs }) };
}

export async function readStickerFile(id) {
  if (!STICKER_FILE.test(id)) return { ok: false, bytes: null, type: '' };
  if (!blobToken()) return { mode: 'local', ok: false, bytes: null, type: '' };
  const file = await getPrivate(`unica/stickers/${id}`);
  if (!file) return { mode: 'blob', ok: false, bytes: null, type: '' };
  return { mode: 'blob', ok: true, bytes: file.bytes, type: file.type };
}

const PRIVATE_FILE = /^unica\/(?:stickers\/stk-[a-f0-9]{16}|uploads\/up-[a-f0-9]{16}(?:\.json)?)$/;

async function putPrivate(pathname, body, contentType) {
  if (!PRIVATE_FILE.test(pathname)) return false;
  return writeRaw(pathname, body, contentType);
}

async function getPrivate(pathname) {
  if (!PRIVATE_FILE.test(pathname)) return null;
  const result = await fetchBlob(pathname);
  if (!result.ok || result.status === 404 || !result.bytes) return null;
  return { bytes: result.bytes, type: result.type };
}

export async function writeStickerFile(id, bytes, contentType) {
  if (!STICKER_FILE.test(id)) return false;
  if (!blobToken()) return false;
  return putPrivate(`unica/stickers/${id}`, bytes, contentType);
}

const UPLOAD_FILE = /^up-[a-f0-9]{16}$/;

export async function writeUploadFile(id, bytes, contentType, meta) {
  if (!UPLOAD_FILE.test(id) || !blobToken()) return false;
  const file = await putPrivate(`unica/uploads/${id}`, bytes, contentType);
  const info = await putPrivate(`unica/uploads/${id}.json`, Buffer.from(JSON.stringify({ name: String(meta?.name || 'arquivo').slice(0, 180), mime: contentType, size: bytes.length })), 'application/json');
  return file && info;
}

export async function readUploadFile(id) {
  if (!UPLOAD_FILE.test(id) || !blobToken()) return null;
  const info = await getPrivate(`unica/uploads/${id}.json`);
  const file = await getPrivate(`unica/uploads/${id}`);
  if (!info || !file) return null;
  try {
    const meta = JSON.parse(info.bytes.toString('utf8'));
    return { bytes: file.bytes, mime: String(meta.mime || file.type || 'application/octet-stream'), name: String(meta.name || 'arquivo') };
  } catch {
    return { bytes: file.bytes, mime: file.type || 'application/octet-stream', name: 'arquivo' };
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
        if (id === 'feed' && !remote.payload) continue;
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
