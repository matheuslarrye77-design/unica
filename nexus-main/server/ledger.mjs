import { fold, formatPeriodLabel, isoWeekKey, mentionedPeriods, metricOf, monthBucketOf, monthKey, parseCustomRequest, parseReport, passesRules } from './goals.mjs';
import { FIELD_NAMES, VALUE_FIELDS, blankValues as catalogBlank, formatFieldValue } from './indicatorCatalog.mjs';

const FIELDS = VALUE_FIELDS;
const NAMES = FIELD_NAMES;
const OPS = { gt: 'maior que', gte: 'pelo menos', lt: 'menor que', lte: 'no máximo', eq: 'igual a', between: 'entre' };
const MARKS = { new: 'NOVO', updated: 'ATUALIZADO', same: 'SEM ALTERAÇÃO' };
function blankValues() {
  return catalogBlank();
}

function usefulRows(parsed) {
  return parsed.rows.filter((row) => Object.values(row.values ?? {}).some((value) => value !== null && value !== undefined));
}

function identityOf(row) {
  return row.userId ? row.userId : `pending:${fold(row.sourceName)}`;
}

function periodLabel(key) {
  return formatPeriodLabel(key);
}

function mergeValues(before, incoming) {
  const next = { ...blankValues(), ...(before ?? {}) };
  for (const [field, value] of Object.entries(incoming ?? {})) {
    if (value !== null && value !== undefined) next[field] = value;
  }
  return next;
}

function diffValues(before, after) {
  const changes = {};
  const fields = [...new Set([...FIELDS, ...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  for (const field of fields) {
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
  return formatFieldValue(field, value) || String(value);
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
  const periodKey = periods[0] ?? inherited ?? parsed.periodKey ?? '';
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
    const changed = Object.values(changes).some((mark) => mark === 'new' || mark === 'updated');
    const record = {
      id,
      identity,
      userId: row.userId || '',
      sourceName: row.sourceName,
      name: row.name || row.sourceName,
      periodKey,
      periodLabel: periodLabel(periodKey),
      subsetor: row.subsetor || previous?.subsetor || '',
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
  const updated = touched.filter((record) => Object.values(record.changes ?? {}).some((mark) => mark === 'new' || mark === 'updated')).length;
  const lines = [`Relatório interpretado. ${updated || touched.length} registro${(updated || touched.length) === 1 ? '' : 's'} atualizado${(updated || touched.length) === 1 ? '' : 's'}. O pódio não foi alterado.`];
  for (const record of touched) {
    if (record.candidates?.length) {
      lines.push(`Não consegui identificar ${record.sourceName || record.name}. Confirme o cadastro: ${record.candidates.map((item) => item.name).join(', ')}.`);
    } else if (!record.userId) {
      lines.push(`Não consegui identificar ${record.sourceName || record.name}. Nenhum colaborador novo foi criado.`);
    }
  }
  const changed = touched.filter((record) => Object.values(record.changes ?? {}).some((mark) => mark === 'new' || mark === 'updated'));
  if (changed.length === 1) {
    const record = changed[0];
    const bits = FIELDS.filter((field) => record.changes[field] === 'new' || record.changes[field] === 'updated').map((field) => `${NAMES[field]}: ${formatValue(field, record.values[field])} (${MARKS[record.changes[field]]})`);
    if (bits.length) lines.push(bits.join('; '));
  }
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
  let next = { ...store, criterion: store.criterion, templates: [...(store.templates ?? [])], managementGoals: [...(store.managementGoals ?? [])] };
  if (Array.isArray(review?.rules) && review.rules.length) {
    const entry = {
      id: `meta-${review.periodKey || Date.now()}`,
      period: review.period || 'month',
      periodKey: review.periodKey || '',
      periodLabel: review.periodLabel || '',
      rules: review.rules,
      updatedAt: now.toISOString(),
    };
    const current = next.managementGoals.find((item) => item.periodKey === entry.periodKey);
    if (current) {
      const rules = [...(current.rules ?? [])];
      for (const rule of entry.rules) {
        const index = rules.findIndex((item) => item.indicator === rule.indicator);
        if (index >= 0) rules[index] = { ...rules[index], ...rule };
        else rules.push(rule);
      }
      next = {
        ...next,
        managementGoals: next.managementGoals.map((item) => item.periodKey === entry.periodKey ? { ...item, ...entry, id: current.id, rules, notes: current.notes ?? [] } : item),
      };
    } else {
      next = { ...next, managementGoals: [...next.managementGoals, { ...entry, notes: [] }] };
    }
  }
  if (Array.isArray(review?.notes) && review.notes.length) {
    const periodKey = review.periodKey || '';
    const current = next.managementGoals.find((item) => item.periodKey === periodKey)
      || next.managementGoals.find((item) => monthBucket(item.periodKey) === monthBucket(periodKey));
    const notes = mergeIncomingNotes(current?.notes, review.notes);
    if (current) {
      next = {
        ...next,
        managementGoals: next.managementGoals.map((item) => item.id === current.id ? { ...item, notes, updatedAt: now.toISOString() } : item),
      };
    } else if (periodKey) {
      next = {
        ...next,
        managementGoals: [...next.managementGoals, {
          id: `meta-${periodKey}`,
          period: review.period || 'month',
          periodKey,
          periodLabel: review.periodLabel || '',
          rules: [],
          notes,
          updatedAt: now.toISOString(),
        }],
      };
    }
  }
  if (Array.isArray(review?.rows) && review.rows.length) {
    const ingested = ingestReport(next, review.sourceText || '', people, {
      now,
      parsed: { rows: review.rows, periodKey: review.periodKey || '', warnings: [] },
    });
    if (ingested.kind === 'ledger') next = { ...ingested.store, criterion: next.criterion, templates: next.templates, managementGoals: next.managementGoals };
  }
  return { store: next };
}

function monthBucket(key) {
  return monthBucketOf(key);
}

const NOTE_CHANNELS = ['Ligação', 'Chat', 'E-mail'];

export function inferNoteEffect(text, kind = 'note') {
  if (kind !== 'rule') return 'none';
  const folded = fold(text);
  if (/falta/.test(folded) && /perde todas|zera|desclassif|anula/.test(folded)) return 'zero_on_faltas';
  return 'none';
}

export function normalizeGoalNotes(notes) {
  return (Array.isArray(notes) ? notes : []).map((item, index) => {
    const text = String(item?.text ?? '').trim();
    const kind = item?.kind === 'rule' ? 'rule' : 'note';
    const channels = (Array.isArray(item?.channels) ? item.channels : [])
      .map((channel) => String(channel ?? ''))
      .filter((channel) => NOTE_CHANNELS.includes(channel));
    return {
      id: String(item?.id ?? `note-${index + 1}`),
      text,
      kind,
      channels,
      effect: item?.effect === 'zero_on_faltas' || inferNoteEffect(text, kind) === 'zero_on_faltas' ? 'zero_on_faltas' : 'none',
    };
  }).filter((item) => item.text);
}

export function noteAppliesToChannel(note, channel) {
  const channels = note?.channels ?? [];
  if (!channels.length) return true;
  return channels.includes(channel);
}

const ZERO_ALL = /perde todas|zera(?:r)?(?:\s+todas)?|desclassif|anula(?:r)?(?:\s+todas)?|fica(?:r)? com zero|pontuacao zero|independente(?:mente)? (?:dos|de) (?:demais |outros )?(?:resultados|indicadores)/;
const AMBIGUOUS_HINT = /considerar|descontar|penaliz|olhar|levar em conta|influenc|vale (?:na |para a )?avalia|conta (?:na|para)/;

function noteChannelsFrom(text) {
  const folded = fold(text);
  const channels = [];
  if (/ligac|telefon/.test(folded)) channels.push('Ligação');
  if (/\bchat\b/.test(folded)) channels.push('Chat');
  if (/e ?mail|email/.test(folded)) channels.push('E-mail');
  return [...new Set(channels)];
}

function noteFingerprint(note) {
  return `${note.kind}:${note.effect || 'none'}:${fold(note.text)}`;
}

export function mergeIncomingNotes(existing, incoming) {
  const next = normalizeGoalNotes(existing);
  for (const note of normalizeGoalNotes(incoming)) {
    const index = next.findIndex((item) => noteFingerprint(item) === noteFingerprint(note)
      || (item.kind === 'rule' && note.kind === 'rule' && item.effect === note.effect && note.effect !== 'none'));
    if (index >= 0) next[index] = { ...next[index], ...note, id: next[index].id };
    else next.push({ ...note, id: note.id || `note-${next.length + 1}` });
  }
  return next;
}

export function extractGoalNotes(source) {
  const text = String(source ?? '');
  const foldedAll = fold(text);
  const found = [];
  const questions = [];
  const labeled = [];
  const pattern = /(?:^|\n)\s*((?:observa[cç][aã]o(?:es)?|obs\.?|regra(?:s)?(?: especiais?)?)\s*[:\-–]\s*)(.+)/gi;
  let match;
  while ((match = pattern.exec(text))) {
    labeled.push({ label: fold(match[1]), body: String(match[2] ?? '').trim() });
  }
  for (const item of labeled) {
    const body = item.body.replace(/\s+/g, ' ').replace(/[.;]+$/, '').trim();
    if (!body) continue;
    const folded = fold(body);
    const channels = noteChannelsFrom(`${item.label} ${body}`);
    if (ZERO_ALL.test(folded) && /falta/.test(folded)) {
      found.push({ text: body, kind: 'rule', channels, effect: 'zero_on_faltas' });
      continue;
    }
    if (/falta/.test(folded) && (AMBIGUOUS_HINT.test(folded) || /avalia|meta|desempenho/.test(folded)) && !ZERO_ALL.test(folded)) {
      questions.push('se a menção a faltas deve zerar todas as metas ou é só um aviso');
      continue;
    }
    found.push({ text: body, kind: /regra/.test(item.label) ? 'rule' : 'note', channels });
  }
  if (!found.some((item) => item.kind === 'rule' && (item.effect === 'zero_on_faltas' || inferNoteEffect(item.text, 'rule') === 'zero_on_faltas'))) {
    if (/falta/.test(foldedAll) && ZERO_ALL.test(foldedAll)) {
      const sentence = text.split(/[\n.]+/).map((item) => item.trim()).find((item) => /falta/i.test(item) && ZERO_ALL.test(fold(item)));
      if (sentence) found.push({ text: sentence.replace(/\s+/g, ' ').trim(), kind: 'rule', channels: noteChannelsFrom(sentence), effect: 'zero_on_faltas' });
    }
  }
  if (!found.length && /observa/.test(foldedAll) && /falta/.test(foldedAll) && AMBIGUOUS_HINT.test(foldedAll) && !ZERO_ALL.test(foldedAll)) {
    questions.push('se a menção a faltas deve zerar todas as metas ou é só um aviso');
  }
  const corrected = applyNoteCorrection(found, text);
  return {
    notes: normalizeGoalNotes(corrected.notes.length ? corrected.notes : found),
    questions: [...new Set([...questions, ...corrected.questions])],
  };
}

function applyNoteCorrection(existing, source) {
  const folded = fold(source);
  const notes = normalizeGoalNotes(existing);
  if (/s[oó] para liga|apenas (para )?liga|vale para liga/.test(folded) && /falta|regra/.test(folded)) {
    return { notes: notes.map((item) => item.kind === 'rule' ? { ...item, channels: ['Ligação'] } : item), questions: [] };
  }
  if (/(chat|e ?mail|email)/.test(folded) && /s[oó] para|apenas|vale para/.test(folded) && /falta|regra/.test(folded)) {
    return { notes: notes.map((item) => item.kind === 'rule' ? { ...item, channels: ['Chat', 'E-mail'] } : item), questions: [] };
  }
  if (/n[aã]o zera|s[oó] (um )?aviso|n[aã]o (e|é) regra|apenas observa/.test(folded) && /falta/.test(folded)) {
    return { notes: notes.map((item) => item.effect === 'zero_on_faltas' ? { ...item, kind: 'note', effect: 'none' } : item), questions: [] };
  }
  return { notes, questions: [] };
}

export function resolveGoalNotes(source, existing = []) {
  const extracted = extractGoalNotes(source);
  const folded = fold(source);
  if (/s[oó] para|apenas|vale para|n[aã]o zera|s[oó] (um )?aviso/.test(folded) && /falta|regra|observa/.test(folded)) {
    const corrected = applyNoteCorrection(existing.length ? existing : extracted.notes, source);
    return { notes: mergeIncomingNotes(existing, corrected.notes), questions: corrected.questions };
  }
  return { notes: mergeIncomingNotes(existing, extracted.notes), questions: extracted.questions };
}

export function saveGoalNotes(store, periodKey, notes, now = new Date()) {
  const bucket = monthBucket(periodKey);
  if (!bucket) return { error: 'period', store };
  const list = normalizeGoalNotes(notes);
  const match = (item) => monthBucket(item.periodKey) === bucket;
  const current = (store.managementGoals ?? []).find(match);
  const entry = {
    id: current?.id || `meta-${bucket}`,
    period: current?.period || 'month',
    periodKey: current?.periodKey || `month:${bucket}`,
    periodLabel: current?.periodLabel || formatPeriodLabel(bucket),
    rules: current?.rules ?? [],
    notes: list,
    updatedAt: now.toISOString(),
  };
  const managementGoals = current
    ? store.managementGoals.map((item) => (match(item) ? { ...item, ...entry, id: current.id } : item))
    : [...(store.managementGoals ?? []), entry];
  return { store: { ...store, managementGoals } };
}

export function clearReportBank(store, options = {}) {
  const all = Boolean(options.all);
  const wanted = monthBucket(options.periodKey);
  const keepRecord = (record) => {
    if (all) return false;
    const bucket = monthBucket(record.periodKey);
    return wanted ? bucket !== wanted : true;
  };
  const keepPeriod = (key) => {
    if (all) return false;
    return wanted ? monthBucket(key) !== wanted : true;
  };
  return {
    ...store,
    ledger: {
      records: (store.ledger?.records ?? []).filter(keepRecord),
      ranking: [],
      applied: store.ledger?.applied ?? [],
    },
    centerFingerprints: all ? [] : (store.centerFingerprints ?? []),
    overallReviews: (store.overallReviews ?? []).filter((item) => keepPeriod(item.periodKey)),
    evaluations: (store.evaluations ?? []).filter((item) => keepPeriod(item.periodKey)),
    podiums: (store.podiums ?? []).filter((item) => keepPeriod(item.periodKey)),
  };
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
