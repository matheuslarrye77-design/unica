export function cleanGifQuery(value: unknown): string | null;
export function gifMediaUrl(value: unknown): string;
export function sanitizeGifs(payload: unknown): { id: string; title: string; preview: string; url: string }[];
export function searchGifs(
  query: unknown,
  env?: NodeJS.ProcessEnv,
  fetchImpl?: typeof fetch,
): Promise<{ status: number; body: { error?: string; gifs?: { id: string; title: string; preview: string; url: string }[] } }>;
