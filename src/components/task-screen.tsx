"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Paperclip } from "lucide-react";
import { PRIORITY_LABEL, STATUS_LABEL, STATUSES } from "@/lib/constants";
import { formatDate, formatDateTime, formatWhen } from "@/lib/dates";
import { canChangeStatus, canEditTask } from "@/lib/permissions";
import {
  addChecklistItem,
  addTaskComment,
  deleteAttachment,
  deleteTask,
  moveTask,
  removeChecklistItem,
  toggleChecklistItem,
  uploadAttachment,
} from "@/server/actions";
import type { PersonOption, SessionUser, TaskDetail, TaskStatus } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { TaskForm } from "./tasks";
import { Avatar, Button, EmptyState, PriorityBadge, toast } from "./ui";

export function TaskScreen({ task, me, people }: { task: TaskDetail; me: SessionUser; people: PersonOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const [item, setItem] = useState("");
  const [pending, setPending] = useState(false);
  const canEdit = canEditTask(me, task);
  const canStatus = canChangeStatus(me, task);

  async function onStatus(status: TaskStatus) {
    const result = await moveTask(task.id, status);
    if (!result.ok) toast(result.error, "error");
    else if (result.message) toast(result.message);
    router.refresh();
  }

  async function onComment(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await addTaskComment(task.id, comment);
    setPending(false);
    if (!result.ok) toast(result.error, "error");
    else {
      setComment("");
      toast(result.message || "Comentário publicado.");
      router.refresh();
    }
  }

  async function onDelete() {
    if (!window.confirm("Excluir esta atividade?")) return;
    const result = await deleteTask(task.id);
    if (!result.ok) toast(result.error, "error");
    else {
      toast(result.message || "Atividade excluída.");
      router.push("/tarefas");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/tarefas" className="text-sm font-medium text-unica">
        Tarefas
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} label={PRIORITY_LABEL[task.priority]} />
            {task.category ? <span className="text-sm text-mute">{task.category}</span> : null}
            {task.overdue ? <span className="text-sm font-medium text-danger">Atrasada</span> : null}
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Editar
            </Button>
          ) : null}
          {canEdit ? (
            <Button variant="danger" onClick={onDelete}>
              Excluir
            </Button>
          ) : null}
        </div>
      </div>
      <dl className="mt-6 grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2">
        <Info label="Responsável" value={task.assigneeName} />
        <Info label="Criada por" value={task.creatorName} />
        <div>
          <dt className="text-xs text-mute">Status</dt>
          <dd className="mt-1">
            {canStatus ? (
              <select className="h-10 rounded-lg border border-line bg-white px-2 text-sm" value={task.status} aria-label="Status" onChange={(event) => onStatus(event.target.value as TaskStatus)}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium">{STATUS_LABEL[task.status]}</span>
            )}
          </dd>
        </div>
        <Info label="Prazo" value={formatDate(task.dueDate)} />
        <Info label="Criação" value={formatDateTime(task.createdAt)} />
        <Info label="Atualização" value={formatDateTime(task.updatedAt)} />
      </dl>
      {task.description ? <p className="mt-6 whitespace-pre-wrap text-sm leading-6">{task.description}</p> : null}
      {task.notes ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold">Observações</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3F3A46]">{task.notes}</p>
        </section>
      ) : null}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Checklist</h2>
        {task.checklist.length === 0 ? <p className="mt-2 text-sm text-mute">Nenhum item no checklist.</p> : null}
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
          {task.checklist.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                checked={entry.done}
                disabled={!canStatus}
                aria-label={entry.title}
                className="h-5 w-5 accent-[#6424B3]"
                onChange={async () => {
                  const result = await toggleChecklistItem(entry.id);
                  if (!result.ok) toast(result.error, "error");
                  router.refresh();
                }}
              />
              <span className={entry.done ? "flex-1 text-sm text-mute line-through" : "flex-1 text-sm"}>{entry.title}</span>
              {canStatus ? (
                <button
                  type="button"
                  className="text-xs text-mute hover:text-danger"
                  onClick={async () => {
                    const result = await removeChecklistItem(entry.id);
                    if (!result.ok) toast(result.error, "error");
                    router.refresh();
                  }}
                >
                  Remover
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {canStatus ? (
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await addChecklistItem(task.id, item);
              if (!result.ok) toast(result.error, "error");
              else setItem("");
              router.refresh();
            }}
          >
            <input value={item} onChange={(event) => setItem(event.target.value)} aria-label="Novo item" placeholder="Adicionar item" className="h-11 flex-1 rounded-lg border border-line px-3 text-sm" />
            <Button type="submit" variant="secondary">
              Adicionar
            </Button>
          </form>
        ) : null}
      </section>
      <section className="mt-8">
        <h2 className="text-base font-semibold">Anexos</h2>
        {task.attachments.length === 0 ? <p className="mt-2 text-sm text-mute">Nenhum arquivo anexado.</p> : null}
        <ul className="mt-3 space-y-2">
          {task.attachments.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2">
              <a href={`/api/media/attachment/${file.id}`} className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-unica">
                <Paperclip size={16} aria-hidden />
                <span className="truncate">{file.name}</span>
                <span className="text-xs text-mute">{formatBytes(file.size)}</span>
              </a>
              {canEdit || canStatus ? (
                <button
                  type="button"
                  className="text-xs text-mute hover:text-danger"
                  onClick={async () => {
                    const result = await deleteAttachment(file.id);
                    if (!result.ok) toast(result.error, "error");
                    else toast(result.message || "Arquivo removido.");
                    router.refresh();
                  }}
                >
                  Remover
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {canStatus ? (
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              data.set("taskId", String(task.id));
              const result = await uploadAttachment(data);
              if (!result.ok) toast(result.error, "error");
              else {
                toast(result.message || "Arquivo anexado.");
                event.currentTarget.reset();
                router.refresh();
              }
            }}
          >
            <input name="file" type="file" required aria-label="Anexar arquivo" className="text-sm" />
            <Button type="submit" variant="secondary">
              Anexar
            </Button>
          </form>
        ) : null}
      </section>
      <section className="mt-8">
        <h2 className="text-base font-semibold">Comentários</h2>
        {task.comments.length === 0 ? <div className="mt-3"><EmptyState title="Nenhum comentário ainda." /></div> : null}
        <ul className="mt-3 space-y-3">
          {task.comments.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <Avatar name={entry.userName} id={entry.userId} hasAvatar={entry.hasAvatar} size={32} />
              <div>
                <p className="text-sm">
                  <span className="font-semibold">{entry.userName}</span> <span className="text-mute">{formatWhen(entry.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{entry.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <form onSubmit={onComment} className="mt-4">
          <label htmlFor="comentario" className="sr-only">
            Comentário
          </label>
          <textarea id="comentario" value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-24 w-full rounded-xl border border-line px-3 py-2 text-sm" placeholder="Escreva um comentário" />
          <Button type="submit" className="mt-2" disabled={pending}>
            {pending ? "Publicando…" : "Comentar"}
          </Button>
        </form>
      </section>
      <section className="mt-8">
        <h2 className="text-base font-semibold">Histórico</h2>
        <ol className="mt-3 space-y-2">
          {task.history.map((entry) => (
            <li key={entry.id} className="text-sm text-mute">
              <span className="font-medium text-ink">{entry.userName}</span> · {entry.details} · {formatWhen(entry.createdAt)}
            </li>
          ))}
        </ol>
      </section>
      {editing ? <TaskForm me={me} people={people} task={task} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-mute">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
