import Link from "next/link";
import { PriorityBadge, StatusText } from "@/components/ui";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import type { TaskCard } from "@/lib/types";

export function Restricted() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-line bg-white px-6 py-10 text-center">
      <h1 className="text-xl font-semibold">Área da liderança</h1>
      <p className="mt-2 text-sm text-mute">Esta página fica disponível apenas para quem tem perfil de liderança.</p>
      <Link href="/inicio" className="mt-4 inline-flex min-h-11 items-center font-medium text-unica">
        Voltar ao início
      </Link>
    </div>
  );
}

export function TaskRows({ tasks }: { tasks: TaskCard[] }) {
  if (tasks.length === 0) {
    return <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-mute">Nenhuma atividade com esse filtro.</p>;
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link href={`/tarefas/${task.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-unica-mist">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{task.title}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mute">
                <span>{task.assigneeName}</span>
                <PriorityBadge priority={task.priority} label={PRIORITY_LABEL[task.priority]} />
                <span>{formatDate(task.dueDate)}</span>
                {task.overdue ? <span className="font-medium text-danger">Atrasada</span> : null}
              </span>
            </span>
            <StatusText status={task.status} label={STATUS_LABEL[task.status]} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
