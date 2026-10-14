import type { IncomingMessage, ServerResponse } from 'node:http';
import { performSession } from '../server/auth/flow.mjs';
import { applyAuthResult } from '../server/auth/http.mjs';
import { supabaseAuthStore, supabaseConfigError } from '../server/auth/supabaseStore.mjs';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    applyAuthResult(res, { status: 405, body: { error: 'method' } });
    return;
  }
  const missing = supabaseConfigError();
  if (missing) {
    applyAuthResult(res, missing);
    return;
  }
  applyAuthResult(res, await performSession(supabaseAuthStore(), req.headers.cookie));
}
