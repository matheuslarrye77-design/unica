import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateMonth, applyCriterion, buildApproval, emptyStore, isoWeekKey, latestPeriod, matchPeople, overallScore, parseCustomRequest, parseReport, podiumFor, rankRows, runAssistant, subsetorOf } from './goals.mjs';

const people = [
  { id: 'matheus', name: 'Matheus Larrye Lopes Batista', funcao: 'Chat', role: 'Atendimento', aliases: ['Matheus', 'Matheus Larrye', 'Matheus Lopes'] },
  { id: 'ana', name: 'Ana Souza', funcao: 'E-mail', role: 'Atendimento', aliases: [] },
  { id: 'ana2', name: 'Ana Lima', funcao: 'Ligação', role: 'Atendimento', aliases: [] },
  { id: 'joao', name: 'João Pereira', funcao: 'Atendimento', role: 'Atendimento', aliases: ['João'] },
];

const individual = `Olá, Matheus! Bom dia, tudo bem?
Segue abaixo seu rendimento referente à semana 02/03/2026 frente às metas do setor:
Tickets Resolvidos: 262 (89,4%) | Meta: 87% (Meta Atingida)
Tickets Transferidos: 31
Tempo de Primeira Resposta: 1 min | Meta: <= 5 min (Meta Atingida)
Tempo Médio até Resolução: 19 min | Meta: <= 18 min (1 min acima da meta).`;

const consolidated = `METAS DA SEMANA:
* Tickets resolvidos: mínimo de 87%.
* Tickets transferidos: indicador informativo.
* Tempo de primeira resposta: até 5 minutos.
* Tempo médio até resolução: até 18 minutos.

RESULTADOS:
* Matheus: 89,4%, 31, 1 min, 19 min.
* Ana Souza: 95%, 20, 3 min, 15 min.
* João: 82%, 25, 6 min, 20 min.`;

test('relatório individual reconhece nome, meta e o que ficou acima', () => {
  const parsed = parseReport(individual, people);
  assert.equal(parsed.rows.length, 1);
  const row = parsed.rows[0];
  assert.equal(row.userId, 'matheus');
  assert.equal(row.subsetor, 'Chat');
  assert.equal(row.values.resolvidos, 89.4);
  assert.equal(row.values.resolvidosCount, 262);
  assert.equal(row.values.transferidos, 31);
  assert.equal(row.values.primeira, 1);
  assert.equal(row.values.resolucao, 19);
  assert.equal(row.goal.resolvidos.target, 87);
  assert.equal(row.goal.resolucao.target, 18);
  assert.equal(parsed.periodKey, isoWeekKey(new Date(2026, 2, 2)));
});

test('relatório consolidado lê várias pessoas e a meta da semana', () => {
  const parsed = parseReport(consolidated, people);
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[0].userId, 'matheus');
  assert.equal(parsed.rows[1].userId, 'ana');
  assert.equal(parsed.rows[1].subsetor, 'E-mail');
  assert.equal(parsed.rows[2].userId, 'joao');
  assert.equal(parsed.rows[2].subsetor, 'Atendimento');
  assert.equal(parsed.rows[2].values.resolvidos, 82);
  assert.equal(parsed.rows[0].values.resolvidos, 89.4);
  assert.equal(parsed.rows[0].values.resolvidosCount, null);
  assert.equal(parsed.rows[0].values.transferidos, 31);
  assert.equal(parsed.rows[0].values.primeira, 1);
  assert.equal(parsed.rows[0].values.resolucao, 19);
  assert.equal(parsed.rows[0].goal.primeira.target, 5);
  assert.equal(parsed.rows[0].goal.transferidosMode, 'info');
});

test('trinta colaboradores de uma vez', () => {
  const roster = Array.from({ length: 30 }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Pessoa ${index + 1}`,
    funcao: ['Chat', 'E-mail', 'Ligação', 'Atendimento'][index % 4],
    role: 'Atendimento',
    aliases: [],
  }));
  const lines = roster.map((person, index) => `* ${person.name}: ${80 + index}%, ${index + 1}, ${index % 5 + 1} min, ${10 + index} min.`);
  const text = `Tickets resolvidos: mínimo de 87%.\nTempo de primeira resposta: até 5 minutos.\nTempo médio até resolução: até 18 minutos.\n${lines.join('\n')}`;
  const parsed = parseReport(text, roster);
  assert.equal(parsed.rows.length, 30);
  assert.equal(parsed.rows.filter((row) => row.userId).length, 30);
});

test('nome abreviado usa o cadastro e nome parecido não escolhe sozinho', () => {
  const abbreviated = parseReport('Matheus Lopes: 90%, 10, 2 min, 10 min.\nTickets resolvidos: mínimo de 87%.\nTempo de primeira resposta: até 5 minutos.\nTempo médio até resolução: até 18 minutos.', people);
  assert.equal(abbreviated.rows[0].userId, 'matheus');
  const similar = parseReport('Ana: 90%, 10, 2 min, 10 min.\nTickets resolvidos: mínimo de 87%.\nTempo de primeira resposta: até 5 minutos.\nTempo médio até resolução: até 18 minutos.', people);
  assert.equal(similar.rows[0].userId, '');
  assert.equal(similar.rows[0].ambiguous.length, 2);
  assert.equal(matchPeople('Ana', people).length, 2);
});

test('metas diferentes por subsetor ficam na semana certa', () => {
  const text = `Chat\nTickets resolvidos: mínimo de 90%.\nTempo de primeira resposta: até 4 minutos.\nTempo médio até resolução: até 16 minutos.\nE-mail\nTickets resolvidos: mínimo de 80%.\nTempo de primeira resposta: até 8 minutos.\nTempo médio até resolução: até 20 minutos.\nMatheus: 91%, 10, 3 min, 15 min.\nAna Souza: 81%, 8, 7 min, 19 min.`;
  const parsed = parseReport(text, people);
  const matheus = parsed.rows.find((row) => row.userId === 'matheus');
  const ana = parsed.rows.find((row) => row.userId === 'ana');
  assert.equal(matheus.goal.resolvidos.target, 90);
  assert.equal(ana.goal.resolvidos.target, 80);
  assert.equal(matheus.goal.primeira.target, 4);
  assert.equal(ana.goal.primeira.target, 8);
});

test('uma semana nova não apaga a meta da semana anterior', () => {
  const directory = people;
  const first = buildApproval(emptyStore(), {
    text: consolidated,
    periodKey: '2026-W10',
    approvedAt: '2026-03-08T12:00:00.000Z',
  }, directory, { id: 'helena', name: 'Helena Duarte' });
  assert.equal(first.error, undefined);
  const secondText = consolidated.replace('mínimo de 87%', 'mínimo de 92%').replace('até 5 minutos', 'até 4 minutos');
  const second = buildApproval(first.store, {
    text: secondText,
    periodKey: '2026-W11',
    approvedAt: '2026-03-15T12:00:00.000Z',
  }, directory, { id: 'helena', name: 'Helena Duarte' });
  const old = second.store.imports.find((item) => item.periodKey === '2026-W10');
  const next = second.store.imports.find((item) => item.periodKey === '2026-W11');
  assert.equal(old.rows[0].goal.resolvidos.target, 87);
  assert.equal(next.rows[0].goal.primeira.target, 4);
  assert.equal(latestPeriod(second.store), '2026-W11');
  assert.equal(podiumFor(second.store, '2026-W10', { mode: 'overall' }).length > 0, true);
});

test('importação repetida e semana incompleta não substituem o que já foi aprovado', () => {
  const approved = buildApproval(emptyStore(), { text: consolidated, periodKey: '2026-W10' }, people, { id: 'helena', name: 'Helena' });
  const duplicate = buildApproval(approved.store, { text: consolidated, periodKey: '2026-W10' }, people, { id: 'helena', name: 'Helena' });
  assert.equal(duplicate.error, 'duplicate');
  const otherWeek = buildApproval(approved.store, { text: consolidated, periodKey: '2026-W12' }, people, { id: 'helena', name: 'Helena' });
  assert.equal(otherWeek.error, 'duplicate');
  const empty = buildApproval(approved.store, { text: '   ', periodKey: '2026-W13' }, people, { id: 'helena', name: 'Helena' });
  assert.equal(empty.error, 'review');
  assert.equal(latestPeriod(approved.store), '2026-W10');
  assert.equal(approved.store.imports.length, 1);
});

test('critério personalizado e desempenho geral', () => {
  const parsed = parseCustomRequest('Quero um pódio para os colaboradores que resolveram pelo menos 250 tickets durante o mês, mantendo o tempo médio de resolução abaixo de 18 minutos.');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.period, 'month');
  assert.deepEqual(parsed.rules, [
    { indicator: 'resolvidosCount', op: 'gte', value: 250 },
    { indicator: 'resolucao', op: 'lte', value: 18 },
  ]);
  const unclear = parseCustomRequest('Quero um pódio especial.');
  assert.equal(unclear.ok, false);
  const row = parseReport(individual, people).rows[0];
  const score = overallScore(row.values, row.goal);
  assert.equal(typeof score, 'number');
  assert.equal(score <= 100, true);
  const ranking = rankRows([row], { mode: 'overall', weights: { resolvidos: 40, primeira: 25, resolucao: 35, floor: 70 } });
  assert.equal(ranking[0].place, 1);
});

test('mês junta as semanas sem inventar valor que não veio', () => {
  const one = buildApproval(emptyStore(), { text: individual, periodKey: '2026-W10' }, people, { id: '1', name: 'Helena' });
  const month = aggregateMonth(one.store.imports, '2026-03');
  assert.equal(month.length, 1);
  assert.equal(month[0].values.resolvidosCount, 262);
  assert.equal(month[0].values.transferidos, 31);
});

test('subsetor oficial vem da função da equipe', () => {
  assert.equal(subsetorOf(people[0]), 'Chat');
  assert.equal(subsetorOf({ funcao: 'Líder', role: 'Líder' }), '');
});

test('critério escolhido fica gravado e não apaga semana anterior', () => {
  const first = buildApproval(emptyStore(), { text: consolidated, periodKey: '2026-W10' }, people, { id: 'helena', name: 'Helena' });
  const next = applyCriterion(first.store, { mode: 'preset', indicator: 'primeira' }, '2026-W10');
  assert.equal(next.criterion.mode, 'preset');
  assert.equal(next.criterion.indicator, 'primeira');
  assert.equal(next.imports[0].display.indicator, 'primeira');
  const later = buildApproval(next, { text: consolidated.replace('mínimo de 87%', 'mínimo de 90%'), periodKey: '2026-W11', replace: false }, people, { id: 'helena', name: 'Helena' });
  assert.equal(later.store.imports.find((item) => item.periodKey === '2026-W10').display.indicator, 'primeira');
  assert.equal(later.store.imports.find((item) => item.periodKey === '2026-W11').display.indicator, 'primeira');
});

test('assistente lê relatório, pede nomes duvidosos e não inventa pedido solto', () => {
  const store = emptyStore();
  const preview = runAssistant({ text: consolidated, store, people });
  assert.equal(preview.kind, 'preview');
  assert.equal(preview.preview.rows.length, 3);
  const similar = runAssistant({ text: 'Ana: 90%, 10, 2 min, 10 min.\nTickets resolvidos: mínimo de 87%.\nTempo de primeira resposta: até 5 minutos.\nTempo médio até resolução: até 18 minutos.', store, people });
  assert.equal(similar.preview.rows[0].userId, '');
  assert.equal(similar.preview.rows[0].ambiguous.length, 2);
  const lost = runAssistant({ text: 'oi, tudo bem?', store, people });
  assert.equal(lost.kind, 'ask');
  const approve = runAssistant({ text: 'Aprovar', store, people, preview: preview.preview });
  assert.equal(approve.kind, 'approve');
});
