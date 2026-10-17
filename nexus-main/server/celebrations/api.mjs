import fs from 'node:fs';
import path from 'node:path';
import { activeBirthdayYear, birthdayWindow, canReadMessage, canWrite, expiredIds, phase } from './rules.mjs';

const THEMES = ['natal', 'anonovo', 'carnaval', 'halloween', 'namorados', 'pascoa', 'maes', 'pais', 'trabalhador', 'extra'];
const KINDS = ['bombom', 'estrela', 'vela', 'flor', 'coracao', 'bolinha', 'presente', 'bandeira', 'plaquinha', 'bexiga', 'mascara', 'abobora', 'ovo', 'fogos'];

function empty() {
  return { settings: { viewMonths: 2, timezone: 'America/Sao_Paulo' }, people: {}, editions: [], ornaments: [] };
}

function todayIn(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function read(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...empty(), ...parsed, people: parsed.people ?? {}, editions: parsed.editions ?? [], ornaments: parsed.ornaments ?? [] };
  } catch {
    return empty();
  }
}

function write(file, store) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2));
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function windowOf(edition) {
  return { prepareFrom: edition.prepareFrom, messageUntil: edition.messageUntil, openAt: edition.openAt, viewUntil: edition.viewUntil };
}

function purge(store, today, dir) {
  const gone = new Set(expiredIds(store.editions, today));
  if (gone.size === 0) return false;
  const removed = store.ornaments.filter((item) => gone.has(item.editionId));
  const kept = store.ornaments.filter((item) => !gone.has(item.editionId));
  const used = new Set(kept.map((item) => item.media?.url).filter(Boolean));
  for (const ornament of removed) {
    const url = ornament.media?.url ?? '';
    const match = /^\/api\/uploads\/(up-[a-f0-9]{16})$/.exec(url);
    if (!match || used.has(url)) continue;
    fs.rmSync(path.join(dir, 'uploads', match[1]), { force: true });
    fs.rmSync(path.join(dir, 'uploads', `${match[1]}.json`), { force: true });
  }
  store.editions = store.editions.filter((edition) => !gone.has(edition.id));
  store.ornaments = kept;
  return true;
}

function seedCollective(store, today) {
  const year = Number(today.slice(0, 4));
  const templates = [
    ['natal', 'Natal', `${year}-11-01`, `${year}-12-24`, `${year}-12-25`, `${year + 1}-01-06`],
    ['anonovo', 'Ano Novo', `${year}-12-01`, `${year}-12-31`, `${year + 1}-01-01`, `${year + 1}-01-15`],
    ['carnaval', 'Carnaval', `${year}-02-01`, `${year}-02-20`, `${year}-02-21`, `${year}-03-05`],
    ['halloween', 'Halloween', `${year}-10-01`, `${year}-10-31`, `${year}-10-31`, `${year}-11-07`],
    ['namorados', 'Dia dos Namorados', `${year}-05-20`, `${year}-06-12`, `${year}-06-12`, `${year}-06-30`],
    ['pascoa', 'Páscoa', `${year}-03-15`, `${year}-04-05`, `${year}-04-06`, `${year}-04-20`],
    ['maes', 'Dia das Mães', `${year}-04-20`, `${year}-05-10`, `${year}-05-10`, `${year}-05-25`],
    ['pais', 'Dia dos Pais', `${year}-07-20`, `${year}-08-09`, `${year}-08-09`, `${year}-08-25`],
    ['trabalhador', 'Dia do Trabalhador', `${year}-04-15`, `${year}-05-01`, `${year}-05-01`, `${year}-05-08`],
  ];
  let added = false;
  for (const [theme, title, prepareFrom, messageUntil, openAt, viewUntil] of templates) {
    const id = `${theme}-${openAt.slice(0, 4)}`;
    if (store.editions.some((edition) => edition.id === id)) continue;
    store.editions.push({ id, scope: 'collective', theme, title, year: Number(openAt.slice(0, 4)), prepareFrom, messageUntil, openAt, viewUntil });
    added = true;
  }
  return added;
}

function publicEdition(edition, today) {
  const window = windowOf(edition);
  return { ...edition, phase: phase(today, window), writable: canWrite(today, window) };
}

function publicOrnament(ornament, edition, user, leader, today) {
  const allowed = canReadMessage(today, windowOf(edition), {
    leader,
    author: ornament.authorId === user.id,
    recipient: edition.scope === 'birthday' && edition.personId === user.id,
  });
  return {
    id: ornament.id,
    editionId: ornament.editionId,
    kind: ornament.kind,
    x: ornament.x,
    y: ornament.y,
    scale: ornament.scale,
    authorId: ornament.authorId,
    authorName: ornament.authorName,
    authorAvatar: ornament.authorAvatar,
    createdAt: ornament.createdAt,
    updatedAt: ornament.updatedAt,
    sealed: !allowed,
    message: allowed ? ornament.message : '',
    media: allowed ? ornament.media ?? null : null,
  };
}

function cleanMedia(value) {
  if (!value || typeof value !== 'object') return null;
  const url = String(value.url ?? '');
  const kind = value.kind === 'gif' || value.kind === 'sticker' || value.kind === 'photo' ? value.kind : '';
  if (!kind) return null;
  if (url.startsWith('/api/uploads/up-') || /^\/figurinhas\/[a-z0-9-]+\.svg$/.test(url)) return { kind, url };
  return null;
}

export async function handleCelebrations(req, res, url, user, dir, leader) {
  const file = path.join(dir, 'celebrations.json');
  const store = read(file);
  const today = todayIn(store.settings.timezone);
  const seeded = seedCollective(store, today);
  const purged = purge(store, today, dir);
  if (purged || seeded) write(file, store);

  if (req.method === 'GET' && url === '/api/celebrations') {
    const query = new URL(req.url ?? '', 'http://local').searchParams;
    const scope = query.get('scope') === 'collective' ? 'collective' : 'birthday';
    let edition = null;
    if (scope === 'birthday') {
      const personId = String(query.get('personId') ?? '');
      const person = store.people[personId];
      if (!person) {
        send(res, 200, { today, settings: store.settings, edition: null, ornaments: [], editions: [] });
        return;
      }
      const year = activeBirthdayYear(person.month, person.day, today, store.settings.viewMonths);
      const window = birthdayWindow(person.month, person.day, year, store.settings.viewMonths);
      const id = `bday-${personId}-${year}`;
      edition = store.editions.find((item) => item.id === id) ?? {
        id,
        scope: 'birthday',
        theme: 'bolo',
        title: `Aniversário de ${person.name}`,
        personId,
        personName: person.name,
        avatar: person.avatar,
        year,
        ...window,
      };
      if (!store.editions.some((item) => item.id === id) && phase(today, window) !== 'expired' && phase(today, window) !== 'upcoming') {
        store.editions.push(edition);
        write(file, store);
      }
    } else {
      const editionId = String(query.get('editionId') ?? '');
      edition = store.editions.find((item) => item.scope === 'collective' && item.id === editionId) ?? null;
    }
    const editions = store.editions.filter((item) => item.scope === 'collective').map((item) => publicEdition(item, today));
    const ornaments = edition
      ? store.ornaments.filter((item) => item.editionId === edition.id).map((item) => publicOrnament(item, edition, user, leader, today))
      : [];
    send(res, 200, {
      today,
      settings: store.settings,
      edition: edition ? publicEdition(edition, today) : null,
      ornaments,
      editions,
      viewer: { id: user.id, leader, recipient: edition?.personId === user.id },
    });
    return;
  }

  if (req.method === 'PUT' && url === '/api/celebrations/people') {
    const body = JSON.parse(await readBody(req) || '{}');
    const personId = String(body.personId ?? '').slice(0, 80);
    const name = String(body.name ?? '').trim().slice(0, 80);
    const month = Number(body.month);
    const day = Number(body.day);
    if (!personId || !name || month < 1 || month > 12 || day < 1 || day > 31) return send(res, 400, { error: 'person' });
    if (!store.people[personId]) {
      store.people[personId] = { name, avatar: String(body.avatar ?? ''), month, day };
      write(file, store);
    }
    send(res, 200, { person: store.people[personId] });
    return;
  }

  if (req.method === 'PUT' && url === '/api/celebrations/settings') {
    if (!leader) return send(res, 403, { error: 'forbidden' });
    const body = JSON.parse(await readBody(req) || '{}');
    const viewMonths = Number(body.viewMonths);
    if (![1, 2, 3, 6].includes(viewMonths)) return send(res, 400, { error: 'months' });
    store.settings.viewMonths = viewMonths;
    write(file, store);
    send(res, 200, { settings: store.settings });
    return;
  }

  if (req.method === 'POST' && url === '/api/celebrations/editions') {
    if (!leader) return send(res, 403, { error: 'forbidden' });
    const body = JSON.parse(await readBody(req) || '{}');
    const theme = THEMES.includes(body.theme) ? body.theme : '';
    const title = String(body.title ?? '').trim().slice(0, 80);
    const dates = ['prepareFrom', 'messageUntil', 'openAt', 'viewUntil'].map((key) => String(body[key] ?? ''));
    if (!theme || !title || dates.some((value) => !/^\d{4}-\d{2}-\d{2}$/.test(value))) return send(res, 400, { error: 'edition' });
    const [prepareFrom, messageUntil, openAt, viewUntil] = dates;
    if (!(prepareFrom <= messageUntil && messageUntil <= viewUntil && openAt >= prepareFrom && openAt <= viewUntil)) return send(res, 400, { error: 'dates' });
    const edition = {
      id: `${theme}-${openAt.slice(0, 4)}-${Date.now().toString(36)}`,
      scope: 'collective',
      theme,
      title,
      year: Number(openAt.slice(0, 4)),
      prepareFrom,
      messageUntil,
      openAt,
      viewUntil,
    };
    store.editions.push(edition);
    write(file, store);
    send(res, 201, { edition: publicEdition(edition, today) });
    return;
  }

  if (req.method === 'POST' && url === '/api/celebrations/ornaments') {
    const body = JSON.parse(await readBody(req) || '{}');
    const edition = store.editions.find((item) => item.id === body.editionId);
    if (!edition) return send(res, 404, { error: 'edition' });
    if (!canWrite(today, windowOf(edition))) return send(res, 403, { error: 'closed' });
    const kind = KINDS.includes(body.kind) ? body.kind : '';
    const message = String(body.message ?? '').trim();
    if (!kind || message.length < 1 || message.length > 500) return send(res, 400, { error: 'message' });
    const media = cleanMedia(body.media);
    const ornament = {
      id: `orn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      editionId: edition.id,
      kind,
      x: Math.min(88, Math.max(8, Number(body.x) || 50)),
      y: Math.min(88, Math.max(12, Number(body.y) || 40)),
      scale: Math.min(1.4, Math.max(0.7, Number(body.scale) || 1)),
      message,
      media,
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.ornaments.push(ornament);
    write(file, store);
    send(res, 201, { ornament: publicOrnament(ornament, edition, user, leader, today) });
    return;
  }

  const match = /^\/api\/celebrations\/ornaments\/([^/]+)$/.exec(url);
  if (match && (req.method === 'PATCH' || req.method === 'DELETE')) {
    const ornament = store.ornaments.find((item) => item.id === match[1]);
    const edition = store.editions.find((item) => item.id === ornament?.editionId);
    if (!ornament || !edition) return send(res, 404, { error: 'missing' });
    const owner = ornament.authorId === user.id;
    if (!owner && !leader) return send(res, 403, { error: 'forbidden' });
    if (req.method === 'DELETE') {
      if (!leader && !canWrite(today, windowOf(edition))) return send(res, 403, { error: 'closed' });
      store.ornaments = store.ornaments.filter((item) => item.id !== ornament.id);
      write(file, store);
      send(res, 200, { ok: true });
      return;
    }
    if (!canWrite(today, windowOf(edition)) && !leader) return send(res, 403, { error: 'closed' });
    const body = JSON.parse(await readBody(req) || '{}');
    if (body.message !== undefined) {
      const message = String(body.message).trim();
      if (message.length < 1 || message.length > 500) return send(res, 400, { error: 'message' });
      ornament.message = message;
    }
    if (body.x !== undefined) ornament.x = Math.min(88, Math.max(8, Number(body.x) || ornament.x));
    if (body.y !== undefined) ornament.y = Math.min(88, Math.max(12, Number(body.y) || ornament.y));
    if (body.scale !== undefined) ornament.scale = Math.min(1.4, Math.max(0.7, Number(body.scale) || ornament.scale));
    if (body.media !== undefined) ornament.media = cleanMedia(body.media);
    ornament.updatedAt = new Date().toISOString();
    write(file, store);
    send(res, 200, { ornament: publicOrnament(ornament, edition, user, leader, today) });
    return;
  }

  send(res, 404, { error: 'missing' });
}
