export function isLeader(user) {
  return /admin|líder|lider|coordena|diret|vp\b|chief|head|gerente/i.test(user?.role ?? '')
    || /comunica/i.test(user?.department ?? '');
}

export function guardLeader(user) {
  if (!user) return { status: 401, body: { error: 'unauthorized' } };
  if (!isLeader(user)) return { status: 403, body: { error: 'forbidden' } };
  return { status: 200, body: { ok: true } };
}
