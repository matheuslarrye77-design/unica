import type { IncomingMessage, ServerResponse } from 'node:http';

type CelebrationUser = { id: string; name: string; avatar: string; role: string; department: string };

export function handleCelebrations(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  user: CelebrationUser,
  dir: string,
  leader: boolean,
): Promise<void>;
