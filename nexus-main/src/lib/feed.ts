import { authHeaders } from '@/lib/session';
import type { SocialPost } from '@/components/social/types';

export type Repost = {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  originalId: string;
  note: string;
  createdAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}

export function loadFeed() {
  return request<{ posts: SocialPost[]; reposts: Repost[] }>('/api/feed');
}

export function createFeedPost(body: { body: string; image?: string; attachment?: SocialPost['attachment']; poll?: SocialPost['poll']; kind?: 'recognition' }) {
  return request<{ post: SocialPost }>('/api/feed', { method: 'POST', body: JSON.stringify(body) });
}

export function likeFeedPost(id: string) {
  return request<{ post: SocialPost }>(`/api/feed/${id}/like`, { method: 'POST' });
}

export function shareFeedPost(id: string) {
  return request<{ post: SocialPost }>(`/api/feed/${id}/share`, { method: 'POST' });
}

export function commentFeedPost(id: string, body: string) {
  return request<{ post: SocialPost }>(`/api/feed/${id}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
}

export function deleteFeedComment(postId: string, commentId: string) {
  return request<{ post: SocialPost }>(`/api/feed/${postId}/comments/${commentId}`, { method: 'DELETE' });
}

export function republishPost(id: string, note: string) {
  return request<{ repost: Repost }>(`/api/feed/${id}/repost`, { method: 'POST', body: JSON.stringify({ note }) });
}

export function cancelRepost(id: string) {
  return request<{ ok: boolean }>(`/api/reposts/${id}`, { method: 'DELETE' });
}
