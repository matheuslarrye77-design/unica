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
  return response.json().catch(() => ({})) as Promise<{ error?: string; stickers?: SavedSticker[]; sticker?: SavedSticker }>;
}

export async function listStickers() {
  const response = await fetch('/api/stickers', { credentials: 'include', headers: { ...authHeaders(), ...demoHeaders() } });
  const body = await readJson(response);
  if (!response.ok) throw new Error(body.error || 'unavailable');
  return Array.isArray(body.stickers) ? body.stickers : [];
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
