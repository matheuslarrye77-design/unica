import { all, get, insert, run } from "./db";
import { nowISO } from "./dates";

export function audit(
  userId: number | null,
  action: string,
  entity: string,
  entityId: number | null,
  details: string,
) {
  insert(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    userId,
    action,
    entity,
    entityId,
    details,
    nowISO(),
  );
}

export function notify(input: {
  userId: number;
  type: string;
  title: string;
  body?: string;
  link?: string | null;
  dedupeKey?: string | null;
}) {
  const createdAt = nowISO();
  const prefs = get<{ preferences: string | null }>("SELECT preferences FROM users WHERE id = ?", input.userId);
  if (prefs?.preferences) {
    try {
      const parsed = JSON.parse(prefs.preferences) as Record<string, boolean>;
      if (parsed[input.type] === false) return;
    } catch {
      /* preferências inválidas não bloqueiam o aviso */
    }
  }
  if (input.dedupeKey) {
    run(
      `INSERT OR IGNORE INTO notifications (user_id, type, title, body, link, dedupe_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.userId,
      input.type,
      input.title,
      input.body ?? "",
      input.link ?? null,
      input.dedupeKey,
      createdAt,
    );
    return;
  }
  insert(
    `INSERT INTO notifications (user_id, type, title, body, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.userId,
    input.type,
    input.title,
    input.body ?? "",
    input.link ?? null,
    createdAt,
  );
}

export function notifyEveryoneExcept(
  exceptUserId: number,
  input: { type: string; title: string; body?: string; link?: string | null; dedupeKey?: string | null },
) {
  const rows = all<{ id: number }>("SELECT id FROM users WHERE active = 1 AND id != ?", exceptUserId);
  for (const person of rows) {
    notify({
      ...input,
      userId: person.id,
      dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${person.id}` : null,
    });
  }
}
