import type { IncomingMessage, ServerResponse } from 'node:http';

type Person = { id: string; name: string; email?: string; funcao: string; role: string };

export function handleGoals(
  req: IncomingMessage,
  res: ServerResponse,
  user: { id: string; name: string; role: string; department?: string },
  dir: string,
  colleagues: Person[],
  teamRoster: Person[],
  send: (res: ServerResponse, status: number, body: unknown) => void,
  readBody: (req: IncomingMessage) => Promise<Buffer>,
): Promise<boolean>;
