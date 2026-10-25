import type { SocialPost } from '@/components/social/types';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { authHeaders, getDemoId } from '@/lib/session';

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

export async function uploadMedia(file: File, onProgress?: (ratio: number) => void) {
  const started = await request<{ id: string; chunkSize: number }>('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({ name: file.name, mime: file.type || 'application/octet-stream', size: file.size }),
  });
  const chunkSize = started.chunkSize || 1024 * 1024;
  let offset = 0;
  while (offset < file.size) {
    const slice = file.slice(offset, Math.min(file.size, offset + chunkSize));
    await sendChunk(started.id, slice, offset);
    offset += slice.size;
    onProgress?.(file.size === 0 ? 1 : offset / file.size);
  }
  return request<{ url: string; name: string; mime: string }>(`/api/uploads/${started.id}`, { method: 'POST' });
}

function sendChunk(id: string, blob: Blob, offset: number) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `/api/uploads/${id}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('x-upload-offset', String(offset));
    const demo = demoHeaders();
    if (demo['x-unica-demo']) xhr.setRequestHeader('x-unica-demo', demo['x-unica-demo']);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
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
