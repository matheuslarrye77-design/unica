import assert from 'node:assert/strict';
import test from 'node:test';
import { describeCriteria, interpretCriteria } from './criteria.mjs';
import { looksLikeReport, parseCustomRequest } from './goals.mjs';

const EXPECTED = [
  { indicator: 'resolvidosCount', op: 'gte', value: 320 },
  { indicator: 'satisfacao', op: 'gte', value: 95 },
  { indicator: 'primeira', op: 'lte', value: 5 },
  { indicator: 'resolucao', op: 'lte', value: 8 },
];

const PHRASES = [
  `Quatro metas para novembro de 2026:
* Tickets resolvidos: pelo menos 320.
* Satisfação: pelo menos 95%.
* Primeira resposta: no máximo 5 minutos.
* Tempo médio de resolução: no máximo 8 minutos.`,
  `Metas de novembro de 2026: tickets resolvidos no mínimo 320, satisfação no mínimo 95%, primeira resposta até 5 minutos e tempo médio de resolução até 8 minutos.`,
  `Para novembro de 2026, tickets resolvidos maior ou igual a 320, satisfação maior ou igual a 95%, primeira resposta menor ou igual a 5 minutos, TMA menor ou igual a 8 minutos.`,
  `Novembro/2026: quantidade de tickets resolvidos >= 320; CSAT >= 95%; TPR <= 5 min; tempo médio de resolução <= 8 min.`,
];

function assertFour(parsed) {
  assert.equal(parsed.ok, true);
  assert.equal(parsed.period, 'month');
  assert.equal(parsed.periodKey, 'month:2026-11');
  assert.equal(parsed.periodLabel, 'Novembro/2026');
  assert.equal(parsed.rules.length, 4);
  assert.deepEqual(
    EXPECTED.map((want) => parsed.rules.find((rule) => rule.indicator === want.indicator)),
    EXPECTED,
  );
}

for (const [index, text] of PHRASES.entries()) {
  test(`interpreta as quatro metas da gestão na forma ${index + 1}`, () => {
    assert.equal(looksLikeReport(text), false);
    assertFour(parseCustomRequest(text));
  });
}

test('interpretCriteria local preserva as quatro metas e a conferência', async () => {
  let called = false;
  const text = PHRASES[0];
  const result = await interpretCriteria(text, { generate: async () => { called = true; return { text: '{}' }; } });
  assert.equal(called, false);
  assert.equal(result.kind, 'proposal');
  assert.equal(result.period, 'month');
  assert.equal(result.periodLabel, 'Novembro/2026');
  assert.deepEqual(
    EXPECTED.map((want) => result.rules.find((rule) => rule.indicator === want.indicator)),
    EXPECTED.map((want) => ({ ...want, period: 'month' })),
  );
  assert.match(result.reply, /Tickets resolvidos \| 320 \| >= \| Novembro\/2026/);
  assert.match(result.reply, /Satisfação \| 95% \| >= \| Novembro\/2026/);
  assert.match(result.reply, /Primeira resposta \| 5 min \| <= \| Novembro\/2026/);
  assert.match(result.reply, /Tempo médio de resolução \| 8 min \| <= \| Novembro\/2026/);
  assert.match(describeCriteria(result), /Conferência das metas/);
  assert.equal(result.rules.some((rule) => rule.indicator === 'transferidos' || rule.indicator === 'resolvidos'), false);
});

test('resultados de colaborador não viram meta da gestão', async () => {
  const text = `Metas para novembro de 2026:
Tickets resolvidos: pelo menos 320.
Satisfação: pelo menos 95%.
Primeira resposta: no máximo 5 minutos.
Tempo médio de resolução: no máximo 8 minutos.
Ana Souza: 280
Felipe Costa: 410 tickets resolvidos.`;
  const parsed = parseCustomRequest(text);
  assertFour(parsed);
  assert.equal(parsed.rules.find((rule) => rule.indicator === 'resolvidosCount').value, 320);
  const result = await interpretCriteria(text, { generate: async () => ({ text: JSON.stringify({ status: 'ready', explanation: '', questions: [], period: 'week', combine: 'all', subsetor: '', weights: null, criteria: [{ indicator: 'resolvidosCount', op: 'gte', value: 280, valueTo: null, period: 'week' }] }) }) });
  assert.equal(result.period, 'month');
  assert.equal(result.rules.find((rule) => rule.indicator === 'resolvidosCount').value, 320);
  assert.equal(result.rules.length, 4);
});

test('não transforma satisfação em percentual de tickets nem inverte a regra', () => {
  const parsed = parseCustomRequest('Novembro de 2026: satisfação pelo menos 95%, tickets resolvidos pelo menos 320, primeira resposta no máximo 5 min, TMA no máximo 8 min.');
  assertFour(parsed);
  assert.equal(parsed.rules.find((rule) => rule.indicator === 'satisfacao').op, 'gte');
  assert.equal(parsed.rules.some((rule) => rule.indicator === 'resolvidos' && rule.value === 95), false);
  const inverted = parseCustomRequest('Novembro de 2026: satisfação no máximo 95%.');
  assert.equal(inverted.ok, true);
  assert.equal(inverted.rules[0].indicator, 'satisfacao');
  assert.equal(inverted.rules[0].op, 'lte');
  assert.equal(inverted.rules[0].value, 95);
});

test('mês pedido não vira semana e indicador omitido não passa', async () => {
  const week = parseCustomRequest(`${PHRASES[0]}\nUse a semana, não o mês.`);
  assert.equal(week.ok, false);
  assert.match(week.message, /semana e mês/);
  const omitted = parseCustomRequest(`Novembro de 2026:
Satisfação: pelo menos 95%.
Primeira resposta: no máximo 5 minutos.
Tempo médio de resolução: no máximo 8 minutos.`);
  assert.equal(omitted.ok, true);
  assert.equal(omitted.rules.some((rule) => rule.indicator === 'resolvidosCount'), false);
  const incomplete = parseCustomRequest(`Novembro de 2026:
Tickets resolvidos.
Satisfação: pelo menos 95%.
Primeira resposta: no máximo 5 minutos.
Tempo médio de resolução: no máximo 8 minutos.`);
  assert.equal(incomplete.ok, false);
  const missingPeriod = parseCustomRequest('Tickets resolvidos pelo menos 320, satisfação pelo menos 95%, primeira resposta no máximo 5 min, TMA no máximo 8 min.');
  assert.equal(missingPeriod.ok, false);
  assert.match(missingPeriod.message, /semana ou do mês/);
  let called = false;
  const result = await interpretCriteria(`Novembro de 2026:
Tickets resolvidos.
Satisfação: pelo menos 95%.
Primeira resposta: no máximo 5 minutos.
Tempo médio de resolução: no máximo 8 minutos.`, {
    generate: async () => { called = true; return { text: '{}' }; },
  });
  assert.equal(called, false);
  assert.equal(result.kind, 'clarify');
});
