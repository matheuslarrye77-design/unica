import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { authHeaders, getDemoId } from '@/lib/session';

export type BirthdaySticker = {
  id: string;
  personId: string;
  stickerId: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
  message: string;
  open: boolean;
  authorId: string;
  authorName: string;
};

export type BirthdayText = {
  id: string;
  personId: string;
  body: string;
  x: number;
  y: number;
  size: number;
  font: string;
  effect: string;
  color: string;
  authorId: string;
  authorName: string;
};

export type BirthdayCardPayload = {
  stickers: BirthdaySticker[];
  texts: BirthdayText[];
  color: string;
  viewer: { id: string; unlimited: boolean };
  mine: { id: string; personId: string } | null;
};

function headers(): Record<string, string> {
  const demo: Record<string, string> = LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() };
  return { ...authHeaders(), ...demo, 'Content-Type': 'application/json' };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: 'include', headers: { ...headers(), ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body.error ?? response.status));
  return body as T;
}

export function saveBirthdayColor(personId: string, color: string) {
  return request<{ color: string }>('/api/birthday-card/color', { method: 'POST', body: JSON.stringify({ personId, color }) });
}

export function loadBirthdayCard(personId: string) {
  return request<BirthdayCardPayload>(`/api/birthday-card?personId=${encodeURIComponent(personId)}`);
}

export function placeBirthdaySticker(draft: { personId: string; stickerId: string; x: number; y: number; width: number; rotation: number; message: string }) {
  return request<{ sticker: BirthdaySticker; mine: { id: string; personId: string } }>('/api/birthday-card', { method: 'POST', body: JSON.stringify(draft) });
}

export function updateBirthdaySticker(id: string, patch: Partial<Pick<BirthdaySticker, 'x' | 'y' | 'width' | 'rotation' | 'message' | 'open'>>) {
  return request<{ sticker: BirthdaySticker }>(`/api/birthday-card/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteBirthdaySticker(id: string) {
  return request<{ mine: { id: string; personId: string } | null }>(`/api/birthday-card/${id}`, { method: 'DELETE' });
}

export function placeBirthdayText(draft: { personId: string; body: string; x: number; y: number; size: number; font: string; effect: string; color: string }) {
  return request<{ text: BirthdayText }>('/api/birthday-card/text', { method: 'POST', body: JSON.stringify(draft) });
}

export function updateBirthdayText(id: string, patch: Partial<Pick<BirthdayText, 'body' | 'x' | 'y' | 'size' | 'font' | 'effect' | 'color'>>) {
  return request<{ text: BirthdayText }>(`/api/birthday-card/text/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteBirthdayText(id: string) {
  return request<{ ok: boolean }>(`/api/birthday-card/text/${id}`, { method: 'DELETE' });
}
