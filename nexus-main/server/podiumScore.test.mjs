import assert from 'node:assert/strict';
import test from 'node:test';
import { overallFor } from './goalsCenter.mjs';

const period = { periodKey: '2027-08', periodLabel: 'Agosto/2027' };
const chat = [
  { id: 'a', name: 'Ana Chat', funcao: 'Chat' },
  { id: 'b', name: 'Bia Chat', funcao: 'Chat' },
  { id: 'c', name: 'Caio Chat', funcao: 'Chat' },
  { id: 'd', name: 'Duda Chat', funcao: 'Chat' },
  { id: 'e', name: 'Eva Chat', funcao: 'Chat' },
];

function row(userId, name, values) {
  return { userId, name, periodKey: '2027-08', values };
}

function pack(ids) {
  const weight = 100 / ids.length;
  const map = { resolvidos: 'resolvidos', transferidos: 'transferidos', primeira: 'primeira', resolucao: 'resolucao', atendidas: 'atendidas', perdidas: 'perdidas', espera: 'espera', duracao: 'duracao', faltas: 'faltas' };
  const out = {};
  ids.forEach((id) => { out[map[id] || id] = weight; });
  return out;
}

test('meta de faltas zero desclassifica quem teve falta e pontua quem zerou', () => {
  const records = [
    row('a', 'Ana Chat', { resolvidosCount: 100, faltas: 0 }),
    row('b', 'Bia Chat', { resolvidosCount: 100, faltas: 1 }),
    row('c', 'Caio Chat', { resolvidosCount: 100, faltas: 2 }),
  ];
  const scored = overallFor(records, [
    { indicator: 'resolvidosCount', op: 'gte', value: 10 },
    { indicator: 'faltas', op: 'lte', value: 0 },
  ], pack(['resolvidosCount', 'faltas']), period, ['resolvidosCount', 'faltas'], true, chat);
  assert.deepEqual(scored.scores.map((item) => item.userId), ['a']);
  assert.equal(scored.scores[0].score, 100);
  assert.equal(scored.scores[0].parts.faltas.contribution, 50);
});

test('meta de faltas 2 pontua 20, 10 e 0 e empata iguais', () => {
  const extras = { resolvidosCount: 100, transferidos: 0, primeira: 1, resolucao: 1 };
  const records = [
    row('a', 'Ana Chat', { ...extras, faltas: 0 }),
    row('b', 'Bia Chat', { ...extras, faltas: 0 }),
    row('c', 'Caio Chat', { ...extras, faltas: 1 }),
    row('d', 'Duda Chat', { ...extras, faltas: 1 }),
    row('e', 'Eva Chat', { ...extras, faltas: 1 }),
    row('f', 'Fê Chat', { ...extras, faltas: 2 }),
    row('g', 'Gil Chat', { ...extras, faltas: 3 }),
  ];
  const roster = [...chat, { id: 'f', name: 'Fê Chat', funcao: 'Chat' }, { id: 'g', name: 'Gil Chat', funcao: 'Chat' }];
  const selected = ['resolvidosCount', 'transferidos', 'primeira', 'resolucao', 'faltas'];
  const scored = overallFor(records, [
    { indicator: 'resolvidosCount', op: 'gte', value: 10 },
    { indicator: 'transferidos', op: 'lte', value: 40 },
    { indicator: 'primeira', op: 'lte', value: 5 },
    { indicator: 'resolucao', op: 'lte', value: 8 },
    { indicator: 'faltas', op: 'lte', value: 2 },
  ], pack(selected), period, selected, true, roster);
  const by = Object.fromEntries(scored.scores.map((item) => [item.userId, item.parts.faltas.contribution]));
  assert.equal(by.a, 20);
  assert.equal(by.b, 20);
  assert.equal(by.c, 10);
  assert.equal(by.d, 10);
  assert.equal(by.e, 10);
  assert.equal(by.f, 0);
  assert.equal(by.g, 0);
  assert.equal(scored.scores.length, 7);
});

test('empate no melhor resultado de tickets recebe o peso integral', () => {
  const records = [
    row('a', 'Ana Chat', { resolvidosCount: 100 }),
    row('b', 'Bia Chat', { resolvidosCount: 100 }),
    row('c', 'Caio Chat', { resolvidosCount: 90 }),
    row('d', 'Duda Chat', { resolvidosCount: 80 }),
  ];
  const scored = overallFor(records, [{ indicator: 'resolvidosCount', op: 'gte', value: 10 }], { resolvidos: 100 }, period, ['resolvidosCount'], true, chat);
  const by = Object.fromEntries(scored.scores.map((item) => [item.userId, item.parts.resolvidosCount.contribution]));
  assert.equal(by.a, 100);
  assert.equal(by.b, 100);
  assert.equal(by.c, 90);
  assert.equal(by.d, 80);
  assert.equal(scored.scores.filter((item) => item.score === 100).length, 2);
});

test('menor resultado elegível de transferidos leva o peso e empata iguais', () => {
  const records = [
    row('a', 'Ana Chat', { transferidos: 4 }),
    row('b', 'Bia Chat', { transferidos: 4 }),
    row('c', 'Caio Chat', { transferidos: 8 }),
  ];
  const scored = overallFor(records, [{ indicator: 'transferidos', op: 'lte', value: 40 }], { transferidos: 100 }, period, ['transferidos'], true, chat);
  const by = Object.fromEntries(scored.scores.map((item) => [item.userId, item.parts.transferidos.contribution]));
  assert.equal(by.a, 100);
  assert.equal(by.b, 100);
  assert.equal(by.c, 50);
});
