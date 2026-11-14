import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Connect } from 'vite';
import { teamRoster } from '../src/data/team.js';
import { createFeedStore, FEED_LOAD_UNAVAILABLE, FEED_UNAVAILABLE } from './feedStore.mjs';
import { LOGIN_REQUIRED } from '../src/lib/loginGate.js';
import { builtinAccounts } from './auth/accounts.js';
import { hashPassword } from './auth/credentials.mjs';
import { performLogin, performLogout, performSession } from './auth/flow.mjs';
import { applyAuthResult } from './auth/http.mjs';
import { createLocalStore, localUserFromRequest } from './auth/localStore.mjs';
import { isLeader } from './auth/permissions.mjs';
import { handleCelebrations } from './celebrations/api.mjs';
import { gifMediaUrl, searchGifs } from './giphy.mjs';
import { handleStickerRequest, stickerMediaUrl } from './stickers.mjs';
import { dataDir } from './dataDir.mjs';
import { handleUpload } from './uploads.js';
import { handleGoals } from './goalsApi.mjs';
import { canSeeMood, canSeePost, cleanAudience, cleanMood, cleanMoodAudience } from './postPrivacy.mjs';

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
  media?: { kind: 'gif' | 'sticker' | 'image' | 'video'; url: string };
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
  blocks?: ({ type: 'text'; text: string } | { type: 'image'; url: string; display?: 'sticker' | 'gif' })[];
  attachment?: { type: 'video' | 'document' | 'audio'; name: string; url?: string; start?: number; duration?: number };
  likes: number;
  likedBy: string[];
  reactions?: Reaction[];
  shares: number;
  comments: Comment[];
  bannerTitle?: string;
  recognizedName?: string;
  recognizedBy?: string;
  receivedRecognition?: boolean;
  caption?: string;
  comment?: string;
  tag?: string;
  journalCategory?: string;
  journalExcerpt?: string;
  nonce?: string;
  poll?: { id: string; label: string; votes: number }[];
  votes?: Record<string, string>;
  eventWhen?: string;
  eventWhere?: string;
  audience?: 'team' | 'management';
  mood?: string;
  moodAudience?: 'team' | 'management' | 'self';
  shareMood?: boolean;
  journalHref?: string;
  createdAt: string;
  updatedAt?: string;
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

type FeedStore = {
  posts: FeedPost[];
  reposts: Repost[];
  saved?: Record<string, string[]>;
  deletedIds?: string[];
  deletedRepostIds?: string[];
};

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
  const item = value as { type?: string; name?: string; url?: string; start?: number; duration?: number };
  if (item.type !== 'video' && item.type !== 'document' && item.type !== 'audio') return undefined;
  const name = String(item.name ?? '').trim().slice(0, 180);
  if (!name) return undefined;
  const url = typeof item.url === 'string' && item.url.startsWith('/api/uploads/up-') ? item.url : undefined;
  if (!url) return undefined;
  if (item.type !== 'audio') return { type: item.type, name, url };
  const start = Number(item.start ?? 0);
  const duration = Number(item.duration ?? 0);
  const roundTime = (value: number) => Math.round(value * 100) / 100;
  const clip = Number.isFinite(start) && Number.isFinite(duration) && start >= 0 && duration > 0 && duration <= 120 * 60
    ? { start: roundTime(start), duration: roundTime(duration) }
    : {};
  return { type: item.type, name, url, ...clip };
}

function cleanBlocks(value: unknown): FeedPost['blocks'] {
  if (!Array.isArray(value)) return [];
  const blocks: NonNullable<FeedPost['blocks']> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const block = entry as { type?: string; text?: string; url?: string; display?: string };
    if (block.type === 'text') {
      const text = String(block.text ?? '').trim().slice(0, 4000);
      if (text) blocks.push({ type: 'text', text });
    }
    if (block.type === 'image') {
      const url = cleanImage(block.url);
      const display = block.display === 'sticker' || block.display === 'gif' ? block.display : undefined;
      if (url) blocks.push(display ? { type: 'image', url, display } : { type: 'image', url });
    }
    if (blocks.length >= 20) break;
  }
  return blocks;
}

function cleanMedia(value: unknown): Comment['media'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as { kind?: string; url?: string };
  const url = String(item.url ?? '');
  const allowed = url.startsWith('/api/uploads/up-')
    || /^\/figurinhas\/[a-z0-9-]+\.(svg|png|jpe?g|webp)$/.test(url)
    || /^\/gifs\/[a-z0-9-]+\.gif$/.test(url)
    || /^https:\/\/fonts\.gstatic\.com\/s\/e\/notoemoji\/latest\/[a-z0-9_]+\/512\.webp$/.test(url)
    || (url.startsWith('https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/') && /_3d(?:_default)?\.png$/.test(url))
    || Boolean(gifMediaUrl(url))
    || Boolean(stickerMediaUrl(url));
  if (!allowed) return undefined;
  if (item.kind !== 'gif' && item.kind !== 'sticker' && item.kind !== 'image' && item.kind !== 'video') return undefined;
  if ((item.kind === 'image' || item.kind === 'video') && !url.startsWith('/api/uploads/up-')) return undefined;
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
  const eventsFile = path.join(dir, 'events.json');
  const mural = createFeedStore({ dir });

  function storageFailed(result: { error?: string; kind?: string } | null | undefined) {
    return Boolean(result && (result.error === 'storage' || result.kind === 'storage'));
  }

  function failFeed(res: ServerResponse, load = false) {
    send(res, 503, { error: 'storage', message: load ? FEED_LOAD_UNAVAILABLE : FEED_UNAVAILABLE });
  }

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

  const journalFile = path.join(dir, 'journal.json');
  const retiredDrafts = ['j-rascunho'];

  function loadJournal() {
    try {
      const parsed = JSON.parse(fs.readFileSync(journalFile, 'utf8')) as { initialized?: boolean; articles?: unknown; deletedIds?: unknown };
      return {
        initialized: Boolean(parsed.initialized),
        articles: Array.isArray(parsed.articles) ? parsed.articles : [],
        deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds.filter((id): id is string => typeof id === 'string') : [],
      };
    } catch {
      return { initialized: false, articles: [] as unknown[], deletedIds: [] as string[] };
    }
  }

  function saveJournal(store: { initialized: boolean; articles: Record<string, unknown>[]; deletedIds: string[] }) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(journalFile, JSON.stringify(store));
  }

  function presentJournal(store: { initialized: boolean; articles: unknown[]; deletedIds: string[] }) {
    const deletedIds = [...new Set([...store.deletedIds, ...retiredDrafts])].slice(0, 2000);
    const blocked = new Set(deletedIds);
    const articles = store.articles.filter((article) => {
      if (!article || typeof article !== 'object') return false;
      const id = String((article as { id?: unknown }).id ?? '');
      return Boolean(id) && !blocked.has(id);
    });
    return { initialized: store.initialized, articles, deletedIds };
  }

  function clip(value: unknown, max: number) {
    return String(value ?? '').slice(0, max);
  }

  function cleanJournalArticle(value: unknown) {
    if (!value || typeof value !== 'object') return null;
    const item = value as Record<string, unknown>;
    const id = clip(item.id, 80).trim();
    const category = clip(item.category, 40);
    const status = clip(item.status, 20);
    if (!id) return null;
    if (!['processos', 'urgente', 'social', 'treinamentos'].includes(category)) return null;
    if (!['published', 'draft', 'removed'].includes(status)) return null;
    const media = Array.isArray(item.media) ? item.media.slice(0, 8).flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const row = entry as Record<string, unknown>;
      const kind = clip(row.kind, 20);
      const mediaId = clip(row.id, 80).trim();
      const url = clip(row.url, 2_000_000);
      if (!mediaId || !url || !['image', 'audio', 'video', 'document'].includes(kind)) return [];
      return [{
        id: mediaId,
        name: clip(row.name, 180),
        kind,
        url,
        ...(typeof row.start === 'number' ? { start: row.start } : {}),
        ...(typeof row.duration === 'number' ? { duration: row.duration } : {}),
      }];
    }) : [];
    const comments = Array.isArray(item.comments) ? item.comments.slice(0, 200).flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const row = entry as Record<string, unknown>;
      const commentId = clip(row.id, 80).trim();
      if (!commentId) return [];
      return [{ id: commentId, author: clip(row.author, 120), text: clip(row.text, 4000), date: clip(row.date, 40) }];
    }) : [];
    return {
      id,
      title: clip(item.title, 150),
      content: clip(item.content, 500_000),
      category,
      cover: clip(item.cover, 2_000_000),
      date: clip(item.date, 40),
      author: clip(item.author, 120),
      status,
      pinned: Boolean(item.pinned) && status === 'published',
      ...(typeof item.pinnedAt === 'string' ? { pinnedAt: clip(item.pinnedAt, 40) } : {}),
      media,
      comments,
      reactions: Math.max(0, Number(item.reactions) || 0),
      reactedBy: Array.isArray(item.reactedBy) ? item.reactedBy.filter((name): name is string => typeof name === 'string').slice(0, 500) : [],
    };
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

  type FeedChange = {
    store: FeedStore;
    skip?: boolean;
    post?: FeedPost;
    duplicate?: FeedPost;
    already?: boolean;
    missing?: boolean;
    forbidden?: boolean;
    badOption?: boolean;
    badBody?: boolean;
    saved?: string[];
    repost?: Repost;
  };

  async function applyFeed(res: ServerResponse, mutator: (feed: FeedStore) => FeedChange | Promise<FeedChange>) {
    const result = await mural.mutate(mutator as never);
    if (storageFailed(result)) {
      failFeed(res);
      return null;
    }
    return result as FeedChange;
  }

  function accountFrom(req: IncomingMessage) {
    return localUserFromRequest(req, authFile, accounts) ?? (LOGIN_REQUIRED ? null : accounts[0]);
  }

  function openPost(feed: FeedStore, id: string, user: Account) {
    const post = feed.posts.find((item) => item.id === id);
    return post && canSeePost(post, user) ? post : null;
  }

  function applySharedMood(userId: string, emoji: string, visibility: 'team' | 'management' | 'self', postId: string) {
    const file = path.join(dir, 'institution.json');
    let store: { moods?: Record<string, unknown> } = {};
    try {
      store = JSON.parse(fs.readFileSync(file, 'utf8')) as { moods?: Record<string, unknown> };
    } catch {
      store = {};
    }
    const moods = store.moods ?? {};
    const current = moods[userId];
    if (current && typeof current === 'object' && (current as { postId?: string }).postId === postId) return;
    const previous = current && typeof current === 'object' ? current as { emoji?: string; visibility?: string; shared?: string } : null;
    const shared = typeof current === 'string'
      ? current
      : previous?.visibility === 'team'
        ? String(previous.emoji ?? previous.shared ?? '')
        : String(previous?.shared ?? '');
    moods[userId] = {
      emoji,
      visibility,
      shared: visibility === 'team' ? emoji : shared,
      postId,
    };
    store.moods = moods;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(store, null, 2));
  }

  function publicPost(post: FeedPost, user: Account, savedIds: string[]) {
    const userId = user.id;
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
      blocks: post.blocks,
      attachment: post.attachment,
      likes: typeof post.likes === 'number' ? post.likes : reactions.length,
      liked: reactions.some((item) => item.userId === userId && item.kind === 'like'),
      reaction: mine?.kind ?? null,
      myReactions: [...new Set(reactions.filter((item) => item.userId === userId).map((item) => item.kind))],
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
      journalHref: post.journalHref,
      journalCategory: post.journalCategory,
      journalExcerpt: post.journalExcerpt,
      recognizedName: post.recognizedName,
      recognizedBy: post.recognizedBy,
      receivedRecognition: post.receivedRecognition,
      caption: post.caption,
      comment: post.comment,
      tag: post.tag,
      poll: post.poll,
      votedId: post.votes?.[userId] ?? null,
      eventWhen: post.eventWhen,
      eventWhere: post.eventWhere,
      saved: savedIds.includes(post.id),
      createdAt: post.createdAt,
      audience: post.audience === 'management' ? 'management' : undefined,
      mood: canSeeMood(post, user) ? post.mood : undefined,
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
    const incoming = String(req.url ?? '');
    if (incoming.includes('nested=')) {
      const current = incoming.startsWith('http') ? new URL(incoming) : new URL(incoming, 'http://internal');
      const nested = current.searchParams.get('nested');
      if (nested) {
        current.searchParams.delete('nested');
        const nestedPath = `/${nested.replace(/^\/+/, '')}`;
        const restored = (nestedPath.startsWith('/api/') ? nestedPath : `/api${nestedPath}`).replace(/\/+$/, '') || '/';
        const query = current.searchParams.toString();
        req.url = `${restored}${query ? `?${query}` : ''}`;
      }
    }
    const url = req.url?.split('?')[0] ?? '';
    const feedRoute = url === '/api/feed' || url.startsWith('/api/feed/');
    const uploadRoute = url.startsWith('/api/uploads');
    const celebrationRoute = url === '/api/celebrations' || url.startsWith('/api/celebrations/');
    const gifRoute = url === '/api/gifs';
    const stickerRoute = url === '/api/stickers' || url.startsWith('/api/stickers/');
    const goalsRoute = url === '/api/goals' || url.startsWith('/api/goals/');
    const journalRoute = url === '/api/journal';
    if (!url.startsWith('/api/login') && !url.startsWith('/api/session') && !url.startsWith('/api/logout') && !feedRoute && !uploadRoute && !celebrationRoute && !gifRoute && !stickerRoute && !goalsRoute && !journalRoute && !url.startsWith('/api/reposts') && !url.startsWith('/api/document-favorites') && !url.startsWith('/api/colleagues') && !url.startsWith('/api/events')) {
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

      if (stickerRoute) {
        const handled = await handleStickerRequest(req, res, url, dir, muralUser(req));
        if (!handled) send(res, 404, { error: 'missing' });
        return;
      }

      const user = (feedRoute || uploadRoute || celebrationRoute || gifRoute || goalsRoute || journalRoute) ? muralUser(req) : accountFrom(req);
      if (goalsRoute) {
        if (!user) return send(res, 401, { error: 'unauthorized' });
        await handleGoals(req, res, user, dir, loadAuth().colleagues, teamRoster, send, readBody);
        return;
      }
      if (!user) return send(res, 401, { error: 'unauthorized' });
      if (req.method === 'GET' && gifRoute) {
        const params = new URL(req.url ?? '', 'http://internal').searchParams;
        const result = await searchGifs(params.get('q') ?? '');
        send(res, result.status, result.body);
        return;
      }
      if (celebrationRoute) {
        await handleCelebrations(req, res, url, user, dir, isLeader(user));
        return;
      }

      if (uploadRoute) {
        await handleUpload(req, res, url, user.id, dir);
        return;
      }

      if (req.method === 'GET' && url === '/api/feed') {
        const loaded = await mural.load();
        if (storageFailed(loaded)) {
          failFeed(res, true);
          return;
        }
        const feed = loaded.store as FeedStore;
        const visible = feed.posts.filter((post) => canSeePost(post, user));
        const visibleIds = new Set(visible.map((post) => post.id));
        const saved = (feed.saved?.[user.id] ?? []).filter((id) => visibleIds.has(id));
        send(res, 200, {
          posts: visible.map((post) => publicPost(post, user, saved)),
          reposts: feed.reposts.filter((item) => visibleIds.has(item.originalId)),
          saved,
        });
        return;
      }

      if (req.method === 'POST' && url === '/api/feed') {
        try {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as Partial<FeedPost> & { images?: unknown; blocks?: unknown; journalHref?: string; nonce?: string };
        const blocks = cleanBlocks(body.blocks);
        const text = blocks?.length ? blocks.filter((block) => block.type === 'text').map((block) => block.text).join('\n\n') : String(body.body ?? '').trim();
        const images = blocks?.length ? blocks.filter((block) => block.type === 'image').map((block) => block.url) : cleanImages(body.images ?? (body.image ? [body.image] : []));
        const attachment = cleanAttachment(body.attachment);
        const labels = Array.isArray(body.poll)
          ? body.poll.map((item) => String(item.label ?? '').trim()).filter(Boolean).slice(0, 12)
          : [];
        const unique = new Set(labels.map((label) => label.toLowerCase()));
        if (labels.length > 0 && (labels.length < 2 || unique.size !== labels.length)) return send(res, 400, { error: 'poll' });
        const poll = labels.length ? labels.map((label, index) => ({ id: `opt-${index + 1}`, label, votes: 0 })) : undefined;
        const journalHref = typeof body.journalHref === 'string' && /^\/announcements\/[A-Za-z0-9._-]{1,80}$/.test(body.journalHref) ? body.journalHref : undefined;
        const bannerTitle = String(body.bannerTitle ?? '').trim().slice(0, 180);
        const announcement = body.kind === 'announcement' || Boolean(journalHref);
        if (!text && images.length === 0 && !attachment && !poll && !announcement) return send(res, 400, { error: 'body' });
        const mood = cleanMood(body.mood);
        const audience = cleanAudience(body.audience);
        const moodAudience = mood ? cleanMoodAudience(body.moodAudience) : undefined;
        const shareMood = Boolean(mood) && body.shareMood !== false;
        const recognition = body.kind === 'recognition';
        if (recognition && !canRecognize(user, dir)) return send(res, 403, { error: 'forbidden' });
        const recognizedName = String(body.recognizedName ?? '').trim();
        if (recognition && !recognizedName) return send(res, 400, { error: 'person' });
        const recognizedBy = String(body.recognizedBy ?? '').trim();
        const receivedRecognition = Boolean(body.receivedRecognition);
        const caption = String(body.caption ?? '').trim().slice(0, 2000);
        const comment = String(body.comment ?? '').trim().slice(0, 2000);
        const journalCategory = String(body.journalCategory ?? '').trim().slice(0, 40);
        const journalExcerpt = String(body.journalExcerpt ?? '').trim().slice(0, 2000);
        const nonce = String(body.nonce ?? '').trim().slice(0, 80);
        const createdAt = new Date().toISOString();
        const result = await applyFeed(res, (feed) => {
          if (nonce) {
            const same = feed.posts.find((item) => item.authorId === user.id && item.nonce === nonce);
            if (same) return { skip: true, duplicate: same, store: feed };
          } else {
            const recent = feed.posts.find((item) => item.authorId === user.id && item.body === text && Date.now() - Date.parse(item.createdAt) < 1200);
            if (recent && recent.images?.join() === images.join()) {
              return { skip: true, duplicate: recent, store: feed };
            }
          }
          const post: FeedPost = {
            id: `post-${Date.now()}-${randomBytes(4).toString('hex')}`,
            kind: recognition ? 'recognition' : announcement ? 'announcement' : poll ? 'poll' : images.length ? 'image' : 'text',
            author: user.name,
            authorId: user.id,
            role: user.role,
            department: user.department,
            avatar: user.avatar,
            time: 'agora',
            body: text || caption || comment || bannerTitle,
            image: images[0],
            images,
            blocks: blocks?.length ? blocks : undefined,
            attachment,
            likes: 0,
            likedBy: [],
            reactions: [],
            shares: 0,
            comments: [],
            poll,
            votes: {},
            bannerTitle: announcement
              ? (bannerTitle || 'Jornal')
              : recognition
                ? (bannerTitle || `Reconhecimento especial para ${recognizedName.split(' ')[0]}!`)
                : bannerTitle || undefined,
            journalHref,
            journalCategory: announcement && journalCategory ? journalCategory : undefined,
            journalExcerpt: announcement && journalExcerpt ? journalExcerpt : undefined,
            recognizedName: recognition ? recognizedName : undefined,
            recognizedBy: recognition && recognizedBy ? recognizedBy : undefined,
            receivedRecognition: recognition ? receivedRecognition : undefined,
            caption: caption || undefined,
            comment: comment || undefined,
            tag: recognition ? String(body.tag ?? '').trim() : undefined,
            nonce: nonce || undefined,
            audience,
            mood,
            moodAudience,
            shareMood,
            createdAt,
            updatedAt: createdAt,
          };
          feed.posts.unshift(post);
          return { store: feed, post };
        });
        if (!result) return;
        const savedPost = result.duplicate ?? result.post;
        if (!savedPost) return send(res, 500, { error: 'publish' });
        if (mood && shareMood && !result.duplicate) {
          try {
            applySharedMood(user.id, mood, moodAudience ?? 'team', savedPost.id);
          } catch {
            /* a publicação já foi gravada; o humor fica como estava */
          }
        }
        send(res, result.duplicate ? 200 : 201, { post: publicPost(savedPost, user, result.store.saved?.[user.id] ?? []) });
        } catch {
          if (!res.headersSent) send(res, 500, { error: 'publish' });
        }
        return;
      }

      const likeMatch = /^\/api\/feed\/([^/]+)\/like$/.exec(url);
      if (req.method === 'POST' && likeMatch) {
        const body = JSON.parse((await readBody(req)).toString('utf8') || '{}') as { kind?: string };
        const kind: Reaction['kind'] | '' = body.kind === 'love' ? 'love' : body.kind === 'like' ? 'like' : '';
        if (!kind) return send(res, 400, { error: 'kind' });
        const result = await applyFeed(res, (feed) => {
          const post = openPost(feed, likeMatch[1], user);
          if (!post) return { skip: true, missing: true, store: feed };
          const before = reactionsOf(post);
          const mine = before.filter((item) => item.userId === user.id);
          const same = mine.some((item) => item.kind === kind);
          const next = same
            ? before.filter((item) => item.userId !== user.id)
            : [...before.filter((item) => item.userId !== user.id), { userId: user.id, name: user.name, kind }];
          post.reactions = next;
          post.likedBy = [...new Set(next.map((item) => item.userId))];
          post.likes = Math.max(0, (typeof post.likes === 'number' ? post.likes : before.length) + next.length - before.length);
          post.updatedAt = new Date().toISOString();
          return { store: feed, post };
        });
        if (!result) return;
        if (result.missing || !result.post) return send(res, 404, { error: 'missing' });
        send(res, 200, { post: publicPost(result.post, user, result.store.saved?.[user.id] ?? []) });
        return;
      }

      const voteMatch = /^\/api\/feed\/([^/]+)\/vote$/.exec(url);
      if (req.method === 'POST' && voteMatch) {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { optionId?: string };
        const optionId = String(body.optionId ?? '');
        const result = await applyFeed(res, (feed) => {
          const post = openPost(feed, voteMatch[1], user);
          if (!post?.poll) return { skip: true, missing: true, store: feed };
          if (!post.poll.some((item) => item.id === optionId)) return { skip: true, badOption: true, store: feed };
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
          post.updatedAt = new Date().toISOString();
          return { store: feed, post };
        });
        if (!result) return;
        if (result.missing || !result.post) return send(res, 404, { error: 'missing' });
        if (result.badOption) return send(res, 400, { error: 'option' });
        send(res, 200, { post: publicPost(result.post, user, result.store.saved?.[user.id] ?? []) });
        return;
      }

      const saveMatch = /^\/api\/feed\/([^/]+)\/save$/.exec(url);
      if (req.method === 'POST' && saveMatch) {
        const result = await applyFeed(res, (feed) => {
          const post = openPost(feed, saveMatch[1], user);
          if (!post) return { skip: true, missing: true, store: feed };
          feed.saved = feed.saved ?? {};
          const list = new Set(feed.saved[user.id] ?? []);
          if (list.has(post.id)) list.delete(post.id);
          else list.add(post.id);
          feed.saved[user.id] = [...list];
          return { store: feed, post, saved: feed.saved[user.id] };
        });
        if (!result) return;
        if (result.missing || !result.post) return send(res, 404, { error: 'missing' });
        send(res, 200, { post: publicPost(result.post, user, result.saved ?? []), saved: result.saved ?? [] });
        return;
      }

      const shareMatch = /^\/api\/feed\/([^/]+)\/share$/.exec(url);
      if (req.method === 'POST' && shareMatch) {
        const result = await applyFeed(res, (feed) => {
          const post = openPost(feed, shareMatch[1], user);
          if (!post) return { skip: true, missing: true, store: feed };
          post.shares += 1;
          post.updatedAt = new Date().toISOString();
          return { store: feed, post };
        });
        if (!result) return;
        if (result.missing || !result.post) return send(res, 404, { error: 'missing' });
        send(res, 200, { post: publicPost(result.post, user, result.store.saved?.[user.id] ?? []) });
        return;
      }

      const commentMatch = /^\/api\/feed\/([^/]+)\/comments$/.exec(url);
      if (req.method === 'POST' && commentMatch) {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { body?: string; media?: unknown };
        const text = String(body.body ?? '').trim();
        const media = cleanMedia(body.media);
        if (!text && !media) return send(res, 400, { error: 'body' });
        if (text.length > 2000) return send(res, 400, { error: 'body' });
        const result = await applyFeed(res, (feed) => {
          const post = openPost(feed, commentMatch[1], user);
          if (!post) return { skip: true, missing: true, store: feed };
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
          post.updatedAt = new Date().toISOString();
          return { store: feed, post };
        });
        if (!result) return;
        if (result.missing || !result.post) return send(res, 404, { error: 'missing' });
        send(res, 201, { post: publicPost(result.post, user, result.store.saved?.[user.id] ?? []) });
        return;
      }

      const commentLike = /^\/api\/feed\/([^/]+)\/comments\/([^/]+)\/like$/.exec(url);
      if (req.method === 'POST' && commentLike) {
        const result = await applyFeed(res, (feed) => {
          const post = openPost(feed, commentLike[1], user);
          const comment = post?.comments.find((item) => item.id === commentLike[2]);
          if (!post || !comment) return { skip: true, missing: true, store: feed };
          comment.likedBy = comment.likedBy ?? [];
          const already = comment.likedBy.includes(user.id);
          comment.likedBy = already ? comment.likedBy.filter((id) => id !== user.id) : [...comment.likedBy, user.id];
          comment.likes = comment.likedBy.length;
          post.updatedAt = new Date().toISOString();
          return { store: feed, post };
        });
        if (!result) return;
        if (result.missing || !result.post) return send(res, 404, { error: 'missing' });
        send(res, 200, { post: publicPost(result.post, user, result.store.saved?.[user.id] ?? []) });
        return;
      }

      const deleteComment = /^\/api\/feed\/([^/]+)\/comments\/([^/]+)$/.exec(url);
      if (req.method === 'DELETE' && deleteComment) {
        const result = await applyFeed(res, (feed) => {
          const post = openPost(feed, deleteComment[1], user);
          if (!post) return { skip: true, missing: true, store: feed };
          const comment = post.comments.find((item) => item.id === deleteComment[2]);
          if (!comment) return { skip: true, missing: true, store: feed };
          const allowed = comment.authorId === user.id || post.authorId === user.id || isLeader(user);
          if (!allowed) return { skip: true, forbidden: true, store: feed };
          post.comments = post.comments.filter((item) => item.id !== comment.id);
          post.updatedAt = new Date().toISOString();
          return { store: feed, post };
        });
        if (!result) return;
        if (result.forbidden) return send(res, 403, { error: 'forbidden' });
        if (result.missing || !result.post) return send(res, 404, { error: 'missing' });
        send(res, 200, { post: publicPost(result.post, user, result.store.saved?.[user.id] ?? []) });
        return;
      }

      const editPost = /^\/api\/feed\/([^/]+)$/.exec(url);
      if (req.method === 'PATCH' && editPost) {
        const body = JSON.parse((await readBody(req)).toString('utf8') || '{}') as Partial<FeedPost> & { images?: unknown; blocks?: unknown };
        const result = await applyFeed(res, (feed) => {
          const post = openPost(feed, editPost[1], user);
          if (!post) return { skip: true, missing: true, store: feed };
          if (post.authorId !== user.id && post.author !== user.name) return { skip: true, forbidden: true, store: feed };
          if (post.kind === 'recognition') return { skip: true, forbidden: true, store: feed };
          const blocks = body.blocks !== undefined ? cleanBlocks(body.blocks) : post.blocks;
          const text = blocks?.length
            ? blocks.filter((block) => block.type === 'text').map((block) => block.text).join('\n\n')
            : body.body !== undefined ? String(body.body).trim() : post.body;
          const images = blocks?.length
            ? blocks.filter((block) => block.type === 'image').map((block) => block.url)
            : body.images !== undefined || body.image !== undefined
              ? cleanImages(body.images ?? (body.image ? [body.image] : []))
              : (post.images ?? []);
          const bannerTitle = body.bannerTitle !== undefined ? String(body.bannerTitle ?? '').trim().slice(0, 180) : post.bannerTitle;
          if (!text && images.length === 0 && !post.attachment && !post.poll && post.kind !== 'announcement') {
            return { skip: true, badBody: true, store: feed };
          }
          post.body = text || bannerTitle || post.body;
          post.images = images;
          post.image = images[0];
          post.blocks = blocks?.length ? blocks : undefined;
          post.bannerTitle = bannerTitle || undefined;
          post.updatedAt = new Date().toISOString();
          return { store: feed, post };
        });
        if (!result) return;
        if (result.forbidden) return send(res, 403, { error: 'forbidden' });
        if (result.badBody) return send(res, 400, { error: 'body' });
        if (result.missing || !result.post) return send(res, 404, { error: 'missing' });
        send(res, 200, { post: publicPost(result.post, user, result.store.saved?.[user.id] ?? []) });
        return;
      }

      const deletePost = /^\/api\/feed\/([^/]+)$/.exec(url);
      if (req.method === 'DELETE' && deletePost) {
        const result = await applyFeed(res, (feed) => {
          const index = feed.posts.findIndex((item) => item.id === deletePost[1]);
          if (index < 0) return { skip: true, missing: true, store: feed };
          const post = feed.posts[index];
          if (!canSeePost(post, user)) return { skip: true, missing: true, store: feed };
          const allowed = post.authorId === user.id || post.author === user.name;
          if (!allowed) return { skip: true, forbidden: true, store: feed };
          const removedReposts = feed.reposts.filter((item) => item.originalId === post.id).map((item) => item.id);
          feed.deletedIds = [...new Set([...(feed.deletedIds ?? []), post.id])];
          feed.deletedRepostIds = [...new Set([...(feed.deletedRepostIds ?? []), ...removedReposts])];
          feed.posts.splice(index, 1);
          feed.reposts = feed.reposts.filter((item) => item.originalId !== post.id);
          return { store: feed };
        });
        if (!result) return;
        if (result.forbidden) return send(res, 403, { error: 'forbidden' });
        if (result.missing) return send(res, 404, { error: 'missing' });
        send(res, 200, { ok: true });
        return;
      }

      const repostMatch = /^\/api\/feed\/([^/]+)\/repost$/.exec(url);
      if (req.method === 'POST' && repostMatch) {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { note?: string };
        const result = await applyFeed(res, (feed) => {
          const original = openPost(feed, repostMatch[1], user);
          if (!original) return { skip: true, missing: true, store: feed };
          if (feed.reposts.some((item) => item.userId === user.id && item.originalId === original.id)) {
            return { skip: true, already: true, store: feed };
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
          return { store: feed, repost };
        });
        if (!result) return;
        if (result.already) return send(res, 409, { error: 'duplicate' });
        if (result.missing || !result.repost) return send(res, 404, { error: 'missing' });
        send(res, 201, { repost: result.repost });
        return;
      }

      const undo = /^\/api\/reposts\/([^/]+)$/.exec(url);
      if (req.method === 'DELETE' && undo) {
        const result = await applyFeed(res, (feed) => {
          const repost = feed.reposts.find((item) => item.id === undo[1]);
          if (!repost) return { skip: true, missing: true, store: feed };
          if (repost.userId !== user.id && !isLeader(user)) return { skip: true, forbidden: true, store: feed };
          feed.deletedRepostIds = [...new Set([...(feed.deletedRepostIds ?? []), repost.id])];
          feed.reposts = feed.reposts.filter((item) => item.id !== repost.id);
          return { store: feed };
        });
        if (!result) return;
        if (result.forbidden) return send(res, 403, { error: 'forbidden' });
        if (result.missing) return send(res, 404, { error: 'missing' });
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

      if (req.method === 'GET' && journalRoute) {
        const current = loadJournal();
        const next = presentJournal(current);
        if (current.initialized && (next.articles.length !== current.articles.length || next.deletedIds.length !== current.deletedIds.length)) {
          saveJournal({ initialized: true, articles: next.articles as Record<string, unknown>[], deletedIds: next.deletedIds });
        }
        send(res, 200, next);
        return;
      }

      if (req.method === 'PUT' && journalRoute) {
        if (!isLeader(user)) return send(res, 403, { error: 'forbidden' });
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { articles?: unknown; deletedIds?: unknown };
        const current = loadJournal();
        const deletedIds = [...new Set([
          ...current.deletedIds,
          ...retiredDrafts,
          ...(Array.isArray(body.deletedIds) ? body.deletedIds.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 80) : []),
        ])].slice(0, 2000);
        const blocked = new Set(deletedIds);
        const articles = (Array.isArray(body.articles) ? body.articles : [])
          .slice(0, 400)
          .map((item) => cleanJournalArticle(item))
          .filter((article): article is NonNullable<ReturnType<typeof cleanJournalArticle>> => article !== null && !blocked.has(article.id));
        const next = { initialized: true, articles, deletedIds };
        saveJournal(next);
        send(res, 200, next);
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
