import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Connect } from 'vite';
import { samplePosts } from '../src/components/social/samplePosts';
import { currentUser, employees } from '../src/data/mockData';

type Account = {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  email: string;
};

type Comment = {
  id: string;
  author: string;
  authorId: string;
  avatar: string;
  body: string;
  time: string;
  likes: number;
  likedBy: string[];
};

type FeedPost = {
  id: string;
  kind: string;
  author: string;
  authorId: string;
  role: string;
  department: string;
  avatar: string;
  time: string;
  body: string;
  image?: string;
  attachment?: { type: 'video' | 'document'; name: string; url?: string };
  likes: number;
  likedBy: string[];
  shares: number;
  comments: Comment[];
  bannerTitle?: string;
  recognizedName?: string;
  poll?: { id: string; label: string; votes: number }[];
  votes?: Record<string, string>;
  eventWhen?: string;
  eventWhere?: string;
  createdAt: string;
};

type Repost = {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  originalId: string;
  note: string;
  createdAt: string;
};

type Colleague = Account & { phone?: string; ramal?: string; funcao: string };

type AuthStore = {
  salt: string;
  passwordHash: string;
  sessions: Record<string, string>;
  favorites: Record<string, string[]>;
  colleagues: Colleague[];
};

type FeedStore = { posts: FeedPost[]; reposts: Repost[] };

const FUNCOES = ['Ligação', 'E-mail', 'Chat', 'Liderança'];
const EVENT_TYPES = ['reuniao', 'evento', 'aniversario', 'outro'] as const;

type AgendaEvent = {
  id: string;
  title: string;
  type: (typeof EVENT_TYPES)[number];
  date: string;
  startTime: string;
  endTime: string;
  place: string;
  description: string;
  participantIds: string[];
  personId: string;
  personName: string;
  avatar: string;
};

function isLeader(user: { role: string; department?: string }) {
  return /admin|líder|lider|coordena|diret|vp\b|chief|head|gerente/i.test(user.role)
    || /comunica/i.test(user.department ?? '');
}

const accounts: Account[] = [
  { ...currentUser, email: 'matheus.larrie@unica.local' },
  ...employees.filter((employee) => employee.id !== currentUser.id && employee.email).map((employee) => ({
    id: employee.id,
    name: employee.name,
    role: employee.role,
    department: employee.department,
    avatar: employee.avatar,
    email: employee.email!,
  })),
];

function hashPassword(password: string, salt: string) {
  return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function seedPosts(): FeedPost[] {
  return samplePosts.map((post) => ({
    id: post.id,
    kind: post.kind,
    author: post.author,
    authorId: accounts.find((account) => account.name === post.author)?.id ?? 'instituicao',
    role: post.role,
    department: post.department,
    avatar: post.avatar,
    time: post.time,
    body: post.body,
    image: post.image,
    attachment: post.attachment,
    likes: post.likes,
    likedBy: [],
    shares: post.shares,
    comments: post.comments.map((comment) => ({
      id: comment.id,
      author: comment.author,
      authorId: accounts.find((account) => account.name === comment.author)?.id ?? '',
      avatar: comment.avatar,
      body: comment.body,
      time: comment.time,
      likes: comment.likes,
      likedBy: [],
    })),
    bannerTitle: post.bannerTitle,
    recognizedName: post.recognizedName,
    poll: post.poll,
    votes: {},
    eventWhen: post.eventWhen,
    eventWhere: post.eventWhere,
    createdAt: new Date().toISOString(),
  }));
}

function readBody(req: IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function extraApi(): Connect.NextHandleFunction {
  const dir = path.resolve(process.cwd(), 'data');
  const authFile = path.join(dir, 'auth.json');
  const feedFile = path.join(dir, 'feed.json');
  const eventsFile = path.join(dir, 'events.json');

  function loadEvents(): AgendaEvent[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(eventsFile, 'utf8')) as { events?: AgendaEvent[] };
      return Array.isArray(parsed.events) ? parsed.events : [];
    } catch {
      return [];
    }
  }

  function saveEvents(events: AgendaEvent[]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(eventsFile, JSON.stringify({ events }, null, 2));
  }

  function readEvent(body: Partial<AgendaEvent>, current?: AgendaEvent): AgendaEvent | null {
    const type = String(body.type ?? current?.type ?? '');
    if (!EVENT_TYPES.includes(type as AgendaEvent['type'])) return null;
    const date = String(body.date ?? current?.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const personName = String(body.personName ?? current?.personName ?? '').trim();
    const title = String(body.title ?? current?.title ?? '').trim() || (type === 'aniversario' ? `Aniversário de ${personName}` : '');
    if (!title) return null;
    if (type === 'aniversario' && !personName) return null;
    return {
      id: current?.id ?? `evt-${Date.now()}`,
      title,
      type: type as AgendaEvent['type'],
      date,
      startTime: type === 'aniversario' ? '' : String(body.startTime ?? current?.startTime ?? '').slice(0, 5),
      endTime: type === 'aniversario' ? '' : String(body.endTime ?? current?.endTime ?? '').slice(0, 5),
      place: String(body.place ?? current?.place ?? '').trim(),
      description: String(body.description ?? current?.description ?? '').trim(),
      participantIds: Array.isArray(body.participantIds) ? body.participantIds.map(String) : current?.participantIds ?? [],
      personId: String(body.personId ?? current?.personId ?? ''),
      personName,
      avatar: String(body.avatar ?? current?.avatar ?? ''),
    };
  }

  function loadAuth(): AuthStore {
    try {
      return JSON.parse(fs.readFileSync(authFile, 'utf8')) as AuthStore;
    } catch {
      const salt = randomBytes(16).toString('hex');
      const store: AuthStore = {
        salt,
        passwordHash: hashPassword('unica-demo', salt),
        sessions: {},
        favorites: {},
        colleagues: [],
      };
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(authFile, JSON.stringify(store, null, 2));
      return store;
    }
  }

  function saveAuth(store: AuthStore) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify(store, null, 2));
  }

  function loadFeed(): FeedStore {
    try {
      const parsed = JSON.parse(fs.readFileSync(feedFile, 'utf8')) as FeedStore;
      return { posts: parsed.posts ?? [], reposts: parsed.reposts ?? [] };
    } catch {
      const store = { posts: seedPosts(), reposts: [] };
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(feedFile, JSON.stringify(store));
      return store;
    }
  }

  function saveFeed(store: FeedStore) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(feedFile, JSON.stringify(store));
  }

  function accountFrom(req: IncomingMessage) {
    const token = String(req.headers['x-session'] ?? '');
    if (!token) return null;
    const userId = loadAuth().sessions[token];
    return accounts.find((account) => account.id === userId)
      ?? loadAuth().colleagues.find((colleague) => colleague.id === userId)
      ?? null;
  }

  function publicPost(post: FeedPost, userId: string) {
    return {
      ...post,
      liked: post.likedBy.includes(userId),
      likes: post.likes,
      shared: false,
      commentsOpen: false,
      votedId: post.votes?.[userId] ?? null,
      comments: post.comments.map((comment) => ({
        ...comment,
        liked: comment.likedBy.includes(userId),
        likes: comment.likedBy.length || comment.likes,
      })),
    };
  }

  return async (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '';
    if (!url.startsWith('/api/login') && !url.startsWith('/api/session') && !url.startsWith('/api/logout') && !url.startsWith('/api/feed') && !url.startsWith('/api/reposts') && !url.startsWith('/api/document-favorites') && !url.startsWith('/api/colleagues') && !url.startsWith('/api/events')) {
      return next();
    }
    try {
      if (req.method === 'POST' && url === '/api/login') {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { email?: string; password?: string };
        const auth = loadAuth();
        const email = String(body.email ?? '').trim().toLowerCase();
        const password = String(body.password ?? '');
        const account = accounts.find((item) => item.email.toLowerCase() === email)
          ?? auth.colleagues.find((item) => item.email.toLowerCase() === email);
        const valid = safeEqual(hashPassword(password, auth.salt), auth.passwordHash);
        if (!account || !valid) return send(res, 401, { error: 'invalid' });
        const token = randomBytes(24).toString('hex');
        auth.sessions[token] = account.id;
        saveAuth(auth);
        send(res, 200, { token, user: account });
        return;
      }

      if (req.method === 'GET' && url === '/api/session') {
        const user = accountFrom(req);
        if (!user) return send(res, 401, { error: 'unauthorized' });
        send(res, 200, { user });
        return;
      }

      if (req.method === 'POST' && url === '/api/logout') {
        const token = String(req.headers['x-session'] ?? '');
        const auth = loadAuth();
        delete auth.sessions[token];
        saveAuth(auth);
        send(res, 200, { ok: true });
        return;
      }

      const user = accountFrom(req);
      if (!user) return send(res, 401, { error: 'unauthorized' });

      if (req.method === 'GET' && url === '/api/feed') {
        const feed = loadFeed();
        send(res, 200, {
          posts: feed.posts.map((post) => publicPost(post, user.id)),
          reposts: feed.reposts,
        });
        return;
      }

      if (req.method === 'POST' && url === '/api/feed') {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as Partial<FeedPost>;
        const text = String(body.body ?? '').trim();
        if (!text) return send(res, 400, { error: 'body' });
        const feed = loadFeed();
        const post: FeedPost = {
          id: `post-${Date.now()}`,
          kind: body.kind === 'recognition' ? 'recognition' : body.poll ? 'poll' : body.image ? 'image' : 'text',
          author: user.name,
          authorId: user.id,
          role: user.role,
          department: user.department,
          avatar: user.avatar,
          time: 'agora',
          body: text,
          image: body.image,
          attachment: body.attachment,
          likes: 0,
          likedBy: [],
          shares: 0,
          comments: [],
          poll: body.poll,
          votes: {},
          createdAt: new Date().toISOString(),
        };
        feed.posts.unshift(post);
        saveFeed(feed);
        send(res, 201, { post: publicPost(post, user.id) });
        return;
      }

      const likeMatch = /^\/api\/feed\/([^/]+)\/like$/.exec(url);
      if (req.method === 'POST' && likeMatch) {
        const feed = loadFeed();
        const post = feed.posts.find((item) => item.id === likeMatch[1]);
        if (!post) return send(res, 404, { error: 'missing' });
        const already = post.likedBy.includes(user.id);
        post.likedBy = already ? post.likedBy.filter((id) => id !== user.id) : [...post.likedBy, user.id];
        post.likes = Math.max(0, post.likes + (already ? -1 : 1));
        saveFeed(feed);
        send(res, 200, { post: publicPost(post, user.id) });
        return;
      }

      const shareMatch = /^\/api\/feed\/([^/]+)\/share$/.exec(url);
      if (req.method === 'POST' && shareMatch) {
        const feed = loadFeed();
        const post = feed.posts.find((item) => item.id === shareMatch[1]);
        if (!post) return send(res, 404, { error: 'missing' });
        post.shares += 1;
        saveFeed(feed);
        send(res, 200, { post: publicPost(post, user.id) });
        return;
      }

      const commentMatch = /^\/api\/feed\/([^/]+)\/comments$/.exec(url);
      if (req.method === 'POST' && commentMatch) {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { body?: string };
        const text = String(body.body ?? '').trim();
        if (!text) return send(res, 400, { error: 'body' });
        const feed = loadFeed();
        const post = feed.posts.find((item) => item.id === commentMatch[1]);
        if (!post) return send(res, 404, { error: 'missing' });
        post.comments.push({
          id: `c-${Date.now()}`,
          author: user.name,
          authorId: user.id,
          avatar: user.avatar,
          body: text,
          time: 'agora',
          likes: 0,
          likedBy: [],
        });
        saveFeed(feed);
        send(res, 201, { post: publicPost(post, user.id) });
        return;
      }

      const deleteComment = /^\/api\/feed\/([^/]+)\/comments\/([^/]+)$/.exec(url);
      if (req.method === 'DELETE' && deleteComment) {
        const feed = loadFeed();
        const post = feed.posts.find((item) => item.id === deleteComment[1]);
        if (!post) return send(res, 404, { error: 'missing' });
        const comment = post.comments.find((item) => item.id === deleteComment[2]);
        if (!comment) return send(res, 404, { error: 'missing' });
        const allowed = comment.authorId === user.id || post.authorId === user.id || isLeader(user);
        if (!allowed) return send(res, 403, { error: 'forbidden' });
        post.comments = post.comments.filter((item) => item.id !== comment.id);
        saveFeed(feed);
        send(res, 200, { post: publicPost(post, user.id) });
        return;
      }

      const repostMatch = /^\/api\/feed\/([^/]+)\/repost$/.exec(url);
      if (req.method === 'POST' && repostMatch) {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { note?: string };
        const feed = loadFeed();
        const original = feed.posts.find((item) => item.id === repostMatch[1]);
        if (!original) return send(res, 404, { error: 'missing' });
        if (feed.reposts.some((item) => item.userId === user.id && item.originalId === original.id)) {
          return send(res, 409, { error: 'duplicate' });
        }
        const repost: Repost = {
          id: `repost-${Date.now()}`,
          userId: user.id,
          userName: user.name,
          avatar: user.avatar,
          originalId: original.id,
          note: String(body.note ?? '').trim(),
          createdAt: new Date().toISOString(),
        };
        feed.reposts.unshift(repost);
        saveFeed(feed);
        send(res, 201, { repost });
        return;
      }

      const undo = /^\/api\/reposts\/([^/]+)$/.exec(url);
      if (req.method === 'DELETE' && undo) {
        const feed = loadFeed();
        const repost = feed.reposts.find((item) => item.id === undo[1]);
        if (!repost) return send(res, 404, { error: 'missing' });
        if (repost.userId !== user.id && !isLeader(user)) return send(res, 403, { error: 'forbidden' });
        feed.reposts = feed.reposts.filter((item) => item.id !== repost.id);
        saveFeed(feed);
        send(res, 200, { ok: true });
        return;
      }

      if (req.method === 'GET' && url === '/api/document-favorites') {
        send(res, 200, { ids: loadAuth().favorites[user.id] ?? [] });
        return;
      }

      if (req.method === 'PUT' && url === '/api/document-favorites') {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { ids?: string[] };
        const auth = loadAuth();
        auth.favorites[user.id] = Array.isArray(body.ids) ? body.ids : [];
        saveAuth(auth);
        send(res, 200, { ids: auth.favorites[user.id] });
        return;
      }

      if (req.method === 'GET' && url === '/api/colleagues') {
        send(res, 200, { colleagues: loadAuth().colleagues });
        return;
      }

      if (req.method === 'POST' && url === '/api/colleagues') {
        if (!isLeader(user)) return send(res, 403, { error: 'forbidden' });
        const body = JSON.parse((await readBody(req)).toString('utf8')) as Partial<Colleague>;
        const name = String(body.name ?? '').trim();
        const email = String(body.email ?? '').trim().toLowerCase();
        const role = String(body.role ?? '').trim();
        const funcao = String(body.funcao ?? '');
        const ramal = String(body.ramal ?? '').trim();
        if (!name || !email || !role || !FUNCOES.includes(funcao)) return send(res, 400, { error: 'fields' });
        if (ramal && !/^\d{3}$/.test(ramal)) return send(res, 400, { error: 'ramal' });
        const auth = loadAuth();
        if (accounts.some((item) => item.email === email) || auth.colleagues.some((item) => item.email === email)) {
          return send(res, 409, { error: 'email' });
        }
        const colleague: Colleague = {
          id: `col-${Date.now()}`,
          name,
          email,
          role,
          department: 'Atendimento',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
          phone: String(body.phone ?? '').trim(),
          ramal,
          funcao,
        };
        auth.colleagues.unshift(colleague);
        saveAuth(auth);
        send(res, 201, { colleague });
        return;
      }

      if (req.method === 'GET' && url === '/api/events') {
        send(res, 200, { events: loadEvents() });
        return;
      }

      if (req.method === 'POST' && url === '/api/events') {
        if (!isLeader(user)) return send(res, 403, { error: 'forbidden' });
        const body = JSON.parse((await readBody(req)).toString('utf8')) as Partial<AgendaEvent>;
        const event = readEvent(body);
        if (!event) return send(res, 400, { error: 'fields' });
        const events = loadEvents();
        if (event.type === 'aniversario' && event.personId) {
          const existing = events.find((item) => item.type === 'aniversario' && item.personId === event.personId);
          if (existing) {
            const updated = { ...event, id: existing.id };
            saveEvents(events.map((item) => item.id === existing.id ? updated : item));
            send(res, 200, { event: updated });
            return;
          }
        }
        events.unshift(event);
        saveEvents(events);
        send(res, 201, { event });
        return;
      }

      const eventMatch = /^\/api\/events\/([^/]+)$/.exec(url);
      if (eventMatch && (req.method === 'PUT' || req.method === 'DELETE')) {
        if (!isLeader(user)) return send(res, 403, { error: 'forbidden' });
        const events = loadEvents();
        const current = events.find((item) => item.id === eventMatch[1]);
        if (!current) return send(res, 404, { error: 'missing' });
        if (req.method === 'DELETE') {
          saveEvents(events.filter((item) => item.id !== current.id));
          send(res, 200, { ok: true });
          return;
        }
        const body = JSON.parse((await readBody(req)).toString('utf8')) as Partial<AgendaEvent>;
        const event = readEvent(body, current);
        if (!event) return send(res, 400, { error: 'fields' });
        saveEvents(events.map((item) => item.id === current.id ? event : item));
        send(res, 200, { event });
        return;
      }

      send(res, 404, { error: 'not-found' });
    } catch {
      send(res, 400, { error: 'bad-request' });
    }
  };
}
