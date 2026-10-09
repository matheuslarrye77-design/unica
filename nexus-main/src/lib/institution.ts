import { currentUser, employees, type Employee } from '@/data/mockData';
import { actor, getToken } from '@/lib/session';
import { useSyncExternalStore } from 'react';

export type PolicyMode = 'leadership' | 'selected' | 'everyone';

export type Policy = { mode: PolicyMode; userIds: string[] };

export type CalendarTheme = 'padrao' | 'halloween' | 'natal' | 'junina' | 'anonovo';

export type InstitutionSettings = {
  muralEnabled: boolean;
  recognition: Policy;
  documents: Policy;
  calendar: { theme: CalendarTheme; wallpaperVersion: number };
};

export type FeedbackItem = {
  id: string;
  destination: 'lideranca' | 'plataforma';
  type: 'feedback' | 'sugestao';
  message: string;
  anonymous: boolean;
  authorName: string | null;
  createdAt: string;
  status: 'novo' | 'analise' | 'resolvido';
};

type Snapshot = {
  ready: boolean;
  settings: InstitutionSettings;
  hasWallpaper: boolean;
  moods: Record<string, string>;
  people: Record<string, { ramal?: string; birthDate?: string }>;
};

const DEFAULTS: InstitutionSettings = {
  muralEnabled: true,
  recognition: { mode: 'everyone', userIds: [] },
  documents: { mode: 'leadership', userIds: [] },
  calendar: { theme: 'padrao', wallpaperVersion: 0 },
};

let snapshot: Snapshot = {
  ready: false,
  settings: DEFAULTS,
  hasWallpaper: false,
  moods: {},
  people: {},
};

const listeners = new Set<() => void>();

function emit(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isLeader(user: { role: string; department?: string }) {
  return /admin|líder|lider|coordena|diret|vp\b|chief|head|gerente/i.test(user.role)
    || /comunica/i.test(user.department ?? '');
}

export function allows(user: { id: string; role: string; department?: string }, policy: Policy) {
  if (policy.mode === 'everyone') return true;
  if (policy.mode === 'selected') return policy.userIds.includes(user.id);
  return isLeader(user);
}

function headers() {
  return { 'Content-Type': 'application/json', 'x-user-id': actor().id, 'x-session': getToken() };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...headers(), ...init?.headers } });
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}

export async function loadInstitution() {
  const [settings, moods, people] = await Promise.all([
    request<{ settings: InstitutionSettings; hasWallpaper: boolean }>('/api/settings'),
    request<{ moods: Record<string, string> }>('/api/moods'),
    request<{ people: Snapshot['people'] }>('/api/people'),
  ]);
  let nextMoods = moods.moods;
  try {
    const legacy = JSON.parse(localStorage.getItem('unica-moods') ?? '{}') as Record<string, string>;
    const emoji = legacy[currentUser.id];
    if (emoji && !nextMoods[currentUser.id]) {
      const saved = await request<{ moods: Record<string, string> }>('/api/moods', { method: 'PUT', body: JSON.stringify({ emoji }) });
      nextMoods = saved.moods;
    }
  } catch {
    nextMoods = moods.moods;
  }
  emit({
    ready: true,
    settings: settings.settings,
    hasWallpaper: settings.hasWallpaper,
    moods: nextMoods,
    people: people.people,
  });
}

export function useInstitution() {
  const value = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return {
    ...value,
    isLeader: isLeader(currentUser),
    canRecognize: value.ready ? allows(currentUser, value.settings.recognition) : true,
    canUploadDocuments: value.ready ? allows(currentUser, value.settings.documents) : isLeader(currentUser),
    muralAvailable: !value.ready || value.settings.muralEnabled || isLeader(currentUser),
  };
}

export async function saveSettings(settings: InstitutionSettings) {
  const saved = await request<{ settings: InstitutionSettings }>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
  emit({ ...snapshot, ready: true, settings: saved.settings });
}

export async function saveWallpaper(dataUrl: string) {
  const saved = await request<{ settings: InstitutionSettings }>('/api/wallpaper', { method: 'PUT', body: JSON.stringify({ dataUrl }) });
  emit({ ...snapshot, settings: saved.settings, hasWallpaper: true });
}

export async function clearWallpaper() {
  const saved = await request<{ settings: InstitutionSettings }>('/api/wallpaper', { method: 'DELETE' });
  emit({ ...snapshot, settings: saved.settings, hasWallpaper: false });
}

export async function assertPermission(action: 'recognition' | 'documents') {
  await request(`/api/permissions/${action}`, { method: 'POST' });
}

export async function submitFeedback(input: { destination: FeedbackItem['destination']; type: FeedbackItem['type']; message: string; anonymous: boolean }) {
  return request<{ feedback: FeedbackItem }>('/api/feedback', { method: 'POST', body: JSON.stringify(input) });
}

export async function loadFeedback() {
  return request<{ feedback: FeedbackItem[] }>('/api/feedback');
}

export async function updateFeedbackStatus(id: string, status: FeedbackItem['status']) {
  return request<{ feedback: FeedbackItem }>(`/api/feedback/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function saveMood(emoji: string) {
  const saved = await request<{ moods: Record<string, string> }>('/api/moods', { method: 'PUT', body: JSON.stringify({ emoji }) });
  emit({ ...snapshot, moods: saved.moods });
}

export async function saveBirthDate(personId: string, birthDate: string) {
  const saved = await request<{ people: Snapshot['people'] }>(`/api/people/${encodeURIComponent(personId)}`, { method: 'PUT', body: JSON.stringify({ birthDate }) });
  emit({ ...snapshot, people: saved.people });
}

export async function saveRamal(personId: string, ramal: string) {
  const saved = await request<{ people: Snapshot['people'] }>(`/api/people/${encodeURIComponent(personId)}`, { method: 'PUT', body: JSON.stringify({ ramal }) });
  emit({ ...snapshot, people: saved.people });
}

export const directoryPeople: Employee[] = [
  { ...currentUser, email: 'matheus.larrie@unica.local' },
  ...employees.filter((employee) => employee.id !== currentUser.id),
];

export function wallpaperUrl(version: number) {
  return `/api/wallpaper?v=${version}`;
}
