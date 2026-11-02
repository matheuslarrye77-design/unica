import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { serverSecretKey, supabaseConfigError } from './auth/supabaseStore.mjs';
import { emptyStore, readCriterion } from './goals.mjs';

export const STORAGE_REPLY = 'O banco de dados está temporariamente indisponível. Nada foi gravado. O texto continua no campo para você tentar de novo.';

function blobToken(env = process.env) {
  return String(env.BLOB_READ_WRITE_TOKEN || '').trim();
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

function blobStoreId(env = process.env) {
  return String(env.BLOB_STORE_ID || '').trim().replace(/^store_/, '') || storeIdFromToken(blobToken(env));
}

export function goalsDocumentId(env = process.env) {
  const named = String(env.GOALS_DOCUMENT_ID || '').trim();
  if (named) return named;
  const stage = String(env.VERCEL_ENV || '').trim();
  if (stage === 'production') return 'goals';
  if (stage === 'preview') return 'goals-preview';
  return 'goals-development';
}

export function normalizeGoals(parsed) {
  const source = parsed && typeof parsed === 'object' ? parsed : {};
  return {
    ...emptyStore(),
    ...source,
    weights: { ...emptyStore().weights, ...(source.weights ?? {}) },
    criterion: readCriterion(source.criterion),
    managementGoals: Array.isArray(source.managementGoals) ? source.managementGoals : [],
    ledger: {
      records: Array.isArray(source.ledger?.records) ? source.ledger.records : [],
      ranking: Array.isArray(source.ledger?.ranking) ? source.ledger.ranking : [],
      applied: Array.isArray(source.ledger?.applied) ? source.ledger.applied : [],
    },
  };
}

function localFile(dir) {
  return path.join(dir, 'goals.json');
}

function readLocal(dir) {
  try {
    return normalizeGoals(JSON.parse(fs.readFileSync(localFile(dir), 'utf8')));
  } catch {
    return emptyStore();
  }
}

function writeLocal(dir, store) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(localFile(dir), JSON.stringify(store));
}

function client(env) {
  return createClient(env.SUPABASE_URL, serverSecretKey(env), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(task, ms) {
  let timer;
  try {
    return await Promise.race([
      task,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function unavailable(detail = 'unknown') {
  console.error('[unica] goals storage', detail);
  return { error: 'storage', kind: 'storage', reply: STORAGE_REPLY };
}

async function readBlobGoals(env) {
  const token = blobToken(env);
  const storeId = blobStoreId(env);
  if (!token || !storeId) return { ok: true, payload: null };
  try {
    const response = await withTimeout(fetch(`https://${storeId}.private.blob.vercel-storage.com/unica/goals.json`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-api-version': '13',
        'x-vercel-blob-store-id': storeId,
      },
    }), 8000);
    if (response.status === 404) return { ok: true, payload: null };
    if (!response.ok) return { ok: false, detail: String(response.status) };
    return { ok: true, payload: JSON.parse(await response.text()) };
  } catch (error) {
    return { ok: false, detail: error?.code === 'timeout' ? 'timeout' : 'network' };
  }
}

export function createGoalsStore(options = {}) {
  const env = options.env ?? process.env;
  const dir = options.dir ?? path.resolve(process.cwd(), 'data');
  const timeoutMs = options.timeoutMs ?? 8000;
  const retries = options.retries ?? 8;
  const migrateBlob = options.migrateBlob ?? ((stageEnv) => readBlobGoals(stageEnv));
  const remote = Boolean(env.VERCEL) || Boolean(options.remote);
  const id = goalsDocumentId(env);

  async function loadRow() {
    if (!remote) {
      if (env.VERCEL) return unavailable('config');
      return { store: readLocal(dir), version: 'local', id };
    }
    if (supabaseConfigError(env)) return unavailable('config');
    try {
      const db = options.client ?? client(env);
      const result = await withTimeout(db.from('unica_documents').select('payload, updated_at').eq('id', id).maybeSingle(), timeoutMs);
      if (result.error) return unavailable(result.error.code || 'unknown');
      if (result.data?.payload) {
        return { store: normalizeGoals(result.data.payload), version: result.data.updated_at || '', id };
      }
      if (id === 'goals') {
        const blob = await migrateBlob(env);
        if (blob.ok && blob.payload) {
          const migrated = normalizeGoals(blob.payload);
          const stamp = new Date().toISOString();
          const written = await withTimeout(db.from('unica_documents').upsert({ id, payload: migrated, updated_at: stamp }), timeoutMs);
          if (written.error) return unavailable(written.error.code || 'unknown');
          return { store: migrated, version: stamp, id };
        }
      }
      return { store: emptyStore(), version: '', id };
    } catch (error) {
      return unavailable(error?.code === 'timeout' ? 'timeout' : 'network');
    }
  }

  async function saveRow(store, version) {
    if (!remote) {
      writeLocal(dir, store);
      return { ok: true, version: 'local' };
    }
    if (supabaseConfigError(env)) return { ok: false, error: unavailable('config') };
    const stamp = new Date().toISOString();
    try {
      const db = options.client ?? client(env);
      if (!version) {
        const inserted = await withTimeout(db.from('unica_documents').insert({ id, payload: store, updated_at: stamp }).select('id'), timeoutMs);
        if (inserted.error && (inserted.error.code === '23505' || /duplicate/i.test(inserted.error.message || ''))) {
          return { ok: false, conflict: true };
        }
        if (inserted.error) return { ok: false, error: unavailable(inserted.error.code || 'unknown') };
        return { ok: true, version: stamp };
      }
      const updated = await withTimeout(
        db.from('unica_documents').update({ payload: store, updated_at: stamp }).eq('id', id).eq('updated_at', version).select('id'),
        timeoutMs,
      );
      if (updated.error) return { ok: false, error: unavailable(updated.error.code || 'unknown') };
      if (!updated.data?.length) return { ok: false, conflict: true };
      return { ok: true, version: stamp };
    } catch (error) {
      return { ok: false, error: unavailable(error?.code === 'timeout' ? 'timeout' : 'network') };
    }
  }

  return {
    id,
    remote,
    async load() {
      return loadRow();
    },
    async mutate(mutator) {
      let last = null;
      for (let attempt = 0; attempt < retries; attempt += 1) {
        const loaded = await loadRow();
        if (loaded.error) return loaded;
        const next = await mutator(loaded.store);
        if (!next || next.skip) return next ?? { store: loaded.store };
        if (next.error && !next.store) return next;
        const saved = await saveRow(next.store, loaded.version);
        if (saved.ok) return { ...next, store: next.store };
        if (saved.error) return saved.error;
        last = saved;
        await wait(25 * (attempt + 1));
      }
      return last?.error ?? unavailable('conflict');
    },
  };
}
