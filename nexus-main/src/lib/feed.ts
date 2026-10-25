import type { SocialPost } from '@/components/social/types';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { authHeaders, getDemoId } from '@/lib/session';
import { shrinkVideo } from '@/lib/shrinkVideo';

const DIRECT = 4 * 1024 * 1024;

export type Repost = {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  originalId: string;
  note: string;
  createdAt: string;
};

function demoHeaders(): Record<string, string> {
  return LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: 'include', headers: { ...authHeaders(), ...demoHeaders(), ...init?.headers } });
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}

function fileMime(file: File) {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.webm')) return 'video/webm';
  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.mp3')) return 'audio/mpeg';
  return 'application/octet-stream';
}

export async function uploadMedia(file: File, onProgress?: (ratio: number) => void) {
  const prepared = file.type.startsWith('video/') ? await shrinkVideo(file) : file;
  const mime = fileMime(prepared);
  if (prepared.size <= DIRECT) return sendDirect(prepared, mime, onProgress);
  const started = await request<{ id: string; chunkSize: number }>('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: prepared.name, mime, size: prepared.size }),
  });
  const chunkSize = started.chunkSize || 1024 * 1024;
  let offset = 0;
  let finished: { url: string; name: string; mime: string } | null = null;
  while (offset < prepared.size) {
    const slice = prepared.slice(offset, Math.min(prepared.size, offset + chunkSize));
    const body = await sendChunk(started.id, slice, offset, (loaded) => {
      onProgress?.(prepared.size === 0 ? 1 : (offset + loaded) / prepared.size);
    });
    offset += slice.size;
    onProgress?.(prepared.size === 0 ? 1 : offset / prepared.size);
    if (body.url) finished = { url: body.url, name: body.name || prepared.name, mime: body.mime || mime };
  }
  if (finished) return finished;
  return request<{ url: string; name: string; mime: string }>(`/api/uploads/${started.id}`, { method: 'POST' });
}

function sendDirect(file: File, mime: string, onProgress?: (ratio: number) => void) {
  return new Promise<{ url: string; name: string; mime: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/uploads');
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', mime);
    xhr.setRequestHeader('x-upload-direct', '1');
    xhr.setRequestHeader('x-upload-name', encodeURIComponent(file.name));
    const demo = demoHeaders();
    if (demo['x-unica-demo']) xhr.setRequestHeader('x-unica-demo', demo['x-unica-demo']);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(String(xhr.status)));
        return;
      }
      resolve(JSON.parse(xhr.responseText) as { url: string; name: string; mime: string });
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(file);
  });
}

function sendChunk(id: string, blob: Blob, offset: number, onProgress?: (loaded: number) => void) {
  return new Promise<{ url?: string; name?: string; mime?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `/api/uploads/${id}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('x-upload-offset', String(offset));
    const demo = demoHeaders();
    if (demo['x-unica-demo']) xhr.setRequestHeader('x-unica-demo', demo['x-unica-demo']);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded);
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(String(xhr.status)));
        return;
      }
      resolve(JSON.parse(xhr.responseText || '{}') as { url?: string; name?: string; mime?: string });
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(blob);
  });
}

export function loadFeed() {
  return request<{ posts: SocialPost[]; reposts: Repost[] }>('/api/feed');
}

export function createFeedPost(body: { body: string; image?: string; images?: string[]; blocks?: SocialPost['blocks']; attachment?: SocialPost['attachment']; poll?: SocialPost['poll']; kind?: 'recognition'; recognizedName?: string; tag?: string }) {
  return request<{ post: SocialPost }>('/api/feed', { method: 'POST', body: JSON.stringify(body) });
}

export function likeFeedPost(id: string, kind: 'like' | 'love') {
  return request<{ post: SocialPost }>(`/api/feed/${id}/like`, { method: 'POST', body: JSON.stringify({ kind }) });
}

export function voteFeedPost(id: string, optionId: string) {
  return request<{ post: SocialPost }>(`/api/feed/${id}/vote`, { method: 'POST', body: JSON.stringify({ optionId }) });
}

export function saveFeedPost(id: string) {
  return request<{ post: SocialPost; saved: string[] }>(`/api/feed/${id}/save`, { method: 'POST' });
}

export function shareFeedPost(id: string) {
  return request<{ post: SocialPost }>(`/api/feed/${id}/share`, { method: 'POST' });
}

export function commentFeedPost(id: string, body: string, media?: SocialPost['comments'][number]['media']) {
  return request<{ post: SocialPost }>(`/api/feed/${id}/comments`, { method: 'POST', body: JSON.stringify({ body, media }) });
}

export function likeFeedComment(postId: string, commentId: string) {
  return request<{ post: SocialPost }>(`/api/feed/${postId}/comments/${commentId}/like`, { method: 'POST' });
}

export function deleteFeedComment(postId: string, commentId: string) {
  return request<{ post: SocialPost }>(`/api/feed/${postId}/comments/${commentId}`, { method: 'DELETE' });
}

export function deleteFeedPost(id: string) {
  return request<{ ok: boolean }>(`/api/feed/${id}`, { method: 'DELETE' });
}

export function republishPost(id: string, note: string) {
  return request<{ repost: Repost }>(`/api/feed/${id}/repost`, { method: 'POST', body: JSON.stringify({ note }) });
}

export function cancelRepost(id: string) {
  return request<{ ok: boolean }>(`/api/reposts/${id}`, { method: 'DELETE' });
}
