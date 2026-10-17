import { currentUser } from '@/data/mockData';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { useSyncExternalStore } from 'react';

export type SessionUser = {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  email: string;
};

export type DemoId = 'matheus' | 'helena';

export const DEMO_PROFILES = [
  {
    id: 'matheus' as const,
    name: 'Matheus Larrie',
    role: 'Colaborador',
    department: 'Atendimento',
    avatar: currentUser.avatar,
    email: 'matheus.larrie@unica.local',
    userId: currentUser.id,
  },
  {
    id: 'helena' as const,
    name: 'Helena Duarte',
    role: 'Gerente',
    department: 'Gestão',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HelenaDuarte',
    email: 'helena.duarte@unica.local',
    userId: 'helena',
  },
];

const DEMO_KEY = 'unica-demo-profile';
let demoId: DemoId = 'matheus';
try {
  const stored = localStorage.getItem(DEMO_KEY);
  if (stored === 'helena' || stored === 'matheus') demoId = stored;
} catch {
  demoId = 'matheus';
}

const demoListeners = new Set<() => void>();

export function getDemoId() {
  return demoId;
}

export function setDemoProfile(id: DemoId) {
  demoId = id;
  try {
    localStorage.setItem(DEMO_KEY, id);
  } catch {
    /* navegador sem armazenamento */
  }
  demoListeners.forEach((listener) => listener());
}

export function useDemoProfile() {
  return useSyncExternalStore(
    (listener) => {
      demoListeners.add(listener);
      return () => demoListeners.delete(listener);
    },
    () => demoId,
    () => 'matheus' as DemoId,
  );
}

const TOKEN = 'unica-session';
const USER = 'unica-user';

export function getSessionUser(): SessionUser | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(USER) ?? 'null') as SessionUser | null;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export function actor(): SessionUser {
  if (!LOGIN_REQUIRED) {
    const profile = DEMO_PROFILES.find((item) => item.id === demoId) ?? DEMO_PROFILES[0];
    return {
      id: profile.userId,
      name: profile.name,
      role: profile.role,
      department: profile.department,
      avatar: profile.avatar,
      email: profile.email,
    };
  }
  return getSessionUser() ?? { ...currentUser, email: 'matheus.larrie@unica.local' };
}

export function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

export async function login(email: string, password: string) {
  const response = await fetch('/api/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({})) as { error?: string; user?: SessionUser };
  if (!response.ok || !data.user) {
    throw new Error(data.error === 'config' || data.error === 'unavailable' ? 'unavailable' : 'invalid');
  }
  localStorage.setItem(USER, JSON.stringify(data.user));
  localStorage.removeItem(TOKEN);
  return data.user;
}

export async function logout() {
  await fetch('/api/logout', { method: 'POST', credentials: 'include', headers: authHeaders() }).catch(() => undefined);
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(USER);
}

export async function restoreSession() {
  const response = await fetch('/api/session', { credentials: 'include', headers: authHeaders() });
  if (!response.ok) {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(USER);
    return null;
  }
  const data = await response.json() as { user: SessionUser };
  localStorage.setItem(USER, JSON.stringify(data.user));
  return data.user;
}
