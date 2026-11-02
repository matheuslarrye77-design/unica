import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { commitTemplate, interpretCriteria } from './criteria.mjs';
import { emptyStore, parseReport, publicStore, reportBankSnapshot, runAssistant, understandGoalsMessage } from './goals.mjs';
import { handleGoals } from './goalsApi.mjs';
import { createGoalsStore } from './goalsStore.mjs';
import { applyGoalsReview, ingestReport } from './ledger.mjs';
import { teamRoster } from '../src/data/team.ts';

const now = new Date(2026, 10, 2, 12, 0, 0);
const felipe = { id: 'tm-4', name: 'Felipe Costa', funcao: 'E-mail', role: 'Atendimento', aliases: [] };
const rafael = { id: 'tm-8', name: 'Rafael Oliveira', funcao: 'E-mail', role: 'Atendimento', aliases: [] };
const people = [felipe, rafael, { id: 'tm-15', name: 'Isabela Costa', funcao: 'Chat', role: 'Atendimento', aliases: [] }];

const goalsText = `Quatro metas para novembro de 2026:
* Tickets resolvidos: pelo menos 320.
* Satisfação: pelo menos 95%.
* Primeira resposta: no máximo 5 minutos.
* Tempo médio de resolução: no máximo 8 minutos.`;

const resultsText = `Rafael Oliveira:

* 300 tickets resolvidos.
* 94% de satisfação.
* 4 minutos de primeira resposta.
* 9 minutos de tempo médio de resolução.

Felipe Costa:

* 350 tickets resolvidos.
* 97% de satisfação.
* 3 minutos de primeira resposta.
* 7 minutos de tempo médio de resolução.`;

test('nome em uma linha e indicadores nas seguintes viram o colaborador da Equipe', () => {
  const parsed = parseReport(resultsText, people);
  assert.equal(parsed.rows.length, 2);
  const rafa = parsed.rows.find((row) => row.userId === 'tm-8');
  const feli = parsed.rows.find((row) => row.userId === 'tm-4');
  assert.equal(rafa.values.resolvidosCount, 300);
  assert.equal(rafa.values.satisfacao, 94);
  assert.equal(rafa.values.primeira, 4);
  assert.equal(rafa.values.resolucao, 9);
  assert.equal(rafa.values.resolvidos, null);
  assert.equal(feli.values.resolvidosCount, 350);
  assert.equal(feli.values.satisfacao, 97);
  assert.equal(feli.values.primeira, 3);
  assert.equal(feli.values.resolucao, 7);
  assert.equal(parsed.rows.every((row) => row.userId), true);
});

test('fluxo completo grava novembro/2026, dois colaboradores e não mexe no pódio', async () => {
  const interpreted = await interpretCriteria(goalsText, { generate: async () => ({ text: '{}' }) });
  assert.equal(interpreted.kind, 'proposal');
  assert.equal(interpreted.periodLabel, 'Novembro/2026');
  assert.equal(interpreted.periodKey, 'month:2026-11');
  assert.equal(interpreted.rules.length, 4);

  const saved = commitTemplate(emptyStore(), interpreted, { confirm: true, name: 'Metas novembro 2026' });
  assert.equal(saved.saved, true);
  assert.equal(saved.store.criterion.mode, 'preset');
  assert.equal(saved.store.imports.length, 0);
  assert.equal(saved.template.periodKey, 'month:2026-11');
  assert.equal(saved.template.periodLabel, 'Novembro/2026');

  const ingested = ingestReport(saved.store, resultsText, people, { now });
  assert.equal(ingested.kind, 'ledger');
  assert.equal(ingested.store.criterion.mode, 'preset');
  assert.equal(ingested.store.imports.length, 0);
  assert.equal((ingested.store.ledger.applied ?? []).length, 0);
  assert.equal(ingested.store.ledger.records.length, 2);
  assert.match(ingested.reply, /pódio não foi alterado/i);

  const view = publicStore(ingested.store);
  assert.equal(view.criterion.mode, 'preset');
  const month = view.bank.periods.find((item) => item.key === '2026-11');
  assert.ok(month);
  assert.equal(month.label, 'Novembro/2026');
  assert.equal(month.goals.length, 4);
  assert.equal(month.goals.every((item) => item.periodLabel === 'Novembro/2026'), true);
  assert.equal(month.pending.length, 0);
  assert.equal(month.people.length, 2);

  const rafa = month.people.find((row) => row.userId === 'tm-8');
  const feli = month.people.find((row) => row.userId === 'tm-4');
  const flag = (person, field) => person.indicators.find((item) => item.field === field);
  assert.equal(rafa.periodLabel, 'Novembro/2026');
  assert.equal(flag(rafa, 'resolvidosCount').met, false);
  assert.equal(flag(rafa, 'satisfacao').met, false);
  assert.equal(flag(rafa, 'primeira').met, true);
  assert.equal(flag(rafa, 'resolucao').met, false);
  assert.equal(flag(feli, 'resolvidosCount').met, true);
  assert.equal(flag(feli, 'satisfacao').met, true);
  assert.equal(flag(feli, 'primeira').met, true);
  assert.equal(flag(feli, 'resolucao').met, true);
  assert.equal(month.people.some((row) => row.indicators.some((item) => item.field === 'resolvidos')), false);

  const snapshot = reportBankSnapshot(ingested.store);
  assert.deepEqual(snapshot.periods[0].label, 'Novembro/2026');
  assert.equal(view.ledger.records.every((row) => row.userId && row.periodLabel === 'Novembro/2026'), true);
});

test('primeira resposta nas metas não vira critério do pódio', () => {
  const asked = runAssistant({ text: goalsText, store: emptyStore(), people, intent: 'custom' });
  assert.notEqual(asked.kind, 'criterion');
  const loose = runAssistant({ text: 'quero usar primeira resposta no pódio', store: emptyStore(), people });
  assert.equal(loose.kind, 'ask');
  assert.match(loose.reply, /confirme explicitamente/i);
  const confirmed = runAssistant({ text: 'Confirmar pódio com primeira resposta', store: emptyStore(), people });
  assert.equal(confirmed.kind, 'criterion');
  assert.equal(confirmed.criterion.indicator, 'primeira');
});

test('a interface do banco mostra mês/ano, gestão e resultados separados', () => {
  const ui = fs.readFileSync(new URL('../src/components/recognition/GoalsCenter.tsx', import.meta.url), 'utf8');
  assert.match(ui, /Metas definidas pela gestão/);
  assert.match(ui, /Resultados individuais/);
  assert.match(ui, /Confirmar metas/);
  assert.match(ui, /O pódio não foi alterado/);
  assert.match(ui, /Novembro\/\$\{year\}|\/\$\{year\}/);
  assert.match(ui, /pendingRules\.comparisons/);
  assert.match(ui, /\/api\/goals\/center/);
  assert.match(ui, /data\.conference/);
  assert.match(ui, /conference\.people/);
  assert.match(ui, /messages\.slice\(-6\)/);
  assert.match(ui, /interpretar metas gerais da gestão/);
  assert.match(ui, /saving\.current/);
  assert.match(ui, /regra personalizada/);
  assert.equal(ui.includes('Olá! Envie os relatórios da equipe'), false);
  assert.equal(ui.includes('Escreva com suas palavras como o pódio deve funcionar'), false);
  assert.equal(ui.includes('O pódio passa a usar esta regra'), false);
});

const NATURAL_MESSAGE = 'Preciso definir as metas gerais para novembro de 2026: tickets resolvidos pelo menos 320, satisfação pelo menos 95%, primeira resposta no máximo 5 minutos e tempo médio de resolução no máximo 8 minutos. O Rafael Oliveira ficou com 300 tickets resolvidos, 94% de satisfação, 4 minutos de primeira resposta e 9 minutos de tempo médio de resolução. O Felipe Costa ficou com 350 tickets resolvidos, 97% de satisfação, 3 minutos de primeira resposta e 7 minutos de tempo médio de resolução. Compara os resultados de cada um com as metas. Conferir antes de salvar. Não alterar o pódio.';

const NATURAL_VARIATIONS = [
  NATURAL_MESSAGE,
  `Metas de novembro de 2026
- pelo menos 320 tickets resolvidos
- satisfação no mínimo 95%
- primeira resposta até 5 min
- tma no máximo 8 min

Rafael Oliveira: 300 tickets, 94% de satisfação, 4 min de primeira resposta, 9 min de resolução.
Felipe Costa: 350 tickets, 97% de satisfação, 3 min de primeira resposta, 7 min de resolução.

Compara com as metas, conferir antes de salvar, não alterar o pódio.`,
  `oi, as metas de nov/2026 ficam assim: 320 tickets no mínimo, 95% de satisfação pelo menos, primeira resposta no máximo 5 minutos e resolução até 8. rafael oliveira fez 300 tickets, 94% satisfação, 4 min primeira resposta e 9 de tma. felipe costa fez 350, 97%, 3 min e 7 min. compara aí, confere antes de salvar e não mexe no pódio.`,
];

function assertNatural(understood) {
  assert.equal(understood.kind, 'review');
  assert.equal(understood.persist, false);
  assert.equal(understood.periodLabel, 'Novembro/2026');
  assert.equal(understood.rules.length, 4);
  assert.deepEqual(understood.rules.map((rule) => rule.indicator).sort(), ['primeira', 'resolucao', 'resolvidosCount', 'satisfacao']);
  const rafa = understood.rows.find((row) => row.userId === 'tm-8');
  const feli = understood.rows.find((row) => row.userId === 'tm-4');
  assert.equal(rafa.values.resolvidosCount, 300);
  assert.equal(rafa.values.satisfacao, 94);
  assert.equal(rafa.values.primeira, 4);
  assert.equal(rafa.values.resolucao, 9);
  assert.equal(feli.values.resolvidosCount, 350);
  assert.equal(feli.values.satisfacao, 97);
  assert.equal(feli.values.primeira, 3);
  assert.equal(feli.values.resolucao, 7);
  const flag = (person, field) => understood.comparisons.find((row) => row.userId === person).indicators.find((item) => item.indicator === field);
  assert.equal(flag('tm-8', 'resolvidosCount').met, false);
  assert.equal(flag('tm-8', 'satisfacao').met, false);
  assert.equal(flag('tm-8', 'primeira').met, true);
  assert.equal(flag('tm-8', 'resolucao').met, false);
  assert.equal(flag('tm-4', 'resolvidosCount').met, true);
  assert.equal(flag('tm-4', 'satisfacao').met, true);
  assert.equal(flag('tm-4', 'primeira').met, true);
  assert.equal(flag('tm-4', 'resolucao').met, true);
  assert.match(understood.reply, /Conferência/);
  assert.match(understood.reply, /não foi alterado|permanece como está/i);
}

test('mensagem natural mista é reconhecida e não cai no fallback', () => {
  const store = emptyStore();
  const understood = understandGoalsMessage(NATURAL_MESSAGE, people);
  assertNatural(understood);
  const assistant = runAssistant({ text: NATURAL_MESSAGE, store, people });
  assert.equal(assistant.kind, 'review');
  assert.notEqual(assistant.kind, 'ask');
  assert.notEqual(assistant.kind, 'criterion');
  assert.equal(store.criterion.mode, 'preset');
  assert.equal(store.ledger.records.length, 0);
});

for (const [index, text] of NATURAL_VARIATIONS.entries()) {
  test(`variação natural ${index + 1} preserva metas, pessoas e comparação`, () => {
    assertNatural(understandGoalsMessage(text, people));
  });
}

test('conferência natural só grava no banco depois de confirmar, sem pódio', () => {
  const original = emptyStore();
  const understood = understandGoalsMessage(NATURAL_MESSAGE, people);
  assert.equal(original.ledger.records.length, 0);
  const saved = applyGoalsReview(original, understood, people, now);
  assert.equal(original.ledger.records.length, 0);
  assert.equal(saved.store.criterion.mode, 'preset');
  assert.equal((saved.store.ledger.applied ?? []).length, 0);
  const view = publicStore(saved.store);
  const month = view.bank.periods.find((item) => item.key === '2026-11');
  assert.equal(month.label, 'Novembro/2026');
  assert.equal(month.goals.length, 4);
  assert.equal(month.people.length, 2);
  assert.equal(month.pending.length, 0);
  assert.equal(month.people.find((row) => row.userId === 'tm-8').indicators.find((item) => item.field === 'resolvidosCount').met, false);
  assert.equal(month.people.find((row) => row.userId === 'tm-4').indicators.find((item) => item.field === 'resolucao').met, true);
});

const leader = { id: '1', name: 'Helena Duarte', role: 'Líder', department: 'Comunicação' };

function memoryGoalsStore() {
  const row = { id: 'goals', payload: emptyStore(), updated_at: 'ok' };
  return createGoalsStore({
    env: {
      VERCEL: '1',
      VERCEL_ENV: 'production',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SECRET_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature',
    },
    remote: true,
    client: {
      from() {
        const filters = {};
        let action = 'select';
        let payload;
        const run = () => {
          if (action === 'select') return { data: JSON.parse(JSON.stringify(row)), error: null };
          row.payload = payload.payload;
          row.updated_at = payload.updated_at;
          return { data: [{ id: payload.id }], error: null };
        };
        const chain = {
          select() { return chain; },
          insert(value) { action = 'insert'; payload = value; return chain; },
          update(value) { action = 'update'; payload = value; return chain; },
          upsert(value) { action = 'upsert'; payload = value; return chain; },
          eq(field, value) { filters[field] = value; return chain; },
          maybeSingle() { return run(); },
          then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
        };
        return chain;
      },
    },
    migrateBlob: async () => ({ ok: true, payload: null }),
  });
}

async function postAssistant(payload, req = {}, generate) {
  const persist = req.store ?? memoryGoalsStore();
  const res = { status: 0, body: null };
  await handleGoals(
    { method: 'POST', url: '/api/goals/assistant', ...req },
    {},
    leader,
    process.cwd(),
    [],
    teamRoster,
    (_response, status, body) => { res.status = status; res.body = body; },
    async () => Buffer.from(Object.prototype.hasOwnProperty.call(req, 'raw') ? req.raw : JSON.stringify(payload)),
    { store: persist, generate: generate ?? (async () => ({ error: 'unconfigured' })) },
  );
  res.store = persist;
  return res;
}

function assertApiReview(result) {
  assert.equal(result.status, 200);
  assert.equal(result.body.kind, 'review');
  assert.notEqual(result.body.kind, 'ask');
  assert.equal(result.body.persist, false);
  assert.equal(result.body.periodLabel, 'Novembro/2026');
  assert.equal(result.body.rules.length, 4);
  assertNatural(result.body);
  assert.equal(result.body.criterion?.mode ?? 'preset', 'preset');
  assert.equal((result.body.ledger?.applied ?? []).length, 0);
}

test('a rota real /api/goals/assistant reconhece a mensagem natural da interface', async () => {
  const result = await postAssistant({ text: NATURAL_MESSAGE, intent: 'idle', preview: null, periodKey: '', history: [] });
  assertApiReview(result);
});

test('a rota real aceita intent custom, rewrite da Vercel e corpo já parseado', async () => {
  const custom = await postAssistant({ text: NATURAL_MESSAGE, intent: 'custom', preview: null, periodKey: '', history: [] });
  assertApiReview(custom);
  const nested = await postAssistant(
    { text: NATURAL_MESSAGE, intent: 'idle', preview: null, periodKey: '', history: [] },
    { url: '/api/goals?nested=goals/assistant' },
  );
  assertApiReview(nested);
  const parsed = await postAssistant(
    { text: NATURAL_MESSAGE, intent: 'idle' },
    { url: '/api/goals/assistant', body: { text: NATURAL_MESSAGE, intent: 'idle' }, raw: '' },
  );
  assertApiReview(parsed);
});

test('a rota real reconhece a mensagem em tópicos sem gravar nem mudar o pódio', async () => {
  const text = NATURAL_VARIATIONS[1];
  const result = await postAssistant({ text, intent: 'idle', preview: null, periodKey: '', history: [] });
  assertApiReview(result);
});

test('a rota chama o Gemini, confere e só grava depois de confirmar, sem pódio', async () => {
  let prompts = 0;
  const generate = async () => {
    prompts += 1;
    return { error: 'unconfigured' };
  };
  const persist = memoryGoalsStore();
  const first = await postAssistant({ text: NATURAL_MESSAGE, intent: 'idle', history: [{ text: 'oi' }] }, { store: persist }, generate);
  assert.equal(prompts, 1);
  assertApiReview(first);
  const saved = await postAssistant({
    text: 'confirmar',
    review: {
      period: first.body.period,
      periodKey: first.body.periodKey,
      periodLabel: first.body.periodLabel,
      rules: first.body.rules,
      rows: first.body.rows,
      sourceText: NATURAL_MESSAGE,
    },
  }, { store: persist }, generate);
  assert.equal(saved.status, 200);
  assert.equal(saved.body.kind, 'ledger');
  assert.equal(saved.body.criterion.mode, 'preset');
  assert.equal((saved.body.ledger.applied ?? []).length, 0);
  const month = saved.body.bank.periods.find((item) => item.key === '2026-11');
  assert.equal(month.label, 'Novembro/2026');
  assert.equal(month.goals.length, 4);
  assert.equal(month.people.length, 2);
  const reload = { status: 0, body: null };
  await handleGoals({ method: 'GET', url: '/api/goals' }, {}, leader, process.cwd(), [], teamRoster, (_r, status, body) => { reload.status = status; reload.body = body; }, async () => Buffer.from('{}'), { store: persist, generate });
  const again = reload.body.bank.periods.find((item) => item.key === '2026-11');
  assert.equal(again.people.length, 2);
  assert.equal(again.goals.length, 4);
  assert.equal(reload.body.criterion.mode, 'preset');
});

test('correção de resultado atualiza o mesmo colaborador no mesmo período', async () => {
  const persist = memoryGoalsStore();
  const first = await postAssistant({ text: NATURAL_MESSAGE, intent: 'idle' }, { store: persist });
  await postAssistant({
    text: 'confirmar',
    review: { period: first.body.period, periodKey: first.body.periodKey, periodLabel: first.body.periodLabel, rules: first.body.rules, rows: first.body.rows, sourceText: NATURAL_MESSAGE },
  }, { store: persist });
  const fix = 'O Rafael Oliveira no novembro de 2026 ficou com 310 tickets resolvidos, 94% de satisfação, 4 minutos de primeira resposta e 9 minutos de TMA. Conferir antes de salvar. Não alterar o pódio.';
  const review = await postAssistant({ text: fix, intent: 'idle' }, { store: persist });
  assert.equal(review.body.kind, 'review');
  assert.equal(review.body.rows.find((row) => row.userId === 'tm-8').values.resolvidosCount, 310);
  await postAssistant({
    text: 'confirmar',
    review: { period: review.body.period, periodKey: review.body.periodKey, periodLabel: review.body.periodLabel, rules: review.body.rules, rows: review.body.rows, sourceText: fix },
  }, { store: persist });
  const reload = { status: 0, body: null };
  await handleGoals({ method: 'GET', url: '/api/goals' }, {}, leader, process.cwd(), [], teamRoster, (_r, status, body) => { reload.status = status; reload.body = body; }, async () => Buffer.from('{}'), { store: persist, generate: async () => ({ error: 'unconfigured' }) });
  const rafa = reload.body.bank.periods.find((item) => item.key === '2026-11').people.find((row) => row.userId === 'tm-8');
  assert.equal(rafa.indicators.find((item) => item.field === 'resolvidosCount').value, 310);
  assert.equal(reload.body.criterion.mode, 'preset');
});

async function postCenter(payload, req = {}, generate) {
  const persist = req.store ?? memoryGoalsStore();
  const res = { status: 0, body: null };
  await handleGoals(
    { method: 'POST', url: '/api/goals/center', ...req },
    {},
    leader,
    process.cwd(),
    [],
    teamRoster,
    (_response, status, body) => { res.status = status; res.body = body; },
    async () => Buffer.from(Object.prototype.hasOwnProperty.call(req, 'raw') ? req.raw : JSON.stringify(payload)),
    { store: persist, generate: generate ?? (async () => ({ error: 'unconfigured' })) },
  );
  res.store = persist;
  return res;
}

function assertConference(result) {
  assert.equal(result.status, 200);
  assert.equal(result.body.kind, 'conference');
  assert.equal(result.body.persist, false);
  const conference = result.body.conference;
  assert.ok(conference);
  assert.equal(conference.period.label, 'Novembro/2026');
  assert.equal(conference.goals.length, 4);
  assert.equal(conference.people.length, 2);
  const rafa = conference.people.find((row) => row.userId === 'tm-8');
  const feli = conference.people.find((row) => row.userId === 'tm-4');
  const valueOf = (person, field) => person.results.find((item) => item.indicator === field)?.value;
  assert.equal(valueOf(rafa, 'resolvidosCount'), 300);
  assert.equal(valueOf(rafa, 'satisfacao'), 94);
  assert.equal(valueOf(rafa, 'primeira'), 4);
  assert.equal(valueOf(rafa, 'resolucao'), 9);
  assert.equal(valueOf(feli, 'resolvidosCount'), 350);
  assert.equal(valueOf(feli, 'satisfacao'), 97);
  assert.equal(valueOf(feli, 'primeira'), 3);
  assert.equal(valueOf(feli, 'resolucao'), 7);
  assert.equal(rafa.results.find((item) => item.indicator === 'resolvidosCount').status, 'Abaixo da meta');
  assert.equal(feli.results.find((item) => item.indicator === 'resolucao').status, 'Atingiu');
  assert.match(result.body.reply, /conferência pronta/i);
  assert.equal(result.body.reply.includes('Tickets resolvidos | 320'), false);
  assert.equal(result.body.reply.includes('Rafael Oliveira'), false);
}

test('a rota exclusiva /api/goals/center monta uma conferência completa da mensagem natural', async () => {
  const namesOnly = async () => ({
    text: JSON.stringify({
      status: 'ready',
      intent: 'review',
      explanation: 'metas e resultados',
      questions: [],
      period: 'month',
      periodKey: 'month:2026-11',
      periodLabel: 'Novembro/2026',
      changePodium: false,
      goals: [],
      people: [
        { name: 'Rafael Oliveira', resolvidosCount: null, resolvidos: null, transferidos: null, primeira: null, resolucao: null, satisfacao: null },
        { name: 'Felipe Costa', resolvidosCount: null, resolvidos: null, transferidos: null, primeira: null, resolucao: null, satisfacao: null },
      ],
    }),
  });
  const result = await postCenter({ text: NATURAL_MESSAGE, history: [] }, {}, namesOnly);
  assertConference(result);
  const nested = await postCenter({ text: NATURAL_MESSAGE }, { url: '/api/goals?nested=goals/center' });
  assertConference(nested);
});

test('a rota exclusiva não monta conferência incompleta e só grava depois de confirmar', async () => {
  const persist = memoryGoalsStore();
  const incomplete = await postCenter({ text: 'Preciso definir as metas gerais para novembro de 2026. Conferir antes de salvar.' }, { store: persist });
  assert.equal(incomplete.body.kind, 'clarify');
  assert.equal(incomplete.body.conference, null);
  const first = await postCenter({ text: NATURAL_MESSAGE }, { store: persist });
  assertConference(first);
  const saved = await postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.kind, 'saved');
  assert.equal(saved.body.criterion.mode, 'preset');
  assert.equal((saved.body.ledger.applied ?? []).length, 0);
  const month = saved.body.bank.periods.find((item) => item.key === '2026-11');
  assert.equal(month.goals.length, 4);
  assert.equal(month.people.length, 2);
  assert.equal(month.people.find((row) => row.userId === 'tm-8').indicators.find((item) => item.field === 'resolvidosCount').value, 300);
  assert.equal(month.people.find((row) => row.userId === 'tm-4').indicators.find((item) => item.field === 'satisfacao').value, 97);
  const records = saved.body.ledger.records.length;
  const again = await postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist });
  assert.equal(again.body.duplicate, true);
  assert.equal(again.body.ledger.records.length, records);
  assert.equal(again.body.bank.periods.find((item) => item.key === '2026-11').goals.length, 4);
  assert.equal(again.body.criterion.mode, 'preset');
  assert.equal((again.body.ledger.applied ?? []).length, 0);
  const parallel = await Promise.all([
    postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist }),
    postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist }),
  ]);
  assert.equal(parallel.every((item) => item.body.duplicate === true || item.body.kind === 'saved'), true);
  assert.equal(parallel[0].body.ledger.records.length, records);
  assert.equal(parallel[1].body.ledger.records.length, records);
});

const QUALITY_MESSAGE = 'Quero uma meta personalizada chamada Índice de qualidade no atendimento: pelo menos 90% em janeiro de 2027. O Rafael Oliveira ficou com 88% e o Felipe Costa ficou com 94%. Conferir antes de salvar. Não alterar o pódio.';
const COMBINED_MESSAGE = 'Critério personalizado para janeiro de 2027: primeira resposta no máximo 5 minutos e tempo médio de resolução no máximo 8 minutos. O Rafael Oliveira ficou com 4 minutos de primeira resposta e 9 minutos de TMA. O Felipe Costa ficou com 3 minutos de primeira resposta e 7 minutos de TMA. Conferir antes de salvar. Não alterar o pódio.';

test('critério personalizado aceita indicador novo sem exigir as quatro metas core', async () => {
  const persist = memoryGoalsStore();
  const first = await postCenter({ text: NATURAL_MESSAGE, mode: 'preset' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist });
  const quality = await postCenter({ text: QUALITY_MESSAGE, mode: 'custom' }, { store: persist });
  assert.equal(quality.body.kind, 'conference');
  assert.equal(quality.body.conference.goals.length, 1);
  assert.equal(quality.body.conference.goals[0].indicator, 'c:indice-de-qualidade-no-atendimento');
  assert.equal(quality.body.conference.goals[0].value, 90);
  assert.equal(quality.body.conference.period.label, 'Janeiro/2027');
  assert.equal(quality.body.conference.people.length, 2);
  const rafa = quality.body.conference.people.find((row) => row.userId === 'tm-8');
  const feli = quality.body.conference.people.find((row) => row.userId === 'tm-4');
  assert.equal(rafa.results[0].value, 88);
  assert.equal(rafa.results[0].status, 'Abaixo da meta');
  assert.equal(feli.results[0].value, 94);
  assert.equal(feli.results[0].status, 'Atingiu');
  const saved = await postCenter({ action: 'confirm', text: 'confirmar', conference: quality.body.conference }, { store: persist });
  assert.equal(saved.body.criterion.mode, 'preset');
  assert.equal((saved.body.ledger.applied ?? []).length, 0);
  const november = saved.body.bank.periods.find((item) => item.key === '2026-11');
  const january = saved.body.bank.periods.find((item) => item.key === '2027-01');
  assert.equal(november.goals.length, 4);
  assert.equal(january.goals.length, 1);
  assert.equal(january.people.find((row) => row.userId === 'tm-8').indicators.find((item) => item.field === 'c:indice-de-qualidade-no-atendimento').value, 88);
});

test('critério personalizado combina dois indicadores conhecidos', async () => {
  const result = await postCenter({ text: COMBINED_MESSAGE, mode: 'custom' });
  assert.equal(result.body.kind, 'conference');
  assert.equal(result.body.conference.goals.length, 2);
  assert.deepEqual(result.body.conference.goals.map((item) => item.indicator).sort(), ['primeira', 'resolucao']);
  assert.equal(result.body.conference.people[0].results.length, 2);
});

test('desempenho geral usa pesos, piso e não inclui transferidos nem muda o pódio', async () => {
  const persist = memoryGoalsStore();
  const first = await postCenter({ text: NATURAL_MESSAGE, mode: 'preset' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist });
  const overall = await postCenter({ text: 'Calcule o desempenho geral de novembro de 2026 com os pesos atuais. Não alterar o pódio.', mode: 'overall' }, { store: persist });
  assert.equal(overall.body.kind, 'conference');
  assert.equal(overall.body.conference.overall.scores.length, 2);
  assert.equal(new Set(overall.body.conference.overall.scores.map((item) => item.userId)).size, 2);
  assert.equal(overall.body.conference.overall.excludes.includes('transferidos'), true);
  assert.equal(overall.body.conference.overall.weights.resolvidos, 40);
  const saved = await postCenter({ action: 'confirm', text: 'confirmar', conference: overall.body.conference }, { store: persist });
  assert.equal(saved.body.criterion.mode, 'preset');
  assert.equal((saved.body.ledger.applied ?? []).length, 0);
});



