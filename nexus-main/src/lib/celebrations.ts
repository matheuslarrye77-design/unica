import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { authHeaders, getDemoId } from '@/lib/session';

const KNOWN_IDS: Record<string, string> = { 'Matheus Larrie': '1', 'Helena Duarte': 'helena' };

export function celebrationPersonId(name: string) {
  return KNOWN_IDS[name] ?? name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export type CelebrationPhase = 'upcoming' | 'preparing' | 'open' | 'expired';

export type CelebrationEdition = {
  id: string;
  scope: 'birthday' | 'collective';
  theme: string;
  title: string;
  personId?: string;
  personName?: string;
  avatar?: string;
  year: number;
  prepareFrom: string;
  messageUntil: string;
  openAt: string;
  viewUntil: string;
  phase: CelebrationPhase;
  writable: boolean;
};

export type OrnamentMedia = { kind: 'photo' | 'gif' | 'sticker'; url: string };

export type Ornament = {
  id: string;
  editionId: string;
  kind: string;
  x: number;
  y: number;
  scale: number;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  updatedAt: string;
  sealed: boolean;
  message: string;
  media: OrnamentMedia | null;
};

export type CelebrationPayload = {
  today: string;
  settings: { viewMonths: number; timezone: string };
  edition: CelebrationEdition | null;
  ornaments: Ornament[];
  editions: CelebrationEdition[];
  viewer: { id: string; leader: boolean; recipient: boolean };
};

function headers(): Record<string, string> {
  const demo: Record<string, string> = LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() };
  return { ...authHeaders(), ...demo };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: 'include', headers: { ...headers(), ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body.error ?? response.status));
  return body as T;
}

export function loadCelebration(query: string) {
  return request<CelebrationPayload>(`/api/celebrations?${query}`);
}

export function registerBirthday(person: { personId: string; name: string; avatar: string; month: number; day: number }) {
  return request<{ person: { name: string; month: number; day: number } }>('/api/celebrations/people', { method: 'PUT', body: JSON.stringify(person) });
}

export function publishOrnament(draft: { editionId: string; kind: string; x: number; y: number; scale: number; message: string; media: OrnamentMedia | null }) {
  return request<{ ornament: Ornament }>('/api/celebrations/ornaments', { method: 'POST', body: JSON.stringify(draft) });
}

export function moveOrnament(id: string, patch: Partial<Pick<Ornament, 'x' | 'y' | 'scale' | 'message'> & { media: OrnamentMedia | null }>) {
  return request<{ ornament: Ornament }>(`/api/celebrations/ornaments/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function removeOrnament(id: string) {
  return request<{ ok: boolean }>(`/api/celebrations/ornaments/${id}`, { method: 'DELETE' });
}

export function saveCelebrationSettings(viewMonths: number) {
  return request<{ settings: { viewMonths: number } }>('/api/celebrations/settings', { method: 'PUT', body: JSON.stringify({ viewMonths }) });
}

export function createCollectiveEdition(draft: { theme: string; title: string; prepareFrom: string; messageUntil: string; openAt: string; viewUntil: string }) {
  return request<{ edition: CelebrationEdition }>('/api/celebrations/editions', { method: 'POST', body: JSON.stringify(draft) });
}
