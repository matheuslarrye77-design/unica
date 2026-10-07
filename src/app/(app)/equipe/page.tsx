import Link from "next/link";
import { redirect } from "next/navigation";
import { Restricted, TaskRows } from "@/components/team";
import { Avatar } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/utils";
import { getTeamStats, listTeam, listTeamTasks, type TeamFilter } from "@/server/data";

const FILTERS: { id: TeamFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "atrasadas", label: "Atrasadas" },
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Esta semana" },
  { id: "concluidas", label: "Concluídas" },
  { id: "andamento", label: "Em andamento" },
];

function isFilter(value: string | undefined): value is TeamFilter {
  return FILTERS.some((item) => item.id === value);
}

export default async function TeamPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "leadership") return <Restricted />;
  const params = await searchParams;
  const requested = firstParam(params.filtro);
  const filter: TeamFilter = isFilter(requested) ? requested : "todos";
  const stats = getTeamStats();
  const people = listTeam();
  const tasks = listTeamTasks(filter);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
      <p className="mt-1 text-sm text-mute">A situação das atividades de todo mundo.</p>
      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Mini label="Em aberto" value={stats.open} />
        <Mini label="Em andamento" value={stats.doing} />
        <Mini label="Atrasadas" value={stats.overdue} warn={stats.overdue > 0} />
        <Mini label="Concluídas" value={stats.done} />
        <Mini label="Vencem hoje" value={stats.dueToday} />
      </dl>
      <h2 className="mb-3 mt-8 text-base font-semibold">Colaboradores</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {people.map((person) => (
          <li key={person.id}>
            <Link href={`/equipe/${person.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-unica-mist">
              <Avatar name={person.name} id={person.id} hasAvatar={person.hasAvatar} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{person.name}</span>
                <span className="text-sm text-mute">{[person.jobTitle, person.department].filter(Boolean).join(" · ") || "Sem setor"}</span>
              </span>
              <span className="hidden text-right text-xs text-mute sm:block">
                {person.openCount} tarefas · {person.doingCount} em andamento
                <br />
                {person.overdueCount} atrasada{person.overdueCount === 1 ? "" : "s"} · {person.doneCount} concluída{person.doneCount === 1 ? "" : "s"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Atividades</h2>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Link key={item.id} href={item.id === "todos" ? "/equipe" : `/equipe?filtro=${item.id}`} aria-current={filter === item.id ? "page" : undefined} className={filter === item.id ? "rounded-full bg-unica-wash px-3 py-1.5 text-sm font-medium text-unica" : "rounded-full px-3 py-1.5 text-sm text-mute hover:bg-white"}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <TaskRows tasks={tasks} />
    </div>
  );
}

function Mini({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <dd className={warn ? "text-2xl font-semibold text-danger" : "text-2xl font-semibold"}>{value}</dd>
      <dt className="text-sm text-mute">{label}</dt>
    </div>
  );
}


