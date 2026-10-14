import { randomBytes } from 'node:crypto';
import { clearSessionCookie, readCookie, secureCookie, SESSION_COOKIE, SESSION_SECONDS, sessionCookie } from './cookies.mjs';
import { normalizeLoginId, passwordMatches, tokenHash } from './credentials.mjs';

function unavailable(scope) {
  console.error(`[unica-auth] ${scope} unavailable`);
  return { status: 503, body: { error: 'unavailable' } };
}

export function configError() {
  console.error('[unica-auth] missing server configuration');
  return { status: 503, body: { error: 'config' } };
}

export async function performLogin(store, body) {
  const loginId = normalizeLoginId(body?.email);
  const password = String(body?.password ?? '');
  if (!loginId || !password) return { status: 400, body: { error: 'fields' } };
  let credential;
  try {
    credential = await store.findCredential(loginId);
  } catch {
    return unavailable('login');
  }
  const matches = passwordMatches(password, credential?.passwordSalt, credential?.passwordHash);
  if (!credential || !matches) return { status: 401, body: { error: 'invalid' } };
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  try {
    await store.createSession({ tokenHash: tokenHash(token), userId: credential.user.id, expiresAt });
  } catch {
    return unavailable('session');
  }
  return {
    status: 200,
    body: { user: credential.user },
    cookie: sessionCookie(token, { secure: secureCookie() }),
  };
}

export async function performSession(store, cookieHeader) {
  const token = readCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return { status: 401, body: { error: 'unauthorized' } };
  let found;
  try {
    found = await store.getSession(tokenHash(token));
  } catch {
    return unavailable('session');
  }
  if (found.status === 'expired') return { status: 401, body: { error: 'expired' } };
  if (found.status !== 'ok') return { status: 401, body: { error: 'unauthorized' } };
  return { status: 200, body: { user: found.user } };
}

export async function performLogout(store, cookieHeader) {
  const token = readCookie(cookieHeader, SESSION_COOKIE);
  if (token) {
    try {
      await store.deleteSession(tokenHash(token));
    } catch {
      return {
        ...unavailable('logout'),
        cookie: clearSessionCookie(secureCookie()),
      };
    }
  }
  return { status: 200, body: { ok: true }, cookie: clearSessionCookie(secureCookie()) };
}
