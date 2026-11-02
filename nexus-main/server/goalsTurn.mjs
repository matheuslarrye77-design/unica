import { classifyGeminiError, completeJson } from './gemini.mjs';
import {
  buildGoalsReview,
  fold,
  formatPeriodLabel,
  isGoalsConferenceTalk,
  looksLikeReport,
  matchPeople,
  parseCustomRequest,
  parsePeopleFromText,
  readGoalPeriod,
  understandGoalsMessage,
} from './goals.mjs';

const INDICATORS = ['resolvidosCount', 'resolvidos', 'transferidos', 'primeira', 'resolucao', 'satisfacao'];
const OPS = ['gt', 'gte', 'lt', 'lte', 'eq', 'between'];
const FIELDS = ['resolvidosCount', 'resolvidos', 'transferidos', 'primeira', 'resolucao', 'satisfacao'];

export const GOALS_TURN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'intent', 'explanation', 'questions', 'period', 'periodKey', 'periodLabel', 'changePodium', 'goals', 'people'],
  properties: {
    status: { type: 'string', enum: ['ready', 'needs_clarification'] },
    intent: { type: 'string', enum: ['review', 'goals', 'results', 'podium', 'none'] },
    explanation: { type: 'string' },
    questions: { type: 'array', items: { type: 'string' } },
    period: { type: 'string', enum: ['week', 'month', ''] },
    periodKey: { type: 'string' },
    periodLabel: { type: 'string' },
    changePodium: { type: 'boolean' },
    goals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['indicator', 'op', 'value', 'valueTo', 'period'],
        properties: {
          indicator: { type: 'string', enum: INDICATORS },
          op: { type: 'string', enum: OPS },
          value: { type: 'number' },
          valueTo: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          period: { type: 'string', enum: ['week', 'month', ''] },
        },
      },
    },
    people: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'resolvidosCount', 'resolvidos', 'transferidos', 'primeira', 'resolucao', 'satisfacao'],
        properties: {
          name: { type: 'string' },
          resolvidosCount: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          resolvidos: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          transferidos: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          primeira: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          resolucao: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          satisfacao: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        },
      },
    },
  },
};

function cleanText(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function scrub(value, max) {
  return cleanText(String(value ?? '')
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, ' ')
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, ' ')
    .replace(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2}\)?[\s-]?)?\d{4,5}[\s-]?\d{4}\b/g, ' ')
    .replace(/\b\d{8,}\b/g, ' '), max);
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function citedNumbers(text) {
  return [...String(text ?? '').matchAll(/(\d[\d.,]*)/g)]
    .map((item) => {
      const raw = String(item[1]).replace(/\s/g, '');
      if (/^(?:19|20)\d{2}$/.test(raw.replace(/\D/g, '')) && raw.replace(/\D/g, '').length === 4) return null;
      const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
      const value = Number(normalized);
      return Number.isFinite(value) ? value : null;
    })
    .filter((value) => value !== null);
}

function inSource(value, source) {
  if (value === null || value === undefined) return false;
  return citedNumbers(source).some((item) => item === value);
}

function explicitPodiumConfirm(text) {
  return /^confirmar podio(?: com| usando)? (tickets resolvidos|primeira resposta|tempo medio(?: de resolucao)?|tickets transferidos)$/.test(fold(text));
}

export function goalsTurnPrompt(text, history = []) {
  const prior = (history ?? [])
    .map((item) => (typeof item === 'string' ? item : item?.text))
    .filter(Boolean)
    .slice(-6)
    .map((item) => scrub(item, 400))
    .filter(Boolean)
    .join('\n')
    .slice(0, 1500);
  return [
    'Interprete um recado de gestão de atendimento, em português, sobre metas e resultados.',
    'Não invente número, indicador, comparador, período ou pessoa.',
    'Metas da gestão são parâmetros gerais. Números ligados a um colaborador são resultados individuais, nunca meta da gestão.',
    'Satisfação é indicador próprio. Não use percentual de tickets resolvidos no lugar de satisfação.',
    'Indicadores: resolvidosCount (quantidade de tickets), resolvidos (percentual de tickets), transferidos, primeira (minutos), resolucao (TMA em minutos), satisfacao (percentual).',
    '"pelo menos", "no mínimo" = gte. "no máximo", "até" = lte.',
    'Mês nomeado (novembro de 2026, nov/2026) é month. periodKey no formato month:AAAA-MM. periodLabel no formato Mês/AAAA.',
    'changePodium só é true se a pessoa pediu explicitamente para mudar o critério do pódio. Definir meta, importar resultado, conferir ou falar em primeira resposta não muda o pódio.',
    'intent review quando houver metas e/ou resultados para conferir antes de gravar. intent podium só para regra de ranking do pódio.',
    'Não omita indicador citado no texto. Se faltar dado, status needs_clarification e uma pergunta curta.',
    prior ? `Conversa anterior:\n${prior}` : '',
    `Pedido atual:\n${scrub(text, 4000)}`,
  ].filter(Boolean).join('\n');
}

function parseGenerated(raw) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
  }
  return parsed && typeof parsed === 'object' ? parsed : null;
}

function validateGoals(items, source, period) {
  const rules = [];
  for (const item of Array.isArray(items) ? items : []) {
    const indicator = INDICATORS.includes(item?.indicator) ? item.indicator : '';
    const op = OPS.includes(item?.op) ? item.op : '';
    const value = finite(item?.value);
    const valueTo = finite(item?.valueTo);
    const when = item?.period === 'month' || item?.period === 'week' ? item.period : period;
    if (!indicator || !op || value === null || !when || !inSource(value, source)) continue;
    if (op === 'between' && (valueTo === null || !inSource(valueTo, source))) continue;
    if (rules.some((rule) => rule.indicator === indicator)) continue;
    rules.push({ indicator, op, value, ...(op === 'between' ? { valueTo } : {}), period: when });
  }
  return rules;
}

function rowsFromModel(peopleList, people, source) {
  const lines = [];
  for (const item of Array.isArray(peopleList) ? peopleList : []) {
    const name = cleanText(item?.name, 80);
    if (!name) continue;
    const bits = [];
    if (inSource(item.resolvidosCount, source)) bits.push(`${item.resolvidosCount} tickets resolvidos`);
    if (inSource(item.satisfacao, source)) bits.push(`${item.satisfacao}% de satisfação`);
    if (inSource(item.resolvidos, source) && !inSource(item.satisfacao, source)) bits.push(`${item.resolvidos}% de tickets resolvidos`);
    if (inSource(item.transferidos, source)) bits.push(`${item.transferidos} tickets transferidos`);
    if (inSource(item.primeira, source)) bits.push(`${item.primeira} min de primeira resposta`);
    if (inSource(item.resolucao, source)) bits.push(`${item.resolucao} min de resolução`);
    if (!bits.length) continue;
    const matches = matchPeople(name, people);
    const label = matches.length === 1 ? matches[0].name : name;
    lines.push(`${label}: ${bits.join(', ')}`);
  }
  if (!lines.length) return [];
  return parsePeopleFromText(lines.join('\n'), people).rows;
}

function mergeRules(primary, extra) {
  const rules = [...(primary ?? [])];
  for (const rule of extra ?? []) {
    if (!rules.some((item) => item.indicator === rule.indicator)) rules.push(rule);
  }
  return rules;
}

function mergeRows(primary, extra) {
  const rows = [...(primary ?? [])];
  for (const row of extra ?? []) {
    const key = fold(row.userId || row.sourceName || row.name);
    const current = rows.find((item) => fold(item.userId || item.sourceName || item.name) === key);
    if (!current) {
      rows.push(row);
      continue;
    }
    for (const field of FIELDS) {
      if ((current.values[field] === null || current.values[field] === undefined) && row.values[field] != null) {
        current.values[field] = row.values[field];
      }
    }
    if (!current.userId && row.userId) {
      current.userId = row.userId;
      current.name = row.name;
      current.subsetor = row.subsetor;
    }
  }
  return rows;
}

function periodFrom(parsed, source) {
  const local = readGoalPeriod(source);
  if (local.ok) return local;
  const key = cleanText(parsed?.periodKey, 32);
  const label = cleanText(parsed?.periodLabel, 80);
  const period = parsed?.period === 'month' || parsed?.period === 'week' ? parsed.period : '';
  if (period && (key || label)) {
    return { ok: true, period, periodKey: key || (period === 'month' ? '' : ''), periodLabel: label || formatPeriodLabel(key) };
  }
  return { ok: false };
}

function failure(kind) {
  const kept = 'Nada foi alterado. O texto que você escreveu continua no campo.';
  if (kind === 'quota') return { kind: 'quota', reply: `O limite gratuito da IA foi atingido agora. ${kept}` };
  if (kind === 'auth') return { kind: 'auth', reply: `A chave da IA foi recusada pelo Google. ${kept}` };
  if (kind === 'permission') return { kind: 'permission', reply: `O Google recusou a permissão desta chave. ${kept}` };
  if (kind === 'model') return { kind: 'model', reply: `O modelo gratuito configurado não existe para esta chave. ${kept}` };
  if (kind === 'invalid') return { kind: 'invalid', reply: `O Google recusou o formato do pedido. ${kept}` };
  if (kind === 'unconfigured') return { kind: 'unavailable', reply: `A inteligência artificial não está disponível com um modelo gratuito agora. ${kept}` };
  return { kind: 'unavailable', reply: `A IA não respondeu. ${kept}` };
}

function fromLocal(local, source) {
  if (local.kind === 'review' || local.kind === 'proposal' || local.kind === 'ingest' || local.kind === 'unknown') return local;
  return { kind: 'unknown' };
}

export async function interpretGoalsTurn(text, options = {}) {
  const source = String(text ?? '').trim();
  if (!source) return { kind: 'unknown' };
  const people = options.people ?? [];
  const local = understandGoalsMessage(source, people);
  if (local.kind === 'ingest' && looksLikeReport(source) && !isGoalsConferenceTalk(source)) return local;
  if (explicitPodiumConfirm(source)) return { kind: 'unknown' };

  let generated;
  try {
    generated = options.generate
      ? await options.generate(goalsTurnPrompt(source, options.history ?? []))
      : await completeJson(goalsTurnPrompt(source, options.history ?? []), { schema: GOALS_TURN_SCHEMA, env: options.env });
  } catch (error) {
    if (local.kind === 'review' || local.kind === 'proposal' || local.kind === 'ingest') return fromLocal(local, source);
    return failure(classifyGeminiError(error));
  }
  if (generated?.error) {
    if (local.kind === 'review' || local.kind === 'proposal' || local.kind === 'ingest') return fromLocal(local, source);
    return failure(generated.error);
  }

  const parsed = parseGenerated(generated?.text ?? generated);
  if (!parsed) {
    if (local.kind === 'review' || local.kind === 'proposal' || local.kind === 'ingest') return fromLocal(local, source);
    return { kind: 'clarify', questions: ['Não consegui ler a interpretação. Pode repetir as metas e os resultados?'], reply: 'Não consegui ler a interpretação. Pode repetir as metas e os resultados? Nada foi gravado e o pódio não mudou.' };
  }

  const period = periodFrom(parsed, source);
  const modelRules = validateGoals(parsed.goals, source, period.ok ? period.period : '');
  const localRules = local.rules ?? [];
  const rules = mergeRules(modelRules, localRules);
  const modelRows = rowsFromModel(parsed.people, people, source);
  const localRows = local.rows ?? [];
  const rows = mergeRows(modelRows, localRows);
  const questions = Array.isArray(parsed.questions) ? parsed.questions.map((item) => cleanText(item, 240)).filter(Boolean).slice(0, 3) : [];

  if (parsed.changePodium && !explicitPodiumConfirm(source)) {
    parsed.changePodium = false;
  }

  if (!rules.length && !rows.length) {
    if (questions.length || parsed.status === 'needs_clarification') {
      return { kind: 'clarify', questions, reply: `${questions.join(' ') || 'Faltou indicador, valor ou período.'} Nada foi gravado e o pódio não mudou.` };
    }
    return fromLocal(local, source);
  }

  if (!period.ok && rules.length) {
    return { kind: 'clarify', questions: ['Diga se estas metas são da semana ou do mês, com o mês e o ano se for o caso.'], reply: 'Diga se estas metas são da semana ou do mês, com o mês e o ano se for o caso. Nada foi gravado e o pódio não mudou.' };
  }

  if (rows.some((row) => !row.userId && (row.ambiguous ?? []).length > 1)) {
    const names = rows.filter((row) => !row.userId).map((row) => row.sourceName || row.name).join(', ');
    return {
      ...buildGoalsReview({ source, rules, rows, period: period.period, periodKey: period.periodKey, periodLabel: period.periodLabel }),
      kind: 'review',
      questions: [`Há nomes sem cadastro único: ${names}. Confirme quem é cada um na Equipe.`],
    };
  }

  if (rules.length && !rows.length) {
    return buildGoalsReview({
      source,
      rules: rules.map((rule) => ({ ...rule, period: period.period })),
      rows: [],
      period: period.period,
      periodKey: period.periodKey,
      periodLabel: period.periodLabel,
    });
  }

  return buildGoalsReview({
    source,
    rules,
    rows,
    period: period.period,
    periodKey: period.periodKey,
    periodLabel: period.periodLabel,
  });
}
