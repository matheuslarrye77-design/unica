import { createClient } from '@supabase/supabase-js';
import { serverSecretKey, supabaseConfigError } from '../server/auth/supabaseStore.mjs';

const env = process.env;
if (supabaseConfigError(env)) {
  console.error('Supabase do mural indisponível. Nenhum dado foi alterado.');
  process.exit(1);
}

const db = createClient(env.SUPABASE_URL, serverSecretKey(env), {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const created = await db.storage.createBucket('unica-mural', { public: false, fileSizeLimit: '209715200' });
if (created.error && !/exists|duplicate/i.test(created.error.message || '')) {
  console.error('Não foi possível criar o armazenamento de imagens.');
  process.exit(1);
}

const feed = await db.from('unica_documents').select('id, updated_at').in('id', ['feed', 'feed-preview', 'feed-development']);
if (feed.error) {
  console.error('Não foi possível ler o mural.');
  process.exit(1);
}

const payload = await db.from('unica_documents').select('payload').eq('id', 'feed').maybeSingle();
const posts = Array.isArray(payload.data?.payload?.posts) ? payload.data.payload.posts.length : 0;
console.log(`armazenamento=ok documentos=${(feed.data || []).map((row) => row.id).join(',') || 'nenhum'} publicacoes_feed=${posts}`);
