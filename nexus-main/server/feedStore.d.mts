export const FEED_UNAVAILABLE: string;
export const FEED_LOAD_UNAVAILABLE: string;
export function feedDocumentId(env?: NodeJS.Dict<string>): string;
export function emptyFeed(): Record<string, unknown>;
export function normalizeFeed(parsed: unknown): Record<string, unknown>;
export function createFeedStore(options?: Record<string, unknown>): {
  id: string;
  remote: boolean;
  load(): Promise<{ store: Record<string, unknown>; version?: string; id?: string; error?: string; kind?: string; message?: string }>;
  mutate(mutator: (store: never) => unknown): Promise<Record<string, unknown>>;
};
