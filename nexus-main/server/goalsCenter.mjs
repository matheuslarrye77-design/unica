import { createHash } from 'node:crypto';
import { classifyGeminiError, completeJson } from './gemini.mjs';
import { fold, formatPeriodLabel, matchPeople, parseCustomRequest, parsePeopleFromText, readGoalPeriod } from './goals.mjs';
import { applyGoalsReview } from './ledger.mjs';
import { citedNumbers, GOALS_TURN_SCHEMA, goalsTurnPrompt } from './goalsTurn.mjs';

const INDICATORS = ['resolvidosCount', 'satisfacao', 'primeira', 'resolucao', 'resolvidos', 'transferidos'];
const CORE = ['resolvidosCount', 'satisfacao', 'primeira', 'resolucao'];
const OPS = ['gt', 'gte', 'lt', 'lte', 'eq', 'between'];
const NAMES = {
  resolvidosCount: 'Tickets resolvidos',
  resolvidos: 'Tickets resolvidos (%)',
  satisfacao: 'Satisfação',
  primeira: 'Primeira resposta',
  resolucao: 'Tempo médio de resolução',
  transferidos: 'Tickets transferidos',
};
const UNITS = { resolvidos: '%', satisfacao: '%', primeira: ' min', resolucao: ' min' };

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function inSource(value, source) {
  if (value === null || value === undefined) return false;
  return citedNumbers(source).some((item) => item === value);
}

function parseGenerated(raw) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
  }
  return parsed && typeof parsed === 'object' ? parsed : null;
}

function passes(value, rule) {
  if (value === null || value === undefined || !rule) return null;
  if (rule.op === 'gt') return value > rule.value;
  if (rule.op === 'gte') return value >= rule.value;
  if (rule.op === 'lt') return value < rule.value;
  if (rule.op === 'lte') return value <= rule.value;
  if (rule.op === 'eq') return value === rule.value;
  if (rule.op === 'between') return value >= rule.value && value <= rule.valueTo;
  return null;
}

function statusOf(met, op) {
  if (met === true) return 'Atingiu';
  if (met === false) return op === 'lte' || op === 'lt' ? 'Acima do limite' : 'Abaixo da meta';
  return 'Sem meta';
}

function fingerprint(conference) {
  return createHash('sha256').update(JSON.stringify({
    periodKey: conference?.period?.key ?? '',
    goals: conference?.goals ?? [],
    people: (conference?.people ?? []).map((row) => ({ userId: row.userId, results: row.results })),
  })).digest('hex');
}

function wantsGoals(text) {
  const folded = fold(text);
  return /meta|pelo menos|no minimo|no maximo|gestao/.test(folded);
}

function wantsPeople(text) {
  return /resultado|colaborador|ficou com|fez \d|oliveira|costa/.test(fold(text));
}

export function toConference({ source, period, rules, rows }) {
  const goals = (rules ?? []).map((rule) => ({
    indicator: rule.indicator,
    name: NAMES[rule.indicator] ?? rule.indicator,
    op: rule.op,
    value: rule.value,
    valueTo: rule.valueTo ?? null,
    unit: UNITS[rule.indicator] ?? '',
    period: rule.period || period.period,
  }));
  const people = (rows ?? []).map((row) => {
    const results = CORE.concat(['resolvidos', 'transferidos']).map((indicator) => {
      const value = row.values?.[indicator];
      if (value === null || value === undefined) return null;
      const rule = goals.find((item) => item.indicator === indicator);
      const met = passes(value, rule);
      return {
        indicator,
        name: NAMES[indicator] ?? indicator,
        value,
        unit: UNITS[indicator] ?? '',
        target: rule?.value ?? null,
        op: rule?.op ?? '',
        met,
        status: statusOf(met, rule?.op ?? ''),
      };
    }).filter(Boolean);
    return {
      userId: row.userId || '',
      name: row.name || row.sourceName,
      sourceName: row.sourceName || row.name,
      subsetor: row.subsetor || '',
      identified: Boolean(row.userId),
      values: { ...row.values },
      results,
    };
  }).filter((row) => row.results.length);
  return {
    id: `conf-${period.periodKey || Date.now()}`,
    sourceText: source,
    period: {
      kind: period.period || '',
      key: period.periodKey || '',
      label: period.periodLabel || '',
    },
    goals,
    people,
    fingerprint: '',
  };
}

const CONFERENCE_REPLY = 'Conferência pronta. Confira os dados organizados abaixo. Nada foi salvo e o pódio não foi alterado.';

function missingParts(conference, source) {
  const missing = [];
  if (wantsGoals(source) && conference.goals.length < 4) missing.push('as quatro metas da gestão (tickets, satisfação, primeira resposta e TMA)');
  if (wantsGoals(source) && !conference.period?.label) missing.push('o período com mês e ano');
  if (wantsPeople(source) && !(conference.people ?? []).length) missing.push('os resultados individuais dos colaboradores citados');
  for (const person of conference.people ?? []) {
    const filled = CORE.filter((field) => person.results.some((item) => item.indicator === field));
    if (filled.length < 4) missing.push(`os quatro indicadores de ${person.name}`);
    if (!person.identified) missing.push(`o cadastro da Equipe de ${person.name}`);
  }
  return missing;
}

function clarify(missing) {
  const ask = `Faltou ${missing.join('; ')}. Nada foi gravado e o pódio não mudou.`;
  return { kind: 'clarify', questions: missing, reply: ask, conference: null };
}

function failure(kind) {
  const kept = 'Nada foi alterado. O texto que você escreveu continua no campo.';
  if (kind === 'quota') return { kind: 'quota', reply: `O limite gratuito da IA foi atingido agora. ${kept}`, conference: null };
  if (kind === 'auth') return { kind: 'auth', reply: `A chave da IA foi recusada pelo Google. ${kept}`, conference: null };
  if (kind === 'unconfigured') return { kind: 'unavailable', reply: `A inteligência artificial não está disponível com um modelo gratuito agora. ${kept}`, conference: null };
  return { kind: 'unavailable', reply: `A IA não respondeu. ${kept}`, conference: null };
}

function rulesFromModel(items, source, period) {
  const rules = [];
  for (const item of Array.isArray(items) ? items : []) {
    const indicator = INDICATORS.includes(item?.indicator) ? item.indicator : '';
    const op = OPS.includes(item?.op) ? item.op : '';
    const value = finite(item?.value);
    const when = item?.period === 'month' || item?.period === 'week' ? item.period : period;
    if (!indicator || !op || value === null || !when || !inSource(value, source)) continue;
    if (rules.some((rule) => rule.indicator === indicator)) continue;
    rules.push({ indicator, op, value, valueTo: finite(item.valueTo), period: when });
  }
  return rules;
}

function rowsFromModel(list, people, source) {
  const lines = [];
  for (const item of Array.isArray(list) ? list : []) {
    const name = String(item?.name ?? '').trim();
    if (!name) continue;
    const bits = [];
    if (inSource(item.resolvidosCount, source)) bits.push(`${item.resolvidosCount} tickets resolvidos`);
    if (inSource(item.satisfacao, source)) bits.push(`${item.satisfacao}% de satisfação`);
    if (inSource(item.primeira, source)) bits.push(`${item.primeira} min de primeira resposta`);
    if (inSource(item.resolucao, source)) bits.push(`${item.resolucao} min de resolução`);
    if (inSource(item.resolvidos, source) && !inSource(item.satisfacao, source)) bits.push(`${item.resolvidos}% de tickets resolvidos`);
    if (inSource(item.transferidos, source)) bits.push(`${item.transferidos} tickets transferidos`);
    if (!bits.length) continue;
    const matches = matchPeople(name, people);
    lines.push(`${matches.length === 1 ? matches[0].name : name}: ${bits.join(', ')}`);
  }
  return lines.length ? parsePeopleFromText(lines.join('\n'), people).rows : [];
}

function fill(primary, extra) {
  const rules = [...(primary.rules ?? [])];
  for (const rule of extra.rules ?? []) {
    if (!rules.some((item) => item.indicator === rule.indicator)) rules.push(rule);
  }
  const rows = [...(primary.rows ?? [])];
  for (const row of extra.rows ?? []) {
    const key = fold(row.userId || row.sourceName || row.name);
    const current = rows.find((item) => fold(item.userId || item.sourceName || item.name) === key);
    if (!current) {
      rows.push(row);
      continue;
    }
    for (const field of INDICATORS) {
      if ((current.values[field] === null || current.values[field] === undefined) && row.values[field] != null) current.values[field] = row.values[field];
    }
    if (!current.userId && row.userId) {
      current.userId = row.userId;
      current.name = row.name;
      current.subsetor = row.subsetor;
    }
  }
  return { rules, rows };
}

function localExtract(source, people) {
  const goals = parseCustomRequest(source);
  const parsed = parsePeopleFromText(source, people);
  const rows = parsed.rows.filter((row) => INDICATORS.some((field) => row.values[field] != null));
  const period = readGoalPeriod(source);
  return {
    rules: goals.ok ? goals.rules.map((rule) => ({ ...rule, period: goals.period })) : [],
    rows,
    period: period.ok ? period : { period: '', periodKey: '', periodLabel: '' },
  };
}

function conferenceResponse(conference) {
  const marked = { ...conference, fingerprint: fingerprint(conference) };
  return {
    kind: 'conference',
    conference: marked,
    reply: CONFERENCE_REPLY,
    persist: false,
  };
}

export function conferenceToReview(conference) {
  return {
    period: conference.period?.kind || 'month',
    periodKey: conference.period?.key || '',
    periodLabel: conference.period?.label || '',
    rules: (conference.goals ?? []).map((goal) => ({
      indicator: goal.indicator,
      op: goal.op,
      value: goal.value,
      valueTo: goal.valueTo ?? null,
      period: conference.period?.kind || 'month',
    })),
    rows: (conference.people ?? []).map((person) => ({
      sourceName: person.sourceName || person.name,
      userId: person.userId || '',
      name: person.name,
      subsetor: person.subsetor || '',
      values: person.values || Object.fromEntries((person.results ?? []).map((item) => [item.indicator, item.value])),
      goal: {},
      ambiguous: [],
    })),
    sourceText: conference.sourceText || '',
  };
}

export async function interpretGoalsCenter(text, options = {}) {
  const source = String(text ?? '').trim();
  if (!source) return { kind: 'clarify', questions: ['Escreva as metas e os resultados.'], reply: 'Escreva as metas e os resultados.', conference: null };
  const people = options.people ?? [];
  const local = localExtract(source, people);
  let parsed = null;
  let modelError = '';
  try {
    const generated = options.generate
      ? await options.generate(goalsTurnPrompt(source, options.history ?? []))
      : await completeJson(goalsTurnPrompt(source, options.history ?? []), { schema: GOALS_TURN_SCHEMA, env: options.env });
    if (generated?.error) modelError = generated.error;
    else parsed = parseGenerated(generated?.text ?? generated);
  } catch (error) {
    modelError = classifyGeminiError(error);
  }

  const period = readGoalPeriod(source).ok
    ? readGoalPeriod(source)
    : parsed?.periodKey
      ? { ok: true, period: parsed.period || 'month', periodKey: String(parsed.periodKey), periodLabel: String(parsed.periodLabel || formatPeriodLabel(parsed.periodKey)) }
      : local.period;
  const model = parsed
    ? { rules: rulesFromModel(parsed.goals, source, period.period), rows: rowsFromModel(parsed.people, people, source) }
    : { rules: [], rows: [] };
  const merged = fill(model, local);
  const conference = toConference({ source, period, rules: merged.rules, rows: merged.rows });
  const missing = missingParts(conference, source);
  if (!conference.goals.length && !conference.people.length) {
    if (missing.length) return clarify(missing);
    if (modelError) return failure(modelError);
    return clarify(['as metas ou os resultados que você quer conferir']);
  }
  if (missing.length) return clarify(missing);
  return conferenceResponse(conference);
}

export function saveGoalsCenter(store, conference, people, now = new Date()) {
  const missing = missingParts(conference, conference.sourceText || '');
  if (missing.length) return { error: 'incomplete', store };
  const seen = store.centerFingerprints ?? [];
  const mark = fingerprint(conference);
  if (seen.includes(mark)) return { store, duplicate: true };
  const saved = applyGoalsReview(store, conferenceToReview(conference), people, now);
  return {
    store: {
      ...saved.store,
      criterion: store.criterion,
      centerFingerprints: [...seen, mark].slice(-50),
    },
  };
}
