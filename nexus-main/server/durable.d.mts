export function openDocuments(dir: string): Promise<{ flush: () => Promise<void> }>;
export function readStickerLibrary(): Promise<{ mode: 'local' | 'blob'; ok: boolean; items: { id: string; userId: string; mime: string; createdAt: string }[] | null }>;
export function writeStickerLibrary(items: { id: string; userId: string; mime: string; createdAt: string }[]): Promise<{ mode: 'local' | 'blob'; ok: boolean }>;
export function readStickerFile(id: string): Promise<{ mode?: 'local' | 'blob'; ok: boolean; bytes: Buffer | null; type: string }>;
export function writeStickerFile(id: string, bytes: Buffer, contentType: string): Promise<boolean>;
export function mergeFeed(local: unknown, remote: unknown): {
  posts: { id: string }[];
  reposts: { id: string }[];
  saved: Record<string, string[]>;
  deletedIds: string[];
  deletedRepostIds: string[];
};
