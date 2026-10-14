import { currentUser } from '@/data/mockData';

export type SessionUser = {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  email: string;
};

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

export function actor() {
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
