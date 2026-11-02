import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { commitTemplate, interpretCriteria } from './criteria.mjs';
import { emptyStore, parseReport, publicStore, reportBankSnapshot, runAssistant } from './goals.mjs';
import { ingestReport } from './ledger.mjs';

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
  assert.equal(ui.includes('O pódio passa a usar esta regra'), false);
});
