import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Restricted, TaskRows } from "@/components/team";
import { Avatar } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/utils";
import { listTeam, listTeamTasks, type TeamFilter } from "@/server/data";

const FILTERS: { id: TeamFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "atrasadas", label: "Atrasadas" },
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Esta semana" },
  { id: "concluidas", label: "Concluídas" },
  { id: "andamento", label: "Em andamento" },
];

export default async function PersonTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "leadership") return <Restricted />;
  const { id } = await params;
  const personId = Number(id);
  const person = listTeam().find((item) => item.id === personId);
  if (!person) notFound();
  const query = await searchParams;
  const raw = firstParam(query.filtro);
  const filter = FILTERS.some((item) => item.id === raw) ? (raw as TeamFilter) : "todos";
  const tasks = listTeamTasks(filter, person.id);
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/equipe" className="text-sm font-medium text-unica">
        Equipe
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={person.name} id={person.id} hasAvatar={person.hasAvatar} size={48} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
          <p className="text-sm text-mute">{[person.jobTitle, person.department].filter(Boolean).join(" · ") || "Colaborador"}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-mute">
        {person.openCount} tarefas · {person.doingCount} em andamento · {person.overdueCount} atrasada{person.overdueCount === 1 ? "" : "s"} · {person.doneCount} concluída{person.doneCount === 1 ? "" : "s"}
      </p>
      <div className="mb-4 mt-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link key={item.id} href={item.id === "todos" ? `/equipe/${person.id}` : `/equipe/${person.id}?filtro=${item.id}`} aria-current={filter === item.id ? "page" : undefined} className={filter === item.id ? "rounded-full bg-unica-wash px-3 py-1.5 text-sm font-medium text-unica" : "rounded-full px-3 py-1.5 text-sm text-mute hover:bg-white"}>
            {item.label}
          </Link>
        ))}
      </div>
      <TaskRows tasks={tasks} />
    </div>
  );
}
