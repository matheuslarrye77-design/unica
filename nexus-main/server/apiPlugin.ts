import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Connect, Plugin } from 'vite';
import { dataDir } from './dataDir.mjs';
import { extraApi } from './extraApi.js';
import { builtinAccounts } from './auth/accounts.js';
import { localUserFromRequest } from './auth/localStore.mjs';
import { isLeader } from './auth/permissions.mjs';
import { currentUser, employees } from '../src/data/mockData.js';
import { LOGIN_REQUIRED } from '../src/lib/loginGate.js';

type Person = { id: string; name: string; role: string; department?: string };

type Policy = { mode: 'leadership' | 'selected' | 'everyone'; userIds: string[] };

type Settings = {
  muralEnabled: boolean;
  recognition: Policy;
  documents: Policy;
  calendar: { theme: string; wallpaperVersion: number };
};

type FeedbackReply = {
  id: string;
  authorId: string;
  authorName: string | null;
  text: string;
  createdAt: string;
};

type Feedback = {
  id: string;
  destination: 'lideranca' | 'plataforma';
  type: 'feedback' | 'sugestao';
  title?: string;
  message: string;
  anonymous: boolean;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  status: 'novo' | 'analise' | 'resolvido' | 'respondido';
  replies?: FeedbackReply[];
};

type Store = {
  settings: Settings;
  feedback: Feedback[];
  moods: Record<string, string>;
  people: Record<string, { ramal?: string; birthDate?: string }>;
};

const THEMES = ['padrao', 'halloween', 'natal', 'junina', 'anonovo'];

const roster = new Map<string, Person>();
roster.set(currentUser.id, currentUser);
roster.set('helena', { id: 'helena', name: 'Helena Duarte', role: 'Gerente', department: 'Gestão' });
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

export function institutionMiddleware(): Connect.NextHandleFunction {
  const dir = dataDir();
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
    const account = localUserFromRequest(req, path.join(dir, 'auth.json'), builtinAccounts()) ?? (LOGIN_REQUIRED ? null : builtinAccounts()[0]);
    if (!account) return null;
    return roster.get(account.id) ?? account;
  }

  function viewStatus(status: string): 'novo' | 'analise' | 'respondido' {
    if (status === 'analise') return 'analise';
    if (status === 'resolvido' || status === 'respondido') return 'respondido';
    return 'novo';
  }

  function publicFeedback(item: Feedback) {
    const replies = Array.isArray(item.replies) ? item.replies : [];
    return {
      id: item.id,
      destination: item.destination,
      type: item.type,
      title: item.title ?? '',
      message: item.message,
      anonymous: item.anonymous,
      authorName: item.anonymous ? null : item.authorName,
      createdAt: item.createdAt,
      status: viewStatus(item.status),
      replies: replies.map((reply) => ({
        id: reply.id,
        authorName: item.anonymous && reply.authorId === item.authorId ? null : reply.authorName,
        text: reply.text,
        createdAt: reply.createdAt,
      })),
    };
  }

  function feedbackActor(req: IncomingMessage) {
    if (!LOGIN_REQUIRED) {
      const demo = String(req.headers['x-unica-demo'] ?? '');
      if (demo === 'helena') return { user: roster.get('helena') ?? null, access: 'gestao' as const };
      const matheus = roster.get(currentUser.id) ?? null;
      return { user: matheus, access: 'colaborador' as const };
    }
    const user = userFrom(req);
    if (!user) return { user: null, access: 'colaborador' as const };
    return { user, access: isLeader(user) ? 'gestao' as const : 'colaborador' as const };
  }

  function ensureSuggestions(store: Store) {
    const seeds: Feedback[] = [
      {
        id: 'sug-docs',
        destination: 'plataforma',
        type: 'sugestao',
        title: 'Dificuldade para acessar os documentos',
        message: 'Ao abrir a área de documentos, a página demora para carregar e às vezes retorna ao início.',
        anonymous: true,
        authorId: 'ana-ribeiro',
        authorName: null,
        createdAt: '2026-10-17T14:32:00.000Z',
        status: 'analise',
        replies: [
          { id: 'sug-docs-1', authorId: 'helena', authorName: 'Helena Duarte', text: 'Vamos verificar o carregamento da área de documentos.', createdAt: '2026-10-17T15:10:00.000Z' },
          { id: 'sug-docs-2', authorId: 'ana-ribeiro', authorName: null, text: 'Acontece principalmente no início do expediente.', createdAt: '2026-10-17T15:40:00.000Z' },
        ],
      },
      {
        id: 'sug-comunicacao',
        destination: 'lideranca',
        type: 'sugestao',
        title: 'Melhorar a comunicação entre equipes',
        message: 'Seria útil ter um resumo semanal das atividades e decisões da equipe.',
        anonymous: false,
        authorId: 'ana-ribeiro',
        authorName: 'Ana Ribeiro',
        createdAt: '2026-10-16T16:48:00.000Z',
        status: 'novo',
        replies: [
          { id: 'sug-comunicacao-1', authorId: 'ana-ribeiro', authorName: 'Ana Ribeiro', text: 'O resumo pode sair toda sexta-feira.', createdAt: '2026-10-16T17:05:00.000Z' },
        ],
      },
      {
        id: 'sug-chat',
        destination: 'plataforma',
        type: 'sugestao',
        title: 'Atalho para abrir o chat',
        message: 'Sugiro um atalho rápido para abrir o chat com o cliente, sem precisar acessar o menu.',
        anonymous: false,
        authorId: 'joao-silva',
        authorName: 'João Silva',
        createdAt: '2026-10-12T10:24:00.000Z',
        status: 'analise',
        replies: [
          { id: 'sug-chat-1', authorId: 'helena', authorName: 'Helena Duarte', text: 'Atalho anotado para a próxima revisão.', createdAt: '2026-10-12T11:00:00.000Z' },
          { id: 'sug-chat-2', authorId: 'joao-silva', authorName: 'João Silva', text: 'Pode ficar ao lado da busca.', createdAt: '2026-10-12T11:20:00.000Z' },
          { id: 'sug-chat-3', authorId: 'helena', authorName: 'Helena Duarte', text: 'Vamos avaliar o espaço do cabeçalho.', createdAt: '2026-10-12T14:00:00.000Z' },
        ],
      },
      {
        id: 'sug-tema',
        destination: 'plataforma',
        type: 'sugestao',
        title: 'Adicionar opção de tema escuro',
        message: 'Seria muito bom ter um tema escuro para facilitar o uso à noite.',
        anonymous: false,
        authorId: 'bruno-costa',
        authorName: 'Bruno Costa',
        createdAt: '2026-10-10T09:17:00.000Z',
        status: 'respondido',
        replies: [
          { id: 'sug-tema-1', authorId: 'helena', authorName: 'Helena Duarte', text: 'O tema escuro já está disponível no cabeçalho.', createdAt: '2026-10-10T18:00:00.000Z' },
          { id: 'sug-tema-2', authorId: 'bruno-costa', authorName: 'Bruno Costa', text: 'Encontrei o botão. Obrigado.', createdAt: '2026-10-11T09:00:00.000Z' },
          { id: 'sug-tema-3', authorId: 'helena', authorName: 'Helena Duarte', text: 'Se notar algum contraste ruim, avise.', createdAt: '2026-10-11T09:30:00.000Z' },
          { id: 'sug-tema-4', authorId: 'bruno-costa', authorName: 'Bruno Costa', text: 'Por enquanto está bom.', createdAt: '2026-10-11T10:00:00.000Z' },
          { id: 'sug-tema-5', authorId: 'helena', authorName: 'Helena Duarte', text: 'Sugestão marcada como respondida.', createdAt: '2026-10-11T10:15:00.000Z' },
        ],
      },
      {
        id: 'sug-matheus',
        destination: 'lideranca',
        type: 'sugestao',
        title: 'Atalho do mural no celular',
        message: 'No celular, o mural fica longe do menu. Um atalho na primeira tela ajudaria no dia a dia.',
        anonymous: false,
        authorId: currentUser.id,
        authorName: 'Matheus Larrie',
        createdAt: '2026-10-15T11:20:00.000Z',
        status: 'novo',
        replies: [],
      },
    ];
    let added = false;
    for (const seed of seeds) {
      if (!store.feedback.some((item) => item.id === seed.id)) {
        store.feedback.push(seed);
        added = true;
      }
    }
    if (added) save(store);
  }

  const attach: Connect.NextHandleFunction = async (req, res, next) => {
    const url = (req.url?.split('?')[0] ?? '').replace(/\/$/, '') || '/';
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
        const { user, access } = feedbackActor(req);
        if (!user) return send(res, 401, { error: 'unknown' });
        const store = load();
        ensureSuggestions(store);
        const visible = store.feedback.filter((item) => access === 'gestao' || item.authorId === user.id);
        send(res, 200, { feedback: visible.map(publicFeedback) });
        return;
      }

      if (req.method === 'POST' && url === '/api/feedback') {
        const { user } = feedbackActor(req);
        if (!user) return send(res, 401, { error: 'unknown' });
        const body = JSON.parse((await readBody(req)).toString('utf8')) as Partial<Feedback>;
        const message = String(body.message ?? '').trim();
        const title = String(body.title ?? '').trim();
        if (!title || title.length > 140) return send(res, 400, { error: 'title' });
        if (!message || message.length > 4000) return send(res, 400, { error: 'message' });
        if (body.destination !== 'lideranca' && body.destination !== 'plataforma') return send(res, 400, { error: 'destination' });
        if (body.type !== 'feedback' && body.type !== 'sugestao') return send(res, 400, { error: 'type' });
        const anonymous = Boolean(body.anonymous);
        const store = load();
        const item: Feedback = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          destination: body.destination,
          type: body.type,
          title,
          message,
          anonymous,
          authorId: user.id,
          authorName: anonymous ? null : user.name,
          createdAt: new Date().toISOString(),
          status: 'novo',
          replies: [],
        };
        store.feedback.unshift(item);
        save(store);
        send(res, 201, { feedback: publicFeedback(item) });
        return;
      }

      const replyMatch = /^\/api\/feedback\/([^/]+)\/replies$/.exec(url);
      if (req.method === 'POST' && replyMatch) {
        const { user, access } = feedbackActor(req);
        if (!user) return send(res, 401, { error: 'unknown' });
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { text?: string };
        const text = String(body.text ?? '').trim();
        if (!text || text.length > 4000) return send(res, 400, { error: 'message' });
        const store = load();
        const item = store.feedback.find((entry) => entry.id === replyMatch[1]);
        if (!item) return send(res, 404, { error: 'missing' });
        if (access !== 'gestao' && item.authorId !== user.id) return send(res, 403, { error: 'forbidden' });
        const recent = (item.replies ?? []).find((entry) => entry.authorId === user.id && entry.text === text && Date.now() - Date.parse(entry.createdAt) < 5000);
        if (recent) {
          send(res, 200, { feedback: publicFeedback(item) });
          return;
        }
        const reply: FeedbackReply = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          authorId: user.id,
          authorName: item.anonymous && item.authorId === user.id ? null : user.name,
          text,
          createdAt: new Date().toISOString(),
        };
        item.replies = [...(item.replies ?? []), reply];
        save(store);
        send(res, 201, { feedback: publicFeedback(item) });
        return;
      }

      const statusMatch = /^\/api\/feedback\/([^/]+)$/.exec(url);
      if (req.method === 'PATCH' && statusMatch) {
        const { user, access } = feedbackActor(req);
        if (!user || access !== 'gestao') return send(res, 403, { error: 'forbidden' });
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { status?: string };
        const next = body.status === 'resolvido' ? 'respondido' : body.status;
        if (next !== 'novo' && next !== 'analise' && next !== 'respondido') return send(res, 400, { error: 'status' });
        const store = load();
        const item = store.feedback.find((entry) => entry.id === statusMatch[1]);
        if (!item) return send(res, 404, { error: 'missing' });
        item.status = next;
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
        const allowed = ['😮‍💨', '😔', '😴', '😐', '😊', '🚀', '🙂'];
        const plain = (value: string) => value.replace(/\uFE0F/g, '');
        const emoji = allowed.find((item) => item === body.emoji || plain(item) === plain(body.emoji ?? ''));
        if (!emoji) return send(res, 400, { error: 'emoji' });
        const store = load();
        store.moods[user.id] = emoji;
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
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { ramal?: string; birthDate?: string };
        const store = load();
        const next = { ...store.people[targetId] };
        if (body.ramal !== undefined) {
          const ramal = String(body.ramal).trim();
          if (ramal && !/^\d{3}$/.test(ramal)) return send(res, 400, { error: 'ramal' });
          next.ramal = ramal;
        }
        if (body.birthDate !== undefined) {
          const birthDate = String(body.birthDate).trim();
          if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return send(res, 400, { error: 'birthDate' });
          if (birthDate) next.birthDate = birthDate;
          else delete next.birthDate;
        }
        if (!next.ramal && !next.birthDate) delete store.people[targetId];
        else store.people[targetId] = next;
        save(store);
        send(res, 200, { people: store.people });
        return;
      }

      send(res, 404, { error: 'not-found' });
    } catch {
      send(res, 400, { error: 'bad-request' });
    }
  };

  return attach;
}

export function institutionApi(): Plugin {
  return {
    name: 'unica-institution-api',
    configureServer(server) {
      server.middlewares.use(extraApi());
      server.middlewares.use(institutionMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(extraApi());
      server.middlewares.use(institutionMiddleware());
    },
  };
}
