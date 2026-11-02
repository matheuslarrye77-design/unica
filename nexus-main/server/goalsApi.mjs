import { isLeader } from './auth/permissions.mjs';
import { commitTemplate, interpretCriteria, normalizeProposal } from './criteria.mjs';
import { applyGoalsReview, applyLedgerRanking, ingestReport, proposeFromLedger } from './ledger.mjs';
import { applyCriterion, buildApproval, emptyStore, fold, goalState, INDICATORS, isGoalsConferenceTalk, looksLikeReport, overallScore, parseReport, publicStore, readCriterion, relinkLedger, runAssistant, understandGoalsMessage } from './goals.mjs';
import { STORAGE_REPLY, createGoalsStore } from './goalsStore.mjs';

function redactLabels(colleagues, aliases, teamRoster) {
  const skip = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'del']);
  const labels = [];
  const add = (value) => {
    const text = String(value ?? '').trim();
    if (text.length < 3 || text.includes('@')) return;
    if (/^\d+$/.test(text) && text.length < 8) return;
    labels.push(text);
    const first = text.split(/\s+/)[0];
    if (first && first.length >= 3 && first !== text && !skip.has(first.toLowerCase())) labels.push(first);
  };
  for (const person of [...(Array.isArray(colleagues) ? colleagues : []), ...teamRoster]) {
    add(person.name);
    add(person.email);
    add(person.phone);
    for (const name of person.reportNames ?? []) add(name);
    for (const name of aliases[person.id] ?? []) add(name);
  }
  return labels;
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
    email: person.email,
    phone: person.phone,
    ramal: person.ramal,
    aliases: [...(person.reportNames ?? []), ...(aliases[person.id] ?? [])],
  }));
}

function viewPeople(people, store) {
  return people.map((person) => ({ id: person.id, name: person.name, funcao: person.funcao, role: person.role, aliases: store.aliases[person.id] ?? [] }));
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

function storageBody() {
  return { error: 'storage', kind: 'storage', reply: STORAGE_REPLY };
}

function publicView(store, user, people) {
  const body = { ...publicStore(store), canManage: isLeader(user), people: viewPeople(people, store) };
  if (!isLeader(user)) {
    body.ledger = { records: [], ranking: [], applied: store.ledger?.applied ?? [] };
    return body;
  }
  body.ledger = relinkLedger(body.ledger, people);
  return body;
}

function resolveGoalsUrl(req) {
  const raw = String(req?.url ?? '');
  const current = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://internal');
  const nested = current.searchParams.get('nested');
  if (nested) {
    const path = `/${String(nested).replace(/^\/+/, '')}`;
    return (path.startsWith('/api/') ? path : `/api${path}`).replace(/\/+$/, '') || '/api/goals';
  }
  return (current.pathname || '/').replace(/\/+$/, '') || '/';
}

function parseGoalsBody(raw, req) {
  let body = {};
  try {
    body = JSON.parse(String(raw ?? '').trim() || '{}');
  } catch {
    body = {};
  }
  const extra = req?.body;
  if (extra && typeof extra === 'object' && !Array.isArray(extra) && !Buffer.isBuffer(extra)) {
    body = { ...extra, ...body };
  }
  if (!body.text && !body.review && typeof extra === 'string') {
    try {
      body = { ...body, ...JSON.parse(extra) };
    } catch {
      /* keep parsed stream */
    }
  }
  return body && typeof body === 'object' ? body : {};
}

export async function handleGoals(req, res, user, dir, colleagues, teamRoster, send, readBody, options = {}) {
  const url = resolveGoalsUrl(req);
  if (url !== '/api/goals' && !url.startsWith('/api/goals/')) return false;
  const persist = options.store ?? createGoalsStore({ dir, env: options.env ?? process.env, remote: options.remote, client: options.client, migrateBlob: options.migrateBlob, timeoutMs: options.timeoutMs, retries: options.retries });
  const loaded = await persist.load();
  const store = loaded.error ? emptyStore() : loaded.store ?? emptyStore();
  const people = directory(colleagues, store.aliases, teamRoster);
  const labels = redactLabels(colleagues, store.aliases, teamRoster);
  if (req.method === 'GET' && url === '/api/goals') {
    send(res, 200, { ...publicView(store, user, people), storage: loaded.error ? 'unavailable' : 'ok' });
    return true;
  }
  if (loaded.error) {
    send(res, 503, storageBody());
    return true;
  }
  if (!isLeader(user)) {
    send(res, 403, { error: 'forbidden' });
    return true;
  }
  const raw = await readBody(req);
  {
    const body = parseGoalsBody(raw, req);

    async function commit(mutator) {
      const result = await persist.mutate(mutator);
      if (result?.error === 'storage') {
        send(res, 503, storageBody());
        return null;
      }
      return result;
    }

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
      const result = await commit((current) => {
        const approved = buildApproval(current, {
          text: String(body.text ?? ''),
          periodKey: String(body.periodKey ?? ''),
          rows: Array.isArray(body.rows) ? body.rows : [],
          replace: Boolean(body.replace),
          display: body.display,
        }, people, user);
        if (approved.error) return { skip: true, error: approved.error };
        return { store: approved.store };
      });
      if (!result) return true;
      if (result.error) {
        send(res, 409, { error: result.error });
        return true;
      }
      send(res, 200, publicView(result.store, user, people));
      return true;
    }
    if (req.method === 'POST' && url === '/api/goals/display') {
      const result = await commit((current) => {
        const item = current.imports.find((entry) => entry.periodKey === String(body.periodKey ?? ''));
        if (!item) return { skip: true, error: 'missing' };
        const criterion = readCriterion(body.display ?? body);
        return {
          store: {
            ...current,
            criterion,
            imports: current.imports.map((entry) => entry.periodKey === item.periodKey ? { ...entry, display: criterion } : entry),
          },
        };
      });
      if (!result) return true;
      if (result.error === 'missing') {
        send(res, 404, { error: 'missing' });
        return true;
      }
      send(res, 200, publicView(result.store, user, people));
      return true;
    }
    if (req.method === 'POST' && url === '/api/goals/criterion') {
      const result = await commit((current) => ({ store: applyLedgerRanking(applyCriterion(current, body, String(body.periodKey ?? ''))) }));
      if (!result) return true;
      send(res, 200, publicView(result.store, user, people));
      return true;
    }
    const assistantPost = req.method === 'POST' && (url === '/api/goals/assistant' || (url === '/api/goals' && body.text && !body.confirm && !body.rows && !body.mode && !body.display && !body.review));
    if (assistantPost) {
      const text = String(body.text ?? '');
      const intent = String(body.intent ?? '');
      const history = Array.isArray(body.history) ? body.history : [];
      if (body.review && /^(confirmar|aprovar)( metas| resultados| conferencia)?$/.test(fold(text))) {
        const result = await commit((current) => ({ store: applyGoalsReview(current, body.review, people, new Date()).store }));
        if (!result) return true;
        send(res, 200, { ...publicView(result.store, user, people), kind: 'ledger', reply: 'Gravei as metas e os resultados no Banco dos relatórios. O pódio não foi alterado.' });
        return true;
      }
      const understood = understandGoalsMessage(text, people);
      if ((understood.kind === 'review' || understood.kind === 'proposal') && (!looksLikeReport(text) || isGoalsConferenceTalk(text) || understood.kind === 'review')) {
        send(res, 200, {
          ...understood,
          combine: understood.combine ?? 'all',
          subsetor: '',
          weights: understood.weights ?? null,
        });
        return true;
      }
      const parsed = parseReport(text, people);
      const outcome = ingestReport(store, text, people, { now: new Date(), parsed });
      if (outcome.kind === 'clarify') {
        send(res, 200, { kind: 'clarify', reply: outcome.reply });
        return true;
      }
      if (outcome.kind === 'ledger') {
        const result = await commit((current) => ingestReport(current, text, people, { now: new Date(), parsed }));
        if (!result) return true;
        send(res, 200, { ...publicView(result.store, user, people), kind: 'ledger', reply: result.reply, proposal: result.proposal });
        return true;
      }
      const proposal = proposeFromLedger(store, text, new Date());
      if (proposal) {
        const result = await commit((current) => {
          const nextProposal = proposeFromLedger(current, text, new Date());
          if (!nextProposal) return { skip: true, store: current, ...proposal };
          return {
            store: { ...current, ledger: { records: current.ledger?.records ?? [], ranking: nextProposal.ranking, applied: current.ledger?.applied ?? [] } },
            ...nextProposal,
          };
        });
        if (!result) return true;
        send(res, 200, { ...publicView(result.store, user, people), ...result });
        return true;
      }
      if (intent === 'custom' && !looksLikeReport(text)) {
        send(res, 200, await interpretCriteria(text, { history, labels }));
        return true;
      }
      const result = runAssistant({
        text,
        store,
        people,
        preview: body.preview,
        periodKey: String(body.periodKey ?? ''),
        intent,
      });
      if (result.kind === 'defer') {
        if (looksLikeReport(text)) {
          send(res, 200, result);
          return true;
        }
        send(res, 200, await interpretCriteria(text, { history, labels }));
        return true;
      }
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
      const result = await commit((current) => ({ store: { ...current, weights: { resolvidos, primeira, resolucao, floor }, tieBreak } }));
      if (!result) return true;
      send(res, 200, publicView(result.store, user, people));
      return true;
    }
    if (req.method === 'POST' && url === '/api/goals/templates') {
      const period = body.period === 'month' || body.period === 'mixed' ? body.period : 'week';
      const proposal = normalizeProposal({
        status: 'ready',
        explanation: String(body.description ?? ''),
        questions: [],
        period: period === 'mixed' ? '' : period,
        periodKey: String(body.periodKey ?? ''),
        periodLabel: String(body.periodLabel ?? ''),
        combine: body.combine === 'any' ? 'any' : 'all',
        subsetor: body.subsetor ?? '',
        weights: body.weights ?? null,
        criteria: Array.isArray(body.rules) ? body.rules.map((rule) => ({ ...rule, valueTo: rule.valueTo ?? null, period: rule.period || (period === 'month' ? 'month' : 'week') })) : [],
      });
      if (!proposal.ok) {
        send(res, 422, proposal);
        return true;
      }
      if (!body.confirm) {
        send(res, 200, proposal);
        return true;
      }
      const result = await commit((current) => {
        const saved = commitTemplate(current, proposal, { name: body.name, confirm: true, description: body.description });
        if (!saved.saved) return { skip: true, proposal: saved.proposal ?? proposal };
        return { store: saved.store };
      });
      if (!result) return true;
      send(res, 201, publicView(result.store, user, people));
      return true;
    }
    if (req.method === 'PUT' && url === '/api/goals/aliases') {
      const person = people.find((item) => item.id === String(body.userId ?? ''));
      if (!person) {
        send(res, 404, { error: 'missing' });
        return true;
      }
      const names = Array.isArray(body.names) ? body.names.map((item) => String(item).trim()).filter(Boolean).slice(0, 8) : [];
      const result = await commit((current) => ({ store: { ...current, aliases: { ...current.aliases, [person.id]: names } }, names }));
      if (!result) return true;
      send(res, 200, { id: person.id, names });
      return true;
    }
    send(res, 404, { error: 'missing' });
    return true;
  }
}
