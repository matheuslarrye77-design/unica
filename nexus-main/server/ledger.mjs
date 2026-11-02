import { commitTemplate } from './criteria.mjs';
import { fold, formatPeriodLabel, isoWeekKey, mentionedPeriods, metricOf, monthKey, parseCustomRequest, parseReport, passesRules } from './goals.mjs';

const FIELDS = ['resolvidosCount', 'resolvidos', 'transferidos', 'primeira', 'resolucao', 'satisfacao'];
const NAMES = {
  resolvidosCount: 'Tickets resolvidos',
  resolvidos: 'Tickets resolvidos (%)',
  transferidos: 'Tickets transferidos',
  primeira: 'Primeira resposta',
  resolucao: 'Tempo médio de resolução',
  satisfacao: 'Satisfação',
};
const OPS = { gt: 'maior que', gte: 'pelo menos', lt: 'menor que', lte: 'no máximo', eq: 'igual a', between: 'entre' };
const MARKS = { new: 'NOVO', updated: 'ATUALIZADO', same: 'SEM ALTERAÇÃO' };
function blankValues() {
  return { resolvidos: null, resolvidosCount: null, transferidos: null, primeira: null, resolucao: null, satisfacao: null };
}

function usefulRows(parsed) {
  return parsed.rows.filter((row) => FIELDS.some((field) => row.values[field] !== null && row.values[field] !== undefined));
}

function identityOf(row) {
  return row.userId ? row.userId : `pending:${fold(row.sourceName)}`;
}

function periodLabel(key) {
  return formatPeriodLabel(key);
}

function mergeValues(before, incoming) {
  const next = { ...blankValues(), ...(before ?? {}) };
  for (const field of FIELDS) {
    if (incoming[field] !== null && incoming[field] !== undefined) next[field] = incoming[field];
  }
  return next;
}

function diffValues(before, after) {
  const changes = {};
  for (const field of FIELDS) {
    const left = before?.[field] ?? null;
    const right = after?.[field] ?? null;
    if (left === right) changes[field] = right === null ? 'empty' : 'same';
    else if (left === null) changes[field] = 'new';
    else changes[field] = 'updated';
  }
  return changes;
}

function sameMarks(values) {
  const changes = {};
  for (const field of FIELDS) changes[field] = values?.[field] === null || values?.[field] === undefined ? 'empty' : 'same';
  return changes;
}

function formatValue(field, value) {
  if (field === 'resolvidos' || field === 'satisfacao') return `${value}%`;
  if (field === 'primeira' || field === 'resolucao') return `${value} min`;
  return String(value);
}

function describeRule(rule) {
  const name = NAMES[rule.indicator] ?? rule.indicator;
  const when = rule.period === 'month' ? ' no mês' : rule.period === 'week' ? ' na semana' : '';
  if (rule.op === 'between') return `${name} entre ${rule.value} e ${rule.valueTo}${when}`;
  return `${name} ${OPS[rule.op] ?? rule.op} ${rule.value}${when}`;
}

function describeRecord(record) {
  const who = record.userId ? `${record.name} (${record.userId})` : record.sourceName;
  const lines = [`${who} — ${record.periodLabel}`];
  for (const field of FIELDS) {
    if (record.values[field] === null || record.values[field] === undefined || record.changes[field] === 'empty') continue;
    lines.push(`• ${NAMES[field]}: ${formatValue(field, record.values[field])} (${MARKS[record.changes[field]] || 'SEM ALTERAÇÃO'})`);
  }
  if (record.note) lines.push(record.note);
  return lines.join('\n');
}

function wantsRecognition(text) {
  const folded = fold(text);
  return /podio|reconhec|classific/.test(folded) || /meta de /.test(folded);
}

function recognitionText(text) {
  return String(text).split(/\r?\n/).filter((line) => {
    const cleaned = String(line).replace(/^[\s*•●▪◦\u2022\u00b7]+/, '').replace(/^[-–—]\s+/, '').trim();
    const label = cleaned.split(':')[0] ?? '';
    if (metricOf(label) || /^metas?\b|^indicador/i.test(label)) return true;
    if (/^.{2,80}:\s*\d/.test(cleaned)) return false;
    if (/^.{2,60}\s+[—–-]\s+\d/.test(cleaned)) return false;
    return true;
  }).join('\n');
}

function noteFor(row) {
  if (row.userId) return '';
  if (row.ambiguous?.length) {
    return `Há nomes parecidos (${row.ambiguous.map((item) => item.name).join(' ou ')}). Confirme qual é o colaborador. Não associei este dado a nenhum deles.`;
  }
  return 'Não encontrei este nome na Equipe. O registro ficou pendente e nenhum colaborador novo foi criado.';
}

export function rankLedger(records, rules, periodKey, combine = 'all') {
  const accept = combine === 'any'
    ? (values) => rules.some((rule) => passesRules(values, [rule]))
    : (values) => passesRules(values, rules);
  const metric = rules[0]?.indicator;
  const lower = rules[0] && (rules[0].op === 'lt' || rules[0].op === 'lte');
  return records.filter((record) => record.userId && record.periodKey === periodKey && accept(record.values)).sort((left, right) => {
    const a = left.values?.[metric];
    const b = right.values?.[metric];
    if (a === b) return fold(left.name).localeCompare(fold(right.name), 'pt');
    if (a === null || a === undefined) return 1;
    if (b === null || b === undefined) return -1;
    return lower ? a - b : b - a;
  }).map((record, index) => ({
    place: index + 1,
    userId: record.userId,
    name: record.name,
    values: { ...blankValues(), ...record.values },
  }));
}

function selectPeriod(records, rulePeriod, now) {
  if (rulePeriod === 'month') {
    const current = monthKey(now);
    if (records.some((record) => record.userId && record.periodKey === current)) return current;
    const months = records.map((record) => record.periodKey).filter((key) => /^month:\d{4}-\d{2}$/.test(key)).sort();
    return months.at(-1) || current;
  }
  const current = isoWeekKey(now);
  if (records.some((record) => record.userId && record.periodKey === current)) return current;
  const weeks = records.map((record) => record.periodKey).filter((key) => /^\d{4}-W\d{2}$/.test(key)).sort();
  return weeks.at(-1) || current;
}

function proposalFrom(text, records, preferredKey, now) {
  if (!wantsRecognition(text)) return null;
  const custom = parseCustomRequest(recognitionText(text));
  if (!custom.ok) return { unclear: true };
  const rules = custom.rules.map((rule) => ({ ...rule, valueTo: rule.valueTo ?? null, period: custom.period }));
  const periodKey = preferredKey || selectPeriod(records, custom.period, now);
  return {
    unclear: false,
    period: custom.period,
    periodKey: custom.periodKey || periodKey,
    periodLabel: custom.periodLabel || formatPeriodLabel(custom.periodKey || periodKey),
    rules,
    combine: 'all',
    subsetor: '',
    weights: null,
    explanation: rules.map(describeRule).join('. '),
    ranking: rankLedger(records, rules, periodKey),
  };
}

function cloneRecords(store) {
  return (store.ledger?.records ?? []).map((record) => ({
    ...record,
    values: { ...blankValues(), ...record.values },
    changes: { ...(record.changes ?? {}) },
    history: (record.history ?? []).map((item) => ({ at: item.at, values: { ...blankValues(), ...item.values } })),
    candidates: [...(record.candidates ?? [])],
  }));
}

export function ingestReport(store, text, people, options = {}) {
  const now = options.now ?? new Date();
  const parsed = options.parsed ?? parseReport(text, people);
  const rows = usefulRows(parsed);
  if (!rows.length) return { kind: 'skip', store };
  const periods = mentionedPeriods(text, now);
  if (periods.length > 1) {
    return { kind: 'clarify', reply: 'O texto cita mais de um período. Não substituí nenhum dado. Diga se os números são da semana ou do mês.', store };
  }
  const inherited = [...(store.templates ?? [])].reverse().find((item) => item.periodKey)?.periodKey || '';
  const periodKey = periods[0] ?? inherited;
  const existing = store.ledger?.records ?? [];
  if (!periodKey) {
    const unclear = rows.filter((row) => existing.some((record) => record.identity === identityOf(row) && record.periodKey));
    if (unclear.length) {
      const labels = [...new Set(existing.filter((record) => unclear.some((row) => record.identity === identityOf(row)) && record.periodKey).map((record) => periodLabel(record.periodKey)))];
      const names = unclear.map((row) => row.name || row.sourceName).join(', ');
      return {
        kind: 'clarify',
        reply: `O período não ficou claro para ${names}. Há dados em ${labels.join(' e ')}. Diga qual período estes números atualizam. Nada foi substituído.`,
        store,
      };
    }
  }
  const records = cloneRecords(store);
  const touched = [];
  for (const row of rows) {
    const identity = identityOf(row);
    const id = `ledger:${identity}:${periodKey || 'aberto'}`;
    let index = records.findIndex((record) => record.id === id);
    if (index < 0 && row.userId) {
      index = records.findIndex((record) => !record.userId && (record.periodKey || 'aberto') === (periodKey || 'aberto') && fold(record.sourceName) === fold(row.sourceName));
    }
    const previous = index >= 0 ? records[index] : null;
    const values = mergeValues(previous?.values, row.values);
    const changes = diffValues(previous?.values, values);
    const changed = FIELDS.some((field) => changes[field] === 'new' || changes[field] === 'updated');
    const record = {
      id,
      identity,
      userId: row.userId || '',
      sourceName: row.sourceName,
      name: row.name || row.sourceName,
      periodKey,
      periodLabel: periodLabel(periodKey),
      values,
      changes,
      updatedAt: previous && !changed ? previous.updatedAt : now.toISOString(),
      note: noteFor(row),
      candidates: (row.ambiguous ?? []).map((item) => ({ id: item.id, name: item.name })),
      history: previous && changed
        ? [...previous.history, { at: previous.updatedAt, values: { ...previous.values } }].slice(-20)
        : [...(previous?.history ?? [])],
    };
    if (index >= 0) records[index] = record;
    else records.push(record);
    touched.push(record);
  }
  const touchedIds = new Set(touched.map((record) => record.id));
  const nextRecords = records.map((record) => touchedIds.has(record.id) ? record : { ...record, changes: sameMarks(record.values) });
  const proposal = proposalFrom(text, nextRecords, periodKey, now);
  const ranking = proposal && !proposal.unclear ? proposal.ranking : [];
  const lines = ['Atualizei o banco de dados. O pódio não foi alterado.', '', ...touched.map(describeRecord)];
  if (proposal?.unclear) {
    lines.push('', 'Os dados foram salvos, mas não transformei o pedido de meta em regra. Diga o indicador, o número e se ele deve ser maior ou menor. O pódio não foi alterado.');
  } else if (proposal) {
    lines.push('', 'Proposta de meta, ainda sem aplicar ao pódio:', proposal.explanation);
    lines.push(ranking.length ? `Classificação: ${ranking.map((row) => `${row.place}º ${row.name}`).join(', ')}.` : 'Ninguém atende a esta meta com os dados atuais.');
    lines.push('Nada foi aplicado ao pódio.');
  }
  return {
    kind: 'ledger',
    reply: lines.join('\n'),
    proposal: proposal && !proposal.unclear ? {
      period: proposal.period,
      periodKey: proposal.periodKey,
      periodLabel: proposal.periodLabel,
      rules: proposal.rules,
      combine: proposal.combine,
      subsetor: proposal.subsetor,
      weights: proposal.weights,
      explanation: proposal.explanation,
    } : null,
    store: { ...store, ledger: { records: nextRecords, ranking, applied: store.ledger?.applied ?? [] } },
  };
}

export function applyLedgerRanking(store, now = new Date()) {
  const ledger = { records: [], ranking: [], applied: [], ...(store.ledger ?? {}) };
  if (store.criterion?.mode !== 'custom') return { ...store, ledger: { ...ledger, applied: [] } };
  const template = (store.templates ?? []).find((entry) => entry.id === store.criterion.templateId);
  const rules = template?.rules ?? [];
  if (!rules.length) return { ...store, ledger: { ...ledger, applied: ledger.ranking ?? [] } };
  const period = template.period === 'month' || rules.every((rule) => rule.period === 'month') ? 'month' : 'week';
  return { ...store, ledger: { ...ledger, applied: rankLedger(ledger.records, rules, selectPeriod(ledger.records, period, now), template.combine === 'any' ? 'any' : 'all') } };
}

export function applyGoalsReview(store, review, people, now = new Date()) {
  let next = store;
  if (Array.isArray(review?.rules) && review.rules.length) {
    const saved = commitTemplate(next, {
      ok: true,
      period: review.period || 'month',
      periodKey: review.periodKey || '',
      periodLabel: review.periodLabel || '',
      combine: review.combine === 'any' ? 'any' : 'all',
      subsetor: '',
      weights: review.weights ?? null,
      rules: review.rules,
      explanation: review.explanation || 'Metas da gestão',
    }, { confirm: true, name: review.name || 'Metas da gestão' });
    if (saved.saved) next = saved.store;
  }
  if (Array.isArray(review?.rows) && review.rows.length) {
    const ingested = ingestReport(next, review.sourceText || '', people, {
      now,
      parsed: { rows: review.rows, periodKey: review.periodKey || '', warnings: [] },
    });
    if (ingested.kind === 'ledger') next = ingested.store;
  }
  return { store: next };
}

export function proposeFromLedger(store, text, now = new Date()) {
  const proposal = proposalFrom(text, store.ledger?.records ?? [], '', now);
  if (!proposal || proposal.unclear) return null;
  const reply = [
    proposal.explanation,
    proposal.ranking.length
      ? `Com os dados do banco, atendem: ${proposal.ranking.map((row) => `${row.place}º ${row.name}`).join(', ')}.`
      : 'Com os dados do banco, ninguém atende a esta meta.',
    'Nada foi aplicado ao pódio.',
  ].join('\n');
  return {
    kind: 'proposal',
    reply,
    period: proposal.period,
    periodKey: proposal.periodKey,
    periodLabel: proposal.periodLabel,
    rules: proposal.rules,
    combine: 'all',
    subsetor: '',
    weights: null,
    explanation: proposal.explanation,
    ranking: proposal.ranking,
  };
}
