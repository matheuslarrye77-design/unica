import type { IncomingMessage, ServerResponse } from 'node:http';

export function stickerMediaUrl(value: string): string;
export function detectImage(bytes: Buffer): string;
export function handleStickerRequest(req: IncomingMessage, res: ServerResponse, url: string, dir: string, user: { id: string } | null): Promise<boolean>;
