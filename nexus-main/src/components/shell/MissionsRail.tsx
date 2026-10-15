import { loadActivityStore, STATUS_LABEL } from '@/data/activities';
import { ChevronRight, Target } from 'lucide-react';
import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';

export const MissionsRail: FC = () => {
  const [store] = useState(loadActivityStore);
  const active = store.activities.filter((activity) => activity.status === 'in_progress');
  const waiting = store.activities.filter((activity) => activity.status === 'todo');
  const featured = active[0] ?? waiting[0];

  return (
    <section className="unica-surface px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <Target className="h-4 w-4 text-primary" strokeWidth={1.75} />
          Missões em andamento
        </h2>
        <Link to="/projects" aria-label="Abrir missões" className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {featured ? (
        <Link to="/projects" className="mt-3 flex items-center gap-3 rounded-[12px] px-1 py-1 hover:bg-accent/60">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accent text-primary">
            <Target className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold leading-5">{featured.title}</span>
            <span className="block text-[12px] text-muted-foreground">
              {active.length} {STATUS_LABEL.in_progress.toLowerCase()} · {waiting.length} {STATUS_LABEL.todo.toLowerCase()}
            </span>
          </span>
        </Link>
      ) : (
        <p className="mt-3 text-[13px] text-muted-foreground">Nenhuma missão em andamento.</p>
      )}
    </section>
  );
};
