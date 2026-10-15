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
    <section className="unica-surface shrink-0 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold">
          <span className="unica-icon">
            <Cake className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          Aniversariantes
        </h2>
        <Link to="/calendar?tipo=aniversarios" aria-label="Abrir aniversariantes no calendário" className="rounded-full p-0.5 text-muted-foreground hover:bg-[#F1EAFE] hover:text-foreground">
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {people.length === 0 ? (
        <p className="mt-1.5 text-[12px] text-muted-foreground">Nenhum aniversário por perto.</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-2">
              {person.avatar ? <img src={person.avatar} alt="" className="h-6 w-6 rounded-full bg-muted object-cover" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F1EAFE] text-[10px] font-semibold text-primary">{person.name.charAt(0)}</span>}
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-4">{person.name}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{new Date(person.when).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
