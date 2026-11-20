import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { uploadMedia } from '@/lib/feed';
import { authHeaders, getDemoId } from '@/lib/session';

const SHELF_KEY = 'unica-sticker-shelf';

export type SavedSticker = {
  id: string;
  url: string;
  createdAt: string;
  uses?: number;
  priority?: number;
  usedAt?: string;
};

export function orderedStickers(items: SavedSticker[]) {
  return [...items].sort((a, b) =>
    (b.priority ?? 0) - (a.priority ?? 0)
    || (b.uses ?? 0) - (a.uses ?? 0)
    || String(b.usedAt ?? '').localeCompare(String(a.usedAt ?? ''))
    || String(b.createdAt).localeCompare(String(a.createdAt)));
}

function demoHeaders(): Record<string, string> {
  return LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() };
}

async function readJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<{ error?: string; stickers?: SavedSticker[]; sticker?: SavedSticker; gifs?: SavedGif[]; gif?: SavedGif }>;
}

export type SavedGif = {
  id: string;
  title: string;
  url: string;
  createdAt: string;
};

export async function listLibrary() {
  const response = await fetch('/api/stickers', { credentials: 'include', headers: { ...authHeaders(), ...demoHeaders() } });
  const body = await readJson(response);
  if (!response.ok) throw new Error(body.error || 'unavailable');
  return {
    stickers: Array.isArray(body.stickers) ? body.stickers : [],
    gifs: Array.isArray(body.gifs) ? body.gifs : [],
  };
}

function stickerId(url: string) {
  return /^\/api\/stickers\/(stk-[a-f0-9]{16})$/.exec(url)?.[1] ?? '';
}

async function fileBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

async function postSticker(body: Record<string, string>) {
  const response = await fetch('/api/stickers', {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders(), ...demoHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload.error || 'file');
  return payload;
}

export async function listStickers() {
  const local = readShelf();
  try {
    const response = await fetch('/api/stickers', { credentials: 'include', headers: { ...authHeaders(), ...demoHeaders() } });
    const body = await readJson(response);
    if (!response.ok) throw new Error(body.error || 'unavailable');
    const remote = Array.isArray(body.stickers) ? body.stickers : [];
    const merged = orderedStickers([...remote, ...local.filter((item) => !remote.some((entry) => entry.url === item.url))]);
    writeShelf(merged);
    return merged;
  } catch {
    publishLibrary(local);
    return local;
  }
}

function readShelf(): SavedSticker[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SHELF_KEY) ?? '[]') as SavedSticker[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.url === 'string' && typeof item.id === 'string') : [];
  } catch {
    return [];
  }
}

function writeShelf(items: SavedSticker[]) {
  const next = orderedStickers(items).slice(0, 40);
  localStorage.setItem(SHELF_KEY, JSON.stringify(next));
  libraryVersion += 1;
  publishLibrary(next);
  return next;
}

export async function saveSticker(file: File) {
  const current = readShelf();
  if (current.length >= 40) throw new Error('limit');
  try {
    const payload = await postSticker({ data: await fileBase64(file) });
    if (!payload.sticker?.url) throw new Error('file');
    const sticker: SavedSticker = { ...payload.sticker, uses: 0, priority: Date.now(), usedAt: new Date().toISOString() };
    writeShelf([sticker, ...readShelf().filter((item) => item.url !== sticker.url)]);
    return sticker;
  } catch (error) {
    if (error instanceof Error && error.message === 'limit') throw error;
    const uploaded = await uploadMedia(file);
    if (!uploaded.url) throw new Error('file');
    const sticker: SavedSticker = {
      id: `local-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      url: uploaded.url,
      createdAt: new Date().toISOString(),
      uses: 0,
      priority: Date.now(),
      usedAt: new Date().toISOString(),
    };
    writeShelf([sticker, ...readShelf().filter((item) => item.url !== sticker.url)]);
    return sticker;
  }
}

let libraryItems: SavedSticker[] | null = null;
let libraryVersion = 0;
const libraryListeners = new Set<(items: SavedSticker[]) => void>();

function publishLibrary(items: SavedSticker[]) {
  libraryItems = items;
  libraryListeners.forEach((listener) => listener(items));
}

export function subscribeStickerLibrary(listener: (items: SavedSticker[]) => void) {
  libraryListeners.add(listener);
  if (libraryItems) listener(libraryItems);
  return () => {
    libraryListeners.delete(listener);
  };
}

const savedUrls = new Set<string>();
const addedUrls = new Set<string>();
const removedUrls = new Set<string>();
let savedLoad: Promise<void> | null = null;

function rememberSticker(url: string, saved: boolean) {
  if (saved) {
    removedUrls.delete(url);
    addedUrls.add(url);
    savedUrls.add(url);
    return;
  }
  addedUrls.delete(url);
  removedUrls.add(url);
  savedUrls.delete(url);
}

function loadSavedStickers() {
  if (!savedLoad) {
    savedLoad = listStickers().then((items) => {
      savedUrls.clear();
      items.forEach((item) => savedUrls.add(item.url));
      addedUrls.forEach((url) => savedUrls.add(url));
      removedUrls.forEach((url) => savedUrls.delete(url));
    }).catch((error: unknown) => {
      savedLoad = null;
      throw error;
    });
  }
  return savedLoad;
}

export function stickerIsSaved(url: string) {
  return loadSavedStickers().then(() => savedUrls.has(url));
}

export async function keepSticker(url: string) {
  if (!url) throw new Error('file');
  const current = readShelf();
  if (current.length >= 40 && !current.some((item) => item.url === url)) throw new Error('limit');
  const sticker: SavedSticker = current.find((item) => item.url === url) ?? {
    id: `local-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
    url,
    createdAt: new Date().toISOString(),
  };
  writeShelf([sticker, ...current.filter((item) => item.url !== url)]);
  rememberSticker(url, true);
  return sticker;
}

async function touchSticker(field: 'use' | 'priority', url: string) {
  const id = stickerId(url);
  if (id) {
    const payload = await postSticker(field === 'use' ? { use: id } : { priority: id });
    if (payload.sticker) writeShelf(readShelf().map((item) => (item.url === url ? { ...item, ...payload.sticker } : item)));
    return payload.sticker ?? readShelf().find((item) => item.url === url)!;
  }
  const current = readShelf();
  const found = current.find((item) => item.url === url);
  if (!found) throw new Error('missing');
  const sticker: SavedSticker = {
    ...found,
    uses: field === 'use' ? (found.uses ?? 0) + 1 : found.uses,
    priority: field === 'priority' ? Date.now() : found.priority,
    usedAt: new Date().toISOString(),
  };
  writeShelf(current.map((item) => (item.url === url ? sticker : item)));
  return sticker;
}

export function useSticker(url: string) {
  return touchSticker('use', url);
}

export function prioritizeSticker(url: string) {
  return touchSticker('priority', url);
}

export async function forgetSticker(url: string) {
  const id = stickerId(url);
  if (id) await postSticker({ forget: id }).catch(() => undefined);
  writeShelf(readShelf().filter((item) => item.url !== url));
  rememberSticker(url, false);
}

export async function saveGif(url: string, title: string) {
  const response = await fetch('/api/stickers', {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders(), ...demoHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ gif: url, title }),
  });
  const body = await readJson(response);
  if (!response.ok || !body.gif) throw new Error(body.error || 'unavailable');
  return body.gif;
}
