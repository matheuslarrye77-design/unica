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

export function getToken() {
  return localStorage.getItem(TOKEN) ?? '';
}

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

function save(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN, token);
  localStorage.setItem(USER, JSON.stringify(user));
}

export function authHeaders() {
  const user = actor();
  return {
    'Content-Type': 'application/json',
    'x-user-id': user.id,
    'x-session': getToken(),
  };
}

export async function login(email: string, password: string) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error('invalid');
  const data = await response.json() as { token: string; user: SessionUser };
  save(data.token, data.user);
  return data.user;
}

export async function logout() {
  await fetch('/api/logout', { method: 'POST', headers: authHeaders() }).catch(() => undefined);
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(USER);
}

export async function restoreSession() {
  if (!getToken()) return null;
  const response = await fetch('/api/session', { headers: authHeaders() });
  if (!response.ok) {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(USER);
    return null;
  }
  const data = await response.json() as { user: SessionUser };
  localStorage.setItem(USER, JSON.stringify(data.user));
  return data.user;
}
