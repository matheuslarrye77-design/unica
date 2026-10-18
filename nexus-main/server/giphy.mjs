const MEDIA = /^https:\/\/(?:i|media\d?)\.giphy\.com\/media\/[A-Za-z0-9]+\/[A-Za-z0-9._-]+\.(?:gif|webp)$/;

export function cleanGifQuery(value) {
  const text = String(value ?? '').replace(/[\u0000-\u001f]/g, '').trim().replace(/\s+/g, ' ').slice(0, 50);
  if (!text) return '';
  if (!/^[\p{L}\p{N} .,'!?+-]+$/u.test(text)) return null;
  return text;
}

export function gifMediaUrl(value) {
  const url = String(value ?? '');
  return MEDIA.test(url) ? url : '';
}

function pickUrl(images) {
  return [images?.fixed_width?.url, images?.downsized?.url, images?.original?.url].map(gifMediaUrl).find(Boolean) || '';
}

export function sanitizeGifs(payload) {
  const list = Array.isArray(payload?.data) ? payload.data : [];
  return list.slice(0, 20).flatMap((item) => {
    const url = pickUrl(item?.images);
    if (!item?.id || !url) return [];
    const preview = gifMediaUrl(item.images?.fixed_width_small?.url) || gifMediaUrl(item.images?.fixed_width?.url) || url;
    const title = String(item.title || 'GIF').replace(/\s+/g, ' ').trim().slice(0, 80) || 'GIF';
    return [{ id: String(item.id).slice(0, 40), title, preview, url }];
  });
}

export async function searchGifs(query, env = process.env, fetchImpl = fetch) {
  const key = String(env.GIPHY_API_KEY || '').trim();
  if (!key) {
    console.error('[unica] giphy missing server configuration');
    return { status: 503, body: { error: 'config' } };
  }
  const cleaned = cleanGifQuery(query);
  if (cleaned === null) return { status: 400, body: { error: 'query' } };
  const endpoint = new URL(cleaned ? 'https://api.giphy.com/v1/gifs/search' : 'https://api.giphy.com/v1/gifs/trending');
  endpoint.searchParams.set('api_key', key);
  endpoint.searchParams.set('limit', '20');
  endpoint.searchParams.set('rating', 'pg');
  endpoint.searchParams.set('lang', 'pt');
  if (cleaned) endpoint.searchParams.set('q', cleaned);
  let response;
  try {
    response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(8000) });
  } catch {
    console.error('[unica] giphy request failed');
    return { status: 502, body: { error: 'unavailable' } };
  }
  if (response.status === 429) {
    console.error('[unica] giphy rate limited');
    return { status: 429, body: { error: 'rate' } };
  }
  if (!response.ok) {
    console.error('[unica] giphy', response.status);
    return { status: 502, body: { error: 'unavailable' } };
  }
  try {
    return { status: 200, body: { gifs: sanitizeGifs(await response.json()) } };
  } catch {
    console.error('[unica] giphy invalid response');
    return { status: 502, body: { error: 'unavailable' } };
  }
}
