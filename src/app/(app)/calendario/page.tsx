import Link from "next/link";
import { redirect } from "next/navigation";
import { EventActions, NewEventButton } from "@/components/calendar";
import { getCurrentUser } from "@/lib/auth";
import { addDays, calendarGrid, formatDate, formatISODate, monthBounds, parseISODate, todayInSaoPaulo, weekBounds } from "@/lib/dates";
import { firstParam } from "@/lib/utils";
import { getCalendar, getEvent, listUpcomingEvents } from "@/server/data";
import type { CalendarEntry } from "@/lib/types";

const TYPES = [
  { id: "", label: "Todos" },
  { id: "aniversario", label: "Aniversários" },
  { id: "tarefa", label: "Tarefas" },
  { id: "evento", label: "Eventos" },
  { id: "reuniao", label: "Reuniões" },
  { id: "comunicado", label: "Comunicados" },
];

const DOT: Record<CalendarEntry["type"], string> = {
  aniversario: "bg-unica",
  tarefa: "bg-[#8D8794]",
  reuniao: "bg-[#A78BD6]",
  evento: "bg-[#6424B3]",
  comunicado: "bg-[#C4A15A]",
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const view = firstParam(params.visao) === "semana" || firstParam(params.visao) === "agenda" ? (firstParam(params.visao) as "semana" | "agenda") : "mes";
  const rawDate = firstParam(params.data);
  const anchor = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayInSaoPaulo();
  const type = firstParam(params.tipo) ?? "";
  const scope = user.role === "leadership" && firstParam(params.escopo) === "equipe" ? "equipe" : "minhas";
  const data = getCalendar(user, anchor, view, type ? [type] : [], scope);
  const selectedId = Number(firstParam(params.evento));
  const selected = Number.isInteger(selectedId) && selectedId > 0 ? getEvent(selectedId) : undefined;
  const upcoming = listUpcomingEvents();
  const prev = shift(anchor, view, -1);
  const next = shift(anchor, view, 1);

  function href(overrides: Record<string, string | undefined>) {
    const query = new URLSearchParams();
    const nextView = overrides.visao ?? view;
    const nextDate = overrides.data ?? anchor;
    const nextType = overrides.tipo === "" ? "" : overrides.tipo ?? type;
    const nextScope = overrides.escopo ?? (scope === "equipe" ? "equipe" : "");
    if (nextView !== "mes") query.set("visao", nextView);
    if (nextDate !== todayInSaoPaulo()) query.set("data", nextDate);
    if (nextType) query.set("tipo", nextType);
    if (nextScope) query.set("escopo", nextScope);
    const value = query.toString();
    return value ? `/calendario?${value}` : "/calendario";
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
          <p className="mt-1 text-sm text-mute">{view === "mes" ? data.title : `${formatDate(data.rangeStart)} – ${formatDate(data.rangeEnd)}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href({ data: prev })} className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white" aria-label="Período anterior">
            ‹
          </Link>
          <Link href="/calendario" className="inline-flex h-11 items-center rounded-lg border border-line bg-white px-3 text-sm">
            Hoje
          </Link>
          <Link href={href({ data: next })} className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white" aria-label="Próximo período">
            ›
          </Link>
          {user.role === "leadership" ? <NewEventButton /> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["mes", "semana", "agenda"] as const).map((item) => (
          <Link key={item} href={href({ visao: item, data: anchor })} aria-current={view === item ? "page" : undefined} className={view === item ? "rounded-full bg-unica-wash px-3 py-1.5 text-sm font-medium text-unica" : "rounded-full px-3 py-1.5 text-sm text-mute"}>
            {item === "mes" ? "Mês" : item === "semana" ? "Semana" : "Agenda"}
          </Link>
        ))}
        {TYPES.map((item) => (
          <Link key={item.label} href={href({ tipo: item.id })} aria-current={type === item.id ? "page" : undefined} className={type === item.id ? "rounded-full bg-white px-3 py-1.5 text-sm font-medium text-ink" : "rounded-full px-3 py-1.5 text-sm text-mute"}>
            {item.label}
          </Link>
        ))}
        {user.role === "leadership" ? (
          <Link href={href({ escopo: scope === "equipe" ? "" : "equipe" })} className={scope === "equipe" ? "rounded-full bg-unica-wash px-3 py-1.5 text-sm font-medium text-unica" : "rounded-full px-3 py-1.5 text-sm text-mute"}>
            {scope === "equipe" ? "Toda a equipe" : "Minhas tarefas"}
          </Link>
        ) : null}
      </div>
      {selected ? (
        <div className="mt-4 rounded-xl border border-line bg-white p-4">
          <p className="text-xs text-mute">{selected.type === "reuniao" ? "Reunião" : "Evento"} · {formatDate(selected.date)}{selected.time ? ` · ${selected.time}` : ""}</p>
          <h2 className="mt-1 font-semibold">{selected.title}</h2>
          {selected.description ? <p className="mt-2 whitespace-pre-wrap text-sm">{selected.description}</p> : null}
        </div>
      ) : null}
      <div className="mt-4">
        {view === "mes" ? <Month anchor={anchor} entries={data.entries} today={data.today} /> : null}
        {view === "semana" ? <Week anchor={anchor} entries={data.entries} today={data.today} /> : null}
        {view === "agenda" ? <Agenda entries={data.entries} /> : null}
      </div>
      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">Próximos eventos</h2>
        {upcoming.length === 0 ? <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-mute">Nenhum evento futuro.</p> : null}
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {upcoming.map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-mute">{event.type === "reuniao" ? "Reunião" : "Evento"} · {formatDate(event.date)}{event.time ? ` · ${event.time}` : ""}</p>
              </div>
              {user.role === "leadership" ? <EventActions event={event} /> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function shift(anchor: string, view: string, direction: number) {
  if (view === "semana") return addDays(weekBounds(anchor).start, direction * 7);
  if (view === "agenda") return addDays(anchor, direction * 14);
  const date = parseISODate(monthBounds(anchor).start);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return formatISODate(date);
}

function Month({ anchor, entries, today }: { anchor: string; entries: CalendarEntry[]; today: string }) {
  const grid = calendarGrid(anchor);
  const month = anchor.slice(0, 7);
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="grid grid-cols-7 border-b border-line text-center text-xs text-mute">
        {days.map((day) => (
          <div key={day} className="px-2 py-2">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.days.map((day) => {
          const items = entries.filter((entry) => entry.date === day).slice(0, 3);
          const extra = entries.filter((entry) => entry.date === day).length - items.length;
          return (
            <div key={day} className={day.slice(0, 7) === month ? "min-h-24 border-b border-r border-line p-1.5" : "min-h-24 border-b border-r border-line bg-[#F8F7F9] p-1.5"}>
              <p className={day === today ? "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-unica text-xs font-semibold text-white" : "mb-1 text-xs text-mute"}>{Number(day.slice(8))}</p>
              <div className="space-y-1">
                {items.map((entry) => (
                  <EntryChip key={entry.id} entry={entry} />
                ))}
                {extra > 0 ? <p className="text-[11px] text-mute">+{extra}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Week({ anchor, entries, today }: { anchor: string; entries: CalendarEntry[]; today: string }) {
  const start = weekBounds(anchor).start;
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((day) => (
        <section key={day} className="rounded-xl border border-line bg-white p-2">
          <h2 className={day === today ? "text-sm font-semibold text-unica" : "text-sm font-semibold"}>{formatDate(day).slice(0, 5)}</h2>
          <div className="mt-2 space-y-1">
            {entries.filter((entry) => entry.date === day).map((entry) => (
              <EntryChip key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Agenda({ entries }: { entries: CalendarEntry[] }) {
  const groups = new Map<string, CalendarEntry[]>();
  for (const entry of [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))) {
    const list = groups.get(entry.date) ?? [];
    list.push(entry);
    groups.set(entry.date, list);
  }
  if (groups.size === 0) return <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-mute">Nada neste período.</p>;
  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([date, items]) => (
        <section key={date}>
          <h2 className="mb-2 text-sm font-semibold">{formatDate(date)}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {items.map((entry) => (
              <li key={entry.id}>
                <EntryLine entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EntryChip({ entry }: { entry: CalendarEntry }) {
  const className = "flex items-center gap-1 truncate rounded bg-[#F7F5F8] px-1.5 py-1 text-[11px]";
  const content = (
    <>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[entry.type]}`} />
      <span className="truncate">{entry.title}</span>
    </>
  );
  if (!entry.href) return <div className={className}>{content}</div>;
  return (
    <Link href={entry.href} className={className}>
      {content}
    </Link>
  );
}

function EntryLine({ entry }: { entry: CalendarEntry }) {
  const body = (
    <span className="flex items-center gap-2 px-4 py-3">
      <span className={`h-2 w-2 rounded-full ${DOT[entry.type]}`} />
      <span>
        <span className="block font-medium">{entry.title}</span>
        <span className="text-sm text-mute">{entry.meta}{entry.time ? ` · ${entry.time}` : ""}</span>
      </span>
    </span>
  );
  if (!entry.href) return body;
  return <Link href={entry.href} className="block hover:bg-unica-mist">{body}</Link>;
}
