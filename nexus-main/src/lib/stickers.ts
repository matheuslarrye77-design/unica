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
  const library = await listLibrary();
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
  return body.sticker;
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
  return body.sticker;
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
