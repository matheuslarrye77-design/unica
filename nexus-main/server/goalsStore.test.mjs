import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { emptyStore } from './goals.mjs';
import { createGoalsStore, goalsDocumentId, STORAGE_REPLY } from './goalsStore.mjs';
import { handleGoals } from './goalsApi.mjs';
import { ingestReport } from './ledger.mjs';

const now = new Date(2026, 10, 1, 12, 0, 0);
const felipe = { id: 'tm-4', name: 'Felipe Costa', funcao: 'E-mail', role: 'Atendimento', aliases: [] };
const rafael = { id: 'tm-8', name: 'Rafael Oliveira', funcao: 'E-mail', role: 'Atendimento', aliases: [] };
const leader = { id: '1', name: 'Matheus Larrie', role: 'Colaborador', department: 'Comunicação' };
const member = { id: '9', name: 'Camila Souza', role: 'Atendimento', department: 'Atendimento' };

function memoryClient(initial = {}) {
  const rows = new Map(Object.entries(initial));
  let blocked = false;
  let failRead = null;
  let failWrite = null;
  let hold;
  const api = {
    failRead(code) { failRead = code; },
    failWrite(code) { failWrite = code; },
    holdWrites() { blocked = true; hold = []; },
    releaseWrites() {
      blocked = false;
      const pending = hold ?? [];
      hold = undefined;
      for (const item of pending) item();
    },
    snapshot() {
      return Object.fromEntries([...rows.entries()].map(([id, row]) => [id, JSON.parse(JSON.stringify(row))]));
    },
    from() {
      const filters = {};
      let action = 'select';
      let payload;
      const run = () => {
        if (action === 'select') {
          if (failRead) return { data: null, error: { code: failRead } };
          const row = rows.get(filters.id);
          return { data: row ? JSON.parse(JSON.stringify(row)) : null, error: null };
        }
        const finish = () => {
          if (failWrite) return { data: null, error: { code: failWrite } };
          if (action === 'insert') {
            if (rows.has(payload.id)) return { data: null, error: { code: '23505', message: 'duplicate' } };
            rows.set(payload.id, { id: payload.id, payload: payload.payload, updated_at: payload.updated_at });
            return { data: [{ id: payload.id }], error: null };
          }
          if (action === 'update') {
            const row = rows.get(filters.id);
            if (!row || (filters.updated_at && row.updated_at !== filters.updated_at)) return { data: [], error: null };
            rows.set(filters.id, { ...row, payload: payload.payload, updated_at: payload.updated_at });
            return { data: [{ id: filters.id }], error: null };
          }
          if (action === 'upsert') {
            rows.set(payload.id, { id: payload.id, payload: payload.payload, updated_at: payload.updated_at });
            return { data: [{ id: payload.id }], error: null };
          }
          return { data: null, error: { code: 'unknown' } };
        };
        if (blocked) {
          return new Promise((resolve) => {
            hold.push(() => resolve(finish()));
          });
        }
        return finish();
      };
      const chain = {
        select() {
          if (!payload) action = 'select';
          return chain;
        },
        insert(value) { action = 'insert'; payload = value; return chain; },
        update(value) { action = 'update'; payload = value; return chain; },
        upsert(value) { action = 'upsert'; payload = value; return chain; },
        eq(field, value) { filters[field] = value; return chain; },
        maybeSingle() { return run(); },
        then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
      };
      return chain;
    },
  };
  return api;
}

function envFor(stage) {
  return {
    VERCEL: '1',
    VERCEL_ENV: stage,
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SECRET_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature',
  };
}

test('cada ambiente usa um documento próprio', () => {
  assert.equal(goalsDocumentId({ VERCEL_ENV: 'production' }), 'goals');
  assert.equal(goalsDocumentId({ VERCEL_ENV: 'preview' }), 'goals-preview');
  assert.equal(goalsDocumentId({ VERCEL_ENV: 'development' }), 'goals-development');
  assert.equal(goalsDocumentId({}), 'goals-development');
  assert.equal(goalsDocumentId({ GOALS_DOCUMENT_ID: 'goals-custom', VERCEL_ENV: 'production' }), 'goals-custom');
});

test('duas importações simultâneas de pessoas diferentes são preservadas', async () => {
  const db = memoryClient();
  const persist = createGoalsStore({ env: envFor('production'), remote: true, client: db, migrateBlob: async () => ({ ok: true, payload: null }) });
  db.holdWrites();
  const first = persist.mutate((store) => ingestReport(store, 'Felipe Costa: 320 tickets resolvidos no mês.', [felipe, rafael], { now }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  const second = persist.mutate((store) => ingestReport(store, 'Rafael Oliveira: 285 tickets resolvidos no mês.', [felipe, rafael], { now }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  db.releaseWrites();
  const a = await first;
  const b = await second;
  assert.equal(a.error, undefined);
  assert.equal(b.error, undefined);
  const loaded = await persist.load();
  const ids = loaded.store.ledger.records.map((row) => row.userId).sort();
  assert.deepEqual(ids, ['tm-4', 'tm-8']);
  assert.equal(loaded.store.ledger.records.find((row) => row.userId === 'tm-4').values.resolvidosCount, 320);
  assert.equal(loaded.store.ledger.records.find((row) => row.userId === 'tm-8').values.resolvidosCount, 285);
});

test('duas atualizações simultâneas do mesmo colaborador preservam histórico e a versão mais nova', async () => {
  const start = ingestReport(emptyStore(), 'Felipe Costa: 150 tickets resolvidos no mês.', [felipe], { now }).store;
  const db = memoryClient({ goals: { id: 'goals', payload: start, updated_at: 'v1' } });
  const persist = createGoalsStore({ env: envFor('production'), remote: true, client: db, migrateBlob: async () => ({ ok: true, payload: null }) });
  db.holdWrites();
  const first = persist.mutate((store) => ingestReport(store, 'Felipe Costa: 220 tickets resolvidos no mês.', [felipe], { now }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  const second = persist.mutate((store) => ingestReport(store, 'Felipe Costa: 180 tickets resolvidos no mês.', [felipe], { now }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  db.releaseWrites();
  await first;
  await second;
  const loaded = await persist.load();
  assert.equal(loaded.store.ledger.records.length, 1);
  const record = loaded.store.ledger.records[0];
  assert.equal(record.values.resolvidosCount, 180);
  assert.equal(record.history.some((item) => item.values.resolvidosCount === 150), true);
  assert.equal(record.history.some((item) => item.values.resolvidosCount === 220), true);
});

test('leitura remota 403 não usa o JSON empacotado nem grava por cima', async () => {
  const db = memoryClient();
  db.failRead('42501');
  const persist = createGoalsStore({
    env: envFor('production'),
    remote: true,
    client: db,
    migrateBlob: async () => ({ ok: false, detail: '403' }),
  });
  const loaded = await persist.load();
  assert.equal(loaded.error, 'storage');
  assert.equal(loaded.kind, 'storage');
  assert.equal(loaded.reply, STORAGE_REPLY);
  assert.equal(Object.keys(db.snapshot()).length, 0);
});

test('timeout na gravação não altera o banco', async () => {
  const start = ingestReport(emptyStore(), 'Felipe Costa: 150 tickets resolvidos no mês.', [felipe], { now }).store;
  const db = memoryClient({ goals: { id: 'goals', payload: start, updated_at: 'v1' } });
  db.failWrite('timeout');
  const persist = createGoalsStore({ env: envFor('production'), remote: true, client: db, migrateBlob: async () => ({ ok: true, payload: null }) });
  const result = await persist.mutate((store) => ingestReport(store, 'Felipe Costa: 220 tickets resolvidos no mês.', [felipe], { now }));
  assert.equal(result.error, 'storage');
  assert.equal(db.snapshot().goals.payload.ledger.records[0].values.resolvidosCount, 150);
});

test('nova implantação e reinício leem o documento remoto, não o arquivo local', async () => {
  const remoteStore = ingestReport(emptyStore(), 'Rafael Oliveira: 285 tickets resolvidos no mês.', [rafael], { now }).store;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'goals-'));
  fs.writeFileSync(path.join(dir, 'goals.json'), JSON.stringify(ingestReport(emptyStore(), 'Felipe Costa: 1 tickets resolvidos no mês.', [felipe], { now }).store));
  const db = memoryClient({ goals: { id: 'goals', payload: remoteStore, updated_at: 'v9' } });
  const persist = createGoalsStore({ env: envFor('production'), dir, remote: true, client: db, migrateBlob: async () => ({ ok: true, payload: null }) });
  const loaded = await persist.load();
  assert.equal(loaded.store.ledger.records[0].userId, 'tm-8');
  assert.equal(loaded.store.ledger.records.some((row) => row.userId === 'tm-4'), false);
});

test('importação no Preview não altera Production', async () => {
  const db = memoryClient({ goals: { id: 'goals', payload: emptyStore(), updated_at: 'prod' } });
  const preview = createGoalsStore({ env: envFor('preview'), remote: true, client: db, migrateBlob: async () => ({ ok: true, payload: null }) });
  const result = await preview.mutate((store) => ingestReport(store, 'Felipe Costa: 320 tickets resolvidos no mês.', [felipe], { now }));
  assert.equal(result.error, undefined);
  assert.equal(preview.id, 'goals-preview');
  const snapshot = db.snapshot();
  assert.equal(snapshot.goals.payload.ledger?.records?.length || 0, 0);
  assert.equal(snapshot['goals-preview'].payload.ledger.records[0].userId, 'tm-4');
});

test('depois da indisponibilidade o banco volta com os dados anteriores', async () => {
  const saved = ingestReport(emptyStore(), 'Felipe Costa: 320 tickets resolvidos no mês.', [felipe], { now }).store;
  const db = memoryClient({ goals: { id: 'goals', payload: saved, updated_at: 'ok' } });
  db.failRead('503');
  const persist = createGoalsStore({ env: envFor('production'), remote: true, client: db, migrateBlob: async () => ({ ok: false, detail: '503' }) });
  const down = await persist.load();
  assert.equal(down.error, 'storage');
  db.failRead(null);
  const up = await persist.load();
  assert.equal(up.store.ledger.records[0].values.resolvidosCount, 320);
});

test('migração do Blob só entra em Production e só se o Supabase estiver vazio', async () => {
  const blob = ingestReport(emptyStore(), 'Rafael Oliveira: 90 tickets resolvidos no mês.', [rafael], { now }).store;
  let asked = 0;
  const emptyDb = memoryClient();
  const production = createGoalsStore({
    env: envFor('production'),
    remote: true,
    client: emptyDb,
    migrateBlob: async () => { asked += 1; return { ok: true, payload: blob }; },
  });
  const migrated = await production.load();
  assert.equal(migrated.store.ledger.records[0].userId, 'tm-8');
  assert.equal(asked, 1);
  const previewDb = memoryClient();
  const preview = createGoalsStore({
    env: envFor('preview'),
    remote: true,
    client: previewDb,
    migrateBlob: async () => { asked += 1; return { ok: true, payload: blob }; },
  });
  const previewLoad = await preview.load();
  assert.equal(previewLoad.store.ledger.records.length, 0);
  assert.equal(asked, 1);
});

function fakeRes() {
  const res = { status: 0, body: null };
  return {
    res,
    send(_res, status, body) {
      res.status = status;
      res.body = body;
    },
  };
}

test('GET omite o ledger completo de quem não é líder e a API avisa indisponibilidade', async () => {
  const saved = ingestReport(emptyStore(), 'Felipe Costa: 320 tickets resolvidos no mês.', [felipe], { now }).store;
  const db = memoryClient({ goals: { id: 'goals', payload: saved, updated_at: 'ok' } });
  const persist = createGoalsStore({ env: envFor('production'), remote: true, client: db, migrateBlob: async () => ({ ok: true, payload: null }) });
  const open = fakeRes();
  await handleGoals({ method: 'GET', url: '/api/goals' }, {}, member, os.tmpdir(), [], [felipe], open.send, async () => Buffer.from('{}'), { store: persist });
  assert.equal(open.res.status, 200);
  assert.equal(open.res.body.ledger.records.length, 0);
  assert.equal(open.res.body.canManage, false);
  const lead = fakeRes();
  await handleGoals({ method: 'GET', url: '/api/goals' }, {}, leader, os.tmpdir(), [], [felipe], lead.send, async () => Buffer.from('{}'), { store: persist });
  assert.equal(lead.res.body.ledger.records.length, 1);
  db.failRead('42501');
  const fail = fakeRes();
  await handleGoals({ method: 'GET', url: '/api/goals' }, {}, leader, os.tmpdir(), [], [felipe], fail.send, async () => Buffer.from('{}'), { store: persist });
  assert.equal(fail.res.status, 503);
  assert.equal(fail.res.body.kind, 'storage');
  const ui = fs.readFileSync(new URL('../src/components/recognition/GoalsCenter.tsx', import.meta.url), 'utf8');
  assert.equal(ui.includes("data.kind === 'storage'"), true);
  const durable = fs.readFileSync(new URL('./durable.mjs', import.meta.url), 'utf8');
  assert.equal(durable.includes("['goals', 'goals.json']"), false);
});
