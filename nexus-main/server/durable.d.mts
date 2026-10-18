export function openDocuments(dir: string): Promise<{ flush: () => Promise<void> }>;
export function readStickerLibrary(): Promise<{ mode: 'local' | 'blob'; ok: boolean; items: { id: string; userId: string; mime: string; createdAt: string }[] | null; gifs: { id: string; userId: string; title: string; url: string; createdAt: string }[] | null }>;
export function writeStickerLibrary(items: { id: string; userId: string; mime: string; createdAt: string }[], gifs?: { id: string; userId: string; title: string; url: string; createdAt: string }[]): Promise<{ mode: 'local' | 'blob'; ok: boolean }>;
export function readStickerFile(id: string): Promise<{ mode?: 'local' | 'blob'; ok: boolean; bytes: Buffer | null; type: string }>;
export function writeStickerFile(id: string, bytes: Buffer, contentType: string): Promise<boolean>;
export function writeUploadFile(id: string, bytes: Buffer, contentType: string, meta: { name?: string }): Promise<boolean>;
export function readUploadFile(id: string): Promise<{ bytes: Buffer; mime: string; name: string } | null>;
export function mergeFeed(local: unknown, remote: unknown): {
  posts: { id: string }[];
  reposts: { id: string }[];
  saved: Record<string, string[]>;
  deletedIds: string[];
  deletedRepostIds: string[];
};
