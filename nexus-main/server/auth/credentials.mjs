import { createHash, timingSafeEqual } from 'node:crypto';

export function normalizeLoginId(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (email === 'matheus') return 'matheus.larrie@unica.local';
  return email;
}

export function hashPassword(password, salt) {
  return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

export function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

const DUMMY_SALT = 'unica-auth-dummy-salt';
const DUMMY_HASH = hashPassword('dummy-password', DUMMY_SALT);

export function passwordMatches(password, salt, hash) {
  const computed = hashPassword(password, salt || DUMMY_SALT);
  return safeEqual(computed, hash || DUMMY_HASH);
}
