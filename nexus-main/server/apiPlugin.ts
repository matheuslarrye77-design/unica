import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Connect, Plugin } from 'vite';
import { currentUser, employees } from '../src/data/mockData';

type Person = { id: string; name: string; role: string; department?: string };

type Policy = { mode: 'leadership' | 'selected' | 'everyone'; userIds: string[] };

type Settings = {
  muralEnabled: boolean;
  recognition: Policy;
  documents: Policy;
  calendar: { theme: string; wallpaperVersion: number };
};

type Feedback = {
  id: string;
  destination: 'lideranca' | 'plataforma';
  type: 'feedback' | 'sugestao';
  message: string;
  anonymous: boolean;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  status: 'novo' | 'analise' | 'resolvido';
};

type Store = {
  settings: Settings;
  feedback: Feedback[];
  moods: Record<string, string>;
  people: Record<string, { ramal?: string }>;
};

const THEMES = ['padrao', 'halloween', 'natal', 'junina', 'anonovo'];

function isLeader(user: { role: string; department?: string }) {
  return /admin|líder|lider|coordena|diret|vp\b|chief|head|gerente/i.test(user.role)
    || /comunica/i.test(user.department ?? '');
}

const roster = new Map<string, Person>();
roster.set(currentUser.id, currentUser);
for (const employee of employees) {
  if (!roster.has(employee.id)) roster.set(employee.id, employee);
}

const defaultSettings = (): Settings => ({
  muralEnabled: true,
  recognition: { mode: 'everyone', userIds: [] },
  documents: { mode: 'leadership', userIds: [] },
  calendar: { theme: 'padrao', wallpaperVersion: 0 },
});

function allows(user: Person, policy: Policy) {
  if (policy.mode === 'everyone') return true;
  if (policy.mode === 'selected') return policy.userIds.includes(user.id);
  return isLeader(user);
}

function readBody(req: IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 2_000_000) {
        reject(new Error('payload'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function institutionApi(): Plugin {
  const dir = path.resolve(process.cwd(), 'data');
  const file = path.join(dir, 'institution.json');
  const wallpaper = path.join(dir, 'calendar-wallpaper');

  function load(): Store {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Store;
      return {
        settings: { ...defaultSettings(), ...parsed.settings, calendar: { ...defaultSettings().calendar, ...parsed.settings?.calendar } },
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
        moods: parsed.moods ?? {},
        people: parsed.people ?? {},
      };
    } catch {
      return { settings: defaultSettings(), feedback: [], moods: {}, people: {} };
    }
  }

  function save(store: Store) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(store, null, 2));
  }

  function userFrom(req: IncomingMessage) {
    const id = String(req.headers['x-user-id'] ?? '');
    return roster.get(id) ?? null;
  }

  function publicFeedback(item: Feedback) {
    return {
      id: item.id,
      destination: item.destination,
      type: item.type,
      message: item.message,
      anonymous: item.anonymous,
      authorName: item.anonymous ? null : item.authorName,
      createdAt: item.createdAt,
      status: item.status,
    };
  }

  const attach: Connect.NextHandleFunction = async (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '';
    if (!url.startsWith('/api/')) return next();

    try {
      if (req.method === 'GET' && url === '/api/settings') {
        const store = load();
        send(res, 200, { settings: store.settings, hasWallpaper: fs.existsSync(wallpaper) });
        return;
      }

      if (req.method === 'PUT' && url === '/api/settings') {
        const user = userFrom(req);
        if (!user || !isLeader(user)) return send(res, 403, { error: 'forbidden' });
        const body = JSON.parse((await readBody(req)).toString('utf8')) as Partial<Settings>;
        const store = load();
        const recognition = body.recognition;
        const documents = body.documents;
        const theme = body.calendar?.theme;
        store.settings = {
          muralEnabled: Boolean(body.muralEnabled),
          recognition: {
            mode: recognition?.mode === 'selected' || recognition?.mode === 'everyone' ? recognition.mode : 'leadership',
            userIds: Array.isArray(recognition?.userIds) ? recognition.userIds.filter((id) => roster.has(id)) : [],
          },
          documents: {
            mode: documents?.mode === 'selected' || documents?.mode === 'everyone' ? documents.mode : 'leadership',
            userIds: Array.isArray(documents?.userIds) ? documents.userIds.filter((id) => roster.has(id)) : [],
          },
          calendar: {
            theme: theme && THEMES.includes(theme) ? theme : 'padrao',
            wallpaperVersion: store.settings.calendar.wallpaperVersion,
          },
        };
        save(store);
        send(res, 200, { settings: store.settings });
        return;
      }

      if (req.method === 'GET' && url === '/api/wallpaper') {
        if (!fs.existsSync(wallpaper)) return send(res, 404, { error: 'none' });
        const data = fs.readFileSync(wallpaper);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'no-store');
        res.end(data);
        return;
      }

      if (req.method === 'PUT' && url === '/api/wallpaper') {
        const user = userFrom(req);
        if (!user || !isLeader(user)) return send(res, 403, { error: 'forbidden' });
        const raw = JSON.parse((await readBody(req)).toString('utf8')) as { dataUrl?: string };
        const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(raw.dataUrl ?? '');
        if (!match) return send(res, 400, { error: 'image' });
        const bytes = Buffer.from(match[2], 'base64');
        if (bytes.length > 1_500_000) return send(res, 400, { error: 'size' });
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(wallpaper, bytes);
        const store = load();
        store.settings.calendar.wallpaperVersion += 1;
        save(store);
        send(res, 200, { settings: store.settings });
        return;
      }

      if (req.method === 'DELETE' && url === '/api/wallpaper') {
        const user = userFrom(req);
        if (!user || !isLeader(user)) return send(res, 403, { error: 'forbidden' });
        if (fs.existsSync(wallpaper)) fs.unlinkSync(wallpaper);
        const store = load();
        store.settings.calendar.wallpaperVersion += 1;
        save(store);
        send(res, 200, { settings: store.settings });
        return;
      }

      if (req.method === 'POST' && (url === '/api/permissions/recognition' || url === '/api/permissions/documents')) {
        const user = userFrom(req);
        if (!user) return send(res, 401, { error: 'unknown' });
        const store = load();
        const policy = url.endsWith('recognition') ? store.settings.recognition : store.settings.documents;
        if (!allows(user, policy)) return send(res, 403, { error: 'forbidden' });
        send(res, 200, { ok: true });
        return;
      }

      if (req.method === 'GET' && url === '/api/feedback') {
        const user = userFrom(req);
        if (!user || !isLeader(user)) return send(res, 403, { error: 'forbidden' });
        send(res, 200, { feedback: load().feedback.map(publicFeedback) });
        return;
      }

      if (req.method === 'POST' && url === '/api/feedback') {
        const user = userFrom(req);
        if (!user) return send(res, 401, { error: 'unknown' });
        const body = JSON.parse((await readBody(req)).toString('utf8')) as Partial<Feedback>;
        const message = String(body.message ?? '').trim();
        if (!message || message.length > 4000) return send(res, 400, { error: 'message' });
        if (body.destination !== 'lideranca' && body.destination !== 'plataforma') return send(res, 400, { error: 'destination' });
        if (body.type !== 'feedback' && body.type !== 'sugestao') return send(res, 400, { error: 'type' });
        const anonymous = Boolean(body.anonymous);
        const store = load();
        const item: Feedback = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          destination: body.destination,
          type: body.type,
          message,
          anonymous,
          authorId: anonymous ? null : user.id,
          authorName: anonymous ? null : user.name,
          createdAt: new Date().toISOString(),
          status: 'novo',
        };
        store.feedback.unshift(item);
        save(store);
        send(res, 201, { feedback: publicFeedback(item) });
        return;
      }

      const statusMatch = /^\/api\/feedback\/([^/]+)$/.exec(url);
      if (req.method === 'PATCH' && statusMatch) {
        const user = userFrom(req);
        if (!user || !isLeader(user)) return send(res, 403, { error: 'forbidden' });
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { status?: string };
        if (body.status !== 'novo' && body.status !== 'analise' && body.status !== 'resolvido') return send(res, 400, { error: 'status' });
        const store = load();
        const item = store.feedback.find((entry) => entry.id === statusMatch[1]);
        if (!item) return send(res, 404, { error: 'missing' });
        item.status = body.status;
        save(store);
        send(res, 200, { feedback: publicFeedback(item) });
        return;
      }

      if (req.method === 'GET' && url === '/api/moods') {
        send(res, 200, { moods: load().moods });
        return;
      }

      if (req.method === 'PUT' && url === '/api/moods') {
        const user = userFrom(req);
        if (!user) return send(res, 401, { error: 'unknown' });
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { emoji?: string };
        const allowed = ['😮‍💨', '😔', '😴', '😐', '😊', '🚀'];
        if (!body.emoji || !allowed.includes(body.emoji)) return send(res, 400, { error: 'emoji' });
        const store = load();
        store.moods[user.id] = body.emoji;
        save(store);
        send(res, 200, { moods: store.moods });
        return;
      }

      const personMatch = /^\/api\/people\/([^/]+)$/.exec(url);
      if (req.method === 'GET' && url === '/api/people') {
        send(res, 200, { people: load().people });
        return;
      }

      if (req.method === 'PUT' && personMatch) {
        const user = userFrom(req);
        const targetId = decodeURIComponent(personMatch[1]);
        if (!user || !roster.has(targetId)) return send(res, 401, { error: 'unknown' });
        if (user.id !== targetId && !isLeader(user)) return send(res, 403, { error: 'forbidden' });
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { ramal?: string };
        const ramal = String(body.ramal ?? '').trim();
        if (ramal && !/^\d{3}$/.test(ramal)) return send(res, 400, { error: 'ramal' });
        const store = load();
        store.people[targetId] = { ...store.people[targetId], ramal };
        save(store);
        send(res, 200, { people: store.people });
        return;
      }

      send(res, 404, { error: 'not-found' });
    } catch {
      send(res, 400, { error: 'bad-request' });
    }
  };

  return {
    name: 'unica-institution-api',
    configureServer(server) {
      server.middlewares.use(attach);
    },
    configurePreviewServer(server) {
      server.middlewares.use(attach);
    },
  };
}
