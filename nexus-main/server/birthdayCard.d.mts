import type { IncomingMessage, ServerResponse } from 'node:http';

type BirthdayUser = { id: string; name: string };

export function canPlaceSticker(userId: string, stickers: { authorId: string }[]): boolean;

export function handleBirthdayCard(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  user: BirthdayUser,
  dir: string,
): Promise<void>;
