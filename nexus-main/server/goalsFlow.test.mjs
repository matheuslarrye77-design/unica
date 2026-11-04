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
  assert.equal(saved.store.criterion.mode, 'overall');
  assert.equal(saved.store.imports.length, 0);
  assert.equal(saved.template.periodKey, 'month:2026-11');
  assert.equal(saved.template.periodLabel, 'Novembro/2026');

  const ingested = ingestReport(saved.store, resultsText, people, { now });
  assert.equal(ingested.kind, 'ledger');
  assert.equal(ingested.store.criterion.mode, 'overall');
  assert.equal(ingested.store.imports.length, 0);
  assert.equal((ingested.store.ledger.applied ?? []).length, 0);
  assert.equal(ingested.store.ledger.records.length, 2);
  assert.match(ingested.reply, /pódio não foi alterado/i);

  const view = publicStore(ingested.store);
  assert.equal(view.criterion.mode, 'overall');
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
  assert.match(ui, /aria-label="Mês"/);
  assert.match(ui, /aria-label="Ano"/);
  assert.match(ui, /createPortal/);
  assert.match(ui, /Valor da meta:/);
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
  assert.match(ui, /Critérios Personalizados/);
  assert.match(ui, /pendingPodium/);
  assert.match(ui, /Confirmar pódio/);
  assert.match(ui, /OVERALL_OPTIONS/);
  assert.match(ui, /identifica pelo texto/);
  assert.match(ui, /Ampliar chat e banco/);
  assert.equal(ui.includes('overallOn'), false);
  assert.equal(ui.includes('toggleOverall'), false);
  assert.equal(ui.includes('Critérios Predefinidos'), false);
  assert.match(ui, /mode: phase === 'idle'/);
  assert.equal(ui.includes('Olá! Envie os relatórios da equipe'), false);
  assert.equal(ui.includes('Escreva com suas palavras como o pódio deve funcionar'), false);
  assert.equal(ui.includes('Qual indicador predefinido entra no pódio desta semana'), false);
  assert.equal(ui.includes('O pódio passa a usar esta regra'), false);
  const composer = fs.readFileSync(new URL('../src/components/social/RecognitionComposer.tsx', import.meta.url), 'utf8');
  assert.match(composer, /teamRoster/);
  assert.equal(composer.includes('directoryPeople'), false);
  const institution = fs.readFileSync(new URL('../src/lib/institution.ts', import.meta.url), 'utf8');
  assert.match(institution, /const user = actor\(\)/);
});

const NATURAL_MESSAGE = 'Preciso definir as metas gerais para novembro de 2026: tickets resolvidos pelo menos 320, tickets transferidos no máximo 40, primeira resposta no máximo 5 minutos e tempo médio de resolução no máximo 8 minutos. O Rafael Oliveira ficou com 300 tickets resolvidos, 35 tickets transferidos, 4 minutos de primeira resposta e 9 minutos de tempo médio de resolução. O Felipe Costa ficou com 350 tickets resolvidos, 20 tickets transferidos, 3 minutos de primeira resposta e 7 minutos de tempo médio de resolução. Compara os resultados de cada um com as metas. Conferir antes de salvar. Não alterar o pódio.';

const NATURAL_VARIATIONS = [
  NATURAL_MESSAGE,
  `Metas de novembro de 2026
- pelo menos 320 tickets resolvidos
- tickets transferidos no máximo 40
- primeira resposta até 5 min
- tma no máximo 8 min

Rafael Oliveira: 300 tickets resolvidos, 35 tickets transferidos, 4 min de primeira resposta, 9 min de resolução.
Felipe Costa: 350 tickets resolvidos, 20 tickets transferidos, 3 min de primeira resposta, 7 min de resolução.

Compara com as metas, conferir antes de salvar, não alterar o pódio.`,
  `oi, as metas de nov/2026 ficam assim: 320 tickets resolvidos no mínimo, 40 tickets transferidos no máximo, primeira resposta no máximo 5 minutos e resolução até 8. rafael oliveira fez 300 tickets resolvidos, 35 tickets transferidos, 4 min primeira resposta e 9 de tma. felipe costa fez 350 tickets resolvidos, 20 tickets transferidos, 3 min e 7 min. compara aí, confere antes de salvar e não mexe no pódio.`,
];

function assertNatural(understood) {
  assert.equal(understood.kind, 'review');
  assert.equal(understood.persist, false);
  assert.equal(understood.periodLabel, 'Novembro/2026');
  assert.equal(understood.rules.length, 4);
  assert.deepEqual(understood.rules.map((rule) => rule.indicator).sort(), ['primeira', 'resolucao', 'resolvidosCount', 'transferidos']);
  const rafa = understood.rows.find((row) => row.userId === 'tm-8');
  const feli = understood.rows.find((row) => row.userId === 'tm-4');
  assert.equal(rafa.values.resolvidosCount, 300);
  assert.equal(rafa.values.transferidos, 35);
  assert.equal(rafa.values.primeira, 4);
  assert.equal(rafa.values.resolucao, 9);
  assert.equal(feli.values.resolvidosCount, 350);
  assert.equal(feli.values.transferidos, 20);
  assert.equal(feli.values.primeira, 3);
  assert.equal(feli.values.resolucao, 7);
  const flag = (person, field) => understood.comparisons.find((row) => row.userId === person).indicators.find((item) => item.indicator === field);
  assert.equal(flag('tm-8', 'resolvidosCount').met, false);
  assert.equal(flag('tm-8', 'transferidos').met, true);
  assert.equal(flag('tm-8', 'primeira').met, true);
  assert.equal(flag('tm-8', 'resolucao').met, false);
  assert.equal(flag('tm-4', 'resolvidosCount').met, true);
  assert.equal(flag('tm-4', 'transferidos').met, true);
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
  assert.equal(store.criterion.mode, 'overall');
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
  assert.equal(saved.store.criterion.mode, 'overall');
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
  assert.equal(result.body.criterion?.mode ?? 'overall', 'overall');
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
  assert.equal(saved.body.criterion.mode, 'overall');
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
  assert.equal(reload.body.criterion.mode, 'overall');
});

test('correção de resultado atualiza o mesmo colaborador no mesmo período', async () => {
  const persist = memoryGoalsStore();
  const first = await postAssistant({ text: NATURAL_MESSAGE, intent: 'idle' }, { store: persist });
  await postAssistant({
    text: 'confirmar',
    review: { period: first.body.period, periodKey: first.body.periodKey, periodLabel: first.body.periodLabel, rules: first.body.rules, rows: first.body.rows, sourceText: NATURAL_MESSAGE },
  }, { store: persist });
  const fix = 'O Rafael Oliveira no novembro de 2026 ficou com 310 tickets resolvidos, 30 tickets transferidos, 4 minutos de primeira resposta e 9 minutos de TMA. Conferir antes de salvar. Não alterar o pódio.';
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
  assert.equal(reload.body.criterion.mode, 'overall');
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
  assert.equal(valueOf(rafa, 'transferidos'), 35);
  assert.equal(valueOf(rafa, 'primeira'), 4);
  assert.equal(valueOf(rafa, 'resolucao'), 9);
  assert.equal(valueOf(feli, 'resolvidosCount'), 350);
  assert.equal(valueOf(feli, 'transferidos'), 20);
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
  assert.equal(saved.body.criterion.mode, 'overall');
  assert.equal((saved.body.ledger.applied ?? []).length, 0);
  const month = saved.body.bank.periods.find((item) => item.key === '2026-11');
  assert.equal(month.goals.length, 4);
  assert.equal(month.people.length, 2);
  assert.equal(month.people.find((row) => row.userId === 'tm-8').indicators.find((item) => item.field === 'resolvidosCount').value, 300);
  assert.equal(month.people.find((row) => row.userId === 'tm-4').indicators.find((item) => item.field === 'transferidos').value, 20);
  const records = saved.body.ledger.records.length;
  const again = await postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist });
  assert.equal(again.body.duplicate, true);
  assert.equal(again.body.ledger.records.length, records);
  assert.equal(again.body.bank.periods.find((item) => item.key === '2026-11').goals.length, 4);
  assert.equal(again.body.criterion.mode, 'overall');
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
  const first = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
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
  assert.equal(saved.body.criterion.mode, 'overall');
  assert.equal((saved.body.ledger.applied ?? []).length, 0);
  const november = saved.body.bank.periods.find((item) => item.key === '2026-11');
  const january = saved.body.bank.periods.find((item) => item.key === '2027-01');
  assert.equal(november.goals.length, 4);
  assert.equal(january.goals.length, 1);
  assert.equal(january.people.find((row) => row.userId === 'tm-8').indicators.find((item) => item.field === 'c:indice-de-qualidade-no-atendimento').value, 88);
});

test('dois indicadores conhecidos no personalizado são roteados para desempenho geral', async () => {
  const result = await postCenter({ text: COMBINED_MESSAGE, mode: 'custom' });
  assert.equal(result.body.kind, 'conference');
  assert.equal(result.body.conference.mode, 'overall');
  assert.ok(result.body.conference.overall);
  assert.equal(result.body.conference.goals.length, 2);
  assert.deepEqual(result.body.conference.goals.map((item) => item.indicator).sort(), ['primeira', 'resolucao']);
  assert.equal(result.body.conference.people[0].results.length, 2);
  const rafa = result.body.conference.people.find((row) => row.userId === 'tm-8');
  assert.equal(rafa.results.find((item) => item.indicator === 'primeira').status, 'Atingiu');
  assert.equal(rafa.results.find((item) => item.indicator === 'resolucao').status, 'Acima do limite');
});

test('critério personalizado aceita indicador inédito sem a palavra qualidade', async () => {
  const text = 'Quero uma meta personalizada chamada Nota de empatia: pelo menos 80% em março de 2027. O Rafael Oliveira ficou com 75% e o Felipe Costa ficou com 91%. Conferir antes de salvar. Não alterar o pódio.';
  const result = await postCenter({ text, mode: 'custom' });
  assert.equal(result.body.kind, 'conference');
  assert.equal(result.body.conference.goals.length, 1);
  assert.equal(result.body.conference.goals[0].indicator, 'c:nota-de-empatia');
  assert.equal(result.body.conference.goals[0].value, 80);
  assert.equal(result.body.conference.period.label, 'Março/2027');
  assert.equal(result.body.conference.people.length, 2);
  const reply = JSON.stringify(result.body);
  assert.equal(reply.includes('Tickets resolvidos'), false);
  assert.equal(reply.includes('Satisfação'), false);
});

test('confirmar pódio não altera metas nem resultados', async () => {
  const persist = memoryGoalsStore();
  const first = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist });
  const podium = await postCenter({ text: 'Confirmar pódio com primeira resposta', mode: 'overall' }, { store: persist });
  assert.equal(podium.body.kind, 'podium');
  assert.equal(podium.body.criterion.indicator, 'primeira');
  assert.equal(podium.body.criterion.mode, 'overall');
  const month = podium.body.bank.periods.find((item) => item.key === '2026-11');
  assert.equal(month.goals.length, 4);
  assert.equal(month.people.length, 2);
  assert.equal((podium.body.ledger.applied ?? []).length, 0);
});

test('desempenho geral usa pesos iguais, elegibilidade e não muda o pódio', async () => {
  const persist = memoryGoalsStore();
  const first = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist });
  const overall = await postCenter({ text: 'Calcule o desempenho geral de novembro de 2026. Não alterar o pódio.', mode: 'overall' }, { store: persist });
  assert.equal(overall.body.kind, 'conference');
  assert.equal(overall.body.conference.overall.scores.length, 2);
  assert.equal(new Set(overall.body.conference.overall.scores.map((item) => item.userId)).size, 2);
  assert.equal(overall.body.conference.overall.selected.includes('transferidos'), true);
  assert.equal(overall.body.conference.overall.selected.length, 4);
  assert.equal(overall.body.conference.overall.weights.resolvidos, 25);
  const saved = await postCenter({ action: 'confirm', text: 'confirmar', conference: overall.body.conference }, { store: persist });
  assert.equal(saved.body.criterion.mode, 'overall');
  assert.equal((saved.body.ledger.applied ?? []).length, 0);
  assert.ok(saved.body.bank.periods.find((item) => item.key === '2026-11').overall);
});

const MARCH_OVERALL = `Período: março de 2027.
Tickets resolvidos: peso de 40%.
Primeira resposta: peso de 25%.
Tempo médio de atendimento (TMA): peso de 35%.
Rafael Oliveira: 300 tickets, primeira resposta de 4 minutos e TMA de 10 minutos.
Felipe Costa: 400 tickets, primeira resposta de 3 minutos e TMA de 6 minutos.
Conferir antes de salvar. Não alterar o pódio.`;

const MARCH_GOALS = `Quatro metas para março de 2027:
* Tickets resolvidos: pelo menos 320.
* Tickets transferidos: no máximo 40.
* Primeira resposta: no máximo 5 minutos.
* Tempo médio de resolução: no máximo 8 minutos.`;

test('desempenho geral no modo da interface não cai em critério personalizado', async () => {
  const missing = await postCenter({ text: MARCH_OVERALL, mode: 'overall' });
  assert.equal(missing.body.kind, 'clarify');
  assert.match(missing.body.reply, /primeira resposta/i);
  assert.match(missing.body.reply, /tempo médio de resolução|TMA/i);
  assert.equal(missing.body.reply.includes('regra personalizada'), false);
  assert.equal(missing.body.conference, null);
});

test('desempenho geral recupera metas do período, calcula nota e não exige indicador de fora', async () => {
  const persist = memoryGoalsStore();
  const goals = await postCenter({ text: MARCH_GOALS, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: goals.body.conference }, { store: persist });
  const overall = await postCenter({
    text: MARCH_OVERALL,
    mode: 'overall',
  }, { store: persist });
  assert.equal(overall.body.kind, 'conference');
  assert.equal(overall.body.conference.mode, 'overall');
  assert.deepEqual(overall.body.conference.overall.selected.sort(), ['primeira', 'resolucao', 'resolvidosCount']);
  assert.equal(overall.body.conference.overall.excluded.includes('transferidos'), true);
  assert.equal(overall.body.conference.people.length, 2);
  const feli = overall.body.conference.overall.scores.find((item) => item.userId === 'tm-4');
  const rafa = overall.body.conference.overall.scores.find((item) => item.userId === 'tm-8');
  assert.equal(feli.score, 100);
  assert.equal(rafa.parts.resolvidosCount.contribution, 0);
  assert.equal(rafa.parts.resolucao.contribution, 0);
  assert.equal(rafa.parts.primeira.eligible, true);
  assert.equal(Math.round((rafa.parts.primeira.contribution + rafa.parts.resolvidosCount.contribution + rafa.parts.resolucao.contribution) * 10) / 10, rafa.score);
  assert.equal(overall.body.conference.goals.some((item) => item.indicator === 'transferidos'), false);
  const saved = await postCenter({ action: 'confirm', text: 'confirmar', conference: overall.body.conference }, { store: persist });
  assert.equal(saved.body.criterion.indicator, 'resolvidos');
  assert.equal((saved.body.ledger.applied ?? []).length, 0);
  const march = saved.body.bank.periods.find((item) => item.key === '2027-03');
  assert.equal(march.people.length, 2);
  assert.equal(march.people.find((row) => row.userId === 'tm-8').indicators.find((item) => item.field === 'resolvidosCount').value, 300);
});

test('desempenho geral aceita 1, 2 e 4 indicadores sem zerar os que ficaram de fora', async () => {
  const persist = memoryGoalsStore();
  const goals = await postCenter({ text: MARCH_GOALS, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: goals.body.conference }, { store: persist });
  const one = await postCenter({
    text: 'Desempenho geral de março de 2027. Rafael Oliveira: 300 tickets. Felipe Costa: 400 tickets. Conferir. Não alterar o pódio.',
    mode: 'overall',
  }, { store: persist });
  assert.equal(one.body.kind, 'conference');
  assert.deepEqual(one.body.conference.overall.selected, ['resolvidosCount']);
  assert.equal(one.body.conference.overall.weights.resolvidos, 100);
  assert.equal(one.body.conference.overall.scores.find((item) => item.userId === 'tm-4').score, 100);
  assert.equal(one.body.conference.overall.scores.find((item) => item.userId === 'tm-8').score, 0);
  const two = await postCenter({
    text: 'Desempenho geral de março de 2027. Rafael Oliveira: 300 tickets resolvidos e 35 tickets transferidos. Felipe Costa: 400 tickets resolvidos e 20 tickets transferidos. Conferir. Não alterar o pódio.',
    mode: 'overall',
  }, { store: persist });
  assert.equal(two.body.kind, 'conference');
  assert.equal(two.body.conference.overall.weights.resolvidos, 50);
  assert.equal(two.body.conference.overall.weights.transferidos, 50);
  assert.equal(two.body.conference.overall.selected.includes('primeira'), false);
  assert.equal(two.body.reply.includes('Primeira resposta'), false);
  const three = await postCenter({
    text: 'Desempenho geral de março de 2027. Rafael Oliveira: 300 tickets, 4 min de primeira resposta e TMA 10 min. Felipe Costa: 400 tickets, 3 min de primeira resposta e TMA 6 min. Conferir. Não alterar o pódio.',
    mode: 'overall',
  }, { store: persist });
  assert.equal(three.body.kind, 'conference');
  assert.equal(three.body.conference.overall.selected.length, 3);
  assert.equal(three.body.conference.overall.weights.resolvidos, 33.33);
  assert.equal(three.body.conference.overall.excluded.includes('transferidos'), true);
  const four = await postCenter({
    text: 'Desempenho geral de março de 2027. Rafael Oliveira: 300 tickets resolvidos, 35 tickets transferidos, 4 min de primeira resposta e TMA 10 min. Felipe Costa: 400 tickets resolvidos, 20 tickets transferidos, 3 min de primeira resposta e TMA 6 min. Conferir. Não alterar o pódio.',
    mode: 'overall',
  }, { store: persist });
  assert.equal(four.body.kind, 'conference');
  assert.equal(four.body.conference.overall.selected.length, 4);
  assert.equal(four.body.conference.overall.weights.primeira, 25);
  const feli4 = four.body.conference.overall.scores.find((item) => item.userId === 'tm-4');
  const sum4 = Object.values(feli4.parts).reduce((total, part) => total + part.contribution, 0);
  assert.equal(Math.round(sum4 * 10) / 10, feli4.score);
});

test('desempenho geral aceita 1 ou 2 indicadores selecionados, com pesos iguais', async () => {
  const persist = memoryGoalsStore();
  const first = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist });
  const two = await postCenter({
    text: 'Novembro de 2026. Rafael Oliveira ficou com 300 tickets e 4 minutos de primeira resposta. Felipe Costa ficou com 350 tickets e 3 minutos de primeira resposta. Conferir. Não alterar o pódio.',
    mode: 'overall',
    indicators: ['resolvidosCount', 'primeira'],
  }, { store: persist });
  assert.equal(two.body.kind, 'conference');
  assert.equal(two.body.conference.mode, 'overall');
  assert.deepEqual(two.body.conference.overall.selected.sort(), ['primeira', 'resolvidosCount']);
  assert.equal(two.body.conference.overall.weights.resolvidos, 50);
  assert.equal(two.body.conference.overall.weights.primeira, 50);
  assert.deepEqual(two.body.conference.goals.map((item) => item.indicator).sort(), ['primeira', 'resolvidosCount']);
  const rafa = two.body.conference.people.find((row) => row.userId === 'tm-8');
  assert.equal(rafa.results.find((item) => item.indicator === 'resolvidosCount').status, 'Abaixo da meta');
  assert.equal(rafa.results.find((item) => item.indicator === 'primeira').status, 'Atingiu');
});

const APRIL_OVERALL = `Período: abril de 2027.
Condições:
* Tickets resolvidos: mínimo de 10.
* Tickets transferidos: máximo de 40.
* Primeira resposta: máximo de 5 minutos.
* TMA: máximo de 15 minutos.
Rafael Oliveira:
* 20 tickets resolvidos.
* 15 tickets transferidos.
* 2 minutos de primeira resposta.
* 10 minutos de TMA.
Felipe Costa:
* 18 tickets resolvidos.
* 20 tickets transferidos.
* 3 minutos de primeira resposta.
* 12 minutos de TMA.
Camila:
* 9 tickets resolvidos.
* 10 tickets transferidos.
* 6 minutos de primeira resposta.
* 18 minutos de TMA.
Conferir. Não alterar o pódio.`;

test('desempenho geral lê as condições da mensagem mesmo com o histórico do assistente', async () => {
  const result = await postCenter({
    text: APRIL_OVERALL,
    mode: 'overall',
    history: [{ text: 'Desempenho geral: envie as condições de entrada e os resultados. Identifico os indicadores na mensagem, distribuo os pesos igualmente e não peço para marcar nada. Quem não cumpre a condição zera aquela parcela; o melhor elegível leva o peso inteiro. Transferidos ficam de fora e o pódio não muda.' }],
  });
  assert.equal(result.body.kind, 'conference');
  assert.equal(result.body.persist, false);
  assert.equal(result.body.conference.mode, 'overall');
  assert.equal(result.body.conference.period.label, 'Abril/2027');
  assert.equal(result.body.conference.overall.weights.resolvidos, 25);
  const rafa = result.body.conference.overall.scores.find((item) => item.userId === 'tm-8');
  const feli = result.body.conference.overall.scores.find((item) => item.userId === 'tm-4');
  const cami = result.body.conference.overall.scores.find((item) => item.userId === 'tm-3');
  assert.equal(rafa.score, 91.67);
  assert.equal(feli.score, 72.5);
  assert.equal(cami.score, 25);
  assert.equal(rafa.place, 1);
  assert.equal(feli.place, 2);
  assert.equal(cami.place, 3);
  assert.equal(rafa.parts.resolvidosCount.contribution, 25);
  assert.equal(feli.parts.resolvidosCount.contribution, 22.5);
  assert.equal(cami.parts.resolvidosCount.contribution, 0);
  assert.equal(rafa.parts.transferidos.contribution, 16.67);
  assert.equal(feli.parts.transferidos.contribution, 12.5);
  assert.equal(cami.parts.transferidos.contribution, 25);
  assert.equal(rafa.parts.primeira.contribution, 25);
  assert.equal(feli.parts.primeira.contribution, 16.67);
  assert.equal(cami.parts.primeira.contribution, 0);
  assert.equal(rafa.parts.resolucao.contribution, 25);
  assert.equal(feli.parts.resolucao.contribution, 20.83);
  assert.equal(cami.parts.resolucao.contribution, 0);
  assert.equal(cami.parts.resolvidosCount.reason.includes('mínimo 10'), true);
  assert.equal(result.body.conference.people.length, 3);
});

test('desempenho geral respeita a seleção manual de indicadores e distribui os pesos', async () => {
  const persist = memoryGoalsStore();
  const goals = await postCenter({ text: MARCH_GOALS, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: goals.body.conference }, { store: persist });
  const result = await postCenter({
    text: 'Desempenho geral de março de 2027. Rafael Oliveira: 300 tickets e 4 min de primeira resposta. Felipe Costa: 400 tickets e 3 min de primeira resposta. Conferir. Não alterar o pódio.',
    mode: 'overall',
    indicators: ['resolvidosCount', 'primeira'],
  }, { store: persist });
  assert.equal(result.body.kind, 'conference');
  assert.equal(result.body.persist, false);
  assert.deepEqual(result.body.conference.overall.selected.sort(), ['primeira', 'resolvidosCount']);
  assert.equal(result.body.conference.overall.weights.resolvidos, 50);
  assert.equal(result.body.conference.overall.weights.primeira, 50);
  assert.equal(result.body.conference.overall.selected.includes('transferidos'), false);
});

async function getGoals(store) {
  const res = { status: 0, body: null };
  await handleGoals(
    { method: 'GET', url: '/api/goals' },
    {},
    leader,
    process.cwd(),
    [],
    teamRoster,
    (_response, status, body) => { res.status = status; res.body = body; },
    async () => Buffer.from('{}'),
    { store, generate: async () => ({ error: 'unconfigured' }) },
  );
  return res;
}

function podiumAt(body, key, mode, channel = 'E-mail') {
  return (body.podiums ?? []).find((item) => item.periodKey === key && item.mode === mode && item.channel === channel);
}

test('pódio é montado pelos resultados já gravados no banco, sem nova avaliação', async () => {
  const persist = memoryGoalsStore();
  const pending = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  assert.equal(pending.body.persist, false);
  const before = await getGoals(persist);
  assert.equal((before.body.podiums ?? []).length, 0);
  await postCenter({ action: 'confirm', text: 'confirmar', conference: pending.body.conference }, { store: persist });
  const loaded = await getGoals(persist);
  const november = podiumAt(loaded.body, '2026-11', 'overall');
  assert.ok(november);
  assert.equal(november.periodLabel, 'Novembro/2026');
  assert.equal(november.ranking[0].userId, 'tm-4');
  assert.equal(november.ranking[0].name, 'Felipe Costa');
  assert.equal(november.ranking[0].place, 1);
  assert.equal(november.ranking[0].score, 100);
  assert.equal(november.ranking[1].userId, 'tm-8');
  assert.equal(november.ranking.length, 2);
  assert.equal(november.ranking.some((row) => row.userId === 'tm-3'), false);
});

test('pódios de períodos diferentes não se misturam e o histórico permanece', async () => {
  const persist = memoryGoalsStore();
  const november = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: november.body.conference }, { store: persist });
  const marchText = `${MARCH_GOALS}
Rafael Oliveira ficou com 400 tickets resolvidos, 10 tickets transferidos, 3 minutos de primeira resposta e 6 minutos de TMA.
Felipe Costa ficou com 300 tickets resolvidos, 35 tickets transferidos, 4 minutos de primeira resposta e 9 minutos de TMA.
Conferir antes de salvar. Não alterar o pódio.`;
  const march = await postCenter({ text: marchText, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: march.body.conference }, { store: persist });
  const loaded = await getGoals(persist);
  const nov = podiumAt(loaded.body, '2026-11', 'overall');
  const mar = podiumAt(loaded.body, '2027-03', 'overall');
  assert.equal(nov.ranking[0].userId, 'tm-4');
  assert.equal(mar.ranking[0].userId, 'tm-8');
  assert.equal(nov.ranking[0].score, 100);
  assert.equal(mar.ranking[0].score, 100);
});

test('empate no pódio usa o nome e registro pendente não entra', async () => {
  const persist = memoryGoalsStore();
  const text = `Metas de maio de 2027: tickets resolvidos pelo menos 10.
Camila Souza ficou com 20 tickets. Lucas Pereira ficou com 20 tickets.
Conferir antes de salvar. Não alterar o pódio.`;
  const first = await postCenter({ text, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist });
  await persist.mutate((current) => ({
    store: {
      ...current,
      ledger: {
        ...current.ledger,
        records: [...(current.ledger?.records ?? []), {
          id: 'pending-1',
          userId: '',
          sourceName: 'Pessoa sem cadastro',
          name: 'Pessoa sem cadastro',
          periodKey: '2027-05',
          periodLabel: 'Maio/2027',
          values: { resolvidosCount: 99 },
        }],
      },
    },
  }));
  const view = await getGoals(persist);
  const may = podiumAt(view.body, '2027-05', 'overall', 'Chat');
  assert.deepEqual(may.ranking.map((row) => row.userId), ['tm-3', 'tm-6']);
  assert.equal(may.ranking[0].score, may.ranking[1].score);
  assert.equal(may.ranking.some((row) => row.name === 'Pessoa sem cadastro'), false);
});

test('novos resultados gravados atualizam o pódio do mesmo período', async () => {
  const persist = memoryGoalsStore();
  const first = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist });
  const before = podiumAt((await getGoals(persist)).body, '2026-11', 'overall');
  assert.equal(before.ranking[0].userId, 'tm-4');
  const update = 'Novembro de 2026. Rafael Oliveira ficou com 400 tickets resolvidos, 10 tickets transferidos, 2 minutos de primeira resposta e 6 minutos de TMA. Conferir antes de salvar. Não alterar o pódio.';
  const next = await postCenter({ text: update, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: next.body.conference }, { store: persist });
  const after = podiumAt((await getGoals(persist)).body, '2026-11', 'overall');
  assert.equal(after.ranking[0].userId, 'tm-8');
  assert.equal(after.ranking[0].score, 100);
  assert.equal(after.ranking[1].userId, 'tm-4');
});

test('pódio predefinido detalha só os indicadores da avaliação, com unidades reais', async () => {
  const persist = memoryGoalsStore();
  const pending = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: pending.body.conference }, { store: persist });
  const loaded = await getGoals(persist);
  const november = podiumAt(loaded.body, '2026-11', 'overall');
  assert.equal(november.basis.modeLabel, 'Desempenho geral');
  assert.match(november.basis.origin, /Supabase|Banco de Dados/i);
  const felipe = november.ranking[0];
  assert.equal(felipe.userId, 'tm-4');
  const tickets = felipe.metrics.find((item) => item.id === 'resolvidosCount');
  const moved = felipe.metrics.find((item) => item.id === 'transferidos');
  const first = felipe.metrics.find((item) => item.id === 'primeira');
  assert.equal(tickets.value, 350);
  assert.equal(tickets.shown, '350');
  assert.equal(moved.value, 20);
  assert.equal(moved.shown, '20');
  assert.equal(first.shown, '3 min');
  assert.equal(felipe.metrics.some((item) => item.id === 'satisfacao'), false);
  assert.notEqual(tickets.value, moved.value);
  assert.equal(pending.body.persist, false);
});

test('pódio de desempenho geral mostra peso, pontuação e elegibilidade', async () => {
  const persist = memoryGoalsStore();
  const goals = await postCenter({ text: MARCH_GOALS, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: goals.body.conference }, { store: persist });
  const overallText = `Desempenho geral de março de 2027.
Rafael Oliveira: 300 tickets resolvidos, 35 tickets transferidos, 4 min de primeira resposta e TMA 9 min.
Felipe Costa: 350 tickets resolvidos, 20 tickets transferidos, 3 min de primeira resposta e TMA 7 min.
Conferir. Não alterar o pódio.`;
  const overall = await postCenter({ text: overallText, mode: 'overall' }, { store: persist });
  assert.equal(overall.body.persist, false);
  await postCenter({ action: 'confirm', text: 'confirmar', conference: overall.body.conference }, { store: persist });
  const loaded = await getGoals(persist);
  const march = podiumAt(loaded.body, '2027-03', 'overall');
  assert.equal(march.ranking[0].userId, 'tm-4');
  assert.equal(march.ranking[0].displayScore, `${String(march.ranking[0].score).replace('.', ',')}%`);
  const tickets = march.ranking[0].metrics.find((item) => item.id === 'resolvidosCount');
  assert.equal(tickets.value, 350);
  assert.equal(tickets.weight, 25);
  assert.equal(tickets.contribution, 25);
  assert.equal(tickets.eligible, true);
  const rafa = march.ranking[1].metrics.find((item) => item.id === 'resolvidosCount');
  assert.equal(rafa.eligible, false);
  assert.ok(rafa.reason);
});

test('pódio personalizado mostra a regra, o valor real e se cumpriu', async () => {
  const persist = memoryGoalsStore();
  const quality = await postCenter({ text: QUALITY_MESSAGE, mode: 'custom' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: quality.body.conference }, { store: persist });
  const loaded = await getGoals(persist);
  const january = podiumAt(loaded.body, '2027-01', 'custom');
  assert.equal(january.modeLabel, 'Critério personalizado - Qualidade no Atendimento - Janeiro/2027');
  assert.equal(january.basis.modeLabel, 'Critério personalizado - Qualidade no Atendimento - Janeiro/2027');
  assert.equal(january.ranking[0].userId, 'tm-4');
  const metric = january.ranking[0].metrics[0];
  assert.equal(metric.value, 94);
  assert.equal(metric.shown, '94%');
  assert.equal(metric.met, true);
  assert.match(metric.condition, /90/);
  assert.equal(january.ranking.some((row) => row.userId === 'tm-8'), false);
});

test('pódio de desempenho geral mostra o percentual total, sem mudar a ordem', async () => {
  const persist = memoryGoalsStore();
  const pending = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: pending.body.conference }, { store: persist });
  const loaded = await getGoals(persist);
  const november = podiumAt(loaded.body, '2026-11', 'overall');
  assert.equal(november.ranking[0].userId, 'tm-4');
  assert.equal(november.ranking[1].userId, 'tm-8');
  assert.equal(november.ranking[0].score, 100);
  assert.equal(november.ranking[0].displayScore, '100%');
  assert.equal(november.ranking[1].displayScore, `${String(november.ranking[1].score).replace('.', ',')}%`);
  assert.notEqual(november.ranking[1].displayScore, '300');
});

test('pódio de desempenho geral mostra percentual em todas as combinações selecionadas', async () => {
  const persist = memoryGoalsStore();
  const pending = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: pending.body.conference }, { store: persist });
  const fields = ['resolvidosCount', 'primeira', 'resolucao', 'transferidos'];
  let counted = 0;
  for (let mask = 1; mask < 16; mask += 1) {
    const selected = fields.filter((_, index) => mask & (1 << index));
    await persist.mutate((current) => ({
      store: {
        ...current,
        evaluations: (current.evaluations ?? []).map((item) => (
          (item.mode === 'overall' || item.mode === 'preset') && item.periodKey === '2026-11' ? { ...item, selected } : item
        )),
      },
    }));
    const view = await getGoals(persist);
    const podium = podiumAt(view.body, '2026-11', 'overall');
    const felipe = podium.ranking.find((row) => row.userId === 'tm-4');
    const rafael = podium.ranking.find((row) => row.userId === 'tm-8');
    assert.equal(felipe.displayScore, `${String(felipe.score).replace('.', ',')}%`);
    assert.equal(rafael.displayScore, `${String(rafael.score).replace('.', ',')}%`);
    assert.equal(felipe.metrics.map((item) => item.id).sort().join(','), [...selected].sort().join(','));
    counted += 1;
  }
  assert.equal(counted, 15);
});

test('pódio de desempenho geral mostra percentual mesmo quando falta um indicador', async () => {
  const persist = memoryGoalsStore();
  const pending = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: pending.body.conference }, { store: persist });
  await persist.mutate((current) => ({
    store: {
      ...current,
      evaluations: (current.evaluations ?? []).map((item) => (
        item.mode === 'overall' || item.mode === 'preset' ? { ...item, selected: ['resolvidosCount'] } : item
      )),
      ledger: {
        ...current.ledger,
        records: (current.ledger?.records ?? []).map((row) => (
          row.userId === 'tm-8' ? { ...row, values: { ...row.values, resolvidosCount: null } } : row
        )),
      },
    },
  }));
  const view = await getGoals(persist);
  const podium = podiumAt(view.body, '2026-11', 'overall');
  const rafael = podium.ranking.find((row) => row.userId === 'tm-8');
  const felipe = podium.ranking.find((row) => row.userId === 'tm-4');
  assert.equal(felipe.displayScore, `${String(felipe.score).replace('.', ',')}%`);
  assert.equal(rafael.displayScore, `${String(rafael.score).replace('.', ',')}%`);
  assert.notEqual(felipe.displayScore, '350');
});

test('dezembro separa ligação, chat e e-mail e exclui líder e supervisor', async () => {
  const persist = memoryGoalsStore();
  const text = `Metas de dezembro de 2026: tickets resolvidos pelo menos 10.
Gabriela Lima ficou com 200 tickets resolvidos.
Juliana Fernandes ficou com 180 tickets resolvidos.
Camila Souza ficou com 150 tickets resolvidos.
Lucas Pereira ficou com 120 tickets resolvidos.
Felipe Costa ficou com 390 tickets resolvidos.
Rafael Oliveira ficou com 360 tickets resolvidos.
Alexandra Mitchell ficou com 999 tickets resolvidos.
Bruno Almeida ficou com 888 tickets resolvidos.
Conferir antes de salvar. Não alterar o pódio.`;
  const pending = await postCenter({ text, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: pending.body.conference }, { store: persist });
  const loaded = await getGoals(persist);
  const call = podiumAt(loaded.body, '2026-12', 'overall', 'Ligação');
  const chat = podiumAt(loaded.body, '2026-12', 'overall', 'Chat');
  const mail = podiumAt(loaded.body, '2026-12', 'overall', 'E-mail');
  assert.deepEqual(call.ranking.map((row) => row.userId), ['tm-5', 'tm-9']);
  assert.equal(call.ranking[0].displayScore, `${String(call.ranking[0].score).replace('.', ',')}%`);
  assert.deepEqual(chat.ranking.map((row) => row.userId), ['tm-3', 'tm-6']);
  assert.equal(chat.ranking[0].displayScore, `${String(chat.ranking[0].score).replace('.', ',')}%`);
  assert.deepEqual(mail.ranking.map((row) => row.userId), ['tm-4', 'tm-8']);
  assert.equal(mail.ranking[0].displayScore, `${String(mail.ranking[0].score).replace('.', ',')}%`);
  assert.equal(mail.ranking[1].displayScore, `${String(mail.ranking[1].score).replace('.', ',')}%`);
  const names = [...call.ranking, ...chat.ranking, ...mail.ranking].map((row) => row.name);
  assert.equal(names.includes('Alexandra Mitchell'), false);
  assert.equal(names.includes('Bruno Almeida'), false);
  assert.equal(call.ranking.some((row) => row.userId === 'tm-4'), false);
  assert.equal(chat.ranking.some((row) => row.userId === 'tm-4'), false);
  const overall = await postCenter({
    text: `Desempenho geral de dezembro de 2026.
Gabriela Lima: 200 tickets. Juliana Fernandes: 180 tickets. Camila Souza: 150 tickets. Lucas Pereira: 120 tickets. Felipe Costa: 390 tickets. Rafael Oliveira: 360 tickets. Alexandra Mitchell: 999 tickets. Conferir. Não alterar o pódio.`,
    mode: 'overall',
  }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: overall.body.conference }, { store: persist });
  const overallMail = podiumAt((await getGoals(persist)).body, '2026-12', 'overall', 'E-mail');
  const overallCall = podiumAt((await getGoals(persist)).body, '2026-12', 'overall', 'Ligação');
  assert.equal(overallMail.ranking[0].userId, 'tm-4');
  assert.equal(overallMail.ranking.some((row) => row.userId === 'tm-5' || row.userId === 'tm-3' || row.userId === 'tm-1'), false);
  assert.equal(overallCall.ranking[0].userId, 'tm-5');
  assert.equal(overallCall.ranking.some((row) => row.userId === 'tm-4'), false);
  const quality = await postCenter({
    text: 'Quero uma meta personalizada chamada Índice de qualidade no atendimento: pelo menos 90% em dezembro de 2026. A Gabriela Lima ficou com 91%, a Camila Souza ficou com 93%, o Felipe Costa ficou com 94% e a Alexandra Mitchell ficou com 99%. Conferir antes de salvar. Não alterar o pódio.',
    mode: 'custom',
  }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: quality.body.conference }, { store: persist });
  const customMail = podiumAt((await getGoals(persist)).body, '2026-12', 'custom', 'E-mail');
  const customChat = podiumAt((await getGoals(persist)).body, '2026-12', 'custom', 'Chat');
  const customCall = podiumAt((await getGoals(persist)).body, '2026-12', 'custom', 'Ligação');
  assert.equal(customMail.ranking[0].userId, 'tm-4');
  assert.equal(customChat.ranking[0].userId, 'tm-3');
  assert.equal(customCall.ranking[0].userId, 'tm-5');
  assert.equal(customMail.ranking.some((row) => row.userId === 'tm-1'), false);
});

test('avaliação antiga em critérios predefinidos aparece como desempenho geral, sem duplicar', async () => {
  const persist = memoryGoalsStore();
  const pending = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: pending.body.conference }, { store: persist });
  await persist.mutate((current) => ({
    store: {
      ...current,
      evaluations: (current.evaluations ?? []).map((item) => ({ ...item, mode: 'preset' })),
    },
  }));
  const view = await getGoals(persist);
  const modes = (view.body.podiums ?? []).filter((item) => item.periodKey === '2026-11').map((item) => item.mode);
  assert.equal(modes.includes('preset'), false);
  assert.equal(modes.includes('overall'), true);
  const november = podiumAt(view.body, '2026-11', 'overall');
  assert.equal(november.modeLabel, 'Desempenho geral');
  assert.equal(november.ranking[0].displayScore, `${String(november.ranking[0].score).replace('.', ',')}%`);
  assert.equal(november.ranking[0].metrics[0].contribution != null, true);
});

test('desempenho geral distribui 100, 50, 33,33 e 25 conforme a quantidade de indicadores', async () => {
  const persist = memoryGoalsStore();
  const first = await postCenter({ text: NATURAL_MESSAGE, mode: 'overall' }, { store: persist });
  await postCenter({ action: 'confirm', text: 'confirmar', conference: first.body.conference }, { store: persist });
  const fields = ['resolvidosCount', 'transferidos', 'primeira', 'resolucao'];
  const keys = ['resolvidos', 'transferidos', 'primeira', 'resolucao'];
  const expected = {
    1: [100],
    2: [50, 50],
    3: [33.33, 33.33, 33.34],
    4: [25, 25, 25, 25],
  };
  for (let count = 1; count <= 4; count += 1) {
    const selected = fields.slice(0, count);
    const result = await postCenter({
      text: 'Novembro de 2026. Rafael Oliveira ficou com 300 tickets resolvidos, 35 tickets transferidos, 4 minutos de primeira resposta e 9 minutos de TMA. Felipe Costa ficou com 350 tickets resolvidos, 20 tickets transferidos, 3 minutos de primeira resposta e 7 minutos de TMA. Conferir. Não alterar o pódio.',
      mode: 'overall',
      indicators: selected,
    }, { store: persist });
    assert.equal(result.body.kind, 'conference', selected.join(','));
    const weights = result.body.conference.overall.weights;
    expected[count].forEach((value, index) => {
      assert.equal(weights[keys[index]], value, `${count}:${keys[index]}`);
    });
  }
});

test('desempenho geral chama a IA quando o texto local não fecha a conferência', async () => {
  let called = 0;
  const result = await postCenter({ text: 'oi', mode: 'overall' }, {}, async () => {
    called += 1;
    return { error: 'unconfigured' };
  });
  assert.equal(called, 1);
  assert.equal(result.body.kind, 'clarify');
});

test('desempenho geral pede só a meta do indicador selecionado que faltar', async () => {
  const result = await postCenter({
    text: 'Desempenho geral de março de 2027. Rafael Oliveira primeira resposta 4 minutos. Felipe Costa primeira resposta 3 minutos. Conferir. Não alterar o pódio.',
    mode: 'overall',
  });
  assert.equal(result.body.kind, 'clarify');
  assert.match(result.body.reply, /primeira resposta/i);
  assert.equal(result.body.reply.includes('Tickets resolvidos'), false);
  assert.equal(result.body.reply.includes('Satisfação'), false);
});



