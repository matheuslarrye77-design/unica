import { CHANNELS, looksLikeReport } from './goals.mjs';
import { classifyGeminiError, completeJson } from './gemini.mjs';

const INDICATORS = ['resolvidos', 'resolvidosCount', 'transferidos', 'primeira', 'resolucao'];
const OPS = ['gt', 'gte', 'lt', 'lte', 'eq', 'between'];
const NAMES = {
  resolvidos: 'tickets resolvidos (%)',
  resolvidosCount: 'quantidade de tickets resolvidos',
  primeira: 'primeira resposta (minutos)',
  resolucao: 'tempo médio de resolução (minutos)',
  transferidos: 'tickets transferidos',
};
const OPS_PT = { gt: 'maior que', gte: 'pelo menos', lt: 'menor que', lte: 'no máximo', eq: 'igual a', between: 'entre' };

export const CRITERIA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'explanation', 'questions', 'period', 'combine', 'subsetor', 'weights', 'criteria'],
  properties: {
    status: { type: 'string', enum: ['ready', 'needs_clarification'] },
    explanation: { type: 'string' },
    questions: { type: 'array', items: { type: 'string' } },
    period: { type: 'string', enum: ['week', 'month', ''] },
    combine: { type: 'string', enum: ['all', 'any', ''] },
    subsetor: { type: 'string', enum: ['', ...CHANNELS] },
    weights: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['resolvidos', 'primeira', 'resolucao'],
          properties: {
            resolvidos: { type: 'number' },
            primeira: { type: 'number' },
            resolucao: { type: 'number' },
          },
        },
      ],
    },
    criteria: {
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function accentPattern(value) {
  return escapeRegExp(String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()).replace(/[a-z]/g, (letter) => ({
    a: '[aáàâã]', e: '[eéê]', i: '[ií]', o: '[oóôõ]', u: '[uú]', c: '[cç]',
  })[letter] ?? letter);
}

function hidePeople(value, labels, max) {
  let text = scrub(value, max);
  const sorted = [...new Set((labels ?? []).map((item) => String(item ?? '').trim()).filter((item) => item.length >= 3))]
    .sort((a, b) => b.length - a.length);
  for (const label of sorted) {
    text = text.replace(new RegExp(`(^|[^\\p{L}\\p{N}])(?:${accentPattern(label)})(?=$|[^\\p{L}\\p{N}])`, 'igu'), '$1 ');
  }
  return cleanText(text, max);
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function describeCriteria(proposal) {
  const period = proposal.period === 'month' ? 'no mês' : proposal.period === 'week' ? 'na semana' : 'no período de cada condição';
  const lines = proposal.rules.map((rule) => {
    const when = rule.period === 'month' ? 'no mês' : rule.period === 'week' ? 'na semana' : period;
    const name = NAMES[rule.indicator] ?? rule.indicator;
    const text = rule.op === 'between'
      ? `${name} entre ${rule.value} e ${rule.valueTo} ${when}`
      : `${name} ${OPS_PT[rule.op] ?? rule.op} ${rule.value} ${when}`;
    return text;
  });
  const join = proposal.combine === 'any' ? 'Basta uma destas condições' : 'Todas estas condições são obrigatórias';
  const where = proposal.subsetor ? ` Subsetor: ${proposal.subsetor}, vindo do cadastro da Equipe.` : '';
  const weights = proposal.weights
    ? ` Pesos só para ordenar quem passar: produtividade ${proposal.weights.resolvidos}%, primeira resposta ${proposal.weights.primeira}%, resolução ${proposal.weights.resolucao}%.`
    : '';
  return `${join}: ${lines.join('; ')}.${where}${weights} Nada foi aplicado ao pódio.`;
}

export function normalizeProposal(raw) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, kind: 'clarify', questions: ['Não consegui ler a interpretação. Pode repetir o pedido com o indicador, o número e se ele deve ser maior ou menor?'], reply: 'Não consegui ler a interpretação. Pode repetir o pedido com o indicador, o número e se ele deve ser maior ou menor? Nada foi aplicado.' };
  }
  const questions = Array.isArray(parsed.questions) ? parsed.questions.map((item) => cleanText(item, 240)).filter(Boolean).slice(0, 3) : [];
  const explanation = cleanText(parsed.explanation, 500);
  const status = parsed.status === 'ready' ? 'ready' : 'needs_clarification';
  const topPeriod = parsed.period === 'month' || parsed.period === 'week' ? parsed.period : '';
  const combine = parsed.combine === 'any' ? 'any' : 'all';
  const subsetor = CHANNELS.includes(parsed.subsetor) ? parsed.subsetor : '';
  let weights = null;
  if (parsed.weights && typeof parsed.weights === 'object') {
    const resolvidos = finite(parsed.weights.resolvidos);
    const primeira = finite(parsed.weights.primeira);
    const resolucao = finite(parsed.weights.resolucao);
    if ([resolvidos, primeira, resolucao].every((value) => value !== null && value >= 0 && value <= 100) && resolvidos + primeira + resolucao === 100) {
      weights = { resolvidos, primeira, resolucao };
    } else {
      questions.push('Quais pesos, em porcentagem, devo usar para produtividade, primeira resposta e tempo de resolução? A soma precisa ser 100.');
    }
  }
  const rules = [];
  const broken = [];
  for (const item of Array.isArray(parsed.criteria) ? parsed.criteria.slice(0, 6) : []) {
    const indicator = INDICATORS.includes(item?.indicator) ? item.indicator : '';
    const op = OPS.includes(item?.op) ? item.op : '';
    const value = finite(item?.value);
    const valueTo = finite(item?.valueTo);
    const period = item?.period === 'month' || item?.period === 'week' ? item.period : topPeriod;
    if (!indicator || !op || value === null || !period || (op === 'between' && valueTo === null)) {
      broken.push(item);
      continue;
    }
    rules.push({ indicator, op, value, ...(op === 'between' ? { valueTo } : {}), period });
  }
  const periods = [...new Set(rules.map((rule) => rule.period))];
  const period = periods.length === 1 ? periods[0] : periods.length > 1 ? 'mixed' : topPeriod;
  const missing = status !== 'ready' || rules.length === 0 || broken.length > 0 || questions.length > 0 || !period;
  if (missing) {
    const ask = questions.length
      ? questions
      : ['Faltou algum dado para a regra valer. Qual indicador, número, comparação (maior, menor ou entre) e período (semana ou mês)?'];
    return { ok: false, kind: 'clarify', questions: ask, explanation, reply: `${ask.join(' ')} Nada foi aplicado ao pódio.` };
  }
  const proposal = { ok: true, kind: 'proposal', explanation, questions: [], period, combine, subsetor, weights, rules };
  const summary = describeCriteria(proposal);
  proposal.reply = explanation ? `${explanation} ${summary}` : summary;
  return proposal;
}

export function criteriaPrompt(text, history = [], labels = []) {
  const prior = history
    .map((item) => (typeof item === 'string' ? item : item?.text))
    .filter((item) => item && !looksLikeReport(item))
    .slice(-6)
    .map((item) => hidePeople(item, labels, 400))
    .filter(Boolean)
    .join('\n')
    .slice(0, 1500);
  return [
    'Interprete um pedido de pódio escrito por uma liderança de atendimento, em português.',
    'Não invente número, indicador, comparador, período, peso ou subsetor.',
    'Se faltar qualquer um desses dados, use status needs_clarification e faça uma pergunta curta.',
    'Indicadores: resolvidos (percentual), resolvidosCount (quantidade de tickets), transferidos (quantidade), primeira (minutos da primeira resposta), resolucao (minutos do tempo médio).',
    'Comparadores: gt, gte, lt, lte, eq, between.',
    'Período de cada condição: week ou month.',
    'combine all quando todas as condições são obrigatórias; any quando basta uma.',
    'Subsetor só pode ser Chat, E-mail, Ligação, Atendimento ou vazio. Não cite nomes de pessoas.',
    'Pesos só se a liderança pedir, e apenas resolvidos, primeira e resolucao, somando 100. Caso contrário weights null.',
    prior ? `Conversa anterior:\n${prior}` : '',
    `Pedido atual:\n${hidePeople(text, labels, 2000)}`,
  ].filter(Boolean).join('\n');
}

function failure(kind) {
  const kept = 'Nada foi alterado. O texto que você escreveu continua no campo.';
  if (kind === 'quota') return { ok: false, kind: 'quota', reply: `O limite gratuito da IA foi atingido agora. ${kept}` };
  if (kind === 'auth') return { ok: false, kind: 'auth', reply: `A chave da IA foi recusada pelo Google. ${kept}` };
  if (kind === 'permission') return { ok: false, kind: 'permission', reply: `O Google recusou a permissão desta chave. ${kept}` };
  if (kind === 'model') return { ok: false, kind: 'model', reply: `O modelo gratuito configurado não existe para esta chave. ${kept}` };
  if (kind === 'invalid') return { ok: false, kind: 'invalid', reply: `O Google recusou o formato do pedido. ${kept}` };
  if (kind === 'unconfigured') return { ok: false, kind: 'unavailable', reply: `A inteligência artificial não está disponível com um modelo gratuito agora. ${kept}` };
  return { ok: false, kind: 'unavailable', reply: `A IA não respondeu. ${kept}` };
}

export async function interpretCriteria(text, options = {}) {
  const source = cleanText(text, 2000);
  if (!source) return { ok: false, kind: 'clarify', questions: ['Escreva o pedido do pódio.'], reply: 'Escreva o pedido do pódio. Nada foi aplicado.' };
  if (looksLikeReport(source)) {
    return { ok: false, kind: 'clarify', questions: ['Descreva a regra sem colar o relatório.'], reply: 'Esse texto parece um relatório. Ele fica só na conferência e não vai para a IA. Descreva a regra do pódio sem colar resultados. Nada foi aplicado.' };
  }
  const history = options.history ?? [];
  const prompt = criteriaPrompt(source, history, options.labels ?? []);
  let generated;
  try {
    generated = options.generate
      ? await options.generate(prompt)
      : await completeJson(prompt, { schema: CRITERIA_SCHEMA, env: options.env });
  } catch (error) {
    return failure(classifyGeminiError(error));
  }
  if (generated?.error) return failure(generated.error);
  return normalizeProposal(generated?.text ?? generated);
}

export function commitTemplate(store, proposal, { name, confirm, description }) {
  if (!proposal?.ok || !Array.isArray(proposal.rules) || proposal.rules.length === 0) return { saved: false, error: 'invalid' };
  if (!confirm) return { saved: false, proposal };
  const template = {
    id: `modelo-${Date.now()}`,
    name: cleanText(name, 80) || 'Pódio personalizado',
    description: cleanText(description || proposal.explanation, 500),
    period: proposal.period === 'month' || proposal.period === 'mixed' ? proposal.period : 'week',
    combine: proposal.combine === 'any' ? 'any' : 'all',
    subsetor: CHANNELS.includes(proposal.subsetor) ? proposal.subsetor : '',
    weights: proposal.weights ?? null,
    rules: proposal.rules,
  };
  return { saved: true, template, store: { ...store, templates: [...store.templates, template] } };
}
