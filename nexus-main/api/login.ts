import type { IncomingMessage, ServerResponse } from 'node:http';
import { performLogin } from '../server/auth/flow.mjs';
import { applyAuthResult, readRequestBody } from '../server/auth/http.mjs';
import { supabaseAuthStore, supabaseConfigError } from '../server/auth/supabaseStore.mjs';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    applyAuthResult(res, { status: 405, body: { error: 'method' } });
    return;
  }
  const missing = supabaseConfigError();
  if (missing) {
    applyAuthResult(res, missing);
    return;
  }
  let body: { email?: string; password?: string } = {};
  try {
    body = JSON.parse(await readRequestBody(req) || '{}') as { email?: string; password?: string };
  } catch {
    applyAuthResult(res, { status: 400, body: { error: 'fields' } });
    return;
  }
  applyAuthResult(res, await performLogin(supabaseAuthStore(), body));
}
