import { createHash } from 'node:crypto';

export const CHANNELS = ['Chat', 'E-mail', 'Ligação', 'Atendimento'];
export const INDICATORS = ['resolvidos', 'transferidos', 'primeira', 'resolucao'];

const DEFAULT_WEIGHTS = { resolvidos: 40, primeira: 25, resolucao: 35, floor: 70 };
const DEFAULT_TIE = ['resolvidos', 'primeira', 'resolucao'];

export function defaultCriterion() {
  return { mode: 'preset', indicator: 'resolvidos', templateId: '' };
}

export function emptyStore() {
  return {
    version: 1,
    aliases: {},
    weights: { ...DEFAULT_WEIGHTS },
    tieBreak: [...DEFAULT_TIE],
    templates: [],
    imports: [],
    criterion: defaultCriterion(),
  };
}

export function readCriterion(value) {
  const mode = value?.mode === 'custom' || value?.mode === 'overall' ? value.mode : 'preset';
  const indicator = INDICATORS.includes(value?.indicator) ? value.indicator : 'resolvidos';
  return { mode, indicator, templateId: String(value?.templateId ?? '') };
}

export function applyCriterion(store, value, periodKey) {
  const criterion = readCriterion(value);
  const target = periodKey || latestPeriod(store);
  return {
    ...store,
    criterion,
    imports: store.imports.map((item) => item.periodKey === target ? { ...item, display: criterion } : item),
  };
}

export function subsetorOf(person) {
  if (CHANNELS.includes(person.funcao)) return person.funcao;
  if (CHANNELS.includes(person.role)) return person.role;
  return '';
}

function fold(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordsInOrder(query, name) {
  const wanted = fold(query).split(' ').filter(Boolean);
  const owned = fold(name).split(' ').filter(Boolean);
  if (wanted.length === 0 || wanted.length > owned.length) return false;
  let cursor = 0;
  for (const word of wanted) {
    const found = owned.findIndex((item, index) => index >= cursor && item === word);
    if (found < 0) return false;
    cursor = found + 1;
  }
  return true;
}

export function matchPeople(query, people) {
  const text = fold(query);
  if (!text) return [];
  const exact = people.filter((person) => fold(person.name) === text || (person.aliases ?? []).some((alias) => fold(alias) === text));
  if (exact.length > 0) return exact;
  return people.filter((person) => wordsInOrder(text, person.name) || (person.aliases ?? []).some((alias) => wordsInOrder(text, alias)));
}

function numberFrom(raw) {
  const text = String(raw ?? '').trim().replace(/\s/g, '').replace('%', '');
  if (!text) return null;
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function readToken(part) {
  const text = String(part ?? '').trim();
  if (!text) return null;
  const percent = text.match(/([\d.,]+)\s*%/);
  const minutes = text.match(/([\d.,]+)\s*min/i);
  const leading = text.match(/^([\d.,]+)/);
  if (leading && percent) {
    const count = numberFrom(leading[1]);
    const percentValue = numberFrom(percent[1]);
    return count === percentValue ? { percent: percentValue } : { count, percent: percentValue };
  }
  if (percent) return { percent: numberFrom(percent[1]) };
  if (minutes) return { minutes: numberFrom(minutes[1]) };
  if (leading && /^[\d.,]+$/.test(text.replace(/\s/g, ''))) return { count: numberFrom(leading[1]) };
  return null;
}

function metricOf(line) {
  const text = fold(line);
  if (/tickets?\s+resolvid/.test(text)) return 'resolvidos';
  if (/tickets?\s+transferid/.test(text)) return 'transferidos';
  if (/primeira\s+resposta/.test(text)) return 'primeira';
  if (/tempo\s+medio|ate\s+resolu|media\s+ate\s+resolu/.test(text)) return 'resolucao';
  return '';
}

function channelOf(line) {
  const text = fold(line).replace(/:$/, '');
  if (text === 'chat') return 'Chat';
  if (text === 'e mail' || text === 'email') return 'E-mail';
  if (text === 'ligacao') return 'Ligação';
  if (text === 'atendimento') return 'Atendimento';
  return '';
}

function blankGoal() {
  return {
    resolvidos: null,
    transferidos: null,
    primeira: null,
    resolucao: null,
    transferidosMode: 'info',
  };
}

function copyGoal(goal) {
  return { ...blankGoal(), ...goal };
}

function readTarget(metric, line) {
  const meta = line.split('|').slice(1).join('|') || line;
  const lower = /<=|até|ate|maximo|máximo|no maximo|no máximo/.test(fold(meta));
  const higher = /minimo|mínimo|maior/.test(fold(meta));
  const percent = meta.match(/([\d.,]+)\s*%/);
  const minutes = meta.match(/([\d.,]+)\s*min/i);
  if (metric === 'resolvidos') {
    const value = percent ? numberFrom(percent[1]) : null;
    return value === null ? null : { target: value, direction: 'higher', unit: 'percent' };
  }
  if (metric === 'primeira' || metric === 'resolucao') {
    const value = minutes ? numberFrom(minutes[1]) : numberFrom((meta.match(/([\d.,]+)/) ?? [])[1]);
    return value === null ? null : { target: value, direction: 'lower', unit: 'minutes' };
  }
  if (metric === 'transferidos') {
    const competitive = lower || higher || /meta/.test(fold(line));
    const value = numberFrom((meta.match(/([\d.,]+)/) ?? [])[1]);
    if (!competitive || value === null || /informativ/.test(fold(line))) return { target: null, direction: 'info', unit: 'count' };
    return { target: value, direction: lower ? 'lower' : 'higher', unit: 'count' };
  }
  return null;
}

function applyMetric(goal, metric, token, target) {
  if (!token) return;
  if (metric === 'resolvidos') {
    if (token.percent !== undefined) goal.resolvidos = { ...(goal.resolvidos ?? {}), value: token.percent, count: token.count ?? goal.resolvidos?.count ?? null };
    else if (token.count !== undefined) goal.resolvidos = { ...(goal.resolvidos ?? {}), count: token.count, value: goal.resolvidos?.value ?? null };
  } else if (metric === 'transferidos' && token.count !== undefined) {
    goal.transferidos = { value: token.count };
  } else if ((metric === 'primeira' || metric === 'resolucao') && token.minutes !== undefined) {
    goal[metric] = { value: token.minutes };
  }
  if (target) goal.targets = { ...(goal.targets ?? {}), [metric]: target };
}

function personFromGreeting(line) {
  const match = line.match(/ol[áa]\s*,\s*([^!?.\n]+)/i);
  return match ? match[1].trim() : '';
}

function isoWeekParts(date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: utc.getUTCFullYear(), week };
}

export function isoWeekKey(date) {
  const parts = isoWeekParts(date);
  return `${parts.year}-W${String(parts.week).padStart(2, '0')}`;
}

export function weekRange(key) {
  const match = /^(\d{4})-W(\d{2})$/.exec(key ?? '');
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const january = new Date(Date.UTC(year, 0, 1));
  const day = january.getUTCDay() || 7;
  const monday = new Date(january);
  const offsetToWeek1Monday = day <= 4 ? 1 - day : 8 - day;
  monday.setUTCDate(january.getUTCDate() + offsetToWeek1Monday + (week - 1) * 7);
  const end = new Date(monday);
  end.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday, end };
}

export function weekLabel(key) {
  const range = weekRange(key);
  if (!range) return key || '';
  const format = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).replace('.', '');
  return `${format(range.start)} – ${format(range.end)}`;
}

function periodFromText(text) {
  const dates = [...text.matchAll(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g)].map((match) => {
    const year = match[3] ? Number(match[3].length === 2 ? `20${match[3]}` : match[3]) : new Date().getFullYear();
    return new Date(year, Number(match[2]) - 1, Number(match[1]));
  }).filter((date) => !Number.isNaN(date.getTime()));
  if (dates.length === 0) return '';
  return isoWeekKey(dates[0]);
}

function fingerprint(text) {
  return createHash('sha256').update(fold(text)).digest('hex');
}

function pushValue(bag, metric, token) {
  if (!token) return;
  if (metric === 'resolvidos') {
    bag.resolvidos = token.percent ?? bag.resolvidos ?? null;
    bag.resolvidosCount = token.count ?? bag.resolvidosCount ?? null;
  } else if (metric === 'transferidos') bag.transferidos = token.count ?? bag.transferidos ?? null;
  else if (metric === 'primeira' && token.minutes !== undefined) bag.primeira = token.minutes;
  else if (metric === 'resolucao' && token.minutes !== undefined) bag.resolucao = token.minutes;
}

function splitValues(text) {
  const parts = [];
  let current = '';
  const source = String(text);
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === ',' && /\d/.test(source[index - 1] ?? '') && /\d/.test(source[index + 1] ?? '')) {
      current += char;
      continue;
    }
    if (char === ',') {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function assignLoose(values, parts) {
  const minutes = [];
  for (const part of parts) {
    const token = readToken(part);
    if (!token) continue;
    if (token.percent !== undefined) {
      values.resolvidos = token.percent;
      if (token.count !== undefined) values.resolvidosCount = token.count;
    } else if (token.minutes !== undefined) minutes.push(token.minutes);
    else if (token.count !== undefined && values.transferidos === undefined) values.transferidos = token.count;
  }
  if (minutes[0] !== undefined) values.primeira = minutes[0];
  if (minutes[1] !== undefined) values.resolucao = minutes[1];
}

export function parseReport(text, people) {
  const lines = String(text ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const goals = { '*': blankGoal() };
  let channel = '*';
  let currentName = '';
  const found = new Map();
  const warnings = [];
  let sawGoal = false;

  function ensure(name) {
    const key = fold(name);
    if (!found.has(key)) found.set(key, { name, values: {} });
    return found.get(key);
  }

  for (const line of lines) {
    const header = channelOf(line.replace(/^[#*\-•]\s*/, ''));
    if (header && line.length < 24) {
      channel = header;
      goals[channel] = goals[channel] ?? blankGoal();
      continue;
    }
    const greeting = personFromGreeting(line);
    if (greeting) {
      currentName = greeting;
      ensure(greeting);
      continue;
    }
    const metric = metricOf(line);
    if (metric) {
      const main = line.split('|')[0];
      const token = readToken(main.split(':').slice(1).join(':'));
      const target = readTarget(metric, line);
      const bucket = currentName ? ensure(currentName) : null;
      if (bucket) {
        pushValue(bucket.values, metric, token);
        if (target) bucket.ownTargets = { ...(bucket.ownTargets ?? {}), [metric]: target };
      } else if (target) {
        sawGoal = true;
        const goal = goals[channel] ?? blankGoal();
        goal[metric] = target.target === null && metric === 'transferidos' ? goal[metric] : target;
        if (metric === 'transferidos') goal.transferidosMode = target.direction === 'info' ? 'info' : target.direction;
        if (metric === 'transferidos' && target.direction === 'info') goal.transferidos = { target: null, direction: 'info', unit: 'count' };
        goals[channel] = goal;
      }
      continue;
    }
    const named = line.replace(/^[*•\-]\s*/, '').match(/^([^:]{2,80}):\s*(.+)$/);
    if (!named || metricOf(named[1])) continue;
    const label = named[1].trim();
    if (/^metas?\b|^resultados?\b/i.test(label)) continue;
    const entry = ensure(label);
    assignLoose(entry.values, splitValues(named[2]));
    currentName = label;
  }

  if (!sawGoal) {
    for (const entry of found.values()) {
      if (!entry.ownTargets) continue;
      const goal = goals['*'];
      for (const metric of INDICATORS) {
        if (entry.ownTargets[metric] && !goal[metric]) goal[metric] = entry.ownTargets[metric];
      }
    }
  }

  const rows = [...found.values()].map((entry) => {
    const matches = matchPeople(entry.name, people);
    const person = matches.length === 1 ? matches[0] : null;
    const subsetor = person ? subsetorOf(person) : '';
    const goal = copyGoal(goals[subsetor] ?? goals['*']);
    for (const metric of INDICATORS) {
      if (entry.ownTargets?.[metric]) goal[metric] = entry.ownTargets[metric];
    }
    if (goal.transferidos?.direction) goal.transferidosMode = goal.transferidos.direction;
    return {
      sourceName: entry.name,
      userId: person?.id ?? '',
      name: person?.name ?? '',
      subsetor,
      ambiguous: matches.length > 1 ? matches.map((item) => ({ id: item.id, name: item.name, subsetor: subsetorOf(item) })) : [],
      values: {
        resolvidos: entry.values.resolvidos ?? null,
        resolvidosCount: entry.values.resolvidosCount ?? null,
        transferidos: entry.values.transferidos ?? null,
        primeira: entry.values.primeira ?? null,
        resolucao: entry.values.resolucao ?? null,
      },
      goal,
    };
  });

  if (rows.length === 0) warnings.push('Nenhum colaborador foi identificado no texto.');
  if (rows.some((row) => !row.userId && row.ambiguous.length === 0)) warnings.push('Há nomes que não foram encontrados na equipe.');
  if (rows.some((row) => row.ambiguous.length > 0)) warnings.push('Há nomes parecidos. Escolha o colaborador certo.');
  if (rows.some((row) => row.userId && !row.subsetor)) warnings.push('Há colaboradores sem subsetor de atendimento.');

  return {
    periodKey: periodFromText(text),
    goals,
    rows,
    warnings,
  };
}

export function fulfillment(metric, value, target) {
  if (value === null || value === undefined || target === null || target === undefined || target === 0) return null;
  if (metric === 'resolvidos') return Math.min(100, (value / target) * 100);
  if (metric === 'primeira' || metric === 'resolucao') return Math.min(100, (target / value) * 100);
  return null;
}

export function goalState(metric, value, goal) {
  const rule = goal?.[metric];
  if (!rule || rule.direction === 'info' || rule.target === null || rule.target === undefined) {
    return value === null || value === undefined ? 'pending' : 'info';
  }
  if (value === null || value === undefined) return 'pending';
  const met = rule.direction === 'lower' ? value <= rule.target : value >= rule.target;
  return met ? 'met' : 'miss';
}

export function overallScore(values, goal, weights = DEFAULT_WEIGHTS) {
  const parts = ['resolvidos', 'primeira', 'resolucao'].map((metric) => {
    const target = goal?.[metric]?.target;
    const score = fulfillment(metric, values[metric], target);
    return score === null ? null : { metric, score, weight: weights[metric] ?? 0 };
  });
  if (parts.some((part) => !part)) return null;
  const weight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (weight !== 100) return null;
  const weighted = parts.reduce((sum, part) => sum + (part.score * part.weight) / 100, 0);
  const floor = weights.floor ?? 70;
  const worst = Math.min(...parts.map((part) => part.score));
  return Math.round((worst < floor ? Math.min(weighted, worst) : weighted) * 10) / 10;
}

function compareMetric(metric, left, right, goal) {
  const direction = goal?.[metric]?.direction === 'lower' || metric === 'primeira' || metric === 'resolucao' ? 'lower' : 'higher';
  const a = left.values[metric];
  const b = right.values[metric];
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  return direction === 'lower' ? a - b : b - a;
}

export function rankRows(rows, options) {
  const tie = [...(options.tieBreak ?? DEFAULT_TIE), 'name'];
  const scored = rows.map((row) => ({
    ...row,
    overall: overallScore(row.values, row.goal, options.weights),
  }));
  const eligible = options.mode === 'overall'
    ? scored.filter((row) => row.overall !== null && row.userId)
    : scored.filter((row) => row.userId && row.values[options.indicator] !== null && row.values[options.indicator] !== undefined && (options.indicator !== 'transferidos' || row.goal.transferidosMode !== 'info'));
  eligible.sort((left, right) => {
    if (options.mode === 'overall' && left.overall !== right.overall) return right.overall - left.overall;
    if (options.mode === 'preset') {
      const diff = compareMetric(options.indicator, left, right, left.goal);
      if (diff !== 0) return diff;
    }
    for (const metric of tie) {
      if (metric === 'name') return fold(left.name).localeCompare(fold(right.name), 'pt');
      const diff = compareMetric(metric, left, right, left.goal);
      if (diff !== 0) return diff;
    }
    return 0;
  });
  return eligible.map((row, index) => ({ ...row, place: index + 1 }));
}

export function passesRules(values, rules) {
  return rules.every((rule) => {
    const value = rule.indicator === 'resolvidosCount' ? values.resolvidosCount : values[rule.indicator];
    if (value === null || value === undefined) return false;
    if (rule.op === 'gt') return value > rule.value;
    if (rule.op === 'gte') return value >= rule.value;
    if (rule.op === 'lt') return value < rule.value;
    if (rule.op === 'lte') return value <= rule.value;
    if (rule.op === 'eq') return value === rule.value;
    if (rule.op === 'between') return value >= rule.value && value <= rule.valueTo;
    return false;
  });
}

export function parseCustomRequest(text) {
  const source = String(text ?? '').trim();
  const rules = [];
  const patterns = [
    { indicator: 'resolvidosCount', re: /(\d[\d.]*)\s+tickets/i, monthly: /m[eê]s|mensal/i },
    { indicator: 'resolvidos', re: /tickets?\s+resolvid[^\d%]{0,40}([\d.,]+)\s*%/i },
    { indicator: 'primeira', re: /primeira\s+resposta[^\d]{0,40}([\d.,]+)\s*min/i },
    { indicator: 'resolucao', re: /resolu[cç][aã]o[^\d]{0,40}([\d.,]+)\s*min/i },
    { indicator: 'transferidos', re: /transferid[^\d]{0,40}([\d.,]+)/i },
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern.re);
    if (!match) continue;
    const around = source.slice(Math.max(0, match.index - 40), match.index + match[0].length + 40);
    const folded = fold(around);
    let op = 'gte';
    if (/abaixo|menor|no maximo|até|ate/.test(folded)) op = 'lte';
    else if (/acima|maior|pelo menos|no minimo|mínimo|minimo/.test(folded)) op = 'gte';
    else if (/igual/.test(folded)) op = 'eq';
    const between = around.match(/entre\s+([\d.,]+)\s+e\s+([\d.,]+)/i);
    if (between) {
      rules.push({ indicator: pattern.indicator, op: 'between', value: numberFrom(between[1]), valueTo: numberFrom(between[2]) });
    } else {
      rules.push({ indicator: pattern.indicator, op, value: numberFrom(match[1]) });
    }
  }
  const period = /m[eê]s|mensal/i.test(source) ? 'month' : 'week';
  if (rules.length === 0 || rules.some((rule) => rule.value === null)) {
    return { ok: false, message: 'Não consegui transformar esse pedido em regras. Diga o indicador, o número e se ele deve ser maior ou menor.' };
  }
  return { ok: true, period, rules };
}

export function aggregateMonth(imports, monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const chosen = imports.filter((item) => {
    const range = weekRange(item.periodKey);
    return range && range.start.getUTCFullYear() === year && range.start.getUTCMonth() + 1 === month;
  });
  const byUser = new Map();
  for (const item of chosen) {
    for (const row of item.rows) {
      if (!row.userId) continue;
      const current = byUser.get(row.userId) ?? { ...row, samples: { resolvidos: [], resolvidosCount: [], transferidos: [], primeira: [], resolucao: [] }, goal: row.goal };
      for (const metric of ['resolvidos', 'resolvidosCount', 'transferidos', 'primeira', 'resolucao']) {
        if (row.values[metric] !== null && row.values[metric] !== undefined) current.samples[metric].push(row.values[metric]);
      }
      current.goal = row.goal;
      current.name = row.name;
      current.subsetor = row.subsetor;
      byUser.set(row.userId, current);
    }
  }
  return [...byUser.values()].map((row) => {
    const average = (list) => list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null;
    const sum = (list) => list.length ? list.reduce((total, value) => total + value, 0) : null;
    return {
      userId: row.userId,
      name: row.name,
      subsetor: row.subsetor,
      goal: row.goal,
      values: {
        resolvidos: average(row.samples.resolvidos),
        resolvidosCount: sum(row.samples.resolvidosCount),
        transferidos: sum(row.samples.transferidos),
        primeira: average(row.samples.primeira),
        resolucao: average(row.samples.resolucao),
      },
    };
  });
}

function materialGoals(parsed) {
  const used = new Map();
  for (const row of parsed.rows) {
    if (!row.subsetor) continue;
    used.set(row.subsetor, row.goal);
  }
  return [...used.entries()].map(([subsetor, goal]) => ({ subsetor, goal }));
}

export function buildApproval(store, payload, people, actor) {
  const parsed = parseReport(payload.text, people.map((person) => ({
    ...person,
    aliases: [...(person.aliases ?? []), ...(store.aliases[person.id] ?? [])],
  })));
  const periodKey = payload.periodKey || parsed.periodKey;
  if (!String(payload.text ?? '').trim() || parsed.rows.length === 0) return { error: 'review' };
  if (!periodKey) return { error: 'period' };
  const corrections = new Map((payload.rows ?? []).map((row) => [fold(row.sourceName), row]));
  const rows = parsed.rows.map((row) => {
    const correction = corrections.get(fold(row.sourceName));
    const userId = correction?.userId || row.userId;
    const person = people.find((item) => item.id === userId);
    if (!person) return { ...row, userId: '' };
    const values = { ...row.values, ...(correction?.values ?? {}) };
    return {
      ...row,
      userId: person.id,
      name: person.name,
      subsetor: subsetorOf(person),
      ambiguous: [],
      values,
      goal: row.goal,
    };
  });
  if (rows.some((row) => !row.userId || !row.subsetor)) return { error: 'review' };
  if (rows.some((row) => ['resolvidos', 'primeira', 'resolucao'].some((metric) => row.values[metric] === null || row.values[metric] === undefined))) {
    return { error: 'review' };
  }
  const hash = fingerprint(payload.text);
  const sameText = store.imports.find((item) => item.fingerprint === hash);
  if (sameText && !(payload.replace && sameText.periodKey === periodKey)) return { error: 'duplicate' };
  const samePeriod = store.imports.find((item) => item.periodKey === periodKey);
  if (samePeriod && !payload.replace) return { error: 'period' };
  const approvedAt = payload.approvedAt || new Date().toISOString();
  const record = {
    id: samePeriod?.id ?? `meta-${Date.now()}`,
    periodKey,
    fingerprint: hash,
    text: String(payload.text),
    goals: materialGoals({ rows }),
    rows: rows.map((row) => ({
      userId: row.userId,
      name: row.name,
      subsetor: row.subsetor,
      values: row.values,
      goal: row.goal,
    })),
    display: payload.display ?? store.criterion ?? defaultCriterion(),
    weights: { ...store.weights },
    tieBreak: [...store.tieBreak],
    approvedBy: actor?.name ?? '',
    approvedById: actor?.id ?? '',
    approvedAt,
  };
  const imports = samePeriod
    ? store.imports.map((item) => item.periodKey === periodKey ? record : item)
    : [...store.imports, record];
  return { store: { ...store, imports }, record };
}

export function latestPeriod(store) {
  return [...store.imports].filter((item) => item.rows?.length).sort((left, right) => right.periodKey.localeCompare(left.periodKey))[0]?.periodKey ?? '';
}

export function podiumFor(store, periodKey, display, people) {
  const item = store.imports.find((entry) => entry.periodKey === periodKey);
  if (!item) return [];
  const mode = display?.mode ?? item.display?.mode ?? 'overall';
  if (mode === 'custom') {
    const template = store.templates.find((entry) => entry.id === display?.templateId);
    if (!template) return [];
    const range = weekRange(periodKey);
    const monthKey = display?.month || (range ? `${range.start.getUTCFullYear()}-${String(range.start.getUTCMonth() + 1).padStart(2, '0')}` : '');
    const source = template.period === 'month'
      ? aggregateMonth(store.imports, monthKey)
      : item.rows;
    const rule = template.rules[0];
    const lower = rule && (rule.op === 'lt' || rule.op === 'lte');
    const metric = rule?.indicator === 'resolvidosCount' ? 'resolvidosCount' : rule?.indicator;
    return source.filter((row) => passesRules(row.values, template.rules)).sort((left, right) => {
      if (!metric) return 0;
      const a = left.values[metric];
      const b = right.values[metric];
      if (a === null || a === undefined) return 1;
      if (b === null || b === undefined) return -1;
      return lower ? a - b : b - a;
    }).map((row, index) => ({ ...row, place: index + 1 }));
  }
  return rankRows(item.rows, {
    mode: mode === 'preset' ? 'preset' : 'overall',
    indicator: display?.indicator ?? item.display?.indicator ?? 'resolvidos',
    weights: item.weights ?? store.weights,
    tieBreak: item.tieBreak ?? store.tieBreak,
  });
}

export function publicStore(store) {
  const criterion = readCriterion(store.criterion);
  return {
    weights: store.weights,
    tieBreak: store.tieBreak,
    aliases: store.aliases,
    templates: store.templates,
    criterion,
    currentKey: latestPeriod(store),
    imports: store.imports.map((item) => ({
      id: item.id,
      periodKey: item.periodKey,
      label: weekLabel(item.periodKey),
      goals: item.goals,
      rows: item.rows.map((row) => ({
        ...row,
        overall: overallScore(row.values, row.goal, item.weights ?? store.weights),
        states: Object.fromEntries(INDICATORS.map((metric) => [metric, goalState(metric, row.values[metric], row.goal)])),
      })),
      display: item.display,
      ranking: podiumFor(store, item.periodKey, item.display ?? criterion).slice(0, 3),
      approvedBy: item.approvedBy,
      approvedAt: item.approvedAt,
    })),
  };
}

export function looksLikeReport(text) {
  const folded = fold(text);
  const hasMetric = /tickets?\s+resolvid|tickets?\s+transferid|primeira\s+resposta|tempo medio|ate resolu/.test(folded);
  const hasPeople = /ola |olá |resultados:|metas da semana|:/.test(folded);
  return hasMetric && (hasPeople || /%/.test(text) || /min/.test(folded));
}

function assistantPreview(store, text, people) {
  const parsed = parseReport(text, people);
  return {
    periodKey: parsed.periodKey,
    warnings: parsed.warnings,
    rows: parsed.rows.map((row) => ({
      ...row,
      states: Object.fromEntries(INDICATORS.map((metric) => [metric, goalState(metric, row.values[metric], row.goal)])),
      overall: row.userId ? overallScore(row.values, row.goal, store.weights) : null,
    })),
  };
}

function currentImport(store, periodKey) {
  return store.imports.find((item) => item.periodKey === periodKey) ?? store.imports.find((item) => item.periodKey === latestPeriod(store));
}

function describeRules(rules, period) {
  const ops = { gt: 'maior que', gte: 'maior ou igual a', lt: 'menor que', lte: 'menor ou igual a', eq: 'igual a', between: 'entre' };
  const names = { resolvidos: 'tickets resolvidos (%)', resolvidosCount: 'tickets resolvidos', primeira: 'primeira resposta', resolucao: 'tempo médio de resolução', transferidos: 'tickets transferidos' };
  const lines = rules.map((rule) => rule.op === 'between'
    ? `${names[rule.indicator] ?? rule.indicator} entre ${rule.value} e ${rule.valueTo}`
    : `${names[rule.indicator] ?? rule.indicator} ${ops[rule.op] ?? rule.op} ${rule.value}`);
  return `${period === 'month' ? 'Período mensal' : 'Período semanal'}. ${lines.join('; ')}.`;
}

export function runAssistant({ text, store, people, preview, periodKey }) {
  const source = String(text ?? '').trim();
  if (!source) return { kind: 'ask', reply: 'Cole o relatório ou escreva o que precisa. Não invento números que não vieram no texto.' };

  const folded = fold(source);
  const item = currentImport(store, periodKey);
  const rows = preview?.rows ?? item?.rows ?? [];

  if (/^(aprovar|confirmar|salvar)( a | a importacao| importacao| os resultados| esta importacao)?$/.test(folded) || folded.includes('aprovar importacao') || folded.includes('confirmar importacao')) {
    if (!preview?.rows?.length) return { kind: 'ask', reply: 'Ainda não há conferência aberta. Cole o relatório primeiro.' };
    return { kind: 'approve', reply: 'Vou gravar estes resultados e atualizar o pódio desta semana. Semanas anteriores continuam como estão.' };
  }

  if (/^(cancelar|descartar)( a conferencia| conferencia| importacao)?$/.test(folded)) {
    return { kind: 'cancel', reply: 'Descartei a conferência. Nada foi salvo no histórico.' };
  }

  if (looksLikeReport(source)) {
    const next = assistantPreview(store, source, people);
    if (next.rows.length === 0) return { kind: 'ask', reply: 'Li o texto, mas não encontrei colaboradores cadastrados. Confira os nomes ou os nomes reconhecidos na Equipe.' };
    const pending = next.rows.filter((row) => !row.userId).length;
    const week = next.periodKey ? weekLabel(next.periodKey) : 'semana a confirmar';
    return {
      kind: 'preview',
      preview: next,
      reply: pending
        ? `Identifiquei ${next.rows.length} colaborador(es) para ${week}. ${pending} nome(s) precisam da sua escolha antes de aprovar.`
        : `Identifiquei ${next.rows.length} colaborador(es) para ${week}. Confira a tabela e escreva Aprovar para gravar.`,
    };
  }

  const goalMatch = folded.match(/meta de (primeira resposta|tempo medio(?: ate resolucao)?|tickets resolvidos)(?: do | da | de )?(chat|e mail|email|ligacao|atendimento)?[^\d]{0,24}(\d+(?:[.,]\d+)?)/);
  if (goalMatch) {
    if (!preview?.rows?.length) return { kind: 'ask', reply: 'Para mudar uma meta, cole primeiro o relatório da semana. Metas de semanas já aprovadas não são alteradas.' };
    const metric = goalMatch[1].includes('primeira') ? 'primeira' : goalMatch[1].includes('resolvid') ? 'resolvidos' : 'resolucao';
    const channel = channelOf(goalMatch[2] ?? '');
    const target = numberFrom(goalMatch[3]);
    return {
      kind: 'goal',
      metric,
      channel,
      target,
      reply: channel
        ? `Vou usar ${target}${metric === 'resolvidos' ? '%' : ' min'} como meta de ${metric} para ${channel} só nesta conferência.`
        : `Vou usar ${target}${metric === 'resolvidos' ? '%' : ' min'} como meta de ${metric} nesta conferência, sem mudar semanas anteriores.`,
    };
  }

  if (/podio|reconhecer os colaboradores|criterio personalizado|criar um podio/.test(folded) && !/predefinid|desempenho geral/.test(folded)) {
    const parsed = parseCustomRequest(source);
    if (!parsed.ok) return { kind: 'ask', reply: parsed.message };
    return { kind: 'custom', period: parsed.period, rules: parsed.rules, reply: `Entendi as regras: ${describeRules(parsed.rules, parsed.period)} Confirme com o nome do pódio para salvar o modelo.` };
  }

  if (/desempenho geral|melhor desempenho|pontuacao geral/.test(folded)) {
    if (!rows.length) return { kind: 'ask', reply: 'Ainda não há resultados aprovados nesta semana. Cole o relatório para eu calcular o desempenho geral.' };
    const ranking = rankRows(rows, { mode: 'overall', weights: item?.weights ?? store.weights, tieBreak: item?.tieBreak ?? store.tieBreak });
    if (!ranking.length) return { kind: 'ask', reply: 'Ninguém completou as três metas com valor. Não invento pontuação para indicador ausente.' };
    const top = ranking.slice(0, 3).map((row) => `${row.place}º ${row.name} (${row.overall})`).join('; ');
    return { kind: 'ranking', ranking, reply: `Desempenho geral: ${top}.` };
  }

  if (/atingiu todas|bateu todas as metas|quem atingiu/.test(folded)) {
    if (!rows.length) return { kind: 'ask', reply: 'Não há resultados para conferir. Cole o relatório da semana.' };
    const names = rows.filter((row) => ['resolvidos', 'primeira', 'resolucao'].every((metric) => goalState(metric, row.values[metric], row.goal) === 'met')).map((row) => row.name);
    return { kind: 'met', reply: names.length ? `Atingiram as três metas: ${names.join(', ')}.` : 'Ninguém atingiu as três metas nesta semana.' };
  }

  if (/metas atuais|ver metas|mostre as metas|quais sao as metas/.test(folded)) {
    const goals = (preview?.rows ?? item?.rows ?? []).reduce((list, row) => {
      if (!row.subsetor || list.some((entry) => entry.subsetor === row.subsetor)) return list;
      return [...list, { subsetor: row.subsetor, goal: row.goal }];
    }, []);
    if (!goals.length) return { kind: 'ask', reply: 'Ainda não há metas gravadas para a semana. Elas entram junto com o relatório aprovado.' };
    const lines = goals.map((entry) => `${entry.subsetor}: resolvidos ${entry.goal.resolvidos?.target ?? '—'}%, primeira ${entry.goal.primeira?.target ?? '—'} min, resolução ${entry.goal.resolucao?.target ?? '—'} min`);
    return { kind: 'goals', reply: `Metas desta semana: ${lines.join('. ')}.` };
  }

  if (/identific|colaborador(es)? (foi|foram) identificado/.test(folded)) {
    if (!preview?.rows?.length) return { kind: 'ask', reply: 'Cole o relatório para eu cruzar os nomes com a Equipe.' };
    const pending = preview.rows.filter((row) => !row.userId);
    return { kind: 'ids', reply: pending.length ? `Faltam ${pending.length} identificação(ões): ${pending.map((row) => row.sourceName).join(', ')}.` : 'Todos os nomes desta conferência estão ligados a um cadastro da Equipe.' };
  }

  if (/tickets resolvid|primeira resposta|tempo medio|transferid/.test(folded) && /podio|usar|criterio predefinid/.test(folded)) {
    const indicator = /transferid/.test(folded) ? 'transferidos' : /primeira/.test(folded) ? 'primeira' : /resolu/.test(folded) && !/resolvid/.test(folded) ? 'resolucao' : 'resolvidos';
    return { kind: 'criterion', criterion: { mode: 'preset', indicator, templateId: '' }, reply: `Vou usar ${indicator} como critério predefinido do pódio.` };
  }

  return { kind: 'ask', reply: 'Não identifiquei esse pedido. Cole um relatório, peça as metas atuais, o desempenho geral ou descreva um pódio personalizado com números.' };
}
