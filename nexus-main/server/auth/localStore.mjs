import fs from 'node:fs';
import path from 'node:path';
import { readCookie, SESSION_COOKIE } from './cookies.mjs';
import { tokenHash } from './credentials.mjs';

function emptyStore() {
  return { salt: '', passwordHash: '', sessions: {}, sessionExpiry: {}, favorites: {}, colleagues: [] };
}

function readAuth(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      ...emptyStore(),
      ...parsed,
      sessions: parsed.sessions ?? {},
      sessionExpiry: parsed.sessionExpiry ?? {},
      favorites: parsed.favorites ?? {},
      colleagues: Array.isArray(parsed.colleagues) ? parsed.colleagues : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeAuth(file, auth) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(auth, null, 2));
}

function publicUser(account) {
  return {
    id: account.id,
    name: account.name,
    role: account.role,
    department: account.department ?? '',
    avatar: account.avatar ?? '',
    email: account.email,
  };
}

function findAccount(auth, accounts, loginId) {
  return accounts.find((item) => item.email.toLowerCase() === loginId)
    ?? auth.colleagues.find((item) => String(item.email ?? '').toLowerCase() === loginId)
    ?? null;
}

export function createLocalStore(file, accounts) {
  return {
    async findCredential(loginId) {
      const auth = readAuth(file);
      const account = findAccount(auth, accounts, loginId);
      if (!account || !auth.salt || !auth.passwordHash) return null;
      return { user: publicUser(account), passwordSalt: auth.salt, passwordHash: auth.passwordHash };
    },
    async createSession({ tokenHash: hash, userId, expiresAt }) {
      const auth = readAuth(file);
      auth.sessions[hash] = userId;
      auth.sessionExpiry[hash] = expiresAt;
      writeAuth(file, auth);
    },
    async getSession(hash) {
      const auth = readAuth(file);
      const userId = auth.sessions[hash];
      if (!userId) return { status: 'missing' };
      const expiresAt = auth.sessionExpiry[hash];
      if (expiresAt && Date.parse(expiresAt) <= Date.now()) return { status: 'expired' };
      const account = accounts.find((item) => item.id === userId)
        ?? auth.colleagues.find((item) => item.id === userId);
      if (!account) return { status: 'missing' };
      return { status: 'ok', user: publicUser(account) };
    },
    async deleteSession(hash) {
      const auth = readAuth(file);
      delete auth.sessions[hash];
      delete auth.sessionExpiry[hash];
      writeAuth(file, auth);
    },
  };
}

export function localUserFromRequest(req, file, accounts) {
  const token = readCookie(req.headers?.cookie, SESSION_COOKIE);
  if (!token) return null;
  const auth = readAuth(file);
  const hash = tokenHash(token);
  const userId = auth.sessions[hash];
  if (!userId) return null;
  const expiresAt = auth.sessionExpiry[hash];
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) return null;
  const account = accounts.find((item) => item.id === userId)
    ?? auth.colleagues.find((item) => item.id === userId);
  return account ? publicUser(account) : null;
}
