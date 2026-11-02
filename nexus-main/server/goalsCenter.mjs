import { createHash } from 'node:crypto';
import { classifyGeminiError, completeJson } from './gemini.mjs';
import { fold, formatPeriodLabel, matchPeople, parseCustomRequest, parsePeopleFromText, readGoalPeriod, subsetorOf } from './goals.mjs';
import { applyGoalsReview } from './ledger.mjs';
import { citedNumbers } from './goalsTurn.mjs';

const KNOWN = ['resolvidosCount', 'satisfacao', 'primeira', 'resolucao', 'resolvidos', 'transferidos'];
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
const CONFERENCE_REPLY = 'Conferência pronta. Confira os dados organizados abaixo. Nada foi salvo e o pódio não foi alterado.';

export const GOALS_CENTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'intent', 'changePodium', 'combine', 'period', 'periodKey', 'periodLabel', 'questions', 'goals', 'people'],
  properties: {
    status: { type: 'string', enum: ['ready', 'needs_clarification'] },
    intent: { type: 'string', enum: ['review', 'goals', 'results', 'overall', 'podium', 'none'] },
    changePodium: { type: 'boolean' },
    combine: { type: 'string', enum: ['all', 'any', ''] },
    period: { type: 'string', enum: ['week', 'month', ''] },
    periodKey: { type: 'string' },
    periodLabel: { type: 'string' },
    questions: { type: 'array', items: { type: 'string' } },
    goals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['indicator', 'name', 'op', 'value', 'valueTo', 'period', 'unit'],
        properties: {
          indicator: { type: 'string' },
          name: { type: 'string' },
          op: { type: 'string', enum: OPS },
          value: { type: 'number' },
          valueTo: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          period: { type: 'string', enum: ['week', 'month', ''] },
          unit: { type: 'string' },
        },
      },
    },
    people: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'results'],
        properties: {
          name: { type: 'string' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['indicator', 'name', 'value', 'unit'],
              properties: {
                indicator: { type: 'string' },
                name: { type: 'string' },
                value: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                unit: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

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
    overall: conference?.overall ?? null,
  })).digest('hex');
}

function slugOf(name) {
  return fold(name).replace(/\s+/g, '-').slice(0, 60);
}

export function normalizeIndicator(indicator, name = '') {
  const raw = fold(indicator || name);
  if (KNOWN.includes(indicator)) return indicator;
  if (/satisfa/.test(raw)) return 'satisfacao';
  if (/primeira/.test(raw)) return 'primeira';
  if (/\btma\b|tempo medio|resolucao/.test(raw) && !/qualidade/.test(raw)) return 'resolucao';
  if (/transfer/.test(raw)) return 'transferidos';
  if ((/ticket/.test(raw) || /resolvido/.test(raw)) && /%|percent/.test(raw)) return 'resolvidos';
  if (/ticket/.test(raw) || (/resolvido/.test(raw) && !/qualidade/.test(raw))) return 'resolvidosCount';
  if (/qualidade/.test(raw)) return 'c:indice-de-qualidade-no-atendimento';
  const slug = slugOf(name || indicator);
  return slug ? `c:${slug}` : '';
}

function displayName(indicator, name) {
  return String(name || NAMES[indicator] || indicator.replace(/^c:/, '').replace(/-/g, ' ')).trim();
}

function unitOf(indicator, unit) {
  if (unit) return unit;
  return UNITS[indicator] ?? (String(indicator).startsWith('c:') ? '%' : '');
}

function citedKnown(source) {
  const folded = fold(source);
  return {
    resolvidosCount: /ticket|resolvido/.test(folded) && !/qualidade/.test(folded),
    satisfacao: /satisfa/.test(folded),
    primeira: /primeira resposta/.test(folded),
    resolucao: /\btma\b|tempo medio|tempo medio de resolucao/.test(folded),
  };
}

function wantsGoals(text) {
  return /meta|pelo menos|no minimo|no maximo|gestao|indice|indicador|regra/.test(fold(text));
}

function wantsPeople(text) {
  return /resultado|colaborador|ficou com|fez \d|oliveira|costa/.test(fold(text));
}

function wantsOverall(text, mode) {
  const folded = fold(text);
  if (mode === 'overall' && /desempenho|geral|nota|peso|pontua/.test(folded)) return true;
  return /desempenho geral|nota geral|pontuacao geral/.test(folded);
}

function wantsPodium(text) {
  const folded = fold(text);
  if (/nao alterar o podio|nao mude o podio|nao mexa no podio|nao mexe no podio|sem alterar o podio/.test(folded)) return false;
  return /confirmar podio|usar no podio|aplicar ao podio|mudar o podio|criterio do podio/.test(folded);
}

export function toConference({ source, period, rules, rows, mode, overall }) {
  const goals = (rules ?? []).map((rule) => ({
    indicator: rule.indicator,
    name: displayName(rule.indicator, rule.name),
    op: rule.op,
    value: rule.value,
    valueTo: rule.valueTo ?? null,
    unit: unitOf(rule.indicator, rule.unit),
    period: rule.period || period.period,
  }));
  const people = (rows ?? []).map((row) => {
    const keys = [...new Set([
      ...goals.map((item) => item.indicator),
      ...Object.keys(row.values ?? {}).filter((field) => row.values[field] != null),
    ])];
    const results = keys.map((indicator) => {
      const value = row.values?.[indicator];
      if (value === null || value === undefined) return null;
      const rule = goals.find((item) => item.indicator === indicator);
      const met = passes(value, rule);
      return {
        indicator,
        name: displayName(indicator, rule?.name),
        value,
        unit: unitOf(indicator, rule?.unit),
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
    mode: mode || 'custom',
    period: {
      kind: period.period || '',
      key: period.periodKey || '',
      label: period.periodLabel || '',
    },
    goals,
    people,
    overall: overall ?? null,
    changePodium: false,
    fingerprint: '',
  };
}

function missingParts(conference, source) {
  const missing = [];
  const cited = citedKnown(source);
  const needed = CORE.filter((field) => cited[field]);
  if (wantsGoals(source) && !conference.goals.length && !conference.overall) missing.push('a regra da meta (indicador, condição, valor e período)');
  if (conference.goals.length && !conference.period?.label) missing.push('o período com mês e ano');
  for (const field of needed) {
    if (!conference.goals.some((goal) => goal.indicator === field)) missing.push(`a meta de ${NAMES[field]}`);
  }
  if (wantsPeople(source) && !(conference.people ?? []).length) missing.push('os resultados individuais dos colaboradores citados');
  const expected = conference.goals.map((goal) => goal.indicator);
  for (const person of conference.people ?? []) {
    for (const field of expected) {
      if (!person.results.some((item) => item.indicator === field)) missing.push(`o resultado de ${displayName(field)} de ${person.name}`);
    }
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
    const indicator = normalizeIndicator(item?.indicator, item?.name);
    const op = OPS.includes(item?.op) ? item.op : '';
    const value = finite(item?.value);
    const when = item?.period === 'month' || item?.period === 'week' ? item.period : period;
    if (!indicator || !op || value === null || !when || !inSource(value, source)) continue;
    if (rules.some((rule) => rule.indicator === indicator)) continue;
    rules.push({
      indicator,
      name: displayName(indicator, item.name),
      op,
      value,
      valueTo: finite(item.valueTo),
      period: when,
      unit: unitOf(indicator, item.unit),
    });
  }
  return rules;
}

function rowsFromModel(list, people, source) {
  const rows = [];
  for (const item of Array.isArray(list) ? list : []) {
    const name = String(item?.name ?? '').trim();
    if (!name) continue;
    const values = {};
    for (const result of Array.isArray(item.results) ? item.results : []) {
      const indicator = normalizeIndicator(result.indicator, result.name);
      const value = finite(result.value);
      if (!indicator || value === null || !inSource(value, source)) continue;
      values[indicator] = value;
    }
    for (const field of KNOWN) {
      if (inSource(item[field], source)) values[field] = finite(item[field]);
    }
    if (!Object.keys(values).length) continue;
    const matches = matchPeople(name, people);
    const person = matches.length === 1 ? matches[0] : null;
    rows.push({
      userId: person?.id || '',
      name: person?.name || name,
      sourceName: name,
      subsetor: person ? subsetorOf(person) : '',
      values,
      goal: {},
      ambiguous: matches.length > 1 ? matches : [],
    });
  }
  return rows;
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
    for (const [field, value] of Object.entries(row.values ?? {})) {
      if ((current.values[field] === null || current.values[field] === undefined) && value != null) current.values[field] = value;
    }
    if (!current.userId && row.userId) {
      current.userId = row.userId;
      current.name = row.name;
      current.subsetor = row.subsetor;
    }
  }
  return { rules, rows };
}

function localCustomRules(source, period) {
  const folded = fold(source);
  if (!/qualidade/.test(folded)) return [];
  const match = folded.match(/pelo menos (\d+)|no minimo (\d+)/);
  const value = finite(match?.[1] ?? match?.[2]);
  if (value === null || !inSource(value, source)) return [];
  return [{
    indicator: 'c:indice-de-qualidade-no-atendimento',
    name: 'Índice de qualidade no atendimento',
    op: 'gte',
    value,
    valueTo: null,
    period: period.period || 'month',
    unit: '%',
  }];
}

function localCustomPeople(source, people, indicator) {
  const rows = [];
  for (const person of people) {
    const pattern = new RegExp(`${person.name.replace(/\s+/g, '\\s+')}[^\\d]{0,48}(\\d+[\\d.,]*)\\s*%?`, 'i');
    const hit = source.match(pattern);
    const value = finite(hit?.[1]?.replace(',', '.'));
    if (value === null || !inSource(value, source)) continue;
    rows.push({
      userId: person.id,
      name: person.name,
      sourceName: person.name,
      subsetor: subsetorOf(person),
      values: { [indicator]: value },
      goal: {},
      ambiguous: [],
    });
  }
  return rows;
}

function localExtract(source, people) {
  const goals = parseCustomRequest(source);
  const period = readGoalPeriod(source);
  const parsed = parsePeopleFromText(source, people);
  const knownRows = parsed.rows.filter((row) => row.userId && KNOWN.some((field) => row.values[field] != null));
  const custom = localCustomRules(source, period.ok ? period : { period: 'month', periodKey: '', periodLabel: '' });
  const customRows = custom.length ? localCustomPeople(source, people, custom[0].indicator) : [];
  return {
    rules: [
      ...(goals.ok ? goals.rules.map((rule) => ({ ...rule, name: NAMES[rule.indicator], unit: UNITS[rule.indicator] ?? '', period: goals.period })) : []),
      ...custom,
    ],
    rows: custom.length ? customRows : knownRows,
    period: period.ok ? period : { period: '', periodKey: '', periodLabel: '' },
  };
}

function partScore(value, target, higher) {
  if (value === null || value === undefined || target === null || target === undefined || target === 0) return null;
  return Math.min(100, higher ? (value / target) * 100 : (target / value) * 100);
}

function monthOf(key) {
  const hit = /(?:month:)?(\d{4}-\d{2})/.exec(String(key ?? ''));
  return hit ? hit[1] : '';
}

function overallFor(records, rules, weights, period) {
  const pack = weights ?? { resolvidos: 40, primeira: 25, resolucao: 35, floor: 70 };
  const wanted = monthOf(period.periodKey || period.key);
  const by = Object.fromEntries((rules ?? []).map((rule) => [rule.indicator, rule]));
  const tickets = by.resolvidos || by.resolvidosCount;
  const scores = [];
  const seen = new Set();
  for (const record of records ?? []) {
    if (!record.userId) continue;
    if (wanted && monthOf(record.periodKey) && monthOf(record.periodKey) !== wanted) continue;
    if (seen.has(record.userId)) continue;
    seen.add(record.userId);
    const resolvidosValue = by.resolvidos ? record.values?.resolvidos : record.values?.resolvidosCount;
    const resolvidos = partScore(resolvidosValue, tickets?.value, true);
    const primeira = partScore(record.values?.primeira, by.primeira?.value, false);
    const resolucao = partScore(record.values?.resolucao, by.resolucao?.value, false);
    if (resolvidos === null || primeira === null || resolucao === null) continue;
    const weighted = (resolvidos * pack.resolvidos + primeira * pack.primeira + resolucao * pack.resolucao) / 100;
    const worst = Math.min(resolvidos, primeira, resolucao);
    const floor = pack.floor ?? 70;
    const score = Math.round((worst < floor ? Math.min(weighted, worst) : weighted) * 10) / 10;
    scores.push({
      userId: record.userId,
      name: record.name,
      score,
      weighted: Math.round(weighted * 10) / 10,
      worst: Math.round(worst * 10) / 10,
      capped: worst < floor,
      parts: { resolvidos, primeira, resolucao },
    });
  }
  scores.sort((left, right) => right.score - left.score || fold(left.name).localeCompare(fold(right.name), 'pt'));
  return {
    weights: pack,
    excludes: ['transferidos'],
    periodLabel: period?.periodLabel || period?.label || '',
    scores: scores.map((item, index) => ({ ...item, place: index + 1 })),
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
      name: goal.name,
      op: goal.op,
      value: goal.value,
      valueTo: goal.valueTo ?? null,
      period: conference.period?.kind || 'month',
      unit: goal.unit,
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

function centerPrompt(text, history, options) {
  const prior = (history ?? [])
    .map((item) => (typeof item === 'string' ? item : item?.text))
    .filter(Boolean)
    .slice(-6)
    .join('\n')
    .slice(0, 1500);
  const mode = options.mode || 'custom';
  const saved = (options.managementGoals ?? []).map((item) => `${item.periodLabel}: ${(item.rules ?? []).map((rule) => `${rule.name || rule.indicator} ${rule.op} ${rule.value}`).join(', ')}`).join('\n');
  return [
    'Interprete um recado da Central Inteligente de Metas, em português.',
    `Modo da interface: ${mode}. Isso é contexto. Se o pedido for claramente outro assunto, siga o pedido.`,
    'Critérios predefinidos usam tickets, satisfação, primeira resposta e TMA.',
    'Critérios personalizados aceitam indicador conhecido ou inédito, uma ou várias condições, e não exigem os quatro indicadores se o texto não os citar.',
    'Desempenho geral usa pesos de resolvidos, primeira resposta e TMA, aplica o piso e não inclui tickets transferidos.',
    'Não invente número, indicador, comparador, período ou pessoa.',
    'changePodium só é true se a pessoa pediu explicitamente para mudar o pódio. Meta, resultado e conferência não mudam o pódio.',
    'Indicadores conhecidos: resolvidosCount, resolvidos (%), transferidos, primeira, resolucao, satisfacao.',
    'Se o indicador for novo, use indicator começando com c: e o name completo, por exemplo c:indice-de-qualidade-no-atendimento.',
    '"pelo menos"/"no mínimo" = gte. "no máximo"/"até" = lte. "entre" = between. Combine indicadores com combine=all, salvo se bastar uma condição.',
    saved ? `Metas já gravadas:\n${saved}` : '',
    prior ? `Conversa anterior:\n${prior}` : '',
    `Pedido atual:\n${text}`,
  ].filter(Boolean).join('\n');
}

export async function interpretGoalsCenter(text, options = {}) {
  const source = String(text ?? '').trim();
  if (!source) return { kind: 'clarify', questions: ['Escreva as metas e os resultados.'], reply: 'Escreva as metas e os resultados.', conference: null };
  const people = options.people ?? [];
  const mode = options.mode === 'preset' || options.mode === 'overall' ? options.mode : 'custom';
  if (wantsPodium(source) && !/confirmar podio/.test(fold(source))) {
    return clarify(['a confirmação explícita do pódio, por exemplo: Confirmar pódio com desempenho geral. As metas não serão alteradas']);
  }
  const local = localExtract(source, people);
  let parsed = null;
  let modelError = '';
  try {
    const generated = options.generate
      ? await options.generate(centerPrompt(source, options.history ?? [], options))
      : await completeJson(centerPrompt(source, options.history ?? [], options), { schema: GOALS_CENTER_SCHEMA, env: options.env });
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
  let overall = null;
  if (wantsOverall(source, mode) || parsed?.intent === 'overall') {
    const records = options.ledger?.records ?? merged.rows;
    const wanted = monthOf(period.periodKey);
    const fromBank = (options.managementGoals ?? [])
      .filter((item) => !wanted || monthOf(item.periodKey) === wanted)
      .flatMap((item) => item.rules ?? []);
    const rules = merged.rules.length ? merged.rules : fromBank;
    overall = overallFor(records, rules, options.weights, period);
  }
  const conference = toConference({ source, period, rules: merged.rules, rows: merged.rows, mode, overall });
  const missing = missingParts(conference, source);
  if (!conference.goals.length && !conference.people.length && !overall?.scores?.length) {
    if (missing.length) return clarify(missing);
    if (modelError) return failure(modelError);
    return clarify(['as metas, os resultados ou o desempenho geral que você quer conferir']);
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
