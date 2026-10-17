import type { IncomingMessage, ServerResponse } from 'node:http';
import { institutionMiddleware } from '../server/apiPlugin.js';
import { dataDir } from '../server/dataDir.mjs';
import { flushDocuments, hydrateDocuments } from '../server/durable.mjs';
import { extraApi } from '../server/extraApi.js';

const feed = extraApi();
const institution = institutionMiddleware();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? '/';
  if (!url.startsWith('/api/')) req.url = `/api${url.startsWith('/') ? url : `/${url}`}`;
  const dir = dataDir();
  await hydrateDocuments(dir);
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
  await flushDocuments(dir);
}
