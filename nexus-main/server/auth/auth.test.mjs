import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { hashPassword } from './credentials.mjs';
import { performLogin, performLogout, performSession } from './flow.mjs';
import { applyAuthResult } from './http.mjs';
import { createLocalStore, localUserFromRequest } from './localStore.mjs';
import { guardLeader } from './permissions.mjs';
import { createClient } from '@supabase/supabase-js';
import { builtinAccounts } from './builtinAccounts.mjs';
import { migrationIdentities } from './migrationRoster.mjs';
import { supabaseConfigError } from './supabaseStore.mjs';

const user = {
  id: '1',
  name: 'Matheus Larrie',
  role: 'Colaborador',
  department: 'Comunicação',
  avatar: '',
  email: 'matheus.larrie@unica.local',
};

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unica-auth-'));
  const file = path.join(dir, 'auth.json');
  const salt = 'test-salt';
  const auth = {
    salt,
    passwordHash: hashPassword('1234', salt),
    sessions: { 'legacy-token': 'keep-me' },
    favorites: { '1': ['doc'] },
    colleagues: [],
  };
  fs.writeFileSync(file, JSON.stringify(auth, null, 2));
  return { file, auth };
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value) {
      this.body = value;
    },
  };
}

function cookieOf(result) {
  return /unica_session=([^;]+)/.exec(result.cookie)?.[1] ?? '';
}

test('login válido, inválido e e-mail normalizado', async () => {
  const { file, auth } = fixture();
  const store = createLocalStore(file, [user]);
  const invalid = await performLogin(store, { email: 'matheus', password: 'errada' });
  assert.equal(invalid.status, 401);
  assert.equal(invalid.body.error, 'invalid');
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).passwordHash, auth.passwordHash);

  for (const email of ['matheus', '  MATHEUS  ', 'Matheus.Larrie@Unica.Local']) {
    const result = await performLogin(store, { email, password: '1234' });
    assert.equal(result.status, 200);
    assert.equal(result.body.user.email, user.email);
    assert.equal(result.body.token, undefined);
    assert.equal(result.body.user.passwordHash, undefined);
    assert.match(result.cookie, /HttpOnly/);
    assert.match(result.cookie, /SameSite=Lax/);
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(saved.passwordHash, auth.passwordHash);
    assert.equal(saved.sessions['legacy-token'], 'keep-me');
    assert.deepEqual(saved.favorites, auth.favorites);
  }
});

test('sessão válida, expirada e logout', async () => {
  const { file } = fixture();
  const store = createLocalStore(file, [user]);
  const login = await performLogin(store, { email: 'matheus', password: '1234' });
  const token = decodeURIComponent(cookieOf(login));
  const current = await performSession(store, login.cookie);
  assert.equal(current.status, 200);
  assert.equal(current.body.user.id, '1');

  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  const hash = Object.keys(saved.sessionExpiry)[0];
  saved.sessionExpiry[hash] = new Date(Date.now() - 1000).toISOString();
  fs.writeFileSync(file, JSON.stringify(saved));
  const expired = await performSession(store, `unica_session=${token}`);
  assert.equal(expired.status, 401);
  assert.equal(expired.body.error, 'expired');

  const fresh = await performLogin(store, { email: 'matheus', password: '1234' });
  const loggedOut = await performLogout(store, fresh.cookie);
  assert.equal(loggedOut.status, 200);
  assert.match(loggedOut.cookie, /Max-Age=0/);
  const after = await performSession(store, fresh.cookie);
  assert.equal(after.status, 401);
});

test('cabeçalho do navegador não concede acesso', () => {
  const { file } = fixture();
  const found = localUserFromRequest({ headers: { 'x-user-id': '1', cookie: '' } }, file, [user]);
  assert.equal(found, null);
  assert.equal(guardLeader(null).status, 401);
  assert.equal(guardLeader({ role: 'Colaborador', department: 'Financeiro' }).status, 403);
  assert.equal(guardLeader(user).status, 200);
});

test('ausência de configuração do banco', () => {
  const missing = supabaseConfigError({});
  assert.equal(missing.status, 503);
  assert.equal(missing.body.error, 'config');
  const url = 'https://example.supabase.co';
  assert.equal(supabaseConfigError({ SUPABASE_URL: url, SUPABASE_SECRET_KEY: 'sb_secret_example' }), null);
  assert.equal(supabaseConfigError({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: 'aaa.bbb.ccc' }), null);
  assert.equal(supabaseConfigError({ SUPABASE_URL: url, SUPABASE_SECRET_KEY: 'sb_publishable_example' }).status, 503);
});

test('cliente instalado aceita a chave sb_secret_', () => {
  const db = createClient('https://example.supabase.co', 'sb_secret_example', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  assert.equal(typeof db.from, 'function');
});

test('POST /api/login responde JSON', async () => {
  const { file } = fixture();
  const result = await performLogin(createLocalStore(file, [user]), { email: 'matheus', password: '1234' });
  const res = response();
  applyAuthResult(res, result);
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(res.body.startsWith('{'), true);
  assert.equal(res.body.includes('<html'), false);
  const parsed = JSON.parse(res.body);
  assert.equal(parsed.user.id, '1');
  assert.equal(parsed.token, undefined);
});

test('vercel.json não entrega index.html para /api', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const source = config.rewrites[0].source;
  const pattern = new RegExp(`^${source}$`);
  assert.equal(pattern.test('/api/login'), false);
  assert.equal(pattern.test('/api/session'), false);
  assert.equal(pattern.test('/api/logout'), false);
  assert.equal(pattern.test('/kudos'), true);
  assert.equal(config.rewrites.some((item) => item.destination === '/index.html' && item.source === '/(.*)'), false);
  assert.equal(fs.existsSync(new URL('../../api/login.ts', import.meta.url)), true);
  assert.equal(fs.existsSync(new URL('../../api/session.ts', import.meta.url)), true);
  assert.equal(fs.existsSync(new URL('../../api/logout.ts', import.meta.url)), true);
});

test('script de migração carrega as contas sem o frontend', () => {
  const source = fs.readFileSync(new URL('../../scripts/migrate-auth-to-supabase.mjs', import.meta.url), 'utf8');
  assert.equal(source.includes('accounts.ts'), false);
  assert.equal(source.includes('mockData'), false);
  const matheus = builtinAccounts.find((account) => account.id === '1');
  assert.equal(matheus.email, 'matheus.larrie@unica.local');
  assert.equal(builtinAccounts.some((account) => account.email === 'priya.sharma@company.com'), false);
  const auth = {
    salt: 'salt-de-teste',
    passwordHash: 'hash-de-teste',
    colleagues: [{ id: 'col-1', email: 'Ana@Unica.local', name: 'Ana', role: 'Colaborador', department: 'Atendimento', avatar: '' }],
  };
  const rows = migrationIdentities(builtinAccounts, auth);
  const colleague = rows.find((account) => account.id === 'col-1');
  assert.equal(colleague.email, 'ana@unica.local');
  assert.equal(rows.every((account) => account.password_hash === auth.passwordHash && account.password_salt === auth.salt), true);
  const authFile = new URL('../../data/auth.json', import.meta.url);
  const before = fs.readFileSync(authFile);
  const run = spawnSync(process.execPath, ['scripts/migrate-auth-to-supabase.mjs'], {
    cwd: new URL('../..', import.meta.url),
    env: {
      ...process.env,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret_example',
      SUPABASE_SERVICE_ROLE_KEY: '',
      MIGRATE_DRY_RUN: '1',
    },
    encoding: 'utf8',
  });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /Prontas \d+\. Nenhuma alteração enviada\./);
  const stored = JSON.parse(before.toString('utf8'));
  assert.equal(run.stdout.includes(stored.passwordHash), false);
  assert.equal(run.stdout.includes(stored.salt), false);
  assert.equal(fs.readFileSync(authFile).equals(before), true);
});

test('migração sem configuração não altera auth.json', () => {
  const authFile = new URL('../../data/auth.json', import.meta.url);
  const before = fs.readFileSync(authFile);
  const run = spawnSync(process.execPath, ['scripts/migrate-auth-to-supabase.mjs'], {
    cwd: new URL('../..', import.meta.url),
    env: { ...process.env, SUPABASE_URL: '', SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '' },
    encoding: 'utf8',
  });
  const after = fs.readFileSync(authFile);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /SUPABASE_URL/);
  assert.equal(run.stdout.includes('password'), false);
  assert.deepEqual(after, before);
});
