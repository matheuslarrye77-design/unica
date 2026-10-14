import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

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

const { builtinAccounts } = await import('../server/auth/accounts.ts');
const identities = builtinAccounts().map((account) => ({
  id: account.id,
  email: account.email.toLowerCase(),
  name: account.name,
  role: account.role,
  department: account.department ?? '',
  avatar: account.avatar ?? '',
}));

for (const colleague of Array.isArray(auth.colleagues) ? auth.colleagues : []) {
  const email = String(colleague.email ?? '').trim().toLowerCase();
  if (!email || identities.some((item) => item.email === email || item.id === colleague.id)) continue;
  identities.push({
    id: String(colleague.id),
    email,
    name: String(colleague.name ?? ''),
    role: String(colleague.role ?? ''),
    department: String(colleague.department ?? ''),
    avatar: String(colleague.avatar ?? ''),
  });
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let inserted = 0;
let kept = 0;
for (const account of identities) {
  const { error } = await db.from('unica_users').insert({
    ...account,
    password_hash: auth.passwordHash,
    password_salt: auth.salt,
  });
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
