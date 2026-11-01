import { GoogleGenAI } from '@google/genai';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_CALLS = 20;
const calls = [];

export function resetGeminiBudget() {
  calls.length = 0;
}

export function allowGeminiCall(now = Date.now()) {
  while (calls.length && now - calls[0] > WINDOW_MS) calls.shift();
  if (calls.length >= MAX_CALLS) return false;
  calls.push(now);
  return true;
}

export function flashModel(env = process.env) {
  const model = String(env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  if (!/flash/i.test(model) || /pro|ultra/i.test(model)) return '';
  return model;
}

const SECRET = /AIza[0-9A-Za-z_-]{8,}|ya29\.[0-9A-Za-z_-]+|key=[^&\s"']+|Bearer\s+\S+|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|[\w.+-]+@[\w.-]+\.\w+/gi;

export function redactGeminiDetail(value) {
  return String(value ?? '').replace(SECRET, '[redacted]').replace(/\b\d{8,}\b/g, '[number]').replace(/\s+/g, ' ').trim().slice(0, 500);
}

export function describeGeminiError(error) {
  const httpStatus = Number(error?.status);
  const raw = String(error?.message ?? error ?? '');
  const jsonStart = raw.indexOf('{');
  let body = null;
  if (jsonStart >= 0) {
    try { body = JSON.parse(raw.slice(jsonStart)); } catch { body = null; }
  }
  const detail = body?.error && typeof body.error === 'object' ? body.error : body ?? {};
  const code = String(detail.status || error?.code || '').slice(0, 80);
  const message = redactGeminiDetail(detail.message || raw);
  return { httpStatus: Number.isFinite(httpStatus) ? httpStatus : 0, code, message };
}

export function classifyGeminiError(error) {
  const info = describeGeminiError(error);
  const blob = `${info.httpStatus} ${info.code} ${info.message}`;
  if (info.httpStatus === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(blob)) return 'quota';
  if (info.httpStatus === 401 || /API_KEY_INVALID|UNAUTHENTICATED|invalid api key/i.test(blob)) return 'auth';
  if (info.httpStatus === 403 || /PERMISSION_DENIED|API_KEY_HTTP_REFERRER|API_KEY_SERVICE_BLOCKED/i.test(blob)) return 'permission';
  if (info.httpStatus === 404 || /NOT_FOUND|is not found|not supported/i.test(blob)) return 'model';
  if (info.httpStatus === 400 || /INVALID_ARGUMENT/i.test(blob)) return 'invalid';
  if (/timeout|ECONNRESET|ENOTFOUND|EAI_AGAIN|fetch failed|socket hang up/i.test(blob)) return 'unavailable';
  return 'unavailable';
}

function logGemini(detail) {
  console.error('[unica] gemini', JSON.stringify({
    httpStatus: Number(detail.httpStatus) || 0,
    code: redactGeminiDetail(detail.code).slice(0, 80),
    message: redactGeminiDetail(detail.message),
  }));
}

export async function completeJson(prompt, options = {}) {
  const env = options.env ?? process.env;
  const key = String(env.GEMINI_API_KEY || '').trim();
  if (!key) return { error: 'unconfigured' };
  const model = flashModel(env);
  if (!model) return { error: 'model' };
  if (!allowGeminiCall()) return { error: 'quota' };
  const call = options.call ?? (async (payload) => {
    const ai = new GoogleGenAI({ apiKey: payload.apiKey });
    const response = await ai.models.generateContent({
      model: payload.model,
      contents: payload.prompt,
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseJsonSchema: payload.schema,
        thinkingConfig: { thinkingBudget: 0 },
        httpOptions: { timeout: 20000 },
      },
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    return {
      text: String(response.text ?? ''),
      meta: {
        finishReason: String(response.candidates?.[0]?.finishReason ?? ''),
        blockReason: String(response.promptFeedback?.blockReason ?? ''),
        parts: parts.map((part) => Object.keys(part).filter((name) => name !== 'text' && name !== 'thoughtSignature').sort().join('+') || 'text').slice(0, 8),
      },
    };
  });
  try {
    const result = await call({ apiKey: key, model, prompt, schema: options.schema });
    const text = typeof result === 'string' ? result : String(result?.text ?? '');
    if (!text.trim()) {
      const meta = typeof result === 'object' && result ? result.meta ?? {} : {};
      logGemini({ httpStatus: 200, code: 'EMPTY_RESPONSE', message: `finish=${meta.finishReason || ''} block=${meta.blockReason || ''} parts=${(meta.parts || []).join(',')}` });
      return { error: 'unavailable' };
    }
    return { text };
  } catch (error) {
    const detail = describeGeminiError(error);
    logGemini(detail);
    return { error: classifyGeminiError(error), detail };
  }
}
