export function openDocuments(dir: string): Promise<{ flush: () => Promise<void> }>;
export function mergeFeed(local: unknown, remote: unknown): {
  posts: { id: string }[];
  reposts: { id: string }[];
  saved: Record<string, string[]>;
  deletedIds: string[];
  deletedRepostIds: string[];
};
