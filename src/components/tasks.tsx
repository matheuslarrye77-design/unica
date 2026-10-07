"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { MessageSquare, Plus } from "lucide-react";
import { CATEGORY_SUGGESTIONS, PRIORITIES, PRIORITY_BAR, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { createTask, moveTask, updateTask } from "@/server/actions";
import type { PersonOption, SessionUser, TaskCard, TaskDetail, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, Button, EmptyState, Field, Modal, PriorityBadge, SelectInput, TextArea, TextInput, toast } from "./ui";

const COLUMN_DOT: Record<TaskStatus, string> = {
  todo: "bg-[#B7B3BC]",
  doing: "bg-[#A78BD6]",
  review: "bg-unica",
  done: "bg-success",
};

export function TaskBoard({
  tasks,
  me,
  people,
  categories,
  truncated,
  initialFilters,
}: {
  tasks: TaskCard[];
  me: SessionUser;
  people: PersonOption[];
  categories: string[];
  truncated: boolean;
  initialFilters: { assignee?: string; priority?: string; category?: string; status?: string; due?: string };
}) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [creating, setCreating] = useState(false);
  const [mobileView, setMobileView] = useState<"lista" | "quadro">("lista");
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => setItems(tasks), [tasks]);

  const grouped = useMemo(() => {
    return Object.fromEntries(STATUSES.map((status) => [status, items.filter((task) => task.status === status)])) as Record<TaskStatus, TaskCard[]>;
  }, [items]);

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const taskId = Number(String(event.active.id).replace("task-", ""));
    const status = event.over?.id as TaskStatus | undefined;
    const current = items.find((task) => task.id === taskId);
    if (!current || !status || !STATUSES.includes(status) || current.status === status) return;
    setItems((prev) => prev.map((task) => (task.id === taskId ? { ...task, status, overdue: status === "done" ? false : task.overdue } : task)));
    const result = await moveTask(taskId, status);
    if (!result.ok) toast(result.error, "error");
    else if (result.message) toast(result.message);
    router.refresh();
  }

  async function changeStatus(task: TaskCard, status: TaskStatus) {
    if (task.status === status) return;
    setItems((prev) => prev.map((item) => (item.id === task.id ? { ...item, status } : item)));
    const result = await moveTask(task.id, status);
    if (!result.ok) toast(result.error, "error");
    else if (result.message) toast(result.message);
    router.refresh();
  }

  const active = items.find((task) => task.id === activeId) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Missões</h1>
          <p className="mt-1 text-sm text-mute">{me.role === "leadership" ? "O quadro da equipe e as suas atividades." : "As atividades sob sua responsabilidade."}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} /> Nova atividade
        </Button>
      </div>
      <FilterBar me={me} people={people} categories={categories} initialFilters={initialFilters} />
      {truncated ? <p className="mb-3 text-sm text-mute">Mostrando as 300 atividades mais relevantes. Use os filtros para refinar.</p> : null}
      <div className="mb-3 flex rounded-lg bg-white p-1 md:hidden">
        {(["lista", "quadro"] as const).map((view) => (
          <button key={view} type="button" onClick={() => setMobileView(view)} className={cn("h-10 flex-1 rounded-md text-sm font-medium", mobileView === view ? "bg-unica-wash text-unica" : "text-mute")}>
            {view === "lista" ? "Lista" : "Quadro"}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Você não tem atividades por aqui." text="Crie uma atividade ou ajuste os filtros." action={<Button onClick={() => setCreating(true)}>Nova atividade</Button>} />
      ) : (
        <>
          <div className={cn("space-y-2", mobileView === "quadro" ? "hidden" : "md:hidden")}>
            {items.map((task) => (
              <article key={task.id} className="rounded-xl border border-line bg-white p-3">
                <Link href={`/tarefas/${task.id}`} className="block font-medium hover:text-unica">
                  {task.title}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-mute">
                  <PriorityBadge priority={task.priority} label={PRIORITY_LABEL[task.priority]} />
                  <span>{formatDate(task.dueDate)}</span>
                  {task.overdue ? <span className="font-medium text-danger">Atrasada</span> : null}
                </div>
                <label className="mt-3 block text-xs text-mute">
                  Status
                  <select className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink" value={task.status} onChange={(event) => changeStatus(task, event.target.value as TaskStatus)} aria-label={`Status de ${task.title}`}>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(event) => setActiveId(Number(String(event.active.id).replace("task-", "")))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
            <div className={cn("gap-3", mobileView === "quadro" ? "flex overflow-x-auto pb-2" : "hidden md:grid md:grid-cols-4")}>
              {STATUSES.map((status) => (
                <Column key={status} status={status} tasks={grouped[status]} />
              ))}
            </div>
            <DragOverlay>{active ? <TaskCardView task={active} dragging /> : null}</DragOverlay>
          </DndContext>
        </>
      )}
      {creating ? <TaskForm me={me} people={people} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function FilterBar({
  me,
  people,
  categories,
  initialFilters,
}: {
  me: SessionUser;
  people: PersonOption[];
  categories: string[];
  initialFilters: { assignee?: string; priority?: string; category?: string; status?: string; due?: string };
}) {
  const router = useRouter();
  function update(key: string, value: string) {
    const params = new URLSearchParams();
    const next = { ...initialFilters, [key]: value };
    Object.entries(next).forEach(([name, item]) => {
      if (item) params.set(name, item);
    });
    router.push(params.size ? `/tarefas?${params}` : "/tarefas");
  }
  return (
    <div className="mb-4 grid gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
      {me.role === "leadership" ? (
        <label className="text-xs text-mute">
          Responsável
          <select className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" value={initialFilters.assignee ?? ""} onChange={(event) => update("assignee", event.target.value)}>
            <option value="">Todos</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="text-xs text-mute">
        Prioridade
        <select className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" value={initialFilters.priority ?? ""} onChange={(event) => update("priority", event.target.value)}>
          <option value="">Todas</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABEL[priority]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-mute">
        Prazo
        <select className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" value={initialFilters.due ?? ""} onChange={(event) => update("due", event.target.value)}>
          <option value="">Qualquer</option>
          <option value="overdue">Atrasadas</option>
          <option value="today">Hoje</option>
          <option value="week">Esta semana</option>
          <option value="none">Sem prazo</option>
        </select>
      </label>
      <label className="text-xs text-mute">
        Categoria
        <select className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" value={initialFilters.category ?? ""} onChange={(event) => update("category", event.target.value)}>
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-mute">
        Status
        <select className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink" value={initialFilters.status ?? ""} onChange={(event) => update("status", event.target.value)}>
          <option value="">Todos</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Column({ status, tasks }: { status: TaskStatus; tasks: TaskCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} className={cn("flex min-h-[280px] w-[78vw] shrink-0 snap-start flex-col rounded-xl bg-[#F3F2F4] p-2 md:w-auto", isOver && "ring-2 ring-unica/30")}>
      <header className="flex items-center gap-2 px-2 py-2">
        <span className={cn("h-2 w-2 rounded-full", COLUMN_DOT[status])} />
        <h2 className="text-sm font-semibold">{STATUS_LABEL[status]}</h2>
        <span className="text-xs text-mute">{tasks.length}</span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.length === 0 ? <p className="px-2 py-6 text-center text-sm text-mute">Nenhuma atividade</p> : null}
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}

function DraggableCard({ task }: { task: TaskCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task-${task.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")} {...listeners} {...attributes}>
      <TaskCardView task={task} />
    </div>
  );
}

function TaskCardView({ task, dragging = false }: { task: TaskCard; dragging?: boolean }) {
  return (
    <article className={cn("rounded-md border border-[#E7E0C8] border-l-[3px] bg-[#FFF8D8] p-3 shadow-[2px_3px_0_rgba(80,60,20,0.06)]", PRIORITY_BAR[task.priority], dragging && "shadow-md")}>
      <Link href={`/tarefas/${task.id}`} className="block text-sm font-semibold leading-snug hover:text-unica" onPointerDown={(event) => event.stopPropagation()}>
        {task.title}
      </Link>
      {task.description ? <p className="mt-1 line-clamp-2 text-xs text-mute">{task.description}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={task.priority} label={PRIORITY_LABEL[task.priority]} />
        {task.category ? <span className="text-xs text-mute">{task.category}</span> : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-mute">
        <span className={task.overdue ? "font-medium text-danger" : ""}>{task.overdue ? `Atrasada · ${formatDate(task.dueDate)}` : formatDate(task.dueDate)}</span>
        <span className="flex items-center gap-2">
          {task.checklistTotal > 0 ? <span>{task.checklistDone}/{task.checklistTotal}</span> : null}
          {task.commentCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <MessageSquare size={12} aria-hidden /> {task.commentCount}
            </span>
          ) : null}
          <Avatar name={task.assigneeName} id={task.assigneeId} hasAvatar={task.assigneeHasAvatar} size={22} />
        </span>
      </div>
    </article>
  );
}

export function TaskForm({
  me,
  people,
  task,
  onClose,
}: {
  me: SessionUser;
  people: PersonOption[];
  task?: TaskCard | TaskDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    if (!task) data.set("checklist", JSON.stringify(draft.trim() ? [...items, draft.trim()] : items));
    const result = task ? await updateTask(data) : await createTask(data);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast(result.message || "Salvo");
    onClose();
    if (!task && result.id) router.push(`/tarefas/${result.id}`);
    else router.refresh();
  }

  return (
    <Modal title={task ? "Editar atividade" : "Nova atividade"} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="grid gap-4">
        {task ? <input type="hidden" name="id" value={task.id} /> : null}
        <Field label="Título">
          <TextInput name="title" required defaultValue={task?.title} maxLength={140} />
        </Field>
        <Field label="Descrição">
          <TextArea name="description" defaultValue={task?.description} maxLength={5000} />
        </Field>
        {me.role === "leadership" ? (
          <Field label="Responsável">
            <SelectInput name="assigneeId" required defaultValue={task?.assigneeId ?? ""}>
              <option value="">Selecionar colaborador</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {person.department ? ` — ${person.department}` : ""}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : (
          <p className="text-sm text-mute">Responsável: {me.name}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prioridade">
            <SelectInput name="priority" defaultValue={task?.priority ?? "normal"}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABEL[priority]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Prazo">
            <TextInput name="dueDate" type="date" defaultValue={task?.dueDate ?? ""} />
          </Field>
        </div>
        {task ? (
          <Field label="Status">
            <SelectInput name="status" defaultValue={task.status}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : null}
        <Field label="Categoria">
          <TextInput name="category" list="categorias" defaultValue={task?.category} maxLength={40} />
          <datalist id="categorias">
            {CATEGORY_SUGGESTIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>
        {!task ? (
          <div>
            <p className="mb-1.5 text-sm font-medium">Checklist</p>
            <ul className="mb-2 space-y-1">
              {items.map((item, index) => (
                <li key={item + index} className="flex items-center justify-between gap-2 rounded-lg bg-[#F7F5F8] px-3 py-2 text-sm">
                  {item}
                  <button type="button" className="text-mute" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover ${item}`}>
                    Remover
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <TextInput value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Novo item" aria-label="Novo item do checklist" />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!draft.trim()) return;
                  setItems([...items, draft.trim()]);
                  setDraft("");
                }}
              >
                Adicionar
              </Button>
            </div>
          </div>
        ) : null}
        <Field label="Observações">
          <TextArea name="notes" defaultValue={task?.notes} className="min-h-20" maxLength={2000} />
        </Field>
        {!task ? (
          <Field label="Anexo" hint="Opcional. PDF, imagem ou documento até 8 MB.">
            <input name="file" type="file" className="block w-full text-sm" />
          </Field>
        ) : null}
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : task ? "Salvar" : "Criar atividade"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
