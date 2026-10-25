import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { authHeaders, getDemoId } from '@/lib/session';

export type SavedSticker = {
  id: string;
  url: string;
  createdAt: string;
};

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

export async function listStickers() {
  const ticket = libraryVersion;
  const library = await listLibrary();
  if (ticket !== libraryVersion) {
    const again = libraryVersion;
    const fresh = await listLibrary();
    if (again !== libraryVersion) return libraryItems ?? fresh.stickers;
    publishLibrary(fresh.stickers);
    return fresh.stickers;
  }
  publishLibrary(library.stickers);
  return library.stickers;
}

export async function saveSticker(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  const response = await fetch('/api/stickers', {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders(), ...demoHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: btoa(binary) }),
  });
  const body = await readJson(response);
  if (!response.ok || !body.sticker) throw new Error(body.error || 'unavailable');
  changeLibrary((items) => [body.sticker!, ...items.filter((item) => item.url !== body.sticker?.url)]);
  return body.sticker;
}

let libraryItems: SavedSticker[] | null = null;
let libraryVersion = 0;
const libraryListeners = new Set<(items: SavedSticker[]) => void>();

function publishLibrary(items: SavedSticker[]) {
  libraryItems = items;
  libraryListeners.forEach((listener) => listener(items));
}

function changeLibrary(update: (items: SavedSticker[]) => SavedSticker[]) {
  libraryVersion += 1;
  if (!libraryItems) return;
  publishLibrary(update(libraryItems));
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
  const source = /^\/api\/stickers\/(stk-[a-f0-9]{16})$/.exec(url)?.[1] ?? '';
  const response = await fetch('/api/stickers', {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders(), ...demoHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
  });
  const body = await readJson(response);
  if (!response.ok || !body.sticker) throw new Error(body.error || 'unavailable');
  rememberSticker(body.sticker.url, true);
  changeLibrary((items) => [body.sticker!, ...items.filter((item) => item.url !== body.sticker?.url)]);
  return body.sticker;
}

export async function forgetSticker(url: string) {
  const source = /^\/api\/stickers\/(stk-[a-f0-9]{16})$/.exec(url)?.[1] ?? '';
  const response = await fetch('/api/stickers', {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders(), ...demoHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ forget: source }),
  });
  const body = await readJson(response);
  if (!response.ok) throw new Error(body.error || 'unavailable');
  rememberSticker(url, false);
  changeLibrary((items) => items.filter((item) => item.url !== url));
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
