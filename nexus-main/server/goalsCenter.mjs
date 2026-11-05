import { createHash } from 'node:crypto';
import { classifyGeminiError, completeJson } from './gemini.mjs';
import { blankPersonSpans, fold, formatPeriodLabel, matchPeople, parseCustomRequest, parsePeopleFromText, readGoalPeriod, subsetorOf, weekRange } from './goals.mjs';
import { FIELD_NAMES, FIELD_UNITS, OVERALL_FIELD_DEFS, VALUE_FIELDS, fieldApplies } from './indicatorCatalog.mjs';
import { applyGoalsReview, inferNoteEffect, noteAppliesToChannel, normalizeGoalNotes } from './ledger.mjs';
import { citedNumbers } from './goalsTurn.mjs';

const KNOWN = VALUE_FIELDS;
const CORE = OVERALL_FIELD_DEFS.map((item) => item.id);
const OPS = ['gt', 'gte', 'lt', 'lte', 'eq', 'between'];
const NAMES = FIELD_NAMES;
const UNITS = FIELD_UNITS;
const OVERALL_FIELDS = OVERALL_FIELD_DEFS;
const CONFERENCE_REPLY = 'Relatório interpretado. Confira os dados abaixo.';

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
  if (/\btma\b|tempo medio(?: de (?:atendimento|resolucao))?|resolucao/.test(raw) && !/qualidade/.test(raw)) return 'resolucao';
  if (/transfer/.test(raw)) return 'transferidos';
  if ((/ticket/.test(raw) || /resolvido/.test(raw)) && /%|percent/.test(raw)) return 'resolvidos';
  if (/ticket/.test(raw) || (/resolvido/.test(raw) && !/qualidade/.test(raw))) return 'resolvidosCount';
  if (/qualidade/.test(raw)) return 'c:indice-de-qualidade-no-atendimento';
  if (/faltas?/.test(raw)) return 'faltas';
  if (/perdid/.test(raw)) return 'perdidas';
  if (/atendid/.test(raw)) return 'atendidas';
  if (/espera/.test(raw)) return 'espera';
  if (/duracao/.test(raw)) return 'duracao';
  const slug = slugOf(name || indicator);
  return slug ? `c:${slug}` : '';
}

function displayName(indicator, name) {
  return String(name || NAMES[indicator] || indicator.replace(/^c:/, '').replace(/-/g, ' ')).trim();
}

function unitOf(indicator, unit) {
  if (unit) return unit;
  if (UNITS[indicator]) return UNITS[indicator];
  const field = OVERALL_FIELDS.find((item) => item.id === indicator);
  if (field?.unit) return field.unit;
  return String(indicator).startsWith('c:') ? '%' : '';
}

function citedKnown(source) {
  const folded = fold(source);
  const named = Boolean(namedIndicator(source));
  return {
    resolvidosCount: !named && !/qualidade/.test(folded) && (
      /tickets?\s+resolvid/.test(folded)
      || (/\btickets?\b/.test(folded) && !/transferid/.test(folded))
      || /\d[\d.]*\s+tickets?(?!\s+transferid)/.test(folded)
    ),
    transferidos: /transferid/.test(folded) && !named,
    satisfacao: /satisfa/.test(folded) && !named,
    primeira: /primeira(?:\s+resposta)?|\btpr\b/.test(folded),
    resolucao: /\btma\b|tempo medio|ate resolu/.test(folded),
    atendidas: /ligac\w*\s+atendid|\batendidas\b/.test(folded),
    perdidas: /perdidas?\s+sem\s+resgate|ligac\w*\s+perdid/.test(folded),
    espera: /tempo\s+de\s+espera|\bespera\b/.test(folded),
    duracao: /duracao(?:\s+da\s+ligacao)?/.test(folded),
    faltas: /faltas?\s+sem\s+atestado|\bfaltas?\b/.test(folded),
  };
}

function namedIndicator(source) {
  const text = String(source ?? '');
  const hit = text.match(/chamad[oa]\s+([^:.\n]+)/i)
    || text.match(/indicador(?:\s+novo)?[:\s]+([^:.\n]+)/i)
    || text.match(/meta personalizada(?:\s+chamada)?\s+([^:.\n]+)/i);
  if (!hit) return '';
  return hit[1].replace(/\s+(pelo menos|no m[ií]nimo|no m[aá]ximo|\bat[eé]\b|maior que|menor que|igual a).*/i, '').replace(/[:.]+$/, '').trim();
}

function wantsGoals(text) {
  return /meta|pelo menos|no minimo|no maximo|gestao|indice|indicador|regra/.test(fold(text));
}

function wantsPeople(text) {
  return /resultado|colaborador|ficou com|fez \d|oliveira|costa|souza|dias|lima|fernandes|pereira/.test(fold(text));
}

function wantsOverall(text, mode) {
  if (mode === 'overall') return true;
  return /desempenho geral|nota geral|pontuacao geral/.test(fold(text));
}

function overallField(indicator) {
  if (indicator === 'resolvidos') return OVERALL_FIELDS[0];
  return OVERALL_FIELDS.find((item) => item.id === indicator) || null;
}

function parseOverallWeights(source) {
  const folded = fold(source);
  const found = {};
  const take = (key, pattern) => {
    const hit = folded.match(pattern);
    const value = finite(hit?.[1]);
    if (value !== null) found[key] = value;
  };
  take('resolvidos', /tickets?(?:\s+resolvid\w*)?[^.\n]{0,48}peso(?:\s+de)?\s+(\d+)/);
  take('transferidos', /tickets?\s+transferid\w*[^.\n]{0,48}peso(?:\s+de)?\s+(\d+)/);
  take('satisfacao', /satisfa\w*[^.\n]{0,48}peso(?:\s+de)?\s+(\d+)/);
  take('primeira', /primeira(?:\s+resposta)?[^.\n]{0,48}peso(?:\s+de)?\s+(\d+)/);
  take('resolucao', /(?:\btma\b|tempo medio(?: de (?:atendimento|resolucao))?)[^.\n]{0,48}peso(?:\s+de)?\s+(\d+)/);
  if (found.resolucao == null) take('resolucao', /tempo medio de resolucao[^.\n]{0,48}peso(?:\s+de)?\s+(\d+)/);
  return found;
}

function fieldsWithValues(rows) {
  return OVERALL_FIELDS.filter((item) => (rows ?? []).some((row) => resultValue(row, item.id) != null)).map((item) => item.id);
}

function selectedOverall(source, options = {}) {
  const allowed = new Set(CORE);
  const fromUi = (Array.isArray(options.indicators) ? options.indicators : [])
    .map((item) => (item === 'resolvidos' ? 'resolvidosCount' : item))
    .filter((item) => allowed.has(item));
  if (fromUi.length) return [...new Set(fromUi)];
  const weighted = parseOverallWeights(source);
  const fromText = OVERALL_FIELDS.filter((item) => weighted[item.weightKey] != null).map((item) => item.id);
  if (fromText.length) return fromText;
  const cited = citedKnown(source);
  const mentioned = OVERALL_FIELDS.filter((item) => cited[item.id]).map((item) => item.id);
  if (mentioned.length) return mentioned;
  const fromRules = OVERALL_FIELDS.filter((item) => ruleForIndicator(options.localRules ?? [], item.id)).map((item) => item.id);
  if (fromRules.length) return fromRules;
  const fromRows = fieldsWithValues(options.localRows);
  if (fromRows.length) return fromRows;
  return OVERALL_FIELDS.filter((item) => ruleForIndicator(options.bank ?? [], item.id) && (options.records ?? []).some((row) => resultValue(row, item.id) != null)).map((item) => item.id);
}

function equalWeights(selected) {
  const pack = {};
  const n = selected.length;
  if (!n) return pack;
  let remain = 100;
  selected.forEach((id, index) => {
    const field = overallField(id);
    if (!field) return;
    const weight = index === n - 1 ? Math.round(remain * 100) / 100 : Math.round((100 / n) * 100) / 100;
    pack[field.weightKey] = weight;
    remain = Math.round((remain - weight) * 100) / 100;
  });
  return pack;
}

function packOverallWeights(selected) {
  if (!selected.length) return { error: ['os indicadores desta avaliação, pelos nomes ou pelos resultados enviados'] };
  return { pack: equalWeights(selected) };
}

function hasNovelIndicator(source) {
  const named = namedIndicator(source);
  if (named) {
    const indicator = normalizeIndicator('', named);
    return Boolean(indicator) && !KNOWN.includes(indicator);
  }
  return /indicador novo|indice de qualidade/.test(fold(source));
}

function publicEvalMode(mode) {
  return mode === 'custom' ? 'custom' : 'overall';
}

export function resolveCenterMode(source, mode) {
  const requested = mode === 'preset' ? 'overall' : mode;
  if (requested === 'overall' || wantsOverall(source, requested)) return 'overall';
  if (hasNovelIndicator(source)) return 'custom';
  const cited = citedKnown(source);
  const known = CORE.some((field) => cited[field]);
  if (requested === 'custom' && known) return 'overall';
  if (known) return 'overall';
  return requested === 'custom' ? 'custom' : 'overall';
}

function selectedPreset(source, options = {}) {
  const allowed = new Set(CORE);
  const fromUi = (Array.isArray(options.indicators) ? options.indicators : [])
    .map((item) => (item === 'resolvidos' ? 'resolvidosCount' : item))
    .filter((item) => allowed.has(item));
  if (fromUi.length) return fromUi;
  const cited = citedKnown(source);
  const mentioned = CORE.filter((field) => cited[field]);
  return mentioned.length ? mentioned : CORE;
}

function rulesFromBank(managementGoals, periodKey) {
  const wanted = monthOf(periodKey);
  return (managementGoals ?? [])
    .filter((item) => !wanted || monthOf(item.periodKey) === wanted)
    .flatMap((item) => item.rules ?? []);
}

function ruleForIndicator(rules, indicator) {
  if (indicator === 'resolvidosCount') return rules.find((item) => item.indicator === 'resolvidosCount') || rules.find((item) => item.indicator === 'resolvidos') || null;
  return rules.find((item) => item.indicator === indicator) || null;
}

function resultValue(row, indicator) {
  if (indicator === 'resolvidosCount') {
    if (row.values?.resolvidosCount != null) return row.values.resolvidosCount;
    if (row.values?.resolvidos != null) return row.values.resolvidos;
    return null;
  }
  return row.values?.[indicator] ?? null;
}

export function readPodiumRequest(text) {
  const folded = fold(text);
  if (/nao alterar o podio|nao mude o podio|nao mexa no podio|nao mexe no podio|sem alterar o podio/.test(folded)) return { kind: 'keep' };
  const mentions = /\bpodio\b/.test(folded) && /confirmar|usar|aplicar|mudar|criterio do podio/.test(folded);
  if (!mentions) return { kind: 'none' };
  if (!/confirmar podio/.test(folded)) {
    return { kind: 'ask', missing: 'a confirmação explícita do pódio, por exemplo: Confirmar pódio com primeira resposta. As metas não serão alteradas' };
  }
  if (/desempenho geral|nota geral/.test(folded)) return { kind: 'apply', criterion: { mode: 'overall', indicator: 'resolvidos', templateId: '' } };
  const indicator = /transferid/.test(folded)
    ? 'transferidos'
    : /primeira/.test(folded)
      ? 'primeira'
      : /\btma\b|tempo medio|resolucao/.test(folded)
        ? 'resolucao'
        : /ticket|resolvid/.test(folded)
          ? 'resolvidos'
          : '';
  if (!indicator) return { kind: 'ask', missing: 'o indicador do pódio (tickets resolvidos, primeira resposta, TMA ou transferidos) ou desempenho geral' };
  return { kind: 'apply', criterion: { mode: 'overall', indicator, templateId: '' } };
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
    const channel = row.subsetor || '';
    const keys = [...new Set([
      ...goals.map((item) => item.indicator),
      ...Object.keys(row.values ?? {}).filter((field) => {
        if (row.values[field] == null) return false;
        if (String(field).startsWith('c:')) return true;
        return !goals.length && KNOWN.includes(field);
      }),
    ])].filter((field) => !channel || fieldApplies(field, channel));
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
    const values = { ...row.values };
    if (channel) {
      for (const field of Object.keys(values)) {
        if (values[field] == null || String(field).startsWith('c:')) continue;
        if (!fieldApplies(field, channel)) values[field] = null;
      }
    }
    return {
      userId: row.userId || '',
      name: row.name || row.sourceName,
      sourceName: row.sourceName || row.name,
      subsetor: channel,
      identified: Boolean(row.userId),
      values,
      results,
    };
  }).filter((row) => row.results.length || row.identified);
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

function missingParts(conference, source, mode = '') {
  const missing = [];
  if (mode === 'overall' || conference.overall) {
    if (!conference.period?.label) missing.push('o período com mês e ano');
    if (!conference.overall?.selected?.length) missing.push('os indicadores que entram nesta avaliação de desempenho geral');
    return missing;
  }
  const cited = citedKnown(source);
  const needed = CORE.filter((field) => cited[field]);
  if (wantsGoals(source) && !conference.goals.length && !conference.overall) missing.push('a regra da meta (indicador, condição, valor e período)');
  if (conference.goals.length && !conference.period?.label) missing.push('o período com mês e ano');
  for (const field of needed) {
    const someone = (conference.people ?? []).some((person) => fieldApplies(field, person.subsetor));
    if ((conference.people ?? []).length && !someone) continue;
    if (!conference.goals.some((goal) => goal.indicator === field)) missing.push(`a meta de ${NAMES[field]}`);
  }
  if (wantsPeople(source) && !(conference.people ?? []).length) missing.push('os resultados individuais dos colaboradores citados');
  const expected = conference.goals.map((goal) => goal.indicator);
  for (const person of conference.people ?? []) {
    if (!person.identified) {
      missing.push(`o cadastro da Equipe de ${person.name}`);
      continue;
    }
    const channel = person.subsetor || '';
    for (const field of expected) {
      if (!fieldApplies(field, channel)) continue;
      if (!person.results.some((item) => item.indicator === field || (field === 'resolvidos' && item.indicator === 'resolvidosCount'))) {
        missing.push(`o resultado de ${displayName(field)} de ${person.name}`);
      }
    }
  }
  return missing;
}

function clarify(missing) {
  const first = missing[0] || 'informação necessária';
  let reply = `Falta ${first}.`;
  if (/cadastro|identificar/.test(first)) reply = `Não consegui identificar 1 colaborador. Selecione o cadastro correspondente para continuar.`;
  else if (missing.length > 1) reply = `Falta ${first}. Há ${missing.length} pendências.`;
  return { kind: 'clarify', questions: missing, reply, conference: null };
}

function failure(kind) {
  const kept = 'Nada foi alterado. O texto que você escreveu continua no campo.';
  if (kind === 'quota') return { kind: 'quota', reply: `O limite gratuito da IA foi atingido agora. ${kept}`, conference: null };
  if (kind === 'auth') return { kind: 'auth', reply: `A chave da IA foi recusada pelo Google. ${kept}`, conference: null };
  if (kind === 'permission') return { kind: 'permission', reply: `A IA não tem permissão para responder agora. ${kept}`, conference: null };
  if (kind === 'model') return { kind: 'model', reply: `O modelo da IA não está disponível. ${kept}`, conference: null };
  if (kind === 'invalid') return { kind: 'invalid', reply: `A IA recusou o pedido. ${kept}`, conference: null };
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

function clauseOp(folded) {
  if (/entre /.test(folded)) return 'between';
  if (/pelo menos|no minimo|minima de|minimo de|minimo |minima |maior ou igual|>=/.test(folded)) return 'gte';
  if (/no maximo|maxima de|maximo de|maximo |maxima |ate |menor ou igual|<=/.test(folded)) return 'lte';
  if (/maior que|acima de/.test(folded)) return 'gt';
  if (/menor que|abaixo de/.test(folded)) return 'lt';
  if (/igual a|igual /.test(folded)) return 'eq';
  return '';
}

function localCustomRules(source, period) {
  const folded = fold(source);
  let name = namedIndicator(source);
  if (!name && /qualidade/.test(folded)) name = 'Índice de qualidade no atendimento';
  if (!name) return [];
  const indicator = normalizeIndicator('', name);
  if (!indicator || KNOWN.includes(indicator)) return [];
  const op = clauseOp(folded);
  if (op === 'between') {
    const between = folded.match(/entre (\d+[^\d]*) e (\d+)/);
    const value = finite(between?.[1]);
    const valueTo = finite(between?.[2]);
    if (value === null || valueTo === null || !inSource(value, source) || !inSource(valueTo, source)) return [];
    return [{ indicator, name, op, value, valueTo, period: period.period || 'month', unit: '%' }];
  }
  const match = folded.match(/pelo menos (\d+)|no minimo (\d+)|no maximo (\d+)|maior que (\d+)|menor que (\d+)|igual a (\d+)/);
  const value = finite(match?.slice(1).find(Boolean));
  if (!op || value === null || !inSource(value, source)) return [];
  return [{
    indicator,
    name,
    op,
    value,
    valueTo: null,
    period: period.period || 'month',
    unit: /%|percent/.test(folded) || String(indicator).startsWith('c:') ? '%' : '',
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
  const goals = parseCustomRequest(blankPersonSpans(source, people));
  const period = readGoalPeriod(source);
  const parsed = parsePeopleFromText(source, people);
  const knownRows = parsed.rows.filter((row) => row.userId && KNOWN.some((field) => row.values[field] != null));
  const custom = localCustomRules(source, period.ok ? period : { period: 'month', periodKey: '', periodLabel: '' });
  const customRows = custom.length ? localCustomPeople(source, people, custom[0].indicator) : [];
  const knownRules = (goals.rules ?? []).filter((rule) => rule.value != null).map((rule) => ({ ...rule, name: NAMES[rule.indicator], unit: UNITS[rule.indicator] ?? '', period: goals.period || period.period || 'month' }));
  return {
    rules: fill({ rules: knownRules, rows: [] }, { rules: custom, rows: [] }).rules,
    rows: custom.length && !knownRules.length
      ? customRows
      : fill({ rules: [], rows: knownRows }, { rules: [], rows: customRows }).rows,
    period: period.ok ? period : { period: '', periodKey: '', periodLabel: '' },
  };
}

function partScore(value, target, higher) {
  if (value === null || value === undefined || target === null || target === undefined || target === 0) return null;
  return Math.min(100, higher ? (value / target) * 100 : (target / value) * 100);
}

function monthOf(key) {
  const month = /^(?:month:)?(\d{4})-(\d{2})$/.exec(String(key ?? ''));
  if (month) return `${month[1]}-${month[2]}`;
  const range = weekRange(String(key ?? ''));
  if (!range) return '';
  return `${range.start.getUTCFullYear()}-${String(range.start.getUTCMonth() + 1).padStart(2, '0')}`;
}

function eligibilityReason(field, rule) {
  const name = displayName(field.id);
  const unit = String(field.unit ?? '').trim();
  const shown = unit ? `${rule?.value} ${unit}`.replace(/\s+/g, ' ') : String(rule?.value ?? '');
  if (!rule) return `Sem condição de entrada para ${name}`;
  if (field.higher || rule.op === 'gte' || rule.op === 'gt') return `Abaixo da condição de entrada (${rule.op === 'gt' ? '>' : 'mínimo'} ${shown})`;
  return `Acima da condição de entrada (${rule.op === 'lt' ? '<' : 'máximo'} ${shown})`;
}

function overallEligible(value, rule, open) {
  if (value == null) return false;
  if (rule) return passes(value, rule) === true;
  return Boolean(open);
}

function channelOfRecord(record, roster) {
  return podiumChannelOf(personFromRoster(roster, record.userId, record.name || record.sourceName));
}

function fieldIsHigher(field, rule) {
  if (rule?.op === 'lte' || rule?.op === 'lt') return false;
  if (rule?.op === 'gte' || rule?.op === 'gt') return true;
  return Boolean(field.higher);
}

function notesForMonth(store, month) {
  return (store?.managementGoals ?? [])
    .filter((item) => monthOf(item.periodKey) === month)
    .flatMap((item) => normalizeGoalNotes(item.notes));
}

function applySpecialRules(record, score, parts, notes, channel) {
  if (!record) return { score, parts, voided: '' };
  const rules = (notes ?? []).filter((item) => item.kind === 'rule' && noteAppliesToChannel(item, channel));
  let nextScore = score;
  let voided = '';
  const nextParts = { ...parts };
  for (const rule of rules) {
    const effect = rule.effect || inferNoteEffect(rule.text, 'rule');
    if (effect !== 'zero_on_faltas') continue;
    const faltas = resultValue(record, 'faltas');
    if (faltas == null || faltas <= 0) continue;
    voided = rule.text;
    nextScore = 0;
    for (const id of Object.keys(nextParts)) {
      nextParts[id] = { ...nextParts[id], contribution: 0, voided: true, reason: rule.text };
    }
  }
  return { score: nextScore, parts: nextParts, voided };
}

function overallFor(records, rules, pack, period, selected, open = false, roster = [], notes = []) {
  const wanted = monthOf(period.periodKey || period.key);
  const chosen = (selected ?? []).map((id) => overallField(id)).filter(Boolean);
  const people = [];
  const seen = new Set();
  for (const record of records ?? []) {
    if (!record.userId) continue;
    if (wanted && monthOf(record.periodKey) && monthOf(record.periodKey) !== wanted) continue;
    if (seen.has(record.userId)) continue;
    seen.add(record.userId);
    people.push(record);
  }
  const bestOf = {};
  for (const field of chosen) {
    const rule = ruleForIndicator(rules, field.id);
    const higher = fieldIsHigher(field, rule);
    const eligible = people
      .map((row) => ({ row, value: resultValue(row, field.id), channel: channelOfRecord(row, roster) }))
      .filter((item) => fieldApplies(field.id, item.channel) && overallEligible(item.value, rule, open))
      .map((item) => item.value);
    bestOf[field.id] = eligible.length ? (higher ? Math.max(...eligible) : Math.min(...eligible)) : null;
  }
  const scores = people.map((record) => {
    const channel = channelOfRecord(record, roster);
    const applicable = chosen.filter((field) => fieldApplies(field.id, channel));
    const localPack = equalWeights(applicable.map((item) => item.id));
    const parts = {};
    let total = 0;
    for (const field of chosen) {
      if (!applicable.includes(field)) continue;
      const rule = ruleForIndicator(rules, field.id);
      const value = resultValue(record, field.id);
      const weight = localPack[field.weightKey] ?? pack[field.weightKey] ?? 0;
      const best = bestOf[field.id];
      const eligible = overallEligible(value, rule, open);
      const higher = fieldIsHigher(field, rule);
      let contribution = 0;
      let reason = '';
      if (!eligible) {
        reason = value == null ? `Sem resultado de ${displayName(field.id)}` : eligibilityReason(field, rule);
      } else if (best && best !== 0) {
        const ratio = higher ? value / best : best / value;
        contribution = Math.min(weight, Math.round(ratio * weight * 100) / 100);
      }
      total += contribution;
      parts[field.id] = {
        name: displayName(field.id),
        value,
        best,
        eligible,
        reason,
        weight,
        contribution: Math.round(contribution * 100) / 100,
      };
    }
    const special = applySpecialRules(record, Math.round(total * 100) / 100, parts, notes, channel);
    return {
      userId: record.userId,
      name: record.name,
      score: special.score,
      parts: special.parts,
      voided: special.voided || '',
    };
  });
  scores.sort((left, right) => right.score - left.score || fold(left.name).localeCompare(fold(right.name), 'pt'));
  const excluded = OVERALL_FIELDS.map((item) => item.id).filter((id) => !chosen.some((item) => item.id === id));
  return {
    weights: pack,
    selected: chosen.map((item) => item.id),
    excluded,
    excludes: excluded,
    periodLabel: period?.periodLabel || period?.label || '',
    scores: scores.map((item, index) => ({ ...item, place: index + 1 })),
  };
}

function rulesForMonth(store, month) {
  const managed = (store.managementGoals ?? []).filter((item) => monthOf(item.periodKey) === month);
  const source = managed.length ? managed : (store.templates ?? []).filter((item) => monthOf(item.periodKey) === month);
  return source.flatMap((item) => item.rules ?? []);
}

const MODE_LABEL = {
  preset: 'Desempenho geral',
  overall: 'Desempenho geral',
  custom: 'Critérios personalizados',
};
const MODE_RANK = { overall: 0, custom: 1, preset: 0 };
const PODIUM_CHANNELS = ['Ligação', 'Chat', 'E-mail'];
const SKIP_FUNCOES = new Set(['Líder', 'Supervisor']);
const CHANNEL_RANK = { Ligação: 0, Chat: 1, 'E-mail': 2 };

function personFromRoster(people, userId, name) {
  const roster = Array.isArray(people) ? people : [];
  return roster.find((item) => item.id && item.id === userId)
    || roster.find((item) => fold(item.name) === fold(name));
}

function podiumChannelOf(person) {
  const funcao = String(person?.funcao ?? '');
  if (SKIP_FUNCOES.has(funcao)) return '';
  return PODIUM_CHANNELS.includes(funcao) ? funcao : '';
}

function recordsForChannel(records, people, channel) {
  return (records ?? []).filter((row) => podiumChannelOf(personFromRoster(people, row.userId, row.name)) === channel);
}
const OP_LABEL = { gt: 'maior que', gte: 'pelo menos', lt: 'menor que', lte: 'no máximo', eq: 'igual a', between: 'entre' };

function isCustomIndicator(indicator) {
  return String(indicator ?? '').startsWith('c:') || (indicator && !KNOWN.includes(indicator) && indicator !== 'resolvidos');
}

function shownValue(indicator, value, unit) {
  if (value == null) return '';
  const extra = String(unitOf(indicator, unit) ?? '').trim();
  const shown = String(value).replace('.', ',');
  if (indicator === 'satisfacao' || indicator === 'resolvidos' || extra === '%') return `${shown}%`;
  if (indicator === 'primeira' || indicator === 'resolucao' || extra.includes('min')) return `${shown} min`;
  return shown;
}

function prettyCustomName(name) {
  const raw = String(name || '').replace(/^índice de\s+/i, '').replace(/^indice de\s+/i, '').trim();
  if (!raw) return 'Critério';
  return raw.split(/\s+/).map((word, index) => {
    if (index && /^(de|do|da|dos|das|no|na|em|e)$/i.test(word)) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function modeTitle(mode, evaluation, label) {
  if (mode === 'custom') {
    return `Critério personalizado - ${prettyCustomName(evaluation?.name || evaluation?.rules?.[0]?.name)} - ${label}`;
  }
  return MODE_LABEL.overall;
}

function describeCondition(rule) {
  if (!rule) return '';
  const name = displayName(rule.indicator, rule.name);
  const unit = unitOf(rule.indicator, rule.unit);
  const shown = rule.op === 'between'
    ? `${rule.value} e ${rule.valueTo ?? ''}${unit}`
    : `${rule.value}${unit === '%' ? '%' : unit}`;
  return `${name} ${OP_LABEL[rule.op] ?? rule.op} ${shown}`.replace(/\s+/g, ' ').trim();
}

function recordFor(records, userId) {
  return records.find((row) => row.userId === userId) ?? null;
}

function rankCustomBank(records, rules) {
  const metric = rules[0]?.indicator;
  const lower = rules[0] && (rules[0].op === 'lt' || rules[0].op === 'lte');
  return [...records].filter((record) => record.userId && rules.every((rule) => overallEligible(resultValue(record, rule.indicator), rule, false))).sort((left, right) => {
    const a = resultValue(left, metric);
    const b = resultValue(right, metric);
    if (a === b) return fold(left.name).localeCompare(fold(right.name), 'pt');
    if (a == null) return 1;
    if (b == null) return -1;
    return lower ? a - b : b - a;
  }).map((record, index) => ({
    place: index + 1,
    userId: record.userId,
    name: record.name,
    score: resultValue(record, metric),
  }));
}

function evaluationsFor(store, month, monthRecords) {
  const saved = (Array.isArray(store.evaluations) ? store.evaluations : []).filter((item) => monthOf(item.periodKey) === month);
  if (saved.length) {
    const groups = { overall: [], custom: [] };
    for (const item of saved) groups[publicEvalMode(item.mode)].push(item);
    const picked = [];
    if (groups.overall.length) {
      const native = groups.overall.filter((item) => item.mode === 'overall');
      const chosen = (native.length ? native : groups.overall).at(-1);
      picked.push({ ...chosen, mode: 'overall' });
    }
    if (groups.custom.length) picked.push(groups.custom.at(-1));
    return picked;
  }
  const inferred = [];
  const rules = rulesForMonth(store, month);
  const overall = (Array.isArray(store.overallReviews) ? store.overallReviews : []).filter((item) => monthOf(item.periodKey) === month).at(-1);
  if (overall?.selected?.length) {
    inferred.push({
      mode: 'overall',
      periodKey: month,
      selected: overall.selected,
      rules,
      weights: overall.weights ?? null,
      name: '',
    });
  }
  const customRules = rules.filter((rule) => isCustomIndicator(rule.indicator));
  const knownRules = rules.filter((rule) => !isCustomIndicator(rule.indicator));
  if (customRules.length) {
    inferred.push({
      mode: 'custom',
      periodKey: month,
      selected: customRules.map((rule) => rule.indicator),
      rules: customRules,
      weights: null,
      name: customRules[0]?.name || '',
    });
  }
  if (knownRules.length) {
    inferred.push({
      mode: 'overall',
      periodKey: month,
      selected: knownRules.map((rule) => (rule.indicator === 'resolvidos' ? 'resolvidosCount' : rule.indicator)).filter((id, index, list) => list.indexOf(id) === index),
      rules: knownRules,
      weights: null,
      name: '',
    });
  }
  if (!inferred.length && monthRecords.length) {
    const selected = OVERALL_FIELDS.filter((field) => monthRecords.some((row) => resultValue(row, field.id) != null)).map((field) => field.id);
    inferred.push({
      mode: 'overall',
      periodKey: month,
      selected,
      rules,
      weights: null,
      name: '',
      detailsPartial: !selected.length,
    });
  }
  return inferred;
}

function basisFor(evaluation, label) {
  const mode = publicEvalMode(evaluation.mode);
  const rules = evaluation.rules ?? [];
  const title = modeTitle(mode, evaluation, label);
  return {
    origin: 'Resultados confirmados no Banco de Dados (Supabase)',
    periodLabel: label,
    modeLabel: title,
    summary: evaluation.detailsPartial
      ? 'O detalhamento desta avaliação não está disponível.'
      : `Pódio de ${MODE_LABEL[mode].toLowerCase()} do período ${label}, gerado só com resultados já gravados.`,
    indicators: (evaluation.selected?.length ? evaluation.selected : rules.map((rule) => rule.indicator)).map((id) => {
      const rule = ruleForIndicator(rules, id) || rules.find((item) => item.indicator === id);
      const field = overallField(id);
      return {
        id,
        name: displayName(id, rule?.name),
        condition: describeCondition(rule),
        weight: evaluation.weights && field ? evaluation.weights[field.weightKey] ?? null : null,
      };
    }),
  };
}

function presetMetrics(record, evaluation) {
  const rules = evaluation.rules ?? [];
  const selected = evaluation.selected?.length ? evaluation.selected : rules.map((rule) => rule.indicator);
  return selected.map((id) => {
    const rule = ruleForIndicator(rules, id) || rules.find((item) => item.indicator === id);
    const value = record ? resultValue(record, id) : null;
    const met = rule ? passes(value, rule) : null;
    return {
      id,
      name: displayName(id, rule?.name),
      value,
      unit: unitOf(id, rule?.unit),
      shown: shownValue(id, value, rule?.unit),
      met,
      condition: describeCondition(rule),
      target: rule?.value ?? null,
      reason: value == null ? `Sem resultado de ${displayName(id, rule?.name)}` : '',
    };
  });
}

function overallMetrics(scoreRow, evaluation, channel = '') {
  const rules = evaluation.rules ?? [];
  return Object.entries(scoreRow.parts ?? {}).flatMap(([id, part]) => {
    if (channel && !fieldApplies(id, channel) && id !== 'faltas' && !String(id).startsWith('c:')) return [];
    if (part?.reason === 'Indicador não se aplica a esta categoria') return [];
    const rule = ruleForIndicator(rules, id) || rules.find((item) => item.indicator === id);
    return [{
      id,
      name: part.name || displayName(id),
      value: part.value ?? null,
      unit: unitOf(id, rule?.unit),
      shown: shownValue(id, part.value, rule?.unit),
      weight: part.weight,
      contribution: part.contribution,
      eligible: part.eligible,
      reason: part.reason || '',
      condition: describeCondition(rule),
      target: rule?.value ?? null,
    }];
  });
}

function percentDisplay(score) {
  if (score == null || score === '') return '';
  const n = Number(score);
  if (!Number.isFinite(n)) return '';
  return `${String(n).replace('.', ',')}%`;
}

function customMetrics(record, evaluation) {
  return (evaluation.rules ?? []).map((rule) => {
    const value = record ? resultValue(record, rule.indicator) : null;
    const met = passes(value, rule);
    return {
      id: rule.indicator,
      name: prettyCustomName(displayName(rule.indicator, rule.name)),
      value,
      unit: unitOf(rule.indicator, rule.unit),
      shown: shownValue(rule.indicator, value, rule.unit),
      met,
      condition: describeCondition(rule),
      target: rule.value ?? null,
      reason: met === false ? 'Não cumpriu a condição' : met === true ? '' : `Sem resultado de ${displayName(rule.indicator, rule.name)}`,
    };
  });
}

function buildModePodium(store, month, monthRecords, evaluation, now, channel = '', people = []) {
  const label = formatPeriodLabel(month);
  const stamp = (now ?? new Date()).toISOString();
  const mode = publicEvalMode(evaluation.mode);
  const rules = evaluation.rules?.length ? evaluation.rules : rulesForMonth(store, month);
  const known = rules.filter((rule) => OVERALL_FIELDS.some((field) => field.id === rule.indicator || (field.id === 'resolvidosCount' && rule.indicator === 'resolvidos')));
  let selected = (evaluation.selected ?? []).map((id) => (id === 'resolvidos' ? 'resolvidosCount' : id)).filter(Boolean);
  if (!selected.length) {
    selected = OVERALL_FIELDS.filter((field) => ruleForIndicator(known, field.id) && monthRecords.some((row) => resultValue(row, field.id) != null)).map((field) => field.id);
  }
  if (!selected.length && mode !== 'custom') {
    selected = OVERALL_FIELDS.filter((field) => monthRecords.some((row) => resultValue(row, field.id) != null)).map((field) => field.id);
  }
  selected = selected.filter((id) => !channel || fieldApplies(id, channel) || String(id).startsWith('c:'));
  const detailsPartial = Boolean(evaluation.detailsPartial);
  const pack = mode === 'custom' ? null : equalWeights(selected);
  const basis = basisFor({ ...evaluation, mode, selected, rules, weights: pack || evaluation.weights, detailsPartial }, label);
  const shell = {
    periodKey: month,
    periodLabel: label,
    mode,
    modeLabel: modeTitle(mode, evaluation, label),
    channel,
    selected,
    weights: {},
    detailsAvailable: !detailsPartial,
    basis,
    computedAt: stamp,
  };
  if (mode === 'custom' && rules.length) {
    const notes = notesForMonth(store, month);
    const ranked = rankCustomBank(monthRecords, rules)
      .map((row) => {
        const record = recordFor(monthRecords, row.userId);
        const person = personFromRoster(people, row.userId, row.name);
        const rowChannel = podiumChannelOf(person) || channel;
        const special = applySpecialRules(record, row.score, {}, notes, rowChannel);
        return { ...row, score: special.voided ? 0 : row.score, voided: special.voided || '' };
      })
      .sort((left, right) => Number(right.score ?? 0) - Number(left.score ?? 0) || fold(left.name).localeCompare(fold(right.name), 'pt'))
      .map((row, index) => ({ ...row, place: index + 1 }))
      .slice(0, 3);
    return {
      ...shell,
      selected: rules.map((rule) => rule.indicator),
      ranking: ranked.map((row) => {
        const record = recordFor(monthRecords, row.userId);
        const metrics = detailsPartial ? [] : customMetrics(record, { ...evaluation, rules }).filter((item) => !channel || fieldApplies(item.id, channel) || item.id === 'faltas' || String(item.id).startsWith('c:'));
        return {
          ...row,
          displayScore: row.voided ? '0' : (row.score == null ? '' : shownValue(rules[0]?.indicator, row.score, rules[0]?.unit)),
          detailsAvailable: !detailsPartial && metrics.some((item) => item.value != null),
          metrics,
        };
      }),
    };
  }
  if (selected.length) {
    const scored = overallFor(monthRecords, known, pack || equalWeights(selected), { periodKey: month, periodLabel: label }, selected, true, people, notesForMonth(store, month));
    return {
      ...shell,
      selected: scored.selected,
      weights: scored.weights,
      ranking: scored.scores.slice(0, 3).map((row) => {
        const record = recordFor(monthRecords, row.userId);
        const metrics = detailsPartial
          ? []
          : overallMetrics(row, { ...evaluation, rules: known, weights: scored.weights }, channel);
        return {
          place: row.place,
          userId: row.userId,
          name: row.name,
          score: row.score,
          displayScore: percentDisplay(row.score),
          detailsAvailable: !detailsPartial && metrics.length > 0,
          voided: row.voided || '',
          metrics,
        };
      }),
    };
  }
  return { ...shell, ranking: [] };
}

export function attachBankPodiums(store, now = new Date(), people = []) {
  const records = Array.isArray(store?.ledger?.records) ? store.ledger.records : [];
  const confirmed = records.filter((row) => row.userId);
  const liveKeys = [...new Set(confirmed.map((row) => monthOf(row.periodKey)).filter(Boolean))];
  const live = liveKeys.flatMap((key) => {
    const monthRecords = confirmed.filter((row) => monthOf(row.periodKey) === key);
    return evaluationsFor(store, key, monthRecords).flatMap((evaluation) => PODIUM_CHANNELS.map((channel) => (
      buildModePodium(store, key, recordsForChannel(monthRecords, people, channel), evaluation, now, channel, people)
    )));
  });
  const liveIndex = new Set(live.map((item) => `${item.periodKey}:${item.mode}`));
  const history = (Array.isArray(store?.podiums) ? store.podiums : []).filter((item) => {
    const key = monthOf(item.periodKey) || item.periodKey;
    const mode = publicEvalMode(item.mode);
    return key && !liveIndex.has(`${key}:${mode}`);
  }).map((item) => {
    const mode = publicEvalMode(item.mode);
    return {
    ...item,
    mode,
    modeLabel: item.mode === 'custom' ? item.modeLabel : MODE_LABEL.overall,
    detailsAvailable: item.detailsAvailable === true && Array.isArray(item.ranking) && item.ranking.some((row) => row.metrics?.length),
    ranking: (item.ranking ?? []).map((row) => ({
      ...row,
      displayScore: mode === 'custom' ? row.displayScore : percentDisplay(row.score),
      detailsAvailable: Boolean(row.metrics?.length),
      metrics: row.metrics ?? [],
    })),
    basis: item.basis ?? {
      origin: 'Histórico do Banco de Dados',
      periodLabel: item.periodLabel || '',
      modeLabel: MODE_LABEL[mode],
      summary: 'O detalhamento desta avaliação não está disponível.',
      indicators: [],
    },
  };
  });
  return {
    ...store,
    podiums: [...live, ...history].sort((left, right) => {
      const byPeriod = String(right.periodKey).localeCompare(String(left.periodKey));
      if (byPeriod) return byPeriod;
      const byMode = (MODE_RANK[left.mode] ?? 9) - (MODE_RANK[right.mode] ?? 9);
      if (byMode) return byMode;
      return (CHANNEL_RANK[left.channel] ?? 9) - (CHANNEL_RANK[right.channel] ?? 9);
    }),
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
    'Há só dois modos: desempenho geral e critérios personalizados. Não existe mais a modalidade critérios predefinidos.',
    'Desempenho geral usa indicadores operacionais: tickets resolvidos, tickets transferidos, primeira resposta, TMA, ligações atendidas, ligações perdidas sem resgate, tempo de espera, duração da ligação e faltas sem atestado. Satisfação não entra. Indicadores de ligação só valem para quem tem funcao Ligação na Equipe. Faltas valem para Ligação, Chat e E-mail. A categoria oficial é o campo funcao, nunca role. Pesos iguais entre os indicadores selecionados e aplicáveis. Quem não entra na condição zera só aquela parcela. O pódio mostra percentual e não mistura categorias nem períodos.',
    'Critérios personalizados servem só para criar indicador inédito. Indicadores já conhecidos entram no desempenho geral.',
    'Não invente número, indicador, comparador, período ou pessoa.',
    'changePodium só é true se a pessoa pediu explicitamente para mudar o pódio. Meta, resultado e conferência não mudam o pódio.',
    'Indicadores conhecidos: resolvidosCount, resolvidos (%), transferidos, primeira, resolucao, satisfacao, atendidas, perdidas, espera, duracao, faltas.',
    'Se o indicador for novo, use indicator começando com c: e o name completo, por exemplo c:indice-de-qualidade-no-atendimento.',
    '"pelo menos"/"no mínimo" = gte. "no máximo"/"até" = lte. "entre" = between. Combine indicadores com combine=all, salvo se bastar uma condição.',
    saved ? `Metas já gravadas:\n${saved}` : '',
    (options.managementGoals ?? []).some((item) => (item.notes ?? []).length)
      ? `Observações e regras da gestão (regras com kind=rule alteram o cálculo; observações não):\n${(options.managementGoals ?? []).flatMap((item) => normalizeGoalNotes(item.notes).map((note) => `${item.periodLabel}: [${note.kind === 'rule' ? 'REGRA' : 'OBSERVAÇÃO'}] ${note.text}`)).join('\n')}`
      : '',
    prior ? `Conversa anterior:\n${prior}` : '',
    `Pedido atual:\n${text}`,
  ].filter(Boolean).join('\n');
}

function combinedSource(text, history) {
  const prior = (history ?? [])
    .map((item) => (typeof item === 'string' ? item : item?.text))
    .filter((item) => item && !/olá!|escreva a regra|vou calcular|estamos nos criterios|desempenho geral:|criterios personalizados:|criterios predefinidos:|criterio personalizado e so|transferidos ficam de fora|identifico os indicadores|identifico pelo texto|descreva no chat|avalie seus colaboradores|faltou |conferência pronta/i.test(item));
  return [...prior, text].filter(Boolean).join('\n');
}

function rulesForSelected(source, local, bank, selected) {
  const localRules = (local.rules ?? []).filter((rule) => {
    if (!(selected.includes(rule.indicator) || (rule.indicator === 'resolvidos' && selected.includes('resolvidosCount')))) return false;
    return !new RegExp(`peso(?:\\s+de)?\\s+${rule.value}(?:\\s*%)?`).test(fold(source));
  });
  const rules = [];
  for (const id of selected) {
    const current = ruleForIndicator(localRules, id) || ruleForIndicator(bank, id);
    if (current) rules.push({ ...current, indicator: current.indicator === 'resolvidos' && id === 'resolvidosCount' ? 'resolvidosCount' : current.indicator, name: displayName(id, current.name), unit: unitOf(id, current.unit) });
  }
  return rules;
}

function recordsForPeriod(local, options, period) {
  const rows = (local.rows ?? []).filter((row) => row.userId);
  const monthRows = (options.ledger?.records ?? []).filter((row) => row.userId && (!period.periodKey || monthOf(row.periodKey) === monthOf(period.periodKey)));
  return rows.length ? rows : monthRows;
}

function interpretKnown(source, options) {
  return interpretOverall(source, { ...options, mode: 'overall' });
}

function scoreOverall(source, options, local, period) {
  const bank = rulesFromBank(options.managementGoals, period.periodKey);
  const records = recordsForPeriod(local, options, period);
  const selected = selectedOverall(source, { ...options, localRules: local.rules, localRows: local.rows, bank, records });
  const packed = packOverallWeights(selected);
  const rules = rulesForSelected(source, local, bank, selected);
  const missing = [];
  if (!period.periodLabel) missing.push('o período com mês e ano');
  if (packed.error) missing.push(...packed.error);
  const roster = options.people ?? [];
  for (const id of selected) {
    const used = records.some((row) => fieldApplies(id, channelOfRecord(row, roster) || row.subsetor));
    if (!used) continue;
    if (!ruleForIndicator(rules, id)) {
      const channels = (OVERALL_FIELDS.find((item) => item.id === id)?.channels ?? []).join(', ');
      missing.push(`cadastrar a meta de ${displayName(id)}${channels ? ` para ${channels}` : ''}${period.periodLabel ? ` em ${period.periodLabel}` : ''}`);
    }
  }
  if (wantsPeople(source) && !records.length) missing.push('os resultados individuais dos colaboradores citados');
  for (const person of records) {
    if (!person.userId) missing.push(`identificar ${person.name || person.sourceName}`);
    const channel = channelOfRecord(person, roster) || person.subsetor;
    for (const id of selected) {
      if (!fieldApplies(id, channel)) continue;
      if (resultValue(person, id) == null) missing.push(`o resultado de ${displayName(id)} de ${person.name || person.sourceName}`);
    }
  }
  if (missing.length) return clarify(missing);
  const overall = overallFor(records, rules, packed.pack, period, selected, false, roster, notesForMonth({ managementGoals: options.managementGoals }, monthOf(period.periodKey || period.key)));
  const conference = toConference({ source, period, rules, rows: records, mode: 'overall', overall });
  if (!conference.goals.length && !conference.people.length) {
    return clarify(['as condições de entrada e os resultados dos indicadores selecionados']);
  }
  if (wantsPeople(source) && !overall.scores.length) {
    return clarify(['os resultados dos indicadores selecionados no período pedido']);
  }
  return conferenceResponse(conference);
}

async function interpretOverall(source, options) {
  const people = options.people ?? [];
  let local = localExtract(source, people);
  let period = readGoalPeriod(source).ok ? readGoalPeriod(source) : local.period;
  const first = scoreOverall(source, options, local, period);
  if (first.kind === 'conference') return first;
  let parsed = null;
  let modelError = '';
  try {
    const generated = options.generate
      ? await options.generate(centerPrompt(source, options.history ?? [], { ...options, mode: 'overall' }))
      : await completeJson(centerPrompt(source, options.history ?? [], { ...options, mode: 'overall' }), { schema: GOALS_CENTER_SCHEMA, env: options.env });
    if (generated?.error) modelError = generated.error;
    else parsed = parseGenerated(generated?.text ?? generated);
  } catch (error) {
    modelError = classifyGeminiError(error);
  }
  if (!parsed) return first;
  const modelPeriod = parsed.periodKey
    ? { ok: true, period: parsed.period || 'month', periodKey: String(parsed.periodKey), periodLabel: String(parsed.periodLabel || formatPeriodLabel(parsed.periodKey)) }
    : period;
  period = readGoalPeriod(source).ok ? readGoalPeriod(source) : (modelPeriod.ok ? modelPeriod : local.period);
  const merged = fill({
    rules: rulesFromModel(parsed.goals, source, period.period),
    rows: rowsFromModel(parsed.people, people, source),
  }, local);
  local = { ...local, rules: merged.rules, rows: merged.rows, period };
  const next = scoreOverall(source, options, local, period);
  if (next.kind === 'conference') return next;
  return next.kind === 'clarify' ? next : first;
}

export async function interpretGoalsCenter(text, options = {}) {
  const source = String(text ?? '').trim();
  if (!source) return { kind: 'clarify', questions: ['Escreva as metas e os resultados.'], reply: 'Escreva as metas e os resultados.', conference: null };
  const people = options.people ?? [];
  const requested = options.mode === 'custom' || options.mode === 'overall' || options.mode === 'preset'
    ? (options.mode === 'preset' ? 'overall' : options.mode)
    : 'overall';
  const mode = resolveCenterMode(source, requested);
  const podium = readPodiumRequest(source);
  if (podium.kind === 'ask') return clarify([podium.missing]);
  if (podium.kind === 'apply') {
    return {
      kind: 'podium',
      persist: true,
      conference: null,
      criterion: podium.criterion,
      reply: 'Atualizei só o critério do pódio. As metas e o Banco dos relatórios não foram alterados.',
    };
  }
  const joined = combinedSource(source, options.history);
  if (mode === 'overall' || mode === 'preset') return interpretOverall(joined, { ...options, mode: 'overall' });
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
  const conference = toConference({ source, period, rules: merged.rules, rows: merged.rows, mode, overall: null });
  const missing = missingParts(conference, source, mode);
  if (!conference.goals.length && !conference.people.length) {
    if (missing.length) return clarify(missing);
    if (modelError) return failure(modelError);
    return clarify(['as metas, os resultados ou o desempenho geral que você quer conferir']);
  }
  if (missing.length) return clarify(missing);
  return conferenceResponse(conference);
}

export function saveGoalsCenter(store, conference, people, now = new Date()) {
  const missing = missingParts(conference, conference.sourceText || '', conference.mode || '');
  if (missing.length) return { error: 'incomplete', store };
  const seen = store.centerFingerprints ?? [];
  const mark = fingerprint(conference);
  if (seen.includes(mark)) return { store, duplicate: true };
  const saved = applyGoalsReview(store, conferenceToReview(conference), people, now);
  const mode = conference.mode === 'custom' && !conference.overall ? 'custom' : 'overall';
  const month = monthOf(conference.period?.key || '');
  const selected = conference.overall?.selected ?? (conference.goals ?? []).map((goal) => (goal.indicator === 'resolvidos' ? 'resolvidosCount' : goal.indicator));
  const evaluation = {
    id: conference.id || `${mode}-${month}`,
    mode,
    periodKey: month || conference.period?.key || '',
    periodLabel: conference.period?.label || '',
    selected,
    rules: conference.goals ?? [],
    weights: conference.overall?.weights ?? (mode === 'overall' ? equalWeights(selected) : null),
    name: mode === 'custom' ? displayName(conference.goals?.[0]?.indicator, conference.goals?.[0]?.name) : '',
    savedAt: now.toISOString(),
  };
  const evaluations = [...(saved.store.evaluations ?? store.evaluations ?? [])]
    .filter((item) => !(monthOf(item.periodKey) === month && item.mode === mode));
  evaluations.push(evaluation);
  const reviews = [...(store.overallReviews ?? [])];
  if (conference.mode === 'overall' && conference.overall) {
    const entry = {
      id: conference.id,
      periodKey: conference.period?.key || '',
      periodLabel: conference.period?.label || '',
      selected: conference.overall.selected ?? [],
      excluded: conference.overall.excluded ?? [],
      weights: conference.overall.weights ?? {},
      scores: conference.overall.scores ?? [],
      savedAt: now.toISOString(),
    };
    const next = reviews.filter((item) => !(item.periodKey === entry.periodKey && JSON.stringify(item.selected) === JSON.stringify(entry.selected)));
    next.push(entry);
    reviews.splice(0, reviews.length, ...next.slice(-50));
  }
  return {
    store: attachBankPodiums({
      ...saved.store,
      criterion: store.criterion,
      centerFingerprints: [...seen, mark].slice(-50),
      overallReviews: reviews,
      evaluations: evaluations.slice(-80),
    }, now, people),
  };
}
