import type { IncomingMessage, ServerResponse } from 'node:http';
import { institutionMiddleware } from '../server/apiPlugin.js';
import { dataDir } from '../server/dataDir.mjs';
import { openDocuments } from '../server/durable.mjs';
import { extraApi } from '../server/extraApi.js';

const feed = extraApi();
const institution = institutionMiddleware();

function restoreNestedPath(req: IncomingMessage) {
  const raw = req.url ?? '/';
  const current = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://internal');
  const nested = current.searchParams.get('nested');
  if (!nested) return;
  current.searchParams.delete('nested');
  const query = current.searchParams.toString();
  const path = `/${nested.replace(/^\/+/, '')}`;
  const restored = `${path.startsWith('/api/') ? path : `/api${path}`}`.replace(/\/+$/, '') || '/';
  req.url = `${restored}${query ? `?${query}` : ''}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  restoreNestedPath(req);
  const raw = req.url ?? '/';
  const queryAt = raw.indexOf('?');
  const path = (queryAt === -1 ? raw : raw.slice(0, queryAt)).replace(/\/+$/, '') || '/';
  const query = queryAt === -1 ? '' : raw.slice(queryAt);
  req.url = `${path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`}${query}`;
  const dir = dataDir();
  const documents = await openDocuments(dir);
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    res.on('finish', done);
    res.on('close', done);
    feed(req, res, () => {
      institution(req, res, () => {
        if (!res.headersSent) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'not-found' }));
        }
        done();
      });
    });
  });
  try {
    await documents.flush();
  } catch {
    console.error('[unica] document write', 'failed');
  }
}
