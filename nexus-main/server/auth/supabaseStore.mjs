import { createClient } from '@supabase/supabase-js';

export function serverSecretKey(env = process.env) {
  return String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

function acceptsServerSecret(key) {
  if (key.startsWith('sb_secret_')) return true;
  if (key.startsWith('sb_')) return false;
  return key.split('.').length === 3;
}

export function supabaseConfigError(env = process.env) {
  const key = serverSecretKey(env);
  if (!env.SUPABASE_URL || !acceptsServerSecret(key)) {
    console.error('[unica-auth] missing server configuration');
    return { status: 503, body: { error: 'config' } };
  }
  return null;
}

function client(env = process.env) {
  return createClient(env.SUPABASE_URL, serverSecretKey(env), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function fail(error) {
  console.error('[unica-auth] database', error?.code || 'unknown');
  throw new Error('unavailable');
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department ?? '',
    avatar: row.avatar ?? '',
    email: row.email,
  };
}

export function supabaseAuthStore(env = process.env) {
  const db = client(env);
  return {
    async findCredential(loginId) {
      const { data, error } = await db
        .from('unica_users')
        .select('id, name, role, department, avatar, email, password_hash, password_salt')
        .eq('email', loginId)
        .maybeSingle();
      if (error) fail(error);
      if (!data) return null;
      return { user: publicUser(data), passwordSalt: data.password_salt, passwordHash: data.password_hash };
    },
    async createSession({ tokenHash, userId, expiresAt }) {
      const { error } = await db.from('unica_sessions').insert({
        token_hash: tokenHash,
        user_id: userId,
        expires_at: expiresAt,
      });
      if (error) fail(error);
    },
    async getSession(hash) {
      const session = await db
        .from('unica_sessions')
        .select('user_id, expires_at')
        .eq('token_hash', hash)
        .maybeSingle();
      if (session.error) fail(session.error);
      if (!session.data) return { status: 'missing' };
      if (Date.parse(session.data.expires_at) <= Date.now()) return { status: 'expired' };
      const user = await db
        .from('unica_users')
        .select('id, name, role, department, avatar, email')
        .eq('id', session.data.user_id)
        .maybeSingle();
      if (user.error) fail(user.error);
      if (!user.data) return { status: 'missing' };
      return { status: 'ok', user: publicUser(user.data) };
    },
    async deleteSession(hash) {
      const { error } = await db.from('unica_sessions').delete().eq('token_hash', hash);
      if (error) fail(error);
    },
  };
}
