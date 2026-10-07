import Link from "next/link";
import { redirect } from "next/navigation";
import { ANNOUNCEMENT_LABEL, STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/utils";
import { searchAll } from "@/server/data";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const query = (firstParam((await searchParams).q) ?? "").trim();
  const results = query.length >= 2 ? searchAll(user, query) : null;
  const total = results ? results.tasks.length + results.people.length + results.announcements.length + results.events.length : 0;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Busca</h1>
      <form action="/busca" className="mt-4">
        <label htmlFor="q" className="sr-only">
          Pesquisar
        </label>
        <input id="q" name="q" defaultValue={query} placeholder="Tarefas, pessoas, comunicados, eventos" className="h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none focus-visible:border-unica" />
      </form>
      {!query ? <p className="mt-6 text-sm text-mute">Pesquise por um nome, um comunicado ou uma atividade.</p> : null}
      {query && query.length < 2 ? <p className="mt-6 text-sm text-mute">Digite pelo menos 2 caracteres.</p> : null}
      {results && total === 0 ? <p className="mt-6 rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-mute">Nenhum resultado para “{query}”.</p> : null}
      {results && results.tasks.length > 0 ? (
        <Section title="Tarefas">
          {results.tasks.map((task) => (
            <Link key={task.id} href={`/tarefas/${task.id}`} className="block px-4 py-3 hover:bg-unica-mist">
              <span className="font-medium">{task.title}</span>
              <span className="mt-1 block text-sm text-mute">{STATUS_LABEL[task.status]} · {formatDate(task.dueDate)}</span>
            </Link>
          ))}
        </Section>
      ) : null}
      {results && results.people.length > 0 ? (
        <Section title="Pessoas">
          {results.people.map((person) => (
            <Link key={person.id} href={`/perfil/${person.id}`} className="block px-4 py-3 hover:bg-unica-mist">
              <span className="font-medium">{person.name}</span>
              <span className="mt-1 block text-sm text-mute">{[person.jobTitle, person.department].filter(Boolean).join(" · ")}</span>
            </Link>
          ))}
        </Section>
      ) : null}
      {results && results.announcements.length > 0 ? (
        <Section title="Comunicados">
          {results.announcements.map((post) => (
            <Link key={post.id} href={`/mural/${post.id}`} className="block px-4 py-3 hover:bg-unica-mist">
              <span className="font-medium">{post.title}</span>
              <span className="mt-1 block text-sm text-mute">{ANNOUNCEMENT_LABEL[post.type]}</span>
            </Link>
          ))}
        </Section>
      ) : null}
      {results && results.events.length > 0 ? (
        <Section title="Eventos">
          {results.events.map((event) => (
            <Link key={event.id} href={`/calendario?data=${event.date}&evento=${event.id}`} className="block px-4 py-3 hover:bg-unica-mist">
              <span className="font-medium">{event.title}</span>
              <span className="mt-1 block text-sm text-mute">{formatDate(event.date)}</span>
            </Link>
          ))}
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">{children}</div>
    </section>
  );
}
