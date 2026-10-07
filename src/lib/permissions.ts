import type { SessionUser, TaskCard } from "./types";

export function isLeadership(user: SessionUser) {
  return user.role === "leadership";
}

export function canViewTask(user: SessionUser, task: { assigneeId: number; creatorId: number }) {
  return isLeadership(user) || task.assigneeId === user.id || task.creatorId === user.id;
}

export function canEditTask(user: SessionUser, task: { creatorId: number }) {
  return isLeadership(user) || task.creatorId === user.id;
}

export function canChangeStatus(user: SessionUser, task: { assigneeId: number; creatorId: number }) {
  return isLeadership(user) || task.assigneeId === user.id || task.creatorId === user.id;
}

export function canSeeMood(user: SessionUser, entry: { userId: number; visibility: string }) {
  if (entry.userId === user.id || isLeadership(user)) return true;
  return entry.visibility === "public";
}

export function taskAccessSql(user: SessionUser) {
  if (isLeadership(user)) return { sql: "1 = 1", params: [] as number[] };
  return { sql: "(t.assignee_id = ? OR t.creator_id = ?)", params: [user.id, user.id] };
}

export type TaskAccess = Pick<TaskCard, "assigneeId" | "creatorId">;
