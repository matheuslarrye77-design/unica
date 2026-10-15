import { calendarEvents } from '@/data/mockData';
import { parseAgendaDate, useAgendaEvents } from '@/lib/events';
import { Cake, ChevronRight } from 'lucide-react';
import { type FC } from 'react';
import { Link } from 'react-router-dom';

function nextDate(month: number, day: number, from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const same = new Date(from.getFullYear(), month, day).getTime();
  return same >= start ? same : new Date(from.getFullYear() + 1, month, day).getTime();
}

export const BirthdayRail: FC = () => {
  const saved = useAgendaEvents();
  const savedNames = new Set(saved.filter((event) => event.type === 'aniversario').map((event) => event.personName));
  const fromCalendar = calendarEvents
    .filter((event) => event.type === 'birthday' && event.personName && !savedNames.has(event.personName))
    .map((event) => ({
      id: event.id,
      name: event.personName ?? 'Aniversariante',
      avatar: event.avatar,
      when: nextDate(event.date.getMonth(), event.date.getDate()),
    }));
  const fromSaved = saved
    .filter((event) => event.type === 'aniversario' && event.personName)
    .map((event) => {
      const date = parseAgendaDate(event.date);
      return {
        id: event.id,
        name: event.personName,
        avatar: event.avatar,
        when: nextDate(date.getMonth(), date.getDate()),
      };
    });
  const people = [...fromSaved, ...fromCalendar].sort((a, b) => a.when - b.when).slice(0, 4);

  return (
    <section className="unica-surface px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <Cake className="h-4 w-4 text-primary" strokeWidth={1.75} />
          Aniversariantes
        </h2>
        <Link to="/calendar?tipo=aniversarios" aria-label="Abrir aniversariantes no calendário" className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {people.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">Nenhum aniversário por perto.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-2.5">
              {person.avatar ? <img src={person.avatar} alt="" className="h-9 w-9 rounded-full bg-muted object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-primary">{person.name.charAt(0)}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium leading-4">{person.name}</span>
                <span className="block text-[11px] text-muted-foreground">{new Date(person.when).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</span>
              </span>
              <Link to="/calendar?tipo=aniversarios" className="shrink-0 text-[12px] font-medium text-primary hover:underline">
                Feliz aniversário!
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
