import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { serverSecretKey, supabaseConfigError } from './auth/supabaseStore.mjs';

const FILES = [
  ['feed', 'feed.json'],
  ['institution', 'institution.json'],
];

function client() {
  return createClient(process.env.SUPABASE_URL, serverSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function hydrateDocuments(dir) {
  if (supabaseConfigError()) return;
  const db = client();
  for (const [id, file] of FILES) {
    const { data, error } = await db.from('unica_documents').select('payload').eq('id', id).maybeSingle();
    if (error || !data?.payload) continue;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, file), JSON.stringify(data.payload));
  }
}

export async function flushDocuments(dir) {
  if (supabaseConfigError()) return;
  const db = client();
  for (const [id, file] of FILES) {
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) continue;
    let payload;
    try {
      payload = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch {
      continue;
    }
    const { error } = await db.from('unica_documents').upsert({ id, payload, updated_at: new Date().toISOString() });
    if (error) console.error('[unica] document', error.code || 'unknown');
  }
}
