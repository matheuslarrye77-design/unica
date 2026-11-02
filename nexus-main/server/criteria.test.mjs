import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { commitTemplate, criteriaPrompt, interpretCriteria, normalizeProposal } from './criteria.mjs';
import { allowGeminiCall, classifyGeminiError, describeGeminiError, flashModel, redactGeminiDetail, resetGeminiBudget } from './gemini.mjs';
import { applyCriterion, buildApproval, emptyStore, matchPeople, parseReport, podiumFor } from './goals.mjs';

const people = [
  { id: 'matheus', name: 'Matheus Larrye Lopes Batista', funcao: 'Chat', role: 'Atendimento', aliases: ['Matheus Larrye'] },
  { id: 'matheus2', name: 'Matheus Silva', funcao: 'E-mail', role: 'Atendimento', aliases: [] },
  { id: 'ana', name: 'Ana Souza', funcao: 'E-mail', role: 'Atendimento', aliases: [] },
  { id: 'ana2', name: 'Ana Lima', funcao: 'Ligação', role: 'Atendimento', aliases: [] },
];

function model(payload) {
  return async () => ({ text: JSON.stringify(payload) });
}

const ready = (criteria, extra = {}) => ({
  status: 'ready',
  explanation: extra.explanation ?? 'Li o pedido assim.',
  questions: extra.questions ?? [],
  period: extra.period ?? 'week',
  combine: extra.combine ?? 'all',
  subsetor: extra.subsetor ?? '',
  weights: extra.weights ?? null,
  criteria,
});

test('pedido simples vira uma regra e não altera o pódio', async () => {
  const store = emptyStore();
  const result = await interpretCriteria('Quero reconhecer quem resolveu pelo menos 250 tickets no mês.', {
    generate: model(ready([{ indicator: 'resolvidosCount', op: 'gte', value: 250, valueTo: null, period: 'month' }], { period: 'month' })),
  });
  assert.equal(result.kind, 'proposal');
  assert.equal(result.rules.length, 1);
  assert.equal(result.rules[0].value, 250);
  assert.equal(store.templates.length, 0);
  assert.equal(store.criterion.mode, 'overall');
});

test('pedido com três indicadores', async () => {
  const result = await interpretCriteria('Quero produtividade, agilidade e tempo de resolução.', {
    generate: model(ready([
      { indicator: 'resolvidos', op: 'gte', value: 87, valueTo: null, period: 'week' },
      { indicator: 'primeira', op: 'lte', value: 5, valueTo: null, period: 'week' },
      { indicator: 'resolucao', op: 'lte', value: 18, valueTo: null, period: 'week' },
    ], { weights: { resolvidos: 50, primeira: 20, resolucao: 30 } })),
  });
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'proposal');
  assert.equal(result.rules.length, 3);
});

test('condições maiores e menores', async () => {
  const result = normalizeProposal(ready([
    { indicator: 'resolvidosCount', op: 'gt', value: 200, valueTo: null, period: 'month' },
    { indicator: 'primeira', op: 'lt', value: 5, valueTo: null, period: 'month' },
  ], { period: 'month' }));
  assert.deepEqual(result.rules.map((rule) => rule.op), ['gt', 'lt']);
});

test('períodos diferentes ficam em cada condição', async () => {
  const result = normalizeProposal(ready([
    { indicator: 'resolvidosCount', op: 'gte', value: 250, valueTo: null, period: 'month' },
    { indicator: 'primeira', op: 'lte', value: 5, valueTo: null, period: 'week' },
  ], { period: '' }));
  assert.equal(result.ok, true);
  assert.equal(result.period, 'mixed');
  assert.deepEqual(result.rules.map((rule) => rule.period), ['month', 'week']);
});

test('texto com erro de digitação não é corrigido por regra local', async () => {
  let sent = '';
  const result = await interpretCriteria('quero reslveu pelo menos 250 tickts no mes', {
    generate: async (prompt) => {
      sent = prompt;
      return { text: JSON.stringify(ready([{ indicator: 'resolvidosCount', op: 'gte', value: 250, valueTo: null, period: 'month' }], { period: 'month', explanation: 'Quantidade de tickets no mês, no mínimo 250.' })) };
    },
  });
  assert.match(sent, /reslveu/);
  assert.equal(result.ok, true);
  assert.equal(result.rules[0].value, 250);
  const invented = normalizeProposal(ready([{ indicator: 'resolvidosCount', op: 'gte', value: null, valueTo: null, period: 'month' }]));
  assert.equal(invented.ok, false);
  assert.equal(invented.kind, 'clarify');
});

test('pedido ambíguo pede esclarecimento e não vira regra', async () => {
  const result = await interpretCriteria('Quero reconhecer quem teve o melhor desempenho no atendimento durante esta semana.', {
    generate: model({ status: 'needs_clarification', explanation: '', questions: ['Qual indicador define o melhor desempenho?'], period: '', combine: '', subsetor: '', weights: null, criteria: [] }),
  });
  assert.equal(result.kind, 'clarify');
  assert.equal(result.rules, undefined);
  assert.match(result.reply, /indicador/i);
});

test('nome abreviado encontra um único cadastro', () => {
  const found = matchPeople('Matheus L.', people);
  assert.equal(found.length, 1);
  assert.equal(found[0].id, 'matheus');
  assert.equal(found[0].name, 'Matheus Larrye Lopes Batista');
});

test('dois colaboradores parecidos não recebem um vencedor automático', () => {
  const found = matchPeople('Matheus', people);
  assert.equal(found.length, 2);
  const report = parseReport('Matheus: 90%, 10, 2 min, 10 min.\nTickets resolvidos: mínimo de 87%.\nTempo de primeira resposta: até 5 minutos.\nTempo médio até resolução: até 18 minutos.', people);
  assert.equal(report.rows[0].userId, '');
  assert.equal(report.rows[0].ambiguous.length, 2);
});

test('falha de comunicação não finge uma resposta da IA', async () => {
  const result = await interpretCriteria('monte um pódio especial agora', {
    generate: async () => { throw new Error('socket hang up'); },
  });
  assert.equal(result.kind, 'unavailable');
  assert.equal(result.google, undefined);
  assert.equal(result.rules, undefined);
  assert.match(result.reply, /Nada foi alterado/);
});

test('limite gratuito excedido é informado sem chamar de novo', async () => {
  resetGeminiBudget();
  for (let index = 0; index < 20; index += 1) assert.equal(allowGeminiCall(1_000), true);
  assert.equal(allowGeminiCall(1_000), false);
  const result = await interpretCriteria('monte um pódio especial agora', {
    generate: async () => ({ error: 'quota' }),
  });
  assert.equal(result.kind, 'quota');
  assert.match(result.reply, /limite gratuito/i);
  assert.equal(classifyGeminiError({ status: 429, message: 'RESOURCE_EXHAUSTED' }), 'quota');
  assert.equal(classifyGeminiError({ status: 401, message: JSON.stringify({ error: { status: 'UNAUTHENTICATED', message: 'API key not valid' } }) }), 'auth');
  assert.equal(classifyGeminiError({ status: 403, message: JSON.stringify({ error: { status: 'PERMISSION_DENIED', message: 'blocked' } }) }), 'permission');
  assert.equal(classifyGeminiError({ status: 404, message: JSON.stringify({ error: { status: 'NOT_FOUND', message: 'models/gemini-2.5-flash is not found' } }) }), 'model');
  assert.equal(classifyGeminiError({ status: 400, message: JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: 'Thinking level is not supported for this model' } }) }), 'invalid');
  assert.equal(classifyGeminiError({ status: 400, message: JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: 'Invalid JSON payload' } }) }), 'invalid');
  const secret = describeGeminiError({ status: 400, message: JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: 'bad key=AIzaSyDUMMYKEY1234567890' } }) });
  assert.equal(secret.httpStatus, 400);
  assert.equal(secret.code, 'INVALID_ARGUMENT');
  assert.equal(secret.message.includes('AIza'), false);
  assert.equal(redactGeminiDetail('ana@empresa.com 11999998888').includes('ana@'), false);
  resetGeminiBudget();
});

test('confirmação grava a regra e cancelamento não mexe no histórico', () => {
  const store = emptyStore();
  const proposal = normalizeProposal(ready([{ indicator: 'primeira', op: 'lte', value: 5, valueTo: null, period: 'week' }]));
  const cancelled = commitTemplate(store, proposal, { confirm: false, name: 'Agilidade' });
  assert.equal(cancelled.saved, false);
  assert.equal(store.templates.length, 0);
  assert.equal(store.criterion.mode, 'overall');
  const saved = commitTemplate(store, proposal, { confirm: true, name: 'Agilidade' });
  assert.equal(saved.saved, true);
  assert.equal(saved.store.criterion.mode, 'overall');
  assert.equal(saved.store.templates.length, 1);
  assert.equal(store.templates.length, 0);
});

test('nenhum pódio muda antes da aprovação da liderança', () => {
  const directory = [
    { id: 'matheus', name: 'Matheus Larrye Lopes Batista', funcao: 'Chat', role: 'Atendimento', aliases: ['Matheus'] },
    { id: 'ana', name: 'Ana Souza', funcao: 'E-mail', role: 'Atendimento', aliases: [] },
    { id: 'joao', name: 'João Pereira', funcao: 'Atendimento', role: 'Atendimento', aliases: ['João'] },
  ];
  const text = `METAS DA SEMANA:
* Tickets resolvidos: mínimo de 87%.
* Tickets transferidos: indicador informativo.
* Tempo de primeira resposta: até 5 minutos.
* Tempo médio até resolução: até 18 minutos.

RESULTADOS:
* Matheus: 89,4%, 31, 1 min, 19 min.
* Ana Souza: 95%, 20, 3 min, 15 min.
* João: 82%, 25, 6 min, 20 min.`;
  const approved = buildApproval(emptyStore(), { text, periodKey: '2026-W10' }, directory, { id: 'helena', name: 'Helena' });
  const before = podiumFor(approved.store, '2026-W10', approved.store.criterion).map((row) => row.userId);
  const proposal = normalizeProposal(ready([{ indicator: 'resolvidos', op: 'gte', value: 90, valueTo: null, period: 'week' }], { subsetor: 'E-mail' }));
  const saved = commitTemplate(approved.store, proposal, { confirm: true, name: 'E-mail acima de 90' });
  assert.deepEqual(podiumFor(saved.store, '2026-W10', saved.store.criterion).map((row) => row.userId), before);
  const applied = applyCriterion(saved.store, { mode: 'custom', templateId: saved.template.id }, '2026-W10');
  const podium = podiumFor(applied, '2026-W10', applied.criterion);
  assert.deepEqual(podium.map((row) => row.userId), ['ana']);
  assert.equal(podium[0].subsetor, 'E-mail');
});

test('o prompt e o frontend não levam a chave nem o cadastro', async () => {
  const labels = ['Ana Souza', 'Matheus Larrye Lopes Batista', 'Matheus', 'ana@empresa.com'];
  const prompt = criteriaPrompt('Quero reconhecer a Ana Souza, ana@empresa.com, telefone (11) 99999-8888, com pelo menos 250 tickets na semana.', [{ text: 'o Matheus Larrye Lopes Batista ficou bem' }], labels);
  assert.match(prompt, /250 tickets/);
  assert.match(prompt, /semana/);
  assert.equal(prompt.includes('GEMINI_API_KEY'), false);
  assert.equal(prompt.includes('Ana'), false);
  assert.equal(prompt.includes('Matheus'), false);
  assert.equal(prompt.includes('ana@empresa.com'), false);
  assert.equal(prompt.includes('99999'), false);
  assert.equal(prompt.includes('8888'), false);
  const blocked = criteriaPrompt('quero 250 tickets', ['Olá, Matheus! Tickets resolvidos: 90%. Tempo de primeira resposta: 2 min.'], labels);
  assert.equal(blocked.includes('Matheus'), false);
  let called = false;
  let seen = '';
  const report = await interpretCriteria('Olá, Matheus! Resultados da semana. Tickets resolvidos: 90%. Tempo de primeira resposta: 2 min.', {
    labels,
    generate: async () => { called = true; return { text: '{}' }; },
  });
  assert.equal(called, false);
  assert.equal(report.kind, 'clarify');
  const named = await interpretCriteria('reconhecer Matheus Larrye com pelo menos 250 tickets no mês', {
    labels,
    generate: async (sent) => { seen = sent; return { text: JSON.stringify(ready([{ indicator: 'resolvidosCount', op: 'gte', value: 250, valueTo: null, period: 'month' }], { period: 'month' })) }; },
  });
  assert.equal(seen, '');
  assert.equal(named.ok, true);
  assert.equal(named.rules[0].value, 250);
  assert.equal(named.period, 'month');
  const ui = fs.readFileSync(new URL('../src/components/recognition/GoalsCenter.tsx', import.meta.url), 'utf8');
  const api = fs.readFileSync(new URL('./goalsApi.mjs', import.meta.url), 'utf8');
  assert.match(ui, /Conferência/);
  assert.match(ui, /Indicador \| Valor \| Regra \| Período/);
  assert.equal(ui.includes('GEMINI_API_KEY') || ui.includes('@google/genai') || ui.includes('generativelanguage.googleapis.com'), false);
  assert.equal(api.includes('GEMINI_API_KEY'), false);
  assert.equal(flashModel({}), 'gemini-3.5-flash-lite');
  assert.equal(flashModel({ GEMINI_MODEL: 'gemini-2.5-pro' }), '');
  assert.equal(flashModel({ GEMINI_MODEL: 'gemini-2.5-flash' }), 'gemini-2.5-flash');
  assert.equal(flashModel({ GEMINI_MODEL: 'gemini-3.8-flash' }), 'gemini-3.8-flash');
});
