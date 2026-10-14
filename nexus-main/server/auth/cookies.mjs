export const SESSION_COOKIE = 'unica_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 7;

export function readCookie(header, name) {
  const source = String(header ?? '');
  for (const part of source.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return '';
}

export function sessionCookie(token, { secure = false, maxAge = SESSION_SECONDS } = {}) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(secure = false) {
  return sessionCookie('', { secure, maxAge: 0 });
}

export function secureCookie() {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}
