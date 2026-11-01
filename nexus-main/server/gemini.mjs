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

export function classifyGeminiError(error) {
  const status = Number(error?.status ?? error?.code);
  const message = String(error?.message ?? error ?? '');
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit|exceeded/i.test(message)) return 'quota';
  return 'unavailable';
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
    return String(response.text ?? '');
  });
  try {
    const text = await call({ apiKey: key, model, prompt, schema: options.schema });
    if (!text.trim()) return { error: 'unavailable' };
    return { text };
  } catch (error) {
    console.error('[unica] gemini', classifyGeminiError(error));
    return { error: classifyGeminiError(error) };
  }
}
