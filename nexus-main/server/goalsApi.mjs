import fs from 'node:fs';
import path from 'node:path';
import { isLeader } from './auth/permissions.mjs';
import { applyCriterion, buildApproval, emptyStore, goalState, INDICATORS, overallScore, parseCustomRequest, parseReport, publicStore, readCriterion, runAssistant } from './goals.mjs';

function readStore(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...emptyStore(), ...parsed, weights: { ...emptyStore().weights, ...(parsed.weights ?? {}) }, criterion: readCriterion(parsed.criterion) };
  } catch {
    return emptyStore();
  }
}

function writeStore(file, store) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store));
}

function directory(colleagues, aliases, teamRoster) {
  const extra = Array.isArray(colleagues) ? colleagues : [];
  const roster = [
    ...extra,
    ...teamRoster.filter((person) => !extra.some((item) => item.email === person.email || item.id === person.id)),
  ];
  return roster.map((person) => ({
    id: person.id,
    name: person.name,
    funcao: person.funcao,
    role: person.role,
    aliases: [...(person.reportNames ?? []), ...(aliases[person.id] ?? [])],
  }));
}

function preview(store, text, people) {
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

export async function handleGoals(req, res, user, dir, colleagues, teamRoster, send, readBody) {
  const url = req.url?.split('?')[0] ?? '';
  if (url !== '/api/goals' && !url.startsWith('/api/goals/')) return false;
  const file = path.join(dir, 'goals.json');
  const store = readStore(file);
  const people = directory(colleagues, store.aliases, teamRoster);
  if (req.method === 'GET' && url === '/api/goals') {
    send(res, 200, { ...publicStore(store), canManage: isLeader(user), people: people.map((person) => ({ id: person.id, name: person.name, funcao: person.funcao, role: person.role, aliases: store.aliases[person.id] ?? [] })) });
    return true;
  }
  if (!isLeader(user)) {
    send(res, 403, { error: 'forbidden' });
    return true;
  }
  const raw = await readBody(req);
  {
    let body = {};
    try { body = JSON.parse(raw.toString('utf8') || '{}'); } catch { body = {}; }
    if (req.method === 'POST' && url === '/api/goals/preview') {
      const text = String(body.text ?? '');
      if (!text.trim()) {
        send(res, 400, { error: 'text' });
        return true;
      }
      send(res, 200, preview(store, text, people));
      return true;
    }
    if (req.method === 'POST' && url === '/api/goals/approve') {
      const result = buildApproval(store, {
        text: String(body.text ?? ''),
        periodKey: String(body.periodKey ?? ''),
        rows: Array.isArray(body.rows) ? body.rows : [],
        replace: Boolean(body.replace),
        display: body.display,
      }, people, user);
      if (result.error) {
        send(res, 409, { error: result.error });
        return true;
      }
      writeStore(file, result.store);
      send(res, 200, publicStore(result.store));
      return true;
    }
    if (req.method === 'POST' && url === '/api/goals/display') {
      const item = store.imports.find((entry) => entry.periodKey === String(body.periodKey ?? ''));
      if (!item) {
        send(res, 404, { error: 'missing' });
        return true;
      }
      const criterion = readCriterion(body.display ?? body);
      item.display = criterion;
      const next = { ...store, criterion };
      writeStore(file, next);
      send(res, 200, publicStore(next));
      return true;
    }
    if (req.method === 'POST' && url === '/api/goals/criterion') {
      const next = applyCriterion(store, body, String(body.periodKey ?? ''));
      writeStore(file, next);
      send(res, 200, publicStore(next));
      return true;
    }
    if (req.method === 'POST' && url === '/api/goals/assistant') {
      const result = runAssistant({
        text: String(body.text ?? ''),
        store,
        people,
        preview: body.preview,
        periodKey: String(body.periodKey ?? ''),
        intent: String(body.intent ?? ''),
      });
      send(res, 200, result);
      return true;
    }
    if (req.method === 'PUT' && url === '/api/goals/settings') {
      const weights = body.weights ?? store.weights;
      const resolvidos = Number(weights.resolvidos);
      const primeira = Number(weights.primeira);
      const resolucao = Number(weights.resolucao);
      const floor = Number(weights.floor);
      if (resolvidos + primeira + resolucao !== 100 || [resolvidos, primeira, resolucao, floor].some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
        send(res, 400, { error: 'weights' });
        return true;
      }
      const tieBreak = Array.isArray(body.tieBreak) ? body.tieBreak.filter((item) => INDICATORS.includes(item)) : store.tieBreak;
      const next = { ...store, weights: { resolvidos, primeira, resolucao, floor }, tieBreak };
      writeStore(file, next);
      send(res, 200, publicStore(next));
      return true;
    }
    if (req.method === 'POST' && url === '/api/goals/templates') {
      const supplied = Array.isArray(body.rules) ? body.rules.filter((rule) => ['resolvidos', 'resolvidosCount', 'transferidos', 'primeira', 'resolucao'].includes(rule.indicator) && ['gt', 'gte', 'lt', 'lte', 'eq', 'between'].includes(rule.op) && Number.isFinite(Number(rule.value))) : [];
      const parsed = body.rules ? { ok: supplied.length === body.rules.length && supplied.length > 0, rules: supplied.map((rule) => ({ indicator: rule.indicator, op: rule.op, value: Number(rule.value), valueTo: rule.op === 'between' ? Number(rule.valueTo) : undefined })), period: body.period === 'month' ? 'month' : 'week', message: 'Não consegui transformar esse pedido em regras. Diga o indicador, o número e se ele deve ser maior ou menor.' } : parseCustomRequest(String(body.description ?? ''));
      if (!parsed.ok) {
        send(res, 422, parsed);
        return true;
      }
      if (!body.confirm) {
        send(res, 200, parsed);
        return true;
      }
      const name = String(body.name ?? '').trim();
      if (!name) {
        send(res, 400, { error: 'name' });
        return true;
      }
      const template = { id: `modelo-${Date.now()}`, name, description: String(body.description ?? ''), period: parsed.period, rules: parsed.rules };
      const next = { ...store, templates: [...store.templates, template] };
      writeStore(file, next);
      send(res, 201, publicStore(next));
      return true;
    }
    if (req.method === 'PUT' && url === '/api/goals/aliases') {
      const person = people.find((item) => item.id === String(body.userId ?? ''));
      if (!person) {
        send(res, 404, { error: 'missing' });
        return true;
      }
      const names = Array.isArray(body.names) ? body.names.map((item) => String(item).trim()).filter(Boolean).slice(0, 8) : [];
      const next = { ...store, aliases: { ...store.aliases, [person.id]: names } };
      writeStore(file, next);
      send(res, 200, { id: person.id, names });
      return true;
    }
    send(res, 404, { error: 'missing' });
    return true;
  }
}
