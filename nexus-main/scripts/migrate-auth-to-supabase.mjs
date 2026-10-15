import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { builtinAccounts } from '../server/auth/builtinAccounts.mjs';
import { migrationIdentities } from '../server/auth/migrationRoster.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const authFile = path.join(root, 'data', 'auth.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!url || !key || key.startsWith('sb_publishable_') || (key.startsWith('sb_') && !key.startsWith('sb_secret_'))) {
  fail('Defina SUPABASE_URL e SUPABASE_SECRET_KEY somente no servidor. Nenhum dado foi alterado.');
}

let auth;
try {
  auth = JSON.parse(fs.readFileSync(authFile, 'utf8'));
} catch {
  fail('Não foi possível ler data/auth.json. Nenhum dado foi alterado.');
}

if (!auth.salt || !auth.passwordHash) {
  fail('data/auth.json não tem o material de credencial esperado. Nenhum dado foi alterado.');
}

const rows = migrationIdentities(builtinAccounts, auth);
if (process.env.MIGRATE_DRY_RUN === '1') {
  console.log(`Prontas ${rows.length}. Nenhuma alteração enviada.`);
  process.exit(0);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
let inserted = 0;
let kept = 0;
for (const account of rows) {
  const { error } = await db.from('unica_users').insert(account);
  if (!error) {
    inserted += 1;
    continue;
  }
  if (error.code === '23505') {
    kept += 1;
    continue;
  }
  console.error('[unica-auth] migration', error.code || 'unknown');
  process.exit(1);
}

console.log(`Inseridas ${inserted}. Já existentes e mantidas sem alteração: ${kept}.`);
