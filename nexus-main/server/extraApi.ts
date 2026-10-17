import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Connect } from 'vite';
import { samplePosts } from '../src/components/social/samplePosts';
import { teamRoster } from '../src/data/team';
import { LOGIN_REQUIRED } from '../src/lib/loginGate';
import { builtinAccounts } from './auth/accounts';
import { hashPassword } from './auth/credentials.mjs';
import { performLogin, performLogout, performSession } from './auth/flow.mjs';
import { applyAuthResult } from './auth/http.mjs';
import { createLocalStore, localUserFromRequest } from './auth/localStore.mjs';
import { isLeader } from './auth/permissions.mjs';
import { handleCelebrations } from './celebrations/api.mjs';
import { dataDir } from './dataDir.mjs';
import { handleUpload } from './uploads';

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
  media?: { kind: 'gif' | 'sticker'; url: string };
  createdAt?: string;
};

type Reaction = { userId: string; name: string; kind: 'like' | 'love' };

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
  images?: string[];
  attachment?: { type: 'video' | 'document'; name: string; url?: string };
  likes: number;
  likedBy: string[];
  reactions?: Reaction[];
  shares: number;
  comments: Comment[];
  bannerTitle?: string;
  recognizedName?: string;
  tag?: string;
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

type FeedStore = { posts: FeedPost[]; reposts: Repost[]; saved?: Record<string, string[]> };

const helena: Account = {
  id: 'helena',
  name: 'Helena Duarte',
  role: 'Gerente',
  department: 'Gestão',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HelenaDuarte',
  email: 'helena.duarte@unica.local',
};

const FUNCOES = ['Líder', 'Supervisor', 'Chat', 'E-mail', 'Ligação'];
const UNIQUE_FUNCOES = ['Líder', 'Supervisor'];
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
  everyone: boolean;
  personId: string;
  personName: string;
  avatar: string;
};

function canRecognize(user: { id: string; role: string; department?: string }, dir: string) {
  try {
    const store = JSON.parse(fs.readFileSync(path.join(dir, 'institution.json'), 'utf8')) as { settings?: { recognition?: { mode?: string; userIds?: string[] } } };
    const policy = store.settings?.recognition ?? { mode: 'everyone', userIds: [] };
    if (policy.mode === 'everyone') return true;
    if (policy.mode === 'selected') return (policy.userIds ?? []).includes(user.id);
    return isLeader(user);
  } catch {
    return true;
  }
}

const accounts: Account[] = builtinAccounts();

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

function cleanImage(value: unknown) {
  if (typeof value !== 'string' || !value || value.length > 2_000 || value.includes('..')) return undefined;
  if (value.startsWith('/api/uploads/up-') || value.startsWith('https://') || value.startsWith('http://') || value.startsWith('/')) return value;
  return undefined;
}

function cleanImages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(cleanImage).filter((item): item is string => Boolean(item)).slice(0, 10);
}

function cleanAttachment(value: unknown): FeedPost['attachment'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as { type?: string; name?: string; url?: string };
  if (item.type !== 'video' && item.type !== 'document') return undefined;
  const name = String(item.name ?? '').trim().slice(0, 180);
  if (!name) return undefined;
  const url = typeof item.url === 'string' && item.url.startsWith('/api/uploads/up-') ? item.url : undefined;
  if (!url) return undefined;
  return { type: item.type, name, url };
}

function cleanMedia(value: unknown): Comment['media'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as { kind?: string; url?: string };
  const url = String(item.url ?? '');
  const allowed = url.startsWith('/api/uploads/up-') || /^\/figurinhas\/[a-z0-9-]+\.svg$/.test(url);
  if (!allowed) return undefined;
  if (item.kind !== 'gif' && item.kind !== 'sticker') return undefined;
  return { kind: item.kind, url };
}

function reactionsOf(post: FeedPost): Reaction[] {
  if (Array.isArray(post.reactions)) return post.reactions;
  return (post.likedBy ?? []).map((id) => ({ userId: id, name: 'Colaborador', kind: 'like' as const }));
}

function formatWhen(iso?: string) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
  const dir = dataDir();
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
      everyone: Boolean(body.everyone ?? current?.everyone),
      participantIds: Boolean(body.everyone ?? current?.everyone) ? [] : (Array.isArray(body.participantIds) ? body.participantIds.map(String) : current?.participantIds ?? []),
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
        passwordHash: hashPassword('1234', salt),
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
      return { posts: parsed.posts ?? [], reposts: parsed.reposts ?? [], saved: parsed.saved ?? {} };
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
    return localUserFromRequest(req, authFile, accounts) ?? (LOGIN_REQUIRED ? null : accounts[0]);
  }

  function publicPost(post: FeedPost, userId: string, savedIds: string[]) {
    const reactions = reactionsOf(post);
    const mine = reactions.find((item) => item.userId === userId);
    const images = post.images?.length ? post.images : post.kind === 'image' && post.image ? [post.image] : [];
    return {
      id: post.id,
      kind: post.kind,
      author: post.author,
      authorId: post.authorId,
      role: post.role,
      department: post.department,
      avatar: post.avatar,
      time: formatWhen(post.createdAt) || post.time,
      body: post.body,
      image: images[0],
      images,
      attachment: post.attachment,
      likes: Array.isArray(post.reactions) ? reactions.length : post.likes,
      liked: Boolean(mine),
      reaction: mine?.kind ?? null,
      reactors: reactions.map((item) => ({ name: item.name, kind: item.kind })),
      shares: post.shares,
      shared: false,
      commentsOpen: false,
      comments: (Array.isArray(post.comments) ? post.comments : []).map((comment) => ({
        id: comment.id,
        author: comment.author,
        authorId: comment.authorId,
        avatar: comment.avatar,
        body: comment.body,
        time: formatWhen(comment.createdAt) || comment.time,
        likes: comment.likedBy?.length ?? comment.likes,
        liked: (comment.likedBy ?? []).includes(userId),
        media: comment.media,
      })),
      bannerTitle: post.bannerTitle,
      recognizedName: post.recognizedName,
      tag: post.tag,
      poll: post.poll,
      votedId: post.votes?.[userId] ?? null,
      eventWhen: post.eventWhen,
      eventWhere: post.eventWhere,
      saved: savedIds.includes(post.id),
      createdAt: post.createdAt,
    };
  }

  function muralUser(req: IncomingMessage) {
    if (!LOGIN_REQUIRED) {
      const demo = String(req.headers['x-unica-demo'] ?? '');
      if (demo === 'helena') return helena;
      if (demo === 'matheus') return accounts[0];
    }
    return accountFrom(req);
  }

  return async (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '';
    const feedRoute = url === '/api/feed' || url.startsWith('/api/feed/');
    const uploadRoute = url.startsWith('/api/uploads');
    const celebrationRoute = url === '/api/celebrations' || url.startsWith('/api/celebrations/');
    if (!url.startsWith('/api/login') && !url.startsWith('/api/session') && !url.startsWith('/api/logout') && !feedRoute && !uploadRoute && !celebrationRoute && !url.startsWith('/api/reposts') && !url.startsWith('/api/document-favorites') && !url.startsWith('/api/colleagues') && !url.startsWith('/api/events')) {
      return next();
    }
    try {
      if (req.method === 'POST' && url === '/api/login') {
        let body: { email?: string; password?: string } = {};
        try {
          body = JSON.parse((await readBody(req)).toString('utf8') || '{}') as { email?: string; password?: string };
        } catch {
          applyAuthResult(res, { status: 400, body: { error: 'fields' } });
          return;
        }
        applyAuthResult(res, await performLogin(createLocalStore(authFile, accounts), body));
        return;
      }

      if (req.method === 'GET' && url === '/api/session') {
        applyAuthResult(res, await performSession(createLocalStore(authFile, accounts), req.headers.cookie));
        return;
      }

      if (req.method === 'POST' && url === '/api/logout') {
        applyAuthResult(res, await performLogout(createLocalStore(authFile, accounts), req.headers.cookie));
        return;
      }

      const user = (feedRoute || uploadRoute || celebrationRoute) ? muralUser(req) : accountFrom(req);
      if (!user) return send(res, 401, { error: 'unauthorized' });
      if (celebrationRoute) {
        await handleCelebrations(req, res, url, user, dir, isLeader(user));
        return;
      }

      if (uploadRoute) {
        await handleUpload(req, res, url, user.id, dir);
        return;
      }

      if (req.method === 'GET' && url === '/api/feed') {
        const feed = loadFeed();
        const saved = feed.saved?.[user.id] ?? [];
        send(res, 200, {
          posts: feed.posts.map((post) => publicPost(post, user.id, saved)),
          reposts: feed.reposts,
          saved,
        });
        return;
      }

      if (req.method === 'POST' && url === '/api/feed') {
        try {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as Partial<FeedPost> & { images?: unknown };
        const text = String(body.body ?? '').trim();
        const images = cleanImages(body.images ?? (body.image ? [body.image] : []));
        const attachment = cleanAttachment(body.attachment);
        const labels = Array.isArray(body.poll)
          ? body.poll.map((item) => String(item.label ?? '').trim()).filter(Boolean).slice(0, 12)
          : [];
        const unique = new Set(labels.map((label) => label.toLowerCase()));
        if (labels.length > 0 && (labels.length < 2 || unique.size !== labels.length)) return send(res, 400, { error: 'poll' });
        const poll = labels.length ? labels.map((label, index) => ({ id: `opt-${index + 1}`, label, votes: 0 })) : undefined;
        if (!text && images.length === 0 && !attachment && !poll) return send(res, 400, { error: 'body' });
        const recognition = body.kind === 'recognition';
        if (recognition && !canRecognize(user, dir)) return send(res, 403, { error: 'forbidden' });
        const recognizedName = String(body.recognizedName ?? '').trim();
        if (recognition && !recognizedName) return send(res, 400, { error: 'person' });
        const feed = loadFeed();
        const recent = feed.posts.find((item) => item.authorId === user.id && item.body === text && Date.now() - Date.parse(item.createdAt) < 5000);
        if (recent && recent.images?.join() === images.join()) {
          send(res, 200, { post: publicPost(recent, user.id, feed.saved?.[user.id] ?? []) });
          return;
        }
        const post: FeedPost = {
          id: `post-${Date.now()}`,
          kind: recognition ? 'recognition' : poll ? 'poll' : images.length ? 'image' : 'text',
          author: user.name,
          authorId: user.id,
          role: user.role,
          department: user.department,
          avatar: user.avatar,
          time: 'agora',
          body: text,
          image: images[0],
          images,
          attachment,
          likes: 0,
          likedBy: [],
          reactions: [],
          shares: 0,
          comments: [],
          poll,
          votes: {},
          recognizedName: recognition ? recognizedName : undefined,
          tag: recognition ? String(body.tag ?? '').trim() : undefined,
          createdAt: new Date().toISOString(),
        };
        feed.posts.unshift(post);
        saveFeed(feed);
        send(res, 201, { post: publicPost(post, user.id, feed.saved?.[user.id] ?? []) });
        } catch {
          if (!res.headersSent) send(res, 500, { error: 'publish' });
        }
        return;
      }

      const likeMatch = /^\/api\/feed\/([^/]+)\/like$/.exec(url);
      if (req.method === 'POST' && likeMatch) {
        const body = JSON.parse((await readBody(req)).toString('utf8') || '{}') as { kind?: string };
        const kind = body.kind === 'love' ? 'love' : body.kind === 'like' ? 'like' : '';
        if (!kind) return send(res, 400, { error: 'kind' });
        const feed = loadFeed();
        const post = feed.posts.find((item) => item.id === likeMatch[1]);
        if (!post) return send(res, 404, { error: 'missing' });
        const reactions = reactionsOf(post).filter((item) => item.userId !== user.id);
        const current = reactionsOf(post).find((item) => item.userId === user.id);
        post.reactions = current?.kind === kind ? reactions : [...reactions, { userId: user.id, name: user.name, kind }];
        post.likedBy = post.reactions.map((item) => item.userId);
        post.likes = post.reactions.length;
        saveFeed(feed);
        send(res, 200, { post: publicPost(post, user.id, feed.saved?.[user.id] ?? []) });
        return;
      }

      const voteMatch = /^\/api\/feed\/([^/]+)\/vote$/.exec(url);
      if (req.method === 'POST' && voteMatch) {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { optionId?: string };
        const feed = loadFeed();
        const post = feed.posts.find((item) => item.id === voteMatch[1]);
        if (!post?.poll) return send(res, 404, { error: 'missing' });
        const optionId = String(body.optionId ?? '');
        if (!post.poll.some((item) => item.id === optionId)) return send(res, 400, { error: 'option' });
        post.votes = post.votes ?? {};
        const previous = post.votes[user.id];
        if (previous === optionId) {
          delete post.votes[user.id];
          const current = post.poll.find((item) => item.id === optionId);
          if (current) current.votes = Math.max(0, current.votes - 1);
        } else {
          if (previous) {
            const old = post.poll.find((item) => item.id === previous);
            if (old) old.votes = Math.max(0, old.votes - 1);
          }
          post.votes[user.id] = optionId;
          const next = post.poll.find((item) => item.id === optionId);
          if (next) next.votes += 1;
        }
        saveFeed(feed);
        send(res, 200, { post: publicPost(post, user.id, feed.saved?.[user.id] ?? []) });
        return;
      }

      const saveMatch = /^\/api\/feed\/([^/]+)\/save$/.exec(url);
      if (req.method === 'POST' && saveMatch) {
        const feed = loadFeed();
        const post = feed.posts.find((item) => item.id === saveMatch[1]);
        if (!post) return send(res, 404, { error: 'missing' });
        feed.saved = feed.saved ?? {};
        const list = new Set(feed.saved[user.id] ?? []);
        if (list.has(post.id)) list.delete(post.id);
        else list.add(post.id);
        feed.saved[user.id] = [...list];
        saveFeed(feed);
        send(res, 200, { post: publicPost(post, user.id, feed.saved[user.id]), saved: feed.saved[user.id] });
        return;
      }

      const shareMatch = /^\/api\/feed\/([^/]+)\/share$/.exec(url);
      if (req.method === 'POST' && shareMatch) {
        const feed = loadFeed();
        const post = feed.posts.find((item) => item.id === shareMatch[1]);
        if (!post) return send(res, 404, { error: 'missing' });
        post.shares += 1;
        saveFeed(feed);
        send(res, 200, { post: publicPost(post, user.id, feed.saved?.[user.id] ?? []) });
        return;
      }

      const commentMatch = /^\/api\/feed\/([^/]+)\/comments$/.exec(url);
      if (req.method === 'POST' && commentMatch) {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { body?: string; media?: unknown };
        const text = String(body.body ?? '').trim();
        const media = cleanMedia(body.media);
        if (!text && !media) return send(res, 400, { error: 'body' });
        if (text.length > 2000) return send(res, 400, { error: 'body' });
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
          media,
          createdAt: new Date().toISOString(),
        });
        saveFeed(feed);
        send(res, 201, { post: publicPost(post, user.id, feed.saved?.[user.id] ?? []) });
        return;
      }

      const commentLike = /^\/api\/feed\/([^/]+)\/comments\/([^/]+)\/like$/.exec(url);
      if (req.method === 'POST' && commentLike) {
        const feed = loadFeed();
        const post = feed.posts.find((item) => item.id === commentLike[1]);
        const comment = post?.comments.find((item) => item.id === commentLike[2]);
        if (!post || !comment) return send(res, 404, { error: 'missing' });
        comment.likedBy = comment.likedBy ?? [];
        const already = comment.likedBy.includes(user.id);
        comment.likedBy = already ? comment.likedBy.filter((id) => id !== user.id) : [...comment.likedBy, user.id];
        comment.likes = comment.likedBy.length;
        saveFeed(feed);
        send(res, 200, { post: publicPost(post, user.id, feed.saved?.[user.id] ?? []) });
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
        send(res, 200, { post: publicPost(post, user.id, feed.saved?.[user.id] ?? []) });
        return;
      }

      const deletePost = /^\/api\/feed\/([^/]+)$/.exec(url);
      if (req.method === 'DELETE' && deletePost) {
        const feed = loadFeed();
        const index = feed.posts.findIndex((item) => item.id === deletePost[1]);
        if (index < 0) return send(res, 404, { error: 'missing' });
        const post = feed.posts[index];
        const allowed = post.authorId === user.id || post.author === user.name || isLeader(user);
        if (!allowed) return send(res, 403, { error: 'forbidden' });
        feed.posts.splice(index, 1);
        feed.reposts = feed.reposts.filter((item) => item.originalId !== post.id);
        saveFeed(feed);
        send(res, 200, { ok: true });
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
        if (ramal && !/^\d{3,4}$/.test(ramal)) return send(res, 400, { error: 'ramal' });
        const auth = loadAuth();
        if (accounts.some((item) => item.email === email) || auth.colleagues.some((item) => item.email === email)) {
          return send(res, 409, { error: 'email' });
        }
        const roleTaken = UNIQUE_FUNCOES.includes(funcao) && (
          teamRoster.some((item) => item.funcao === funcao) || auth.colleagues.some((item) => item.funcao === funcao)
        );
        if (roleTaken) return send(res, 409, { error: 'unique-role' });
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
