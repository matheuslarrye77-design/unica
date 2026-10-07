import { calendarEvents } from '@/data/mockData';
import { type FC } from 'react';

export const UpcomingEvents: FC = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const upcoming = calendarEvents
    .filter((event) => event.type !== 'birthday' && event.date.getTime() >= start.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

  return (
    <section className="shrink-0 rounded-2xl border bg-card p-3">
      <h2 className="px-1 text-sm font-semibold">Próximos eventos</h2>
      {upcoming.length === 0 ? (
        <p className="px-1 py-2 text-sm text-muted-foreground">Nenhum evento próximo.</p>
      ) : (
        <div className="mt-1">
          {upcoming.map((event) => (
            <div key={event.id} className="px-1 py-2">
              <p className="truncate text-sm font-medium">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{event.time ? ` · ${event.time}` : ''}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
