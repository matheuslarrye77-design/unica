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

export type BirthdayCardPayload = {
  stickers: BirthdaySticker[];
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
