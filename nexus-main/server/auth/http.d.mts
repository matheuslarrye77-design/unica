import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthResult } from './flow.mjs';

export function applyAuthResult(res: ServerResponse, result: AuthResult): void;
export function readRequestBody(req: IncomingMessage): Promise<string>;
