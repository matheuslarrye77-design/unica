import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { readUploadFile, writeUploadFile } from './durable.mjs';

const CHUNK = 4 * 1024 * 1024;

const LIMITS: Record<string, number> = {
  'image/jpeg': 12 * 1024 * 1024,
  'image/png': 12 * 1024 * 1024,
  'image/webp': 12 * 1024 * 1024,
  'image/gif': 12 * 1024 * 1024,
  'audio/mpeg': 80 * 1024 * 1024,
  'audio/mp4': 80 * 1024 * 1024,
  'audio/m4a': 80 * 1024 * 1024,
  'audio/x-m4a': 80 * 1024 * 1024,
  'audio/wav': 80 * 1024 * 1024,
  'audio/wave': 80 * 1024 * 1024,
  'audio/x-wav': 80 * 1024 * 1024,
  'audio/ogg': 80 * 1024 * 1024,
  'audio/webm': 80 * 1024 * 1024,
  'audio/aac': 80 * 1024 * 1024,
  'video/mp4': 200 * 1024 * 1024,
  'video/webm': 200 * 1024 * 1024,
  'application/pdf': 40 * 1024 * 1024,
  'text/plain': 8 * 1024 * 1024,
  'application/msword': 40 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 40 * 1024 * 1024,
  'application/vnd.ms-excel': 40 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 40 * 1024 * 1024,
  'application/vnd.ms-powerpoint': 40 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 40 * 1024 * 1024,
};

type Meta = {
  id: string;
  name: string;
  mime: string;
  size: number;
  received: number;
  ownerId: string;
  done: boolean;
};

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function safeId(value: string) {
  return /^up-[a-f0-9]{16}$/.test(value);
}

function readMeta(file: string): Meta | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Meta;
  } catch {
    return null;
  }
}

function sniff(buf: Buffer, mime: string) {
  if (buf.length < 12) return false;
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  if (mime === 'image/png') return buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG';
  if (mime === 'image/gif') return buf.toString('ascii', 0, 3) === 'GIF';
  if (mime === 'image/webp') return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  if (mime === 'application/pdf') return buf.toString('ascii', 0, 4) === '%PDF';
  if (mime === 'video/webm' || mime === 'audio/webm') return buf[0] === 0x1a && buf[1] === 0x45;
  if (mime === 'video/mp4' || mime === 'audio/mp4' || mime === 'audio/m4a' || mime === 'audio/x-m4a') return buf.toString('ascii', 4, 8) === 'ftyp';
  if (mime === 'audio/mpeg' || mime === 'audio/aac') return (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || buf[0] === 0xff;
  if (mime === 'audio/wav' || mime === 'audio/wave' || mime === 'audio/x-wav') return buf.toString('ascii', 0, 4) === 'RIFF';
  if (mime === 'audio/ogg') return buf.toString('ascii', 0, 4) === 'OggS';
  if (mime === 'text/plain') return !buf.includes(0);
  return buf[0] === 0x50 && buf[1] === 0x4b;
}

function writeChunk(req: IncomingMessage, file: string, offset: number, max: number) {
  return new Promise<number>((resolve, reject) => {
    let received = 0;
    const out = fs.createWriteStream(file, { flags: offset === 0 ? 'w' : 'r+', start: offset });
    const fail = (error: Error) => {
      req.destroy();
      out.destroy();
      reject(error);
    };
    req.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (offset + received > max) {
        fail(new Error('size'));
        return;
      }
      if (!out.write(chunk)) req.pause();
    });
    out.on('drain', () => req.resume());
    req.on('end', () => out.end(() => resolve(received)));
    req.on('error', fail);
    out.on('error', fail);
  });
}

export async function handleUpload(req: IncomingMessage, res: ServerResponse, url: string, userId: string, dir: string) {
  const root = path.join(dir, 'uploads');
  fs.mkdirSync(root, { recursive: true });

  if (req.method === 'POST' && url === '/api/uploads') {
    const raw = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
    const body = JSON.parse(raw || '{}') as { name?: string; mime?: string; size?: number };
    const mime = String(body.mime ?? '');
    const size = Number(body.size ?? 0);
    const limit = LIMITS[mime];
    const name = String(body.name ?? 'arquivo').replace(/[^\w.\- ()]/g, '').slice(0, 180);
    if (!limit || !name || !Number.isFinite(size) || size <= 0 || size > limit) {
      send(res, 400, { error: 'file' });
      return;
    }
    const id = `up-${randomBytes(8).toString('hex')}`;
    const meta: Meta = { id, name, mime, size, received: 0, ownerId: userId, done: false };
    fs.writeFileSync(path.join(root, `${id}.json`), JSON.stringify(meta));
    fs.writeFileSync(path.join(root, id), Buffer.alloc(0));
    send(res, 201, { id, chunkSize: CHUNK });
    return;
  }

  const part = /^\/api\/uploads\/(up-[a-f0-9]{16})$/.exec(url);
  if (!part || !safeId(part[1])) {
    send(res, 404, { error: 'missing' });
    return;
  }
  const id = part[1];
  const metaFile = path.join(root, `${id}.json`);
  const dataFile = path.join(root, id);
  const meta = readMeta(metaFile);

  if (req.method === 'GET') {
    if (meta?.done && fs.existsSync(dataFile)) {
      res.statusCode = 200;
      res.setHeader('Content-Type', meta.mime);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(meta.name)}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      fs.createReadStream(dataFile).pipe(res);
      return;
    }
    const stored = await readUploadFile(id);
    if (!stored) {
      send(res, 404, { error: 'missing' });
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', stored.mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(stored.name)}"`);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.end(stored.bytes);
    return;
  }

  if (!meta) {
    send(res, 404, { error: 'missing' });
    return;
  }

  if (meta.ownerId !== userId) {
    send(res, 403, { error: 'forbidden' });
    return;
  }

  if (req.method === 'PUT') {
    const offset = Number(req.headers['x-upload-offset'] ?? 0);
    if (!Number.isFinite(offset) || offset !== meta.received || meta.done) {
      send(res, 409, { error: 'offset', received: meta.received });
      return;
    }
    try {
      const received = await writeChunk(req, dataFile, offset, meta.size);
      meta.received += received;
      fs.writeFileSync(metaFile, JSON.stringify(meta));
      send(res, 200, { received: meta.received });
    } catch {
      send(res, 400, { error: 'chunk' });
    }
    return;
  }

  if (req.method === 'POST') {
    if (meta.received !== meta.size) {
      send(res, 409, { error: 'incomplete', received: meta.received });
      return;
    }
    const sample = Buffer.alloc(16);
    const fd = fs.openSync(dataFile, 'r');
    fs.readSync(fd, sample, 0, 16, 0);
    fs.closeSync(fd);
    if (!sniff(sample, meta.mime)) {
      fs.rmSync(dataFile, { force: true });
      fs.rmSync(metaFile, { force: true });
      send(res, 400, { error: 'type' });
      return;
    }
    meta.done = true;
    fs.writeFileSync(metaFile, JSON.stringify(meta));
    const durable = (meta.mime.startsWith('image/') && meta.size <= 12 * 1024 * 1024) || (meta.mime.startsWith('audio/') && meta.size <= 30 * 1024 * 1024);
    if (durable) {
      const bytes = fs.readFileSync(dataFile);
      const stored = await writeUploadFile(id, bytes, meta.mime, { name: meta.name });
      if (process.env.BLOB_READ_WRITE_TOKEN && !stored) console.error('[unica] media write', 'upload');
    }
    send(res, 200, { url: `/api/uploads/${id}`, name: meta.name, mime: meta.mime });
    return;
  }

  send(res, 405, { error: 'method' });
}
