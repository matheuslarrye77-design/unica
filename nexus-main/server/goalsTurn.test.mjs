import assert from 'node:assert/strict';
import test from 'node:test';
import { citedNumbers, goalsTurnPrompt, interpretGoalsTurn } from './goalsTurn.mjs';

const people = [
  { id: 'tm-8', name: 'Rafael Oliveira', funcao: 'E-mail', role: 'Atendimento', aliases: [] },
  { id: 'tm-4', name: 'Felipe Costa', funcao: 'E-mail', role: 'Atendimento', aliases: [] },
];

const TEXT = 'Preciso definir as metas gerais para novembro de 2026: tickets resolvidos pelo menos 320, satisfação pelo menos 95%, primeira resposta no máximo 5 minutos e tempo médio de resolução no máximo 8 minutos. O Rafael Oliveira ficou com 300 tickets resolvidos, 94% de satisfação, 4 minutos de primeira resposta e 9 minutos de tempo médio de resolução. O Felipe Costa ficou com 350 tickets resolvidos, 97% de satisfação, 3 minutos de primeira resposta e 7 minutos de tempo médio de resolução. Compara os resultados de cada um com as metas. Conferir antes de salvar. Não alterar o pódio.';

function model(overrides = {}) {
  return {
    status: 'ready',
    intent: 'review',
    explanation: '',
    questions: [],
    period: 'month',
    periodKey: 'month:2026-11',
    periodLabel: 'Novembro/2026',
    changePodium: false,
    goals: [
      { indicator: 'resolvidosCount', op: 'gte', value: 320, valueTo: null, period: 'month' },
      { indicator: 'satisfacao', op: 'gte', value: 95, valueTo: null, period: 'month' },
      { indicator: 'primeira', op: 'lte', value: 5, valueTo: null, period: 'month' },
      { indicator: 'resolucao', op: 'lte', value: 8, valueTo: null, period: 'month' },
    ],
    people: [
      { name: 'Rafael Oliveira', resolvidosCount: 300, resolvidos: null, transferidos: null, primeira: 4, resolucao: 9, satisfacao: 94 },
      { name: 'Felipe Costa', resolvidosCount: 350, resolvidos: null, transferidos: null, primeira: 3, resolucao: 7, satisfacao: 97 },
    ],
    ...overrides,
  };
}

test('Gemini recebe o texto com os nomes escritos pela gestão', () => {
  const prompt = goalsTurnPrompt(TEXT, [{ text: 'olá' }]);
  assert.match(prompt, /Rafael Oliveira/);
  assert.match(prompt, /Felipe Costa/);
  assert.match(prompt, /320/);
  assert.equal(prompt.includes('GEMINI_API_KEY'), false);
});

test('números citados no texto não incluem o ano', () => {
  assert.equal(citedNumbers(TEXT).includes(2026), false);
  assert.equal(citedNumbers(TEXT).includes(320), true);
  assert.equal(citedNumbers(TEXT).includes(94), true);
});

test('interpretação do Gemini é validada e vira conferência completa', async () => {
  let called = false;
  const result = await interpretGoalsTurn(TEXT, {
    people,
    generate: async () => {
      called = true;
      return { text: JSON.stringify(model({ changePodium: true })) };
    },
  });
  assert.equal(called, true);
  assert.equal(result.kind, 'review');
  assert.equal(result.persist, false);
  assert.equal(result.periodLabel, 'Novembro/2026');
  assert.equal(result.rules.length, 4);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows.find((row) => row.userId === 'tm-8').values.satisfacao, 94);
  assert.equal(result.rows.find((row) => row.userId === 'tm-4').values.resolucao, 7);
  assert.match(result.reply, /Resultados individuais/);
  assert.match(result.reply, /não foi alterado|permanece como está/i);
});

test('Gemini incompleto é completado pela validação local sem inventar valor', async () => {
  const result = await interpretGoalsTurn(TEXT, {
    people,
    generate: async () => ({
      text: JSON.stringify(model({
        goals: [{ indicator: 'resolvidosCount', op: 'gte', value: 320, valueTo: null, period: 'month' }],
        people: [{ name: 'Rafael Oliveira', resolvidosCount: 300, resolvidos: null, transferidos: null, primeira: null, resolucao: null, satisfacao: null }],
      })),
    }),
  });
  assert.equal(result.rules.length, 4);
  assert.equal(result.rows.find((row) => row.userId === 'tm-8').values.resolucao, 9);
  assert.equal(result.rows.find((row) => row.userId === 'tm-4').values.resolvidosCount, 350);
});

test('número inventado pelo Gemini é descartado', async () => {
  const result = await interpretGoalsTurn(TEXT, {
    people,
    generate: async () => ({
      text: JSON.stringify(model({
        goals: [{ indicator: 'resolvidosCount', op: 'gte', value: 999, valueTo: null, period: 'month' }],
      })),
    }),
  });
  assert.equal(result.rules.find((rule) => rule.indicator === 'resolvidosCount').value, 320);
});

test('se o Gemini falha, a extração local ainda monta a conferência', async () => {
  const result = await interpretGoalsTurn(TEXT, {
    people,
    generate: async () => ({ error: 'unavailable' }),
  });
  assert.equal(result.kind, 'review');
  assert.equal(result.rows.length, 2);
  assert.equal(result.rules.length, 4);
});
