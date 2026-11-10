import { calendarEvents } from '@/data/mockData';
import { celebrationPersonId } from '@/lib/celebrations';
import { Cake, ChevronRight, Sparkles } from 'lucide-react';
import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';

export const AgendaRail: FC = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const nextBirthday = calendarEvents
    .filter((event) => event.type === 'birthday' && event.date >= start)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const featured = calendarEvents
    .filter((event) => event.type !== 'birthday' && event.date >= start && (event.category === 'Reunião' || event.category === 'Treinamento'))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const upcoming = calendarEvents
    .filter((event) => event.id !== featured?.id && event.date >= start && (event.type !== 'birthday' || event.id === nextBirthday?.id))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const birthdays = calendarEvents
    .filter((event) => event.type === 'birthday' && event.date >= start)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);
  const noteTarget = nextBirthday;
  const [expanded, setExpanded] = useState(false);
  const visibleUpcoming = expanded ? upcoming : upcoming.slice(0, 3);

  return (
    <div className="grid min-w-0 gap-3">
      <section className="unica-surface relative min-w-0 overflow-hidden p-4">
        <div className="relative flex items-center gap-3">
          <span className="unica-icon"><Sparkles className="h-4 w-4" /></span>
          <p className="text-[14px] font-medium text-[var(--ds-ink)]">Eventos importantes</p>
        </div>
        {featured ? (
          <div className="relative mt-3 flex items-center gap-3 rounded-[12px] bg-[var(--ds-surface)] px-3 py-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white text-center leading-tight text-[var(--ds-purple)]">
              <span className="text-[13px] font-medium">{featured.date.toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
              <span className="unica-meta capitalize">{featured.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-[var(--ds-ink)]">{featured.title}</span>
              <span className="mt-0.5 block truncate text-[12px] text-[var(--ds-slate)]">{[featured.time, featured.place].filter(Boolean).join(' · ')}</span>
            </span>
          </div>
        ) : null}
      </section>

      <section className="unica-surface min-w-0 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-[var(--ds-ink)]">Próximos</h2>
          <a href="#calendario" className="text-[12.5px] font-medium text-[var(--ds-purple)]">Ver todos</a>
        </div>
        <ul className="mt-3 grid gap-3">
          {visibleUpcoming.map((event) => {
            const day = event.date.toLocaleDateString('pt-BR', { day: '2-digit' });
            const month = event.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            const showNote = event.id === noteTarget?.id;
            return (
              <li key={event.id} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[var(--ds-lavender)] text-center leading-tight text-[var(--ds-purple)]">
                  <span className="text-[13px] font-medium">{day}</span>
                  <span className="unica-meta capitalize">{month}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[var(--ds-ink)]">{event.type === 'birthday' ? `Aniversário de ${event.personName?.split(' ')[0]}` : event.title}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-[var(--ds-muted)]">
                    {event.type === 'birthday' ? `${event.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · Equipe` : [event.place, event.time].filter(Boolean).join(' · ')}
                  </span>
                  {showNote && event.personName ? (
                    <Link to={`/calendar?tipo=aniversarios&pessoa=${celebrationPersonId(event.personName)}`} className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ds-purple)]">
                      <Cake className="h-3.5 w-3.5" /> Deixe um recado
                    </Link>
                  ) : null}
                </span>
                {event.avatar ? <img src={event.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full bg-[var(--ds-lavender)]" /> : <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[var(--ds-muted)]" />}
              </li>
            );
          })}
        </ul>
        {upcoming.length > 3 ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? 'Mostrar menos próximos' : 'Mostrar todos os próximos'}
            onClick={() => setExpanded((value) => !value)}
            className="mt-2 w-full text-center text-[18px] font-medium leading-none tracking-[0.2em] text-[var(--ds-lilac)]"
          >
            {expanded ? '–' : '…'}
          </button>
        ) : null}
      </section>

      <section className="unica-surface min-w-0 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[14px] font-medium text-[var(--ds-ink)]"><Cake className="h-4 w-4 text-[var(--ds-purple)]" /> Aniversários do mês</h2>
        </div>
        <div className="mt-3 flex min-w-0 justify-start gap-3">
          {birthdays.map((event) => (
            <div key={event.id} className="w-12 min-w-0 shrink text-center">
              <img src={event.avatar} alt="" className="mx-auto h-10 w-10 rounded-full bg-[var(--ds-lavender)]" />
              <p className="mt-1 truncate text-[12px] font-medium text-[var(--ds-ink)]">{event.personName?.split(' ')[0]}</p>
              <p className="unica-meta">{event.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
