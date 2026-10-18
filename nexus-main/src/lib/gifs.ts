import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { authHeaders, getDemoId } from '@/lib/session';

export type GifHit = {
  id: string;
  title: string;
  preview: string;
  url: string;
};

function demoHeaders(): Record<string, string> {
  return LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() };
}

export async function searchGifs(query: string) {
  const params = new URLSearchParams();
  const term = query.trim().slice(0, 50);
  if (term) params.set('q', term);
  const response = await fetch(`/api/gifs?${params}`, { credentials: 'include', headers: { ...authHeaders(), ...demoHeaders() } });
  const body = await response.json().catch(() => ({})) as { error?: string; gifs?: GifHit[] };
  if (!response.ok) throw new Error(body.error === 'rate' || body.error === 'config' || body.error === 'query' ? body.error : 'unavailable');
  return Array.isArray(body.gifs) ? body.gifs : [];
}
