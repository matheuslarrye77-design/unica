import type { IncomingMessage } from 'node:http';
import type { AuthStore, PublicUser } from './flow.mjs';

export function createLocalStore(file: string, accounts: PublicUser[]): AuthStore;
export function localUserFromRequest(req: IncomingMessage, file: string, accounts: PublicUser[]): PublicUser | null;
