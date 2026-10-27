import { isLeader } from './auth/permissions.mjs';

export const MOODS = ['😮‍💨', '😔', '😴', '😐', '😊', '🚀'];

function plain(value) {
  return String(value ?? '').replace(/\uFE0F/g, '');
}

export function cleanMood(value) {
  if (typeof value !== 'string' || !value) return undefined;
  return MOODS.find((item) => item === value || plain(item) === plain(value));
}

export function cleanAudience(value) {
  return value === 'management' ? 'management' : 'team';
}

export function cleanMoodAudience(value) {
  return value === 'management' || value === 'self' ? value : 'team';
}

export function isManagement(user) {
  return /admin|líder|lider|coordena|diret|vp\b|chief|head|gerente/i.test(String(user?.role ?? ''));
}

export function canSeePost(post, user) {
  if (!post) return false;
  if (post.audience !== 'management') return true;
  return post.authorId === user?.id || isManagement(user);
}

export function canSeeMood(post, user) {
  if (!post?.mood) return false;
  if (post.authorId === user?.id) return true;
  if (post.moodAudience === 'self') return false;
  if (post.moodAudience === 'management') return isLeader(user);
  return true;
}

export function moodForViewer(record, viewerId, ownerId, leader) {
  if (typeof record === 'string') return record;
  if (!record || typeof record !== 'object') return '';
  const emoji = typeof record.emoji === 'string' ? record.emoji : '';
  const shared = typeof record.shared === 'string' ? record.shared : '';
  if (viewerId === ownerId) return emoji;
  if (record.visibility === 'self') return shared;
  if (record.visibility === 'management') return leader ? emoji : shared;
  return emoji;
}
