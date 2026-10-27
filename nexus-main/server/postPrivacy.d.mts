export const MOODS: string[];

export function cleanMood(value: unknown): string | undefined;

export function cleanAudience(value: unknown): 'team' | 'management';

export function cleanMoodAudience(value: unknown): 'team' | 'management' | 'self';

export function canSeePost(
  post: { audience?: string; authorId?: string } | null | undefined,
  user: { id?: string; role?: string; department?: string } | null | undefined,
): boolean;

export function canSeeMood(
  post: { mood?: string; authorId?: string; moodAudience?: string } | null | undefined,
  user: { id?: string; role?: string; department?: string } | null | undefined,
): boolean;

export function moodForViewer(
  record: string | { emoji?: string; visibility?: string; shared?: string } | null | undefined,
  viewerId: string,
  ownerId: string,
  leader: boolean,
): string;
