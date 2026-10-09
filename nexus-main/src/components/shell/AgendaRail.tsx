import { nextOccurrence, useAgendaEvents, type AgendaEvent } from '@/lib/events';
import { calendarEvents } from '@/data/mockData';
import { type FC } from 'react';

function upcomingSaved(events: AgendaEvent[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return events
    .map((event) => ({ event, when: nextOccurrence(event, start) }))
    .filter((item) => item.when >= start)
    .sort((a, b) => a.when.getTime() - b.when.getTime())
    .slice(0, 6);
}

export const AgendaRail: FC = () => {
  const saved = useAgendaEvents();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const base = calendarEvents
    .filter((event) => {
      const when = event.type === 'birthday'
        ? new Date(start.getFullYear(), event.date.getMonth(), event.date.getDate())
        : event.date;
      const next = when < start && event.type === 'birthday' ? new Date(start.getFullYear() + 1, event.date.getMonth(), event.date.getDate()) : when;
      return next >= start;
    })
    .map((event) => ({
      id: event.id,
      title: event.type === 'birthday' ? `Aniversário de ${event.personName?.split(' ')[0]}` : event.title,
      when: event.type === 'birthday'
        ? nextOccurrence({ type: 'aniversario', date: `${event.date.getFullYear()}-${String(event.date.getMonth() + 1).padStart(2, '0')}-${String(event.date.getDate()).padStart(2, '0')}` } as AgendaEvent, start)
        : event.date,
    }));
  const extra = upcomingSaved(saved).map((item) => ({
    id: item.event.id,
    title: item.event.type === 'aniversario' ? `Aniversário de ${item.event.personName.split(' ')[0]}` : item.event.title,
    when: item.when,
  }));
  const seen = new Set(base.map((item) => item.title));
  const items = [...base, ...extra.filter((item) => !seen.has(item.title))]
    .sort((a, b) => a.when.getTime() - b.when.getTime())
    .slice(0, 6);

  return (
    <section className="shrink-0 rounded-2xl border bg-card p-3">
      <h2 className="px-1 text-sm font-semibold">Próximos</h2>
      {items.length === 0 ? (
        <p className="px-1 py-2 text-sm text-muted-foreground">Nenhum evento próximo.</p>
      ) : (
        <div className="mt-1">
          {items.map((item) => (
            <div key={item.id} className="px-1 py-2">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.when.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
