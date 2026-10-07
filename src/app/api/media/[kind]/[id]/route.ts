import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { get, uploadDir } from "@/lib/db";
import { canViewTask } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });
  const { kind, id } = await context.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return new NextResponse("Não encontrado", { status: 404 });

  let stored = "";
  let mime = "application/octet-stream";
  let filename = "arquivo";

  if (kind === "avatar") {
    const row = get<{ avatar_path: string | null; name: string }>("SELECT avatar_path, name FROM users WHERE id = ?", numericId);
    if (!row?.avatar_path) return new NextResponse("Não encontrado", { status: 404 });
    stored = row.avatar_path;
    mime = mimeFromName(stored);
    filename = "foto";
  } else if (kind === "attachment") {
    const row = get<{ stored_name: string; mime: string; original_name: string; assignee_id: number; creator_id: number }>(
      `SELECT a.stored_name, a.mime, a.original_name, t.assignee_id, t.creator_id
       FROM task_attachments a JOIN tasks t ON t.id = a.task_id WHERE a.id = ?`,
      numericId,
    );
    if (!row || !canViewTask(user, { assigneeId: row.assignee_id, creatorId: row.creator_id })) {
      return new NextResponse("Não encontrado", { status: 404 });
    }
    stored = row.stored_name;
    mime = row.mime;
    filename = row.original_name;
  } else if (kind === "post") {
    const row = get<{ image_path: string | null }>("SELECT image_path FROM posts WHERE id = ?", numericId);
    if (!row?.image_path) return new NextResponse("Não encontrado", { status: 404 });
    stored = row.image_path;
    mime = mimeFromName(stored);
    filename = "imagem";
  } else if (kind === "document") {
    const row = get<{ stored_name: string; original_name: string; status: string; author_id: number }>(
      "SELECT stored_name, original_name, status, author_id FROM documents WHERE id = ?",
      numericId,
    );
    if (!row) return new NextResponse("Não encontrado", { status: 404 });
    const allowed = row.status === "approved" || row.author_id === user.id || user.role === "leadership";
    if (!allowed) return new NextResponse("Não encontrado", { status: 404 });
    stored = row.stored_name;
    mime = "application/pdf";
    filename = row.original_name;
  } else if (kind === "announcement") {
    const row = get<{ image_path: string | null }>("SELECT image_path FROM announcements WHERE id = ?", numericId);
    if (!row?.image_path) return new NextResponse("Não encontrado", { status: 404 });
    stored = row.image_path;
    mime = mimeFromName(stored);
    filename = "imagem";
  } else {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const full = path.resolve(uploadDir(), path.basename(stored));
  if (!full.startsWith(path.resolve(uploadDir())) || !fs.existsSync(full)) {
    return new NextResponse("Não encontrado", { status: 404 });
  }
  const bytes = fs.readFileSync(full);
  const safe = filename.replace(/[^\w.\- ]/g, "_");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${safe}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}
