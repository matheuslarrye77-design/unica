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
    <div className="grid min-w-0 gap-2">
      <section className="min-w-0 rounded-[22px] bg-gradient-to-r from-[#F8EAFB] to-[#F3DDF8] p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/80 text-[#8E35B8]"><Sparkles className="h-4 w-4" /></span>
          <p className="text-[14px] font-semibold text-[#6A228C]">Eventos importantes</p>
        </div>
        {featured ? (
          <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-white/80 px-2.5 py-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F3E4FA] text-center leading-tight text-[#6A228C]">
              <span className="text-[13px] font-semibold">{featured.date.toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
              <span className="text-[10px] capitalize">{featured.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-[#2C2433]">{featured.title}</span>
              <span className="mt-0.5 block truncate text-[12px] text-[#8A5AA0]">{[featured.time, featured.place].filter(Boolean).join(' · ')}</span>
            </span>
          </div>
        ) : null}
      </section>

      <section className="min-w-0 rounded-[22px] border border-[#F0E7F6] bg-white p-3 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#2C2433]">Próximos</h2>
          <a href="#calendario" className="text-[12.5px] font-medium text-[#8E35B8]">Ver todos</a>
        </div>
        <ul className="mt-2.5 grid gap-2.5">
          {visibleUpcoming.map((event) => {
            const day = event.date.toLocaleDateString('pt-BR', { day: '2-digit' });
            const month = event.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            const showNote = event.id === noteTarget?.id;
            return (
              <li key={event.id} className="flex items-start gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F8EAFB] text-center leading-tight text-[#6A228C]">
                  <span className="text-[13px] font-semibold">{day}</span>
                  <span className="text-[10px] capitalize">{month}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[#2C2433]">{event.type === 'birthday' ? `Aniversário de ${event.personName?.split(' ')[0]}` : event.title}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-[#8A7C98]">
                    {event.type === 'birthday' ? `${event.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · Equipe` : [event.place, event.time].filter(Boolean).join(' · ')}
                  </span>
                  {showNote && event.personName ? (
                    <Link to={`/calendar?tipo=aniversarios&pessoa=${celebrationPersonId(event.personName)}`} className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[#8E35B8]">
                      <Cake className="h-3.5 w-3.5" /> Deixe um recado
                    </Link>
                  ) : null}
                </span>
                {event.avatar ? <img src={event.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full bg-[#F3E4FA]" /> : <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[#C4B6D4]" />}
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
            className="mt-1.5 w-full text-center text-[18px] font-semibold leading-none tracking-[0.2em] text-[#8E35B8]"
          >
            {expanded ? '–' : '…'}
          </button>
        ) : null}
      </section>

      <section className="min-w-0 rounded-[22px] border border-[#F0E7F6] bg-white p-3 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#2C2433]"><Cake className="h-4 w-4 text-[#8E35B8]" /> Aniversários do mês</h2>
        </div>
        <div className="mt-2.5 flex min-w-0 justify-start gap-3">
          {birthdays.map((event) => (
            <div key={event.id} className="w-12 min-w-0 shrink text-center">
              <img src={event.avatar} alt="" className="mx-auto h-10 w-10 rounded-full bg-[#F3E4FA]" />
              <p className="mt-1 truncate text-[12px] font-medium text-[#2C2433]">{event.personName?.split(' ')[0]}</p>
              <p className="text-[10px] text-[#8A7C98]">{event.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
