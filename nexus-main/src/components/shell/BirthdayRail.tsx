import { Emoji } from '@/components/Emoji';
import { calendarEvents } from '@/data/mockData';
import { parseAgendaDate, useAgendaEvents } from '@/lib/events';
import { Cake, ChevronRight } from 'lucide-react';
import { type FC } from 'react';
import { Link } from 'react-router-dom';

function nextBirthday(month: number, day: number, from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const thisYear = new Date(from.getFullYear(), month, day).getTime();
  return thisYear >= start ? thisYear : new Date(from.getFullYear() + 1, month, day).getTime();
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
      when: nextBirthday(event.date.getMonth(), event.date.getDate()),
    }));
  const fromSaved = saved
    .filter((event) => event.type === 'aniversario' && event.personName)
    .map((event) => {
      const date = parseAgendaDate(event.date);
      return {
        id: event.id,
        name: event.personName,
        avatar: event.avatar,
        when: nextBirthday(date.getMonth(), date.getDate()),
      };
    });
  const upcoming = [...fromSaved, ...fromCalendar].sort((a, b) => a.when - b.when || a.name.localeCompare(b.name, 'pt-BR'));
  const people = [
    { id: 'foto-ana', name: 'Ana Souza', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnaSouza', whenLabel: '14 de outubro' },
    { id: 'foto-joao', name: 'João Pereira', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JoaoPereira', whenLabel: '18 de outubro' },
  ].slice(0, 2);
  void upcoming;

  return (
    <section className="unica-surface flex min-h-0 flex-col px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold">
          <span className="unica-icon">
            <Cake className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          Aniversariantes
        </h2>
        <Link to="/calendar?tipo=aniversarios" aria-label="Abrir aniversariantes no calendário" className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {people.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-muted-foreground">Nenhum aniversário por perto.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-2.5">
              {person.avatar ? <img src={person.avatar} alt="" className="h-8 w-8 rounded-full bg-muted object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-primary">{person.name.charAt(0)}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium leading-4">{person.name}</span>
                <span className="block text-[11.5px] text-muted-foreground">{person.whenLabel}</span>
              </span>
              <Link to="/calendar?tipo=aniversarios" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[12px] font-medium text-primary hover:underline">
                <Emoji emoji="🎉" className="h-3.5 w-3.5" />
                Feliz aniversário!
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
