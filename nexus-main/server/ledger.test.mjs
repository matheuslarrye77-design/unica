import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { applyCriterion, emptyStore, fold, matchPeople, monthKey, parseReport, publicStore, relinkLedger } from './goals.mjs';
import { applyLedgerRanking, ingestReport, proposeFromLedger } from './ledger.mjs';

const now = new Date(2026, 10, 1, 12, 0, 0);
const person = (id, name, funcao = 'E-mail') => ({ id, name, funcao, role: 'Atendimento', aliases: [] });
const matheus = person('matheus', 'Matheus Larrye', 'Chat');
const felipe = person('tm-4', 'Felipe Costa');
const rafael = person('tm-8', 'Rafael Oliveira');
const ana = person('ana', 'Ana Souza');
const isabela = person('tm-15', 'Isabela Costa', 'Chat');

const report = `Considere exclusivamente estes dois colaboradores:

Felipe Costa: 320 tickets resolvidos.
Rafael Oliveira: 285 tickets resolvidos.

Crie uma meta de reconhecimento para quem resolver pelo menos 250 tickets no mês e monte o pódio com base nesses dados.

Não invente colaboradores, não complete o pódio com pessoas que não foram informadas e não utilize dados externos.`;

test('teste A: dois colaboradores entram no banco e a meta não muda o pódio', () => {
  const original = emptyStore();
  const outcome = ingestReport(original, report, [felipe, rafael, ana, isabela], { now });
  assert.equal(outcome.kind, 'ledger');
  assert.equal(original.ledger.records.length, 0);
  assert.equal(outcome.store.imports.length, 0);
  assert.equal(outcome.store.templates.length, 0);
  assert.equal(outcome.store.criterion.mode, 'overall');
  assert.equal(outcome.store.ledger.records.length, 2);
  const names = outcome.store.ledger.records.map((row) => row.userId).sort();
  assert.deepEqual(names, ['tm-4', 'tm-8']);
  assert.equal(outcome.store.ledger.records.find((row) => row.userId === 'tm-4').values.resolvidosCount, 320);
  assert.equal(outcome.store.ledger.records.find((row) => row.userId === 'tm-8').values.resolvidosCount, 285);
  assert.equal(outcome.store.ledger.records.every((row) => row.changes.resolvidosCount === 'new'), true);
  assert.equal(outcome.proposal.rules[0].value, 250);
  assert.equal(outcome.proposal.period, 'month');
  assert.deepEqual(outcome.store.ledger.ranking.map((row) => row.name), ['Felipe Costa', 'Rafael Oliveira']);
  assert.equal(outcome.store.ledger.applied.length, 0);
  assert.equal(outcome.reply.includes('não encontrei colaboradores'), false);
  assert.match(outcome.reply, /pódio não foi alterado|Nada foi aplicado ao pódio/);
  assert.equal(outcome.reply.includes('Ana Souza') || outcome.reply.includes('Isabela Costa'), false);
});

test('teste B: o mesmo período substitui o valor e guarda o anterior', () => {
  const first = ingestReport(emptyStore(), 'Matheus: 150 tickets resolvidos, 96% na semana.', [matheus], { now });
  const second = ingestReport(first.store, 'Matheus: 220 tickets resolvidos na semana.', [matheus], { now });
  assert.equal(second.store.ledger.records.length, 1);
  const record = second.store.ledger.records[0];
  assert.equal(record.userId, 'matheus');
  assert.equal(record.values.resolvidosCount, 220);
  assert.notEqual(record.values.resolvidosCount, 370);
  assert.equal(record.values.resolvidos, 96);
  assert.equal(record.changes.resolvidosCount, 'updated');
  assert.equal(record.changes.resolvidos, 'same');
  assert.equal(record.history.length, 1);
  assert.equal(record.history[0].values.resolvidosCount, 150);
  assert.match(second.reply, /220 \(ATUALIZADO\)/);
  assert.match(second.reply, /96% \(SEM ALTERAÇÃO\)/);
  assert.equal(second.reply.includes('96% (NOVO)'), false);
  assert.equal(second.store.criterion.mode, 'overall');
  const month = ingestReport(second.store, 'Matheus: 80 tickets resolvidos no mês.', [matheus], { now });
  assert.equal(month.store.ledger.records.length, 2);
  assert.equal(month.store.ledger.records.find((row) => row.periodKey === monthKey(now)).values.resolvidosCount, 80);
  assert.equal(month.store.ledger.records.find((row) => row.periodKey !== monthKey(now)).values.resolvidosCount, 220);
  const asked = ingestReport(first.store, 'Matheus: 220 tickets resolvidos.', [matheus], { now });
  assert.equal(asked.kind, 'clarify');
  assert.equal(asked.store.ledger.records[0].values.resolvidosCount, 150);
  const conflict = ingestReport(emptyStore(), 'Matheus: 150 tickets resolvidos na semana e no mês.', [matheus], { now });
  assert.equal(conflict.kind, 'clarify');
  assert.equal(conflict.store.ledger.records.length, 0);
});

test('teste C: aceita acento, maiúsculas, aspas e o par Filipe/Felipe', () => {
  const roster = [
    person('joao', 'João Pereira', 'Chat'),
    felipe,
    person('graca', 'Graça Nunes', 'Ligação'),
    matheus,
  ];
  const text = `●\tJoao: 10 tickets resolvidos.
“Filipe Costa”: 11 tickets resolvidos.
* Graca: 12 tickets resolvidos.
MATHEUS: 13 tickets resolvidos.`;
  const outcome = ingestReport(emptyStore(), text, roster, { now });
  const ids = Object.fromEntries(outcome.store.ledger.records.map((row) => [row.userId, row.values.resolvidosCount]));
  assert.deepEqual(ids, { joao: 10, 'tm-4': 11, graca: 12, matheus: 13 });
});

test('teste D: erro pequeno só vincula quando a correspondência é única', () => {
  const safe = ingestReport(emptyStore(), '●\tMatheuz: 15 tickets resolvidos.', [matheus], { now });
  assert.equal(safe.store.ledger.records[0].userId, 'matheus');
  assert.equal(safe.store.ledger.records[0].name, 'Matheus Larrye');
  const far = ingestReport(emptyStore(), 'Xyzabc Qwerty: 8 tickets resolvidos.', [matheus, ana], { now });
  assert.equal(far.store.ledger.records.length, 1);
  assert.equal(far.store.ledger.records[0].userId, '');
  assert.match(far.reply, /nenhum colaborador novo foi criado/i);
  const short = ingestReport(emptyStore(), 'An: 4 tickets resolvidos.', [ana], { now });
  assert.equal(short.store.ledger.records[0].userId, '');
});

test('teste E: nomes parecidos pedem confirmação', () => {
  const matheus2 = person('m2', 'Matheus Silva', 'Ligação');
  const similar = ingestReport(emptyStore(), 'Matheus: 10 tickets resolvidos.', [matheus, matheus2], { now });
  assert.equal(similar.store.ledger.records.every((row) => row.userId === ''), true);
  assert.match(similar.reply, /Matheus Larrye/);
  assert.match(similar.reply, /Matheus Silva/);
  assert.match(similar.reply, /Confirme/);
  const filipe = person('filipe', 'Filipe Costa', 'Chat');
  const twins = ingestReport(emptyStore(), 'Filipe Costa: 10 tickets resolvidos.', [felipe, filipe], { now });
  assert.equal(twins.store.ledger.records[0].userId, 'filipe');
  assert.equal(twins.store.ledger.records[0].name, 'Filipe Costa');
  const lastName = ingestReport(emptyStore(), 'Costa: 10 tickets resolvidos.', [felipe, isabela], { now });
  assert.equal(lastName.store.ledger.records[0].userId, '');
  assert.match(lastName.reply, /Felipe Costa/);
  assert.match(lastName.reply, /Isabela Costa/);
  assert.match(lastName.reply, /Confirme/);
});

test('teste F: o banco sobrevive a um novo carregamento do arquivo', () => {
  const outcome = ingestReport(emptyStore(), report, [felipe, rafael, ana], { now });
  const saved = JSON.parse(JSON.stringify(outcome.store));
  const loaded = {
    ...emptyStore(),
    ...saved,
    ledger: {
      records: Array.isArray(saved.ledger?.records) ? saved.ledger.records : [],
      ranking: Array.isArray(saved.ledger?.ranking) ? saved.ledger.ranking : [],
    },
  };
  const view = publicStore(loaded);
  assert.equal(view.ledger.records.find((row) => row.userId === 'tm-4').values.resolvidosCount, 320);
  assert.equal(view.ledger.records.find((row) => row.userId === 'tm-8').values.resolvidosCount, 285);
  assert.equal(view.ledger.ranking.length, 2);
  assert.equal(view.criterion.mode, 'overall');
  assert.equal(view.imports.length, 0);
});

test('teste G: a classificação usa o banco e só quem atende ao critério', () => {
  const roster = [felipe, rafael, ana];
  let store = emptyStore();
  for (const line of [
    'Felipe Costa: 320 tickets resolvidos no mês.',
    'Rafael Oliveira: 285 tickets resolvidos no mês.',
    'Ana Souza: 100 tickets resolvidos no mês.',
    'Visitante: 400 tickets resolvidos no mês.',
  ]) {
    const step = ingestReport(store, line, roster, { now });
    assert.equal(step.kind, 'ledger');
    store = step.store;
  }
  const proposal = proposeFromLedger(store, 'Crie uma meta de reconhecimento para quem resolver pelo menos 250 tickets no mês.', now);
  assert.deepEqual(proposal.ranking.map((row) => row.name), ['Felipe Costa', 'Rafael Oliveira']);
  assert.equal(proposal.ranking.some((row) => row.name === 'Ana Souza' || row.name === 'Visitante'), false);
  assert.equal(store.criterion.mode, 'overall');
  assert.equal(store.imports.length, 0);
  assert.equal(store.ledger.records.length, 4);
  assert.equal(store.ledger.records.find((row) => row.sourceName === 'Visitante').userId, '');
  assert.equal((store.ledger.applied ?? []).length, 0);
  const withTemplate = {
    ...store,
    templates: [{ id: 'meta-1', name: 'Meta', description: '', period: 'month', combine: 'all', subsetor: '', weights: null, rules: [{ indicator: 'resolvidosCount', op: 'gte', value: 250, period: 'month' }] }],
  };
  const chosen = applyLedgerRanking(applyCriterion(withTemplate, { mode: 'custom', templateId: 'meta-1' }, ''), now);
  assert.deepEqual(chosen.ledger.applied.map((row) => row.name), ['Felipe Costa', 'Rafael Oliveira']);
  assert.equal(chosen.imports.length, 0);
  const back = applyLedgerRanking(applyCriterion(chosen, { mode: 'overall', indicator: 'resolvidos' }, ''), now);
  assert.equal(back.ledger.applied.length, 0);
  assert.equal(back.ledger.records.length, 4);
});

test('a Equipe atual e um cadastro novo entram sem lista fixa de nomes', () => {
  const source = fs.readFileSync(new URL('../src/data/team.ts', import.meta.url), 'utf8');
  const current = [...source.matchAll(/member\('([^']+)', '([^']+)',/g)].map((match) => ({
    id: match[1],
    name: match[2],
    email: `${fold(match[2]).replace(/ /g, '.')}@company.com`,
    ramal: '',
    funcao: 'E-mail',
    role: 'Atendimento',
    aliases: [],
  }));
  const helena = {
    id: 'col-new',
    name: 'Helena Duarte',
    email: 'helena.duarte@unica.local',
    ramal: '1099',
    funcao: 'Chat',
    role: 'Atendimento',
    aliases: [],
  };
  const roster = [...current, helena];
  const lines = roster.map((item, index) => `${item.name}: ${200 + index} tickets resolvidos no mês.`);
  const outcome = ingestReport(emptyStore(), lines.join('\n'), roster, { now });
  assert.equal(outcome.kind, 'ledger');
  assert.equal(outcome.store.ledger.records.length, roster.length);
  assert.equal(outcome.store.ledger.records.every((row) => Boolean(row.userId)), true);
  assert.equal(outcome.store.ledger.records.some((row) => row.userId === 'col-new'), true);
  assert.equal(outcome.store.ledger.records.find((row) => row.userId === 'col-new').values.resolvidosCount, 200 + roster.length - 1);
  assert.equal(outcome.store.ledger.applied.length, 0);
});

test('acento, e-mail e ramal apontam para o cadastro da Equipe', () => {
  const joao = { id: 'joao', name: 'João Pereira', email: 'joao.pereira@unica.local', ramal: '2040', funcao: 'Chat', role: 'Atendimento', aliases: [] };
  const roster = [joao, felipe];
  const accent = ingestReport(emptyStore(), 'Joao Pereira: 12 tickets resolvidos no mês.', roster, { now });
  assert.equal(accent.store.ledger.records[0].userId, 'joao');
  const mail = ingestReport(emptyStore(), 'joao.pereira@unica.local: 14 tickets resolvidos no mês.', roster, { now });
  assert.equal(mail.store.ledger.records[0].userId, 'joao');
  const ramal = ingestReport(emptyStore(), '2040: 16 tickets resolvidos no mês.', roster, { now });
  assert.equal(ramal.store.ledger.records[0].userId, 'joao');
  assert.deepEqual(matchPeople('JOÃO PEREIRA', roster).map((item) => item.id), ['joao']);
});

test('indicadores seguem o significado e a ordem do texto', () => {
  const labeled = parseReport('Felipe Costa: 92% de satisfação, 8 minutos de tempo médio de resolução, 4 minutos de primeira resposta, 320 tickets resolvidos.', [felipe]);
  assert.equal(labeled.rows[0].userId, 'tm-4');
  assert.equal(labeled.rows[0].values.resolvidosCount, 320);
  assert.equal(labeled.rows[0].values.satisfacao, 92);
  assert.equal(labeled.rows[0].values.primeira, 4);
  assert.equal(labeled.rows[0].values.resolucao, 8);
  assert.equal(labeled.rows[0].values.resolvidos, null);
  const compact = parseReport('Rafael Oliveira: 320 tickets, 92% de satisfação, 4 minutos, 8 minutos.', [rafael]);
  assert.equal(compact.rows[0].values.resolvidosCount, 320);
  assert.equal(compact.rows[0].values.satisfacao, 92);
  assert.equal(compact.rows[0].values.primeira, 4);
  assert.equal(compact.rows[0].values.resolucao, 8);
  assert.equal(compact.rows[0].values.resolvidos, null);
  const mixed = ingestReport(emptyStore(), 'Felipe Costa: 150 tickets resolvidos, 96% na semana.', [felipe], { now });
  assert.equal(mixed.store.ledger.records[0].values.resolvidosCount, 150);
  assert.equal(mixed.store.ledger.records[0].values.resolvidos, 96);
  assert.equal(mixed.store.ledger.records[0].values.satisfacao, null);
});

test('publicStore preserva satisfação e religa pendente único à Equipe', () => {
  const store = emptyStore();
  store.ledger.records = [{
    id: 'ledger:pending:rafael oliveira:month:2026-11',
    identity: 'pending:rafael oliveira',
    userId: '',
    sourceName: 'Rafael Oliveira',
    name: 'Rafael Oliveira',
    periodKey: 'month:2026-11',
    periodLabel: 'novembro de 2026',
    values: { resolvidos: null, resolvidosCount: 285, transferidos: null, primeira: 4, resolucao: 8, satisfacao: 92 },
    changes: {},
    updatedAt: now.toISOString(),
    note: 'Não encontrei este nome na Equipe.',
    candidates: [],
    history: [],
  }];
  const view = publicStore(store);
  assert.equal(view.ledger.records[0].values.satisfacao, 92);
  assert.equal(view.ledger.records[0].values.resolvidos, null);
  const linked = relinkLedger(view.ledger, [rafael, felipe]);
  assert.equal(linked.records[0].userId, 'tm-8');
  assert.equal(linked.records[0].pending, false);
  assert.equal(linked.records[0].name, 'Rafael Oliveira');
});

test('nova importação aproveita o registro pendente do mesmo nome e período', () => {
  const pending = ingestReport(emptyStore(), 'Visitante: 10 tickets resolvidos no mês.', [felipe], { now }).store;
  const named = { id: 'col-9', name: 'Visitante Silva', funcao: 'Chat', role: 'Atendimento', aliases: ['Visitante'] };
  const linked = ingestReport(pending, 'Visitante: 12 tickets resolvidos no mês.', [named], { now });
  assert.equal(linked.store.ledger.records.length, 1);
  assert.equal(linked.store.ledger.records[0].userId, 'col-9');
  assert.equal(linked.store.ledger.records[0].values.resolvidosCount, 12);
  assert.equal(linked.store.ledger.records[0].history.length, 1);
});

test('colar no chat não envia a mensagem sozinho', () => {
  const ui = fs.readFileSync(new URL('../src/components/recognition/GoalsCenter.tsx', import.meta.url), 'utf8');
  assert.equal(ui.includes('onPaste'), false);
  assert.equal(ui.includes('void talk(pasted)'), false);
  assert.equal(ui.includes('Abrir banco de dados dos relatórios'), true);
  assert.equal(ui.includes('Metas definidas pela gestão'), true);
  assert.equal(ui.includes('Resultados individuais'), true);
  assert.equal(ui.includes('Aguardando identificação'), true);
  assert.equal(ui.includes('Atingiu a meta'), true);
  assert.equal(ui.includes('Histórico de atualizações'), true);
  assert.equal(ui.includes('pendente de identificação'), false);
});
