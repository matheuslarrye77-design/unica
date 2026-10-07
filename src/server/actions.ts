"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit, notify, notifyEveryoneExcept } from "@/lib/audit";
import { clearSessionCookie, cleanupSessions, getCurrentUser, sessionExpiry, setSessionCookie } from "@/lib/auth";
import { ANNOUNCEMENT_TYPES, MOODS, PRIORITIES, RECOGNITION_CATEGORIES, STATUSES, STATUS_LABEL } from "@/lib/constants";
import { all, get, insert, run, transaction, uploadDir } from "@/lib/db";
import { formatDate, nowISO, todayInSaoPaulo } from "@/lib/dates";
import { ActionError, runAction } from "@/lib/errors";
import { canChangeStatus, canEditTask, canViewTask } from "@/lib/permissions";
import { safeFileName } from "@/lib/utils";
import { appSetting, countUsers, documentPublishers, findUserByEmail, uniqueUsername, userExists } from "@/server/data";
import type { ActionResult, DocumentStatus, FeedbackKind, MoodType, MoodVisibility, Priority, ReactionType, SessionUser, TaskStatus } from "@/lib/types";

const FILES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const IMAGES = new Set(["image/png", "image/jpeg", "image/webp"]);

type TaskRow = {
  id: number;
  title: string;
  description: string;
  assignee_id: number;
  creator_id: number;
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  category: string;
  notes: string;
};

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function requireLeadership(user: SessionUser) {
  if (user.role !== "leadership") throw new ActionError("Sem permissão para esta ação.");
}

function loadTask(id: number) {
  return get<TaskRow>("SELECT * FROM tasks WHERE id = ?", id);
}

function touchTask(id: number) {
  run("UPDATE tasks SET updated_at = ? WHERE id = ?", nowISO(), id);
}

function history(taskId: number, userId: number, action: string, details: string) {
  insert(
    "INSERT INTO task_history (task_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)",
    taskId,
    userId,
    action,
    details,
    nowISO(),
  );
}

function revalidateTask(id?: number) {
  revalidatePath("/inicio");
  revalidatePath("/tarefas");
  revalidatePath("/calendario");
  revalidatePath("/equipe");
  revalidatePath("/busca");
  if (id) revalidatePath(`/tarefas/${id}`);
}

function createSession(userId: number) {
  cleanupSessions();
  const token = crypto.randomBytes(32).toString("hex");
  insert(
    "INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)",
    userId,
    token,
    sessionExpiry(),
    nowISO(),
  );
  return token;
}

async function storeFile(file: File, imagesOnly = false) {
  const allowed = imagesOnly ? IMAGES : FILES;
  if (!allowed.has(file.type)) throw new ActionError("Formato de arquivo não suportado.");
  if (file.size <= 0) throw new ActionError("Arquivo vazio.");
  if (file.size > 8 * 1024 * 1024) throw new ActionError("O arquivo precisa ter no máximo 8 MB.");
  const stored = `${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(uploadDir(), stored), bytes);
  return { stored, size: bytes.length, mime: file.type, name: file.name.slice(0, 180) };
}

function removeStored(stored: string | null | undefined) {
  if (!stored) return;
  const full = path.resolve(uploadDir(), path.basename(stored));
  if (full.startsWith(path.resolve(uploadDir())) && fs.existsSync(full)) fs.unlinkSync(full);
}

const text = (value: FormDataEntryValue | null, max: number) => String(value ?? "").trim().slice(0, max);

export async function setupAccount(formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    if (countUsers() > 0) throw new ActionError("O acesso inicial já foi configurado.");
    const parsed = z
      .object({
        name: z.string().trim().min(2, "Informe o nome.").max(80),
        email: z.string().trim().email("E-mail inválido.").max(120),
        password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(80),
        jobTitle: z.string().trim().max(80).optional(),
        department: z.string().trim().max(80).optional(),
        birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
      })
      .safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        jobTitle: formData.get("jobTitle"),
        department: formData.get("department"),
        birthday: formData.get("birthday") || "",
      });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const now = nowISO();
    const email = parsed.data.email.toLowerCase();
    const userId = transaction(() =>
      insert(
        `INSERT INTO users (name, username, email, password_hash, role, job_title, department, birthday, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'leadership', ?, ?, ?, ?, ?)`,
        parsed.data.name,
        uniqueUsername(parsed.data.name),
        email,
        bcrypt.hashSync(parsed.data.password, 10),
        parsed.data.jobTitle || "",
        parsed.data.department || "",
        parsed.data.birthday || null,
        now,
        now,
      ),
    );
    audit(userId, "user.setup", "user", userId, "Primeiro acesso da liderança");
    await setSessionCookie(createSession(userId));
    return { ok: true as const };
  });
  if (result.ok) redirect("/inicio");
  return result;
}

export async function login(formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const email = text(formData.get("email"), 120).toLowerCase();
    const password = String(formData.get("password") ?? "");
    const account = findUserByEmail(email);
    if (!account || !bcrypt.compareSync(password, account.password_hash)) {
      return { ok: false, error: "E-mail ou senha incorretos." };
    }
    if (account.active !== 1) return { ok: false, error: "Acesso desativado. Procure a liderança." };
    await setSessionCookie(createSession(account.id));
    return { ok: true as const };
  });
  if (result.ok) redirect("/inicio");
  return result;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get("koban_session")?.value;
  if (token) run("DELETE FROM sessions WHERE token = ?", token);
  await clearSessionCookie();
  redirect("/login");
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const title = text(formData.get("title"), 140);
    if (title.length < 2) throw new ActionError("Informe um título.");
    const description = text(formData.get("description"), 5000);
    const notes = text(formData.get("notes"), 2000);
    const category = text(formData.get("category"), 40);
    const priority = text(formData.get("priority"), 20);
    if (!PRIORITIES.includes(priority as Priority)) throw new ActionError("Prioridade inválida.");
    const due = text(formData.get("dueDate"), 10);
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new ActionError("Prazo inválido.");
    let assigneeId = user.id;
    if (user.role === "leadership") {
      assigneeId = Number(formData.get("assigneeId"));
      if (!userExists(assigneeId)) throw new ActionError("Selecione o responsável.");
    }
    let checklist: string[] = [];
    try {
      const parsed = JSON.parse(String(formData.get("checklist") || "[]"));
      if (!Array.isArray(parsed)) throw new Error("invalid");
      checklist = parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 30);
    } catch {
      throw new ActionError("Checklist inválido.");
    }
    const file = formData.get("file");
    const now = nowISO();
    const taskId = transaction(() => {
      const id = insert(
        `INSERT INTO tasks (title, description, assignee_id, creator_id, priority, status, due_date, category, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?)`,
        title,
        description,
        assigneeId,
        user.id,
        priority,
        due || null,
        category,
        notes,
        now,
        now,
      );
      checklist.forEach((item, index) => {
        insert(
          "INSERT INTO task_checklist_items (task_id, title, done, position) VALUES (?, ?, 0, ?)",
          id,
          item.slice(0, 160),
          index,
        );
      });
      history(id, user.id, "created", "Criou a atividade");
      return id;
    });
    if (file instanceof File && file.size > 0) {
      const saved = await storeFile(file);
      insert(
        `INSERT INTO task_attachments (task_id, original_name, stored_name, mime, size, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        taskId,
        saved.name,
        saved.stored,
        saved.mime,
        saved.size,
        user.id,
        nowISO(),
      );
    }
    audit(user.id, "task.create", "task", taskId, title);
    if (assigneeId !== user.id) {
      notify({
        userId: assigneeId,
        type: "task_assigned",
        title: "Você recebeu uma nova atividade",
        body: title,
        link: `/tarefas/${taskId}`,
      });
    }
    revalidateTask(taskId);
    return { ok: true, message: "Atividade criada.", id: taskId };
  });
}

export async function updateTask(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const id = Number(formData.get("id"));
    const task = loadTask(id);
    if (!task) throw new ActionError("Atividade não encontrada.");
    if (!canEditTask(user, { creatorId: task.creator_id })) throw new ActionError("Sem permissão para editar esta atividade.");
    const title = text(formData.get("title"), 140);
    if (title.length < 2) throw new ActionError("Informe um título.");
    const description = text(formData.get("description"), 5000);
    const notes = text(formData.get("notes"), 2000);
    const category = text(formData.get("category"), 40);
    const priority = text(formData.get("priority"), 20) as Priority;
    const status = text(formData.get("status"), 20) as TaskStatus;
    if (!PRIORITIES.includes(priority)) throw new ActionError("Prioridade inválida.");
    if (!STATUSES.includes(status)) throw new ActionError("Status inválido.");
    const due = text(formData.get("dueDate"), 10);
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new ActionError("Prazo inválido.");
    let assigneeId = task.assignee_id;
    if (user.role === "leadership") {
      assigneeId = Number(formData.get("assigneeId"));
      if (!userExists(assigneeId)) throw new ActionError("Selecione o responsável.");
    }
    const now = nowISO();
    transaction(() => {
      run(
        `UPDATE tasks
         SET title = ?, description = ?, assignee_id = ?, priority = ?, status = ?, due_date = ?, category = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        title,
        description,
        assigneeId,
        priority,
        status,
        due || null,
        category,
        notes,
        now,
        id,
      );
      if (title !== task.title || description !== task.description || category !== task.category || notes !== task.notes || priority !== task.priority) {
        history(id, user.id, "updated", "Editou a atividade");
      }
      if (status !== task.status) {
        history(
          id,
          user.id,
          status === "done" ? "completed" : "status",
          status === "done" ? "Concluiu a atividade" : `Moveu de ${STATUS_LABEL[task.status]} para ${STATUS_LABEL[status]}`,
        );
      }
      if ((due || null) !== (task.due_date || null)) {
        history(id, user.id, "due", due ? `Alterou o prazo para ${formatDate(due)}` : "Removeu o prazo");
      }
      if (assigneeId !== task.assignee_id) {
        const name = get<{ name: string }>("SELECT name FROM users WHERE id = ?", assigneeId)?.name ?? "colaborador";
        history(id, user.id, "assignee", `Alterou o responsável para ${name}`);
      }
    });
    audit(user.id, "task.update", "task", id, title);
    if (assigneeId !== task.assignee_id && assigneeId !== user.id) {
      notify({ userId: assigneeId, type: "task_assigned", title: "Você recebeu uma nova atividade", body: title, link: `/tarefas/${id}` });
    }
    revalidateTask(id);
    return { ok: true, message: status === "done" && task.status !== "done" ? "Atividade concluída" : "Atividade atualizada." };
  });
}

export async function moveTask(taskId: number, status: TaskStatus): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    if (!STATUSES.includes(status)) throw new ActionError("Status inválido.");
    const task = loadTask(taskId);
    if (!task) throw new ActionError("Atividade não encontrada.");
    if (!canChangeStatus(user, { assigneeId: task.assignee_id, creatorId: task.creator_id })) {
      throw new ActionError("Sem permissão para alterar esta atividade.");
    }
    if (task.status === status) return { ok: true, message: "Status atualizado" };
    run("UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?", status, nowISO(), taskId);
    history(
      taskId,
      user.id,
      status === "done" ? "completed" : "status",
      status === "done" ? "Concluiu a atividade" : `Moveu de ${STATUS_LABEL[task.status]} para ${STATUS_LABEL[status]}`,
    );
    audit(user.id, status === "done" ? "task.complete" : "task.status", "task", taskId, `${task.status} → ${status}`);
    revalidateTask(taskId);
    return { ok: true, message: status === "done" ? "Atividade concluída" : "Status atualizado" };
  });
}

export async function deleteTask(taskId: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const task = loadTask(taskId);
    if (!task) throw new ActionError("Atividade não encontrada.");
    if (!canEditTask(user, { creatorId: task.creator_id })) throw new ActionError("Sem permissão para excluir esta atividade.");
    const files = all<{ stored_name: string }>("SELECT stored_name FROM task_attachments WHERE task_id = ?", taskId);
    audit(user.id, "task.delete", "task", taskId, task.title);
    run("DELETE FROM tasks WHERE id = ?", taskId);
    files.forEach((file) => removeStored(file.stored_name));
    revalidateTask();
    return { ok: true, message: "Atividade excluída." };
  });
}

export async function addTaskComment(taskId: number, body: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const task = loadTask(taskId);
    if (!task) throw new ActionError("Atividade não encontrada.");
    if (!canViewTask(user, { assigneeId: task.assignee_id, creatorId: task.creator_id })) {
      throw new ActionError("Sem permissão para comentar.");
    }
    const message = body.trim().slice(0, 2000);
    if (message.length < 1) throw new ActionError("Escreva um comentário.");
    insert(
      "INSERT INTO task_comments (task_id, user_id, body, created_at) VALUES (?, ?, ?, ?)",
      taskId,
      user.id,
      message,
      nowISO(),
    );
    touchTask(taskId);
    const recipients = new Set([task.assignee_id, task.creator_id]);
    recipients.delete(user.id);
    for (const recipient of recipients) {
      notify({
        userId: recipient,
        type: "task_comment",
        title: `${user.name.split(" ")[0]} comentou em sua atividade`,
        body: task.title,
        link: `/tarefas/${taskId}`,
      });
    }
    revalidateTask(taskId);
    return { ok: true, message: "Comentário publicado." };
  });
}

export async function addChecklistItem(taskId: number, title: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const task = loadTask(taskId);
    if (!task || !canChangeStatus(user, { assigneeId: task.assignee_id, creatorId: task.creator_id })) {
      throw new ActionError("Sem permissão para alterar o checklist.");
    }
    const item = title.trim().slice(0, 160);
    if (!item) throw new ActionError("Informe o item.");
    const position = get<{ maxPos: number }>("SELECT COALESCE(MAX(position), -1) AS maxPos FROM task_checklist_items WHERE task_id = ?", taskId);
    insert(
      "INSERT INTO task_checklist_items (task_id, title, done, position) VALUES (?, ?, 0, ?)",
      taskId,
      item,
      (position?.maxPos ?? -1) + 1,
    );
    history(taskId, user.id, "updated", "Adicionou um item ao checklist");
    touchTask(taskId);
    revalidateTask(taskId);
    return { ok: true };
  });
}

export async function toggleChecklistItem(itemId: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const item = get<{ id: number; task_id: number; done: number }>("SELECT id, task_id, done FROM task_checklist_items WHERE id = ?", itemId);
    if (!item) throw new ActionError("Item não encontrado.");
    const task = loadTask(item.task_id);
    if (!task || !canChangeStatus(user, { assigneeId: task.assignee_id, creatorId: task.creator_id })) {
      throw new ActionError("Sem permissão para alterar o checklist.");
    }
    run("UPDATE task_checklist_items SET done = ? WHERE id = ?", item.done ? 0 : 1, itemId);
    touchTask(item.task_id);
    revalidateTask(item.task_id);
    return { ok: true };
  });
}

export async function removeChecklistItem(itemId: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const item = get<{ id: number; task_id: number }>("SELECT id, task_id FROM task_checklist_items WHERE id = ?", itemId);
    if (!item) throw new ActionError("Item não encontrado.");
    const task = loadTask(item.task_id);
    if (!task || !canChangeStatus(user, { assigneeId: task.assignee_id, creatorId: task.creator_id })) {
      throw new ActionError("Sem permissão para alterar o checklist.");
    }
    run("DELETE FROM task_checklist_items WHERE id = ?", itemId);
    history(item.task_id, user.id, "updated", "Removeu um item do checklist");
    touchTask(item.task_id);
    revalidateTask(item.task_id);
    return { ok: true };
  });
}

export async function uploadAttachment(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const taskId = Number(formData.get("taskId"));
    const task = loadTask(taskId);
    if (!task || !canChangeStatus(user, { assigneeId: task.assignee_id, creatorId: task.creator_id })) {
      throw new ActionError("Sem permissão para anexar arquivo.");
    }
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ActionError("Selecione um arquivo.");
    const saved = await storeFile(file);
    insert(
      `INSERT INTO task_attachments (task_id, original_name, stored_name, mime, size, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      taskId,
      saved.name,
      saved.stored,
      saved.mime,
      saved.size,
      user.id,
      nowISO(),
    );
    touchTask(taskId);
    revalidateTask(taskId);
    return { ok: true, message: "Arquivo anexado." };
  });
}

export async function deleteAttachment(id: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const file = get<{ id: number; task_id: number; stored_name: string; uploaded_by: number }>(
      "SELECT id, task_id, stored_name, uploaded_by FROM task_attachments WHERE id = ?",
      id,
    );
    if (!file) throw new ActionError("Arquivo não encontrado.");
    const task = loadTask(file.task_id);
    if (!task) throw new ActionError("Atividade não encontrada.");
    const allowed = user.role === "leadership" || file.uploaded_by === user.id || task.creator_id === user.id;
    if (!allowed) throw new ActionError("Sem permissão para remover o arquivo.");
    run("DELETE FROM task_attachments WHERE id = ?", id);
    removeStored(file.stored_name);
    revalidateTask(file.task_id);
    return { ok: true, message: "Arquivo removido." };
  });
}

export async function saveEvent(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    requireLeadership(user);
    const id = Number(formData.get("id") || 0);
    const title = text(formData.get("title"), 140);
    if (title.length < 2) throw new ActionError("Informe o título.");
    const description = text(formData.get("description"), 2000);
    const type = text(formData.get("type"), 20);
    if (type !== "reuniao" && type !== "evento") throw new ActionError("Tipo inválido.");
    const date = text(formData.get("date"), 10);
    const time = text(formData.get("time"), 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ActionError("Data inválida.");
    if (time && !/^\d{2}:\d{2}$/.test(time)) throw new ActionError("Horário inválido.");
    const now = nowISO();
    if (id) {
      const existing = get("SELECT id FROM events WHERE id = ?", id);
      if (!existing) throw new ActionError("Evento não encontrado.");
      run(
        "UPDATE events SET title = ?, description = ?, type = ?, event_date = ?, event_time = ?, updated_at = ? WHERE id = ?",
        title,
        description,
        type,
        date,
        time || null,
        now,
        id,
      );
      audit(user.id, "event.update", "event", id, title);
    } else {
      const created = insert(
        `INSERT INTO events (title, description, type, event_date, event_time, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        title,
        description,
        type,
        date,
        time || null,
        user.id,
        now,
        now,
      );
      audit(user.id, "event.create", "event", created, title);
    }
    revalidatePath("/calendario");
    revalidatePath("/inicio");
    return { ok: true, message: id ? "Evento atualizado." : "Evento criado." };
  });
}

export async function deleteEvent(id: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    requireLeadership(user);
    const event = get<{ title: string }>("SELECT title FROM events WHERE id = ?", id);
    if (!event) throw new ActionError("Evento não encontrado.");
    audit(user.id, "event.delete", "event", id, event.title);
    run("DELETE FROM events WHERE id = ?", id);
    revalidatePath("/calendario");
    revalidatePath("/inicio");
    return { ok: true, message: "Evento excluído." };
  });
}

export async function leaveBirthdayMessage(recipientId: number, body: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    if (recipientId === user.id) throw new ActionError("Escolha outra pessoa para a mensagem.");
    if (!userExists(recipientId)) throw new ActionError("Pessoa não encontrada.");
    const message = body.trim().slice(0, 400);
    if (message.length < 2) throw new ActionError("Escreva uma mensagem.");
    const year = Number(todayInSaoPaulo().slice(0, 4));
    const recipient = get<{ name: string }>("SELECT name FROM users WHERE id = ?", recipientId);
    insert(
      "INSERT INTO birthday_messages (recipient_id, author_id, year, body, created_at) VALUES (?, ?, ?, ?, ?)",
      recipientId,
      user.id,
      year,
      message,
      nowISO(),
    );
    notify({
      userId: recipientId,
      type: "birthday_message",
      title: `${user.name.split(" ")[0]} deixou uma mensagem de aniversário`,
      body: message,
      link: `/aniversarios?pessoa=${recipientId}`,
    });
    audit(user.id, "birthday.message", "user", recipientId, recipient?.name ?? "");
    revalidatePath("/aniversarios");
    revalidatePath("/inicio");
    return { ok: true, message: "Mensagem enviada." };
  });
}

export async function saveAnnouncement(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    requireLeadership(user);
    const id = Number(formData.get("id") || 0);
    const title = text(formData.get("title"), 140);
    const content = text(formData.get("content"), 8000);
    const type = text(formData.get("type"), 20);
    if (title.length < 2) throw new ActionError("Informe o título.");
    if (content.length < 2) throw new ActionError("Escreva o conteúdo.");
    if (!ANNOUNCEMENT_TYPES.includes(type as (typeof ANNOUNCEMENT_TYPES)[number])) throw new ActionError("Tipo inválido.");
    const eventDate = text(formData.get("eventDate"), 10);
    if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) throw new ActionError("Data inválida.");
    const allowComments = formData.get("allowComments") === "on" || formData.get("allowComments") === "1";
    const pinned = formData.get("pinned") === "on" || formData.get("pinned") === "1";
    const now = nowISO();
    const image = formData.get("image");
    let imagePath: string | null | undefined;
    if (image instanceof File && image.size > 0) {
      const saved = await storeFile(image, true);
      imagePath = saved.stored;
    }
    if (formData.get("removeImage") === "1") imagePath = null;
    if (id) {
      const current = get<{ title: string; image_path: string | null }>("SELECT title, image_path FROM announcements WHERE id = ?", id);
      if (!current) throw new ActionError("Publicação não encontrada.");
      if (imagePath === undefined) imagePath = current.image_path;
      if (imagePath !== current.image_path) removeStored(current.image_path);
      run(
        `UPDATE announcements
         SET title = ?, content = ?, type = ?, allow_comments = ?, event_date = ?, image_path = ?, pinned = ?,
             pinned_at = CASE WHEN ? = 1 THEN COALESCE(pinned_at, ?) ELSE NULL END, updated_at = ?
         WHERE id = ?`,
        title,
        content,
        type,
        allowComments ? 1 : 0,
        eventDate || null,
        imagePath,
        pinned ? 1 : 0,
        pinned ? 1 : 0,
        now,
        now,
        id,
      );
      audit(user.id, "announcement.update", "announcement", id, title);
      revalidatePath("/mural");
      revalidatePath(`/mural/${id}`);
      revalidatePath("/inicio");
      revalidatePath("/calendario");
      return { ok: true, message: "Comunicado atualizado.", id };
    }
    const created = insert(
      `INSERT INTO announcements (title, content, type, author_id, pinned, pinned_at, allow_comments, event_date, image_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      title,
      content,
      type,
      user.id,
      pinned ? 1 : 0,
      pinned ? now : null,
      allowComments ? 1 : 0,
      eventDate || null,
      imagePath ?? null,
      now,
      now,
    );
    audit(user.id, "announcement.create", "announcement", created, title);
    notifyEveryoneExcept(user.id, {
      type: "announcement",
      title: "Novo comunicado da liderança",
      body: title,
      link: `/mural/${created}`,
      dedupeKey: `announcement:${created}`,
    });
    revalidatePath("/mural");
    revalidatePath("/inicio");
    revalidatePath("/calendario");
    revalidatePath("/notificacoes");
    return { ok: true, message: "Comunicado publicado.", id: created };
  });
}

export async function togglePin(id: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    requireLeadership(user);
    const post = get<{ pinned: number; title: string }>("SELECT pinned, title FROM announcements WHERE id = ?", id);
    if (!post) throw new ActionError("Publicação não encontrada.");
    const next = post.pinned ? 0 : 1;
    if (next) run("UPDATE announcements SET pinned = 0, pinned_at = NULL, updated_at = ? WHERE pinned = 1", nowISO());
    run("UPDATE announcements SET pinned = ?, pinned_at = ?, updated_at = ? WHERE id = ?", next, next ? nowISO() : null, nowISO(), id);
    audit(user.id, next ? "announcement.pin" : "announcement.unpin", "announcement", id, post.title);
    revalidatePath("/mural");
    revalidatePath(`/mural/${id}`);
    revalidatePath("/inicio");
    return { ok: true, message: next ? "Comunicado fixado." : "Fixação removida." };
  });
}

export async function deleteAnnouncement(id: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    requireLeadership(user);
    const post = get<{ title: string; image_path: string | null }>("SELECT title, image_path FROM announcements WHERE id = ?", id);
    if (!post) throw new ActionError("Publicação não encontrada.");
    audit(user.id, "announcement.delete", "announcement", id, post.title);
    run("DELETE FROM announcements WHERE id = ?", id);
    removeStored(post.image_path);
    revalidatePath("/mural");
    revalidatePath("/inicio");
    revalidatePath("/calendario");
    return { ok: true, message: "Comunicado excluído." };
  });
}

export async function addAnnouncementComment(id: number, body: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const post = get<{ allow_comments: number; title: string; author_id: number }>(
      "SELECT allow_comments, title, author_id FROM announcements WHERE id = ?",
      id,
    );
    if (!post) throw new ActionError("Publicação não encontrada.");
    if (!post.allow_comments) throw new ActionError("Os comentários estão fechados.");
    const message = body.trim().slice(0, 2000);
    if (!message) throw new ActionError("Escreva um comentário.");
    insert(
      "INSERT INTO announcement_comments (announcement_id, user_id, body, created_at) VALUES (?, ?, ?, ?)",
      id,
      user.id,
      message,
      nowISO(),
    );
    if (post.author_id !== user.id) {
      notify({
        userId: post.author_id,
        type: "announcement_comment",
        title: `${user.name.split(" ")[0]} comentou em um comunicado`,
        body: post.title,
        link: `/mural/${id}`,
      });
    }
    revalidatePath("/mural");
    revalidatePath(`/mural/${id}`);
    return { ok: true, message: "Comentário publicado." };
  });
}

export async function toggleReaction(id: number, reaction: ReactionType): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    if (!["like", "heart", "clap", "idea"].includes(reaction)) throw new ActionError("Reação inválida.");
    const post = get("SELECT id FROM announcements WHERE id = ?", id);
    if (!post) throw new ActionError("Publicação não encontrada.");
    const existing = get(
      "SELECT id FROM announcement_reactions WHERE announcement_id = ? AND user_id = ? AND reaction = ?",
      id,
      user.id,
      reaction,
    );
    if (existing) run("DELETE FROM announcement_reactions WHERE id = ?", (existing as { id: number }).id);
    else {
      insert(
        "INSERT INTO announcement_reactions (announcement_id, user_id, reaction, created_at) VALUES (?, ?, ?, ?)",
        id,
        user.id,
        reaction,
        nowISO(),
      );
    }
    revalidatePath("/mural");
    revalidatePath(`/mural/${id}`);
    return { ok: true };
  });
}

export async function setMood(mood: MoodType, visibility: MoodVisibility): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    if (!MOODS.some((item) => item.id === mood)) throw new ActionError("Humor inválido.");
    if (visibility !== "public" && visibility !== "private") throw new ActionError("Visibilidade inválida.");
    const today = todayInSaoPaulo();
    const now = nowISO();
    run(
      `INSERT INTO moods (user_id, mood_date, mood, visibility, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, mood_date) DO UPDATE SET mood = excluded.mood, visibility = excluded.visibility, updated_at = excluded.updated_at`,
      user.id,
      today,
      mood,
      visibility,
      now,
      now,
    );
    audit(user.id, "mood.set", "mood", user.id, `${mood}:${visibility}`);
    revalidatePath("/inicio");
    revalidatePath("/humor");
    return { ok: true, message: "Humor registrado." };
  });
}

export async function sendRecognition(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const toId = Number(formData.get("toId"));
    const category = text(formData.get("category"), 30);
    const message = text(formData.get("message"), 500);
    if (toId === user.id) throw new ActionError("Escolha outra pessoa.");
    if (!userExists(toId)) throw new ActionError("Pessoa não encontrada.");
    if (!RECOGNITION_CATEGORIES.some((item) => item.id === category)) throw new ActionError("Escolha uma categoria.");
    if (message.length < 3) throw new ActionError("Escreva uma mensagem curta.");
    const id = insert(
      "INSERT INTO recognitions (from_user_id, to_user_id, category, message, created_at) VALUES (?, ?, ?, ?, ?)",
      user.id,
      toId,
      category,
      message,
      nowISO(),
    );
    const recipient = get<{ name: string }>("SELECT name FROM users WHERE id = ?", toId);
    notify({
      userId: toId,
      type: "recognition",
      title: "Você recebeu um reconhecimento",
      body: message,
      link: "/reconhecimentos",
    });
    audit(user.id, "recognition.create", "recognition", id, recipient?.name ?? "");
    revalidatePath("/reconhecimentos");
    revalidatePath("/inicio");
    revalidatePath(`/perfil/${toId}`);
    return { ok: true, message: "Reconhecimento enviado." };
  });
}

export async function markNotificationRead(id: number) {
  await runAction(async () => {
    const user = await requireUser();
    run("UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL", nowISO(), id, user.id);
    revalidatePath("/notificacoes");
    revalidatePath("/inicio");
    return { ok: true };
  });
}

export async function markAllNotificationsRead() {
  await runAction(async () => {
    const user = await requireUser();
    run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", nowISO(), user.id);
    revalidatePath("/notificacoes");
    return { ok: true, message: "Notificações marcadas como lidas." };
  });
}

export async function notificationPreview() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { listNotifications } = await import("@/server/data");
  return listNotifications(user.id, 8);
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const name = text(formData.get("name"), 80);
    const bio = text(formData.get("bio"), 280);
    if (name.length < 2) throw new ActionError("Informe o nome.");
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    if (newPassword) {
      if (newPassword.length < 8) throw new ActionError("A nova senha precisa ter pelo menos 8 caracteres.");
      const row = get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", user.id);
      if (!row || !bcrypt.compareSync(currentPassword, row.password_hash)) {
        throw new ActionError("Senha atual incorreta.");
      }
      run("UPDATE users SET password_hash = ? WHERE id = ?", bcrypt.hashSync(newPassword, 10), user.id);
    }
    const avatar = formData.get("avatar");
    let avatarPath: string | undefined;
    if (avatar instanceof File && avatar.size > 0) {
      const saved = await storeFile(avatar, true);
      const previous = get<{ avatar_path: string | null }>("SELECT avatar_path FROM users WHERE id = ?", user.id);
      removeStored(previous?.avatar_path);
      avatarPath = saved.stored;
    }
    if (avatarPath) {
      run("UPDATE users SET name = ?, bio = ?, avatar_path = ?, updated_at = ? WHERE id = ?", name, bio, avatarPath, nowISO(), user.id);
    } else {
      run("UPDATE users SET name = ?, bio = ?, updated_at = ? WHERE id = ?", name, bio, nowISO(), user.id);
    }
    audit(user.id, "profile.update", "user", user.id, name);
    revalidatePath("/perfil");
    revalidatePath(`/perfil/${user.id}`);
    revalidatePath("/inicio");
    return { ok: true, message: "Perfil atualizado." };
  });
}

export async function adminSaveUser(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    requireLeadership(user);
    const id = Number(formData.get("id") || 0);
    const name = text(formData.get("name"), 80);
    const email = text(formData.get("email"), 120).toLowerCase();
    const role = text(formData.get("role"), 20);
    const jobTitle = text(formData.get("jobTitle"), 80);
    const department = text(formData.get("department"), 80);
    const birthday = text(formData.get("birthday"), 10);
    const active = formData.get("active") === "on" || formData.get("active") === "1";
    const password = String(formData.get("password") ?? "");
    if (name.length < 2) throw new ActionError("Informe o nome.");
    if (!z.string().email().safeParse(email).success) throw new ActionError("E-mail inválido.");
    if (role !== "collaborator" && role !== "leadership") throw new ActionError("Perfil inválido.");
    if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) throw new ActionError("Aniversário inválido.");
    if (password && password.length < 8) throw new ActionError("A senha precisa ter pelo menos 8 caracteres.");
    const duplicate = get<{ id: number }>("SELECT id FROM users WHERE email = ? AND id != ?", email, id);
    if (duplicate) throw new ActionError("Já existe alguém com este e-mail.");
    const now = nowISO();
    if (!id) {
      if (password.length < 8) throw new ActionError("Defina uma senha inicial com pelo menos 8 caracteres.");
      const created = insert(
        `INSERT INTO users (name, username, email, password_hash, role, job_title, department, birthday, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        name,
        uniqueUsername(name),
        email,
        bcrypt.hashSync(password, 10),
        role,
        jobTitle,
        department,
        birthday || null,
        active ? 1 : 0,
        now,
        now,
      );
      audit(user.id, "user.create", "user", created, `${name} · ${role}`);
      revalidatePath("/configuracoes");
      revalidatePath("/aniversarios");
      return { ok: true, message: "Colaborador cadastrado." };
    }
    if (id === user.id && role !== "leadership") throw new ActionError("Você não pode remover o próprio acesso de liderança.");
    if (id === user.id && !active) throw new ActionError("Você não pode desativar o próprio acesso.");
    const leadershipLeft = get<{ total: number }>(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'leadership' AND active = 1 AND id != ?",
      id,
    )?.total ?? 0;
    const current = get<{ role: string; active: number }>("SELECT role, active FROM users WHERE id = ?", id);
    if (!current) throw new ActionError("Pessoa não encontrada.");
    if (current.role === "leadership" && current.active === 1 && (role !== "leadership" || !active) && leadershipLeft === 0) {
      throw new ActionError("Precisa existir ao menos uma liderança ativa.");
    }
    run(
      `UPDATE users SET name = ?, email = ?, role = ?, job_title = ?, department = ?, birthday = ?, active = ?, updated_at = ? WHERE id = ?`,
      name,
      email,
      role,
      jobTitle,
      department,
      birthday || null,
      active ? 1 : 0,
      now,
      id,
    );
    if (password) run("UPDATE users SET password_hash = ? WHERE id = ?", bcrypt.hashSync(password, 10), id);
    if (!active) run("DELETE FROM sessions WHERE user_id = ?", id);
    audit(user.id, "user.update", "user", id, `${name} · ${role}`);
    revalidatePath("/configuracoes");
    revalidatePath("/equipe");
    revalidatePath("/aniversarios");
    revalidatePath(`/perfil/${id}`);
    return { ok: true, message: "Cadastro atualizado." };
  });
}

function revalidateFeed() {
  revalidatePath("/inicio");
  revalidatePath("/perfil");
}

export async function createPost(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const body = text(formData.get("body"), 2000);
    const file = formData.get("image");
    if (!body && !(file instanceof File && file.size > 0)) throw new ActionError("Escreva algo ou escolha uma imagem.");
    let image: string | null = null;
    if (file instanceof File && file.size > 0) image = (await storeFile(file, true)).stored;
    const id = insert(
      "INSERT INTO posts (author_id, body, image_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      user.id,
      body,
      image,
      nowISO(),
      nowISO(),
    );
    audit(user.id, "post.create", "post", id, body.slice(0, 80));
    revalidateFeed();
    return { ok: true, message: "Publicação enviada." };
  });
}

export async function deletePost(id: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const post = get<{ author_id: number; image_path: string | null }>("SELECT author_id, image_path FROM posts WHERE id = ?", id);
    if (!post) throw new ActionError("Publicação não encontrada.");
    if (post.author_id !== user.id && user.role !== "leadership") throw new ActionError("Você não pode remover esta publicação.");
    run("DELETE FROM posts WHERE id = ?", id);
    removeStored(post.image_path);
    audit(user.id, "post.delete", "post", id, "");
    revalidateFeed();
    return { ok: true, message: "Publicação removida." };
  });
}

export async function togglePostLike(id: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const post = get("SELECT id FROM posts WHERE id = ?", id);
    if (!post) throw new ActionError("Publicação não encontrada.");
    const existing = get("SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?", id, user.id);
    if (existing) run("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", id, user.id);
    else {
      insert("INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)", id, user.id, nowISO());
      const author = get<{ author_id: number }>("SELECT author_id FROM posts WHERE id = ?", id);
      if (author && author.author_id !== user.id) {
        notify({ userId: author.author_id, type: "like", title: "Nova curtida", body: `${user.name} curtiu sua publicação.`, link: "/inicio" });
      }
    }
    revalidateFeed();
    return { ok: true };
  });
}

export async function addPostComment(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const postId = Number(formData.get("postId"));
    const body = text(formData.get("body"), 800);
    if (!body) throw new ActionError("Escreva um comentário.");
    const post = get<{ author_id: number }>("SELECT author_id FROM posts WHERE id = ?", postId);
    if (!post) throw new ActionError("Publicação não encontrada.");
    insert("INSERT INTO post_comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)", postId, user.id, body, nowISO());
    if (post.author_id !== user.id) {
      notify({ userId: post.author_id, type: "comment", title: "Novo comentário", body: `${user.name} comentou na sua publicação.`, link: "/inicio" });
    }
    revalidateFeed();
    return { ok: true, message: "Comentário publicado." };
  });
}

export async function deletePostComment(id: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const comment = get<{ user_id: number }>("SELECT user_id FROM post_comments WHERE id = ?", id);
    if (!comment) throw new ActionError("Comentário não encontrado.");
    if (comment.user_id !== user.id && user.role !== "leadership") throw new ActionError("Você não pode remover este comentário.");
    run("DELETE FROM post_comments WHERE id = ?", id);
    revalidateFeed();
    return { ok: true, message: "Comentário removido." };
  });
}

export async function toggleRepost(id: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const post = get<{ author_id: number }>("SELECT author_id FROM posts WHERE id = ?", id);
    if (!post) throw new ActionError("Publicação não encontrada.");
    if (post.author_id === user.id) throw new ActionError("A publicação já é sua.");
    const existing = get("SELECT id FROM post_reposts WHERE post_id = ? AND user_id = ?", id, user.id);
    if (existing) run("DELETE FROM post_reposts WHERE post_id = ? AND user_id = ?", id, user.id);
    else insert("INSERT INTO post_reposts (post_id, user_id, created_at) VALUES (?, ?, ?)", id, user.id, nowISO());
    revalidateFeed();
    return { ok: true, message: existing ? "Republicação desfeita." : "Publicação republicada." };
  });
}

export async function createPoll(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    requireLeadership(user);
    const question = text(formData.get("question"), 180);
    const startsAt = text(formData.get("startsAt"), 40);
    const endsAt = text(formData.get("endsAt"), 40);
    const options = String(formData.get("options") ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (question.length < 4) throw new ActionError("Escreva a pergunta da enquete.");
    if (options.length < 2) throw new ActionError("Informe pelo menos duas opções, uma por linha.");
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new ActionError("Defina início e encerramento válidos.");
    }
    const now = nowISO();
    const pollId = transaction(() => {
      const id = insert(
        `INSERT INTO polls (question, starts_at, ends_at, single_vote, hide_results, author_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        question,
        start.toISOString(),
        end.toISOString(),
        formData.get("singleVote") === "on" ? 1 : 0,
        formData.get("hideResults") === "on" ? 1 : 0,
        user.id,
        now,
      );
      options.forEach((label, index) => {
        insert("INSERT INTO poll_options (poll_id, label, position) VALUES (?, ?, ?)", id, label.slice(0, 80), index);
      });
      return id;
    });
    notifyEveryoneExcept(user.id, { type: "poll", title: "Nova enquete", body: question, link: "/enquetes" });
    audit(user.id, "poll.create", "poll", pollId, question);
    revalidatePath("/enquetes");
    revalidatePath("/inicio");
    return { ok: true, message: "Enquete publicada." };
  });
}

export async function votePoll(pollId: number, optionId: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const poll = get<{ single_vote: number; starts_at: string; ends_at: string }>(
      "SELECT single_vote, starts_at, ends_at FROM polls WHERE id = ?",
      pollId,
    );
    if (!poll) throw new ActionError("Enquete não encontrada.");
    const now = new Date().toISOString();
    if (poll.starts_at > now) throw new ActionError("Esta enquete ainda não começou.");
    if (poll.ends_at < now) throw new ActionError("Enquete encerrada.");
    const option = get("SELECT id FROM poll_options WHERE id = ? AND poll_id = ?", optionId, pollId);
    if (!option) throw new ActionError("Opção inválida.");
    const existing = get("SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?", pollId, user.id);
    if (poll.single_vote === 1 && existing) throw new ActionError("Seu voto já foi registrado.");
    const same = get("SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ? AND option_id = ?", pollId, user.id, optionId);
    if (same) throw new ActionError("Você já escolheu esta opção.");
    insert("INSERT INTO poll_votes (poll_id, option_id, user_id, created_at) VALUES (?, ?, ?, ?)", pollId, optionId, user.id, nowISO());
    revalidatePath("/enquetes");
    revalidatePath("/inicio");
    return { ok: true, message: "Voto registrado." };
  });
}

export async function sendFeedback(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const kind = text(formData.get("kind"), 20) as FeedbackKind;
    const body = text(formData.get("body"), 2000);
    const anonymous = formData.get("anonymous") === "on";
    if (!["sugestao", "critica", "melhoria", "observacao"].includes(kind)) throw new ActionError("Escolha o tipo de feedback.");
    if (body.length < 8) throw new ActionError("Escreva o feedback com um pouco mais de contexto.");
    const id = insert(
      "INSERT INTO feedbacks (author_id, kind, body, anonymous, created_at) VALUES (?, ?, ?, ?, ?)",
      user.id,
      kind,
      body,
      anonymous ? 1 : 0,
      nowISO(),
    );
    const leaders = all<{ id: number }>("SELECT id FROM users WHERE role = 'leadership' AND active = 1");
    for (const leader of leaders) {
      notify({
        userId: leader.id,
        type: "feedback",
        title: "Novo feedback",
        body: anonymous ? "Chegou um feedback anônimo." : `${user.name} enviou um feedback.`,
        link: "/feedbacks",
      });
    }
    audit(user.id, "feedback.create", "feedback", id, anonymous ? "anonimo" : kind);
    revalidatePath("/feedbacks");
    return { ok: true, message: "Feedback enviado." };
  });
}

export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const title = text(formData.get("title"), 120);
    const description = text(formData.get("description"), 500);
    const category = text(formData.get("category"), 60);
    const platform = text(formData.get("platform"), 20);
    if (title.length < 2) throw new ActionError("Informe o nome do documento.");
    if (platform !== "pincel" && platform !== "prominas") throw new ActionError("Escolha a plataforma.");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ActionError("Envie um PDF.");
    if (file.type !== "application/pdf") throw new ActionError("Somente arquivos PDF.");
    const mode = appSetting("document_mode", "approval");
    const allowed = documentPublishers().some((person) => person.id === user.id);
    let status = "pending";
    if (user.role === "leadership") status = "approved";
    else if (mode === "authorized") {
      if (!allowed) throw new ActionError("Você não tem permissão para publicar documentos.");
      status = "approved";
    } else if (mode === "restricted") {
      if (!allowed) throw new ActionError("A publicação de documentos está restrita.");
    }
    const stored = await storeFile(file, false);
    const now = nowISO();
    const id = insert(
      `INSERT INTO documents (title, description, category, platform, status, stored_name, original_name, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      title,
      description,
      category,
      platform,
      status,
      stored.stored,
      stored.name,
      user.id,
      now,
      now,
    );
    if (status === "pending") {
      const leaders = all<{ id: number }>("SELECT id FROM users WHERE role = 'leadership' AND active = 1");
      for (const leader of leaders) {
        notify({ userId: leader.id, type: "document", title: "Documento para revisar", body: title, link: "/documentos" });
      }
    }
    audit(user.id, "document.upload", "document", id, `${platform}:${status}`);
    revalidatePath("/documentos");
    return { ok: true, message: status === "approved" ? "Documento publicado." : "Documento enviado para aprovação." };
  });
}

export async function reviewDocument(id: number, status: DocumentStatus): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    requireLeadership(user);
    if (!["approved", "rejected", "archived", "pending"].includes(status)) throw new ActionError("Status inválido.");
    const doc = get<{ title: string; author_id: number }>("SELECT title, author_id FROM documents WHERE id = ?", id);
    if (!doc) throw new ActionError("Documento não encontrado.");
    run("UPDATE documents SET status = ?, updated_at = ? WHERE id = ?", status, nowISO(), id);
    if (status === "approved" || status === "rejected") {
      notify({
        userId: doc.author_id,
        type: "document",
        title: status === "approved" ? "Documento aprovado" : "Documento rejeitado",
        body: doc.title,
        link: "/documentos",
      });
    }
    audit(user.id, "document.review", "document", id, status);
    revalidatePath("/documentos");
    return { ok: true, message: "Documento atualizado." };
  });
}

export async function saveDocumentPolicy(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    requireLeadership(user);
    const mode = text(formData.get("mode"), 20);
    if (!["approval", "authorized", "restricted"].includes(mode)) throw new ActionError("Regra inválida.");
    run(
      "INSERT INTO app_settings (key, value) VALUES ('document_mode', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      mode,
    );
    const birthdayStyle = text(formData.get("birthdayStyle"), 10);
    if (birthdayStyle === "photo" || birthdayStyle === "name") {
      run(
        "INSERT INTO app_settings (key, value) VALUES ('birthday_style', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        birthdayStyle,
      );
    }
    const ids = formData.getAll("publisher").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
    transaction(() => {
      run("DELETE FROM document_publishers");
      for (const id of ids) insert("INSERT INTO document_publishers (user_id) VALUES (?)", id);
    });
    audit(user.id, "document.policy", "settings", null, mode);
    revalidatePath("/documentos");
    revalidatePath("/configuracoes");
    return { ok: true, message: "Regras atualizadas." };
  });
}

export async function setTheme(theme: "light" | "dark"): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    if (theme !== "light" && theme !== "dark") throw new ActionError("Tema inválido.");
    run("UPDATE users SET theme = ?, updated_at = ? WHERE id = ?", theme, nowISO(), user.id);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function saveAccount(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const name = text(formData.get("name"), 80);
    const username = text(formData.get("username"), 24).toLowerCase();
    const theme = text(formData.get("theme"), 10);
    const repostsVisible = formData.get("repostsVisible") === "visible" ? 1 : 0;
    if (name.length < 2) throw new ActionError("Informe o nome de exibição.");
    if (!/^[a-z0-9]{3,24}$/.test(username)) throw new ActionError("O usuário deve ter de 3 a 24 letras ou números.");
    const taken = get<{ id: number }>("SELECT id FROM users WHERE username = ? AND id != ?", username, user.id);
    if (taken) throw new ActionError("Este usuário já está em uso.");
    if (theme !== "light" && theme !== "dark") throw new ActionError("Tema inválido.");
    const keys = ["task", "comment", "like", "recognition", "birthday", "announcement", "poll", "document", "feedback"];
    const preferences = Object.fromEntries(keys.map((key) => [key, formData.get(`notify_${key}`) === "on"]));
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    if (newPassword) {
      if (newPassword.length < 8) throw new ActionError("A nova senha precisa ter pelo menos 8 caracteres.");
      const row = get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", user.id);
      if (!row || !bcrypt.compareSync(currentPassword, row.password_hash)) throw new ActionError("Senha atual incorreta.");
      run("UPDATE users SET password_hash = ? WHERE id = ?", bcrypt.hashSync(newPassword, 10), user.id);
    }
    run(
      "UPDATE users SET name = ?, username = ?, theme = ?, reposts_visible = ?, preferences = ?, updated_at = ? WHERE id = ?",
      name,
      username,
      theme,
      repostsVisible,
      JSON.stringify(preferences),
      nowISO(),
      user.id,
    );
    audit(user.id, "account.update", "user", user.id, username);
    revalidatePath("/conta");
    revalidatePath("/inicio");
    revalidatePath("/perfil");
    return { ok: true, message: "Configurações salvas." };
  });
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const email = text(formData.get("email"), 120).toLowerCase();
    if (!z.string().email().safeParse(email).success) throw new ActionError("Informe um e-mail válido.");
    const account = findUserByEmail(email);
    if (account && account.active === 1) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      run("UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL", nowISO(), account.id);
      insert(
        "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
        account.id,
        tokenHash,
        expires,
        nowISO(),
      );
      audit(account.id, "password.reset.request", "user", account.id, "");
    }
    return {
      ok: true,
      message: "Se este e-mail estiver cadastrado, o pedido foi registrado. O link será enviado quando o serviço de e-mail estiver configurado.",
    };
  });
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const token = String(formData.get("token") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (token.length < 20) throw new ActionError("Link inválido.");
    if (password.length < 8) throw new ActionError("A senha precisa ter pelo menos 8 caracteres.");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const row = get<{ id: number; user_id: number; expires_at: string }>(
      "SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL",
      tokenHash,
    );
    if (!row || row.expires_at < new Date().toISOString()) throw new ActionError("Este link expirou ou já foi usado.");
    run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", bcrypt.hashSync(password, 10), nowISO(), row.user_id);
    run("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?", nowISO(), row.id);
    run("DELETE FROM sessions WHERE user_id = ?", row.user_id);
    audit(row.user_id, "password.reset", "user", row.user_id, "");
    return { ok: true, message: "Senha atualizada. Entre com a nova senha." };
  });
}

export async function searchPreview(query: string) {
  const user = await getCurrentUser();
  const q = query.trim();
  if (!user || q.length < 2) return { tasks: [], people: [], announcements: [], events: [] };
  const { searchAll } = await import("@/server/data");
  const results = searchAll(user, q);
  return {
    tasks: results.tasks.slice(0, 5),
    people: results.people.slice(0, 4),
    announcements: results.announcements.slice(0, 4),
    events: results.events.slice(0, 3),
  };
}
