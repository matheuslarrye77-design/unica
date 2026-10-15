import { loadActivityStore, STATUS_LABEL } from '@/data/activities';
import { ChevronRight, Target } from 'lucide-react';
import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';

export const MissionsRail: FC = () => {
  const [store] = useState(loadActivityStore);
  const active = store.activities.filter((activity) => activity.status === 'in_progress');
  const waiting = store.activities.filter((activity) => activity.status === 'todo');
  const done = store.activities.filter((activity) => activity.status === 'done').length;
  const total = store.activities.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const featured = active[0] ?? waiting[0];

  return (
    <section className="unica-surface shrink-0 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold">
          <span className="unica-icon">
            <Target className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          Missões em andamento
        </h2>
        <Link to="/projects" aria-label="Abrir missões" className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {featured ? (
        <Link to="/projects" className="mt-2 flex items-center gap-2.5 rounded-[12px] border border-[#E8DDFB] bg-[#F0E9FF] px-2.5 py-2 hover:bg-accent">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-white text-primary">
            <Target className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold leading-4">{featured.title}</span>
            <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
              {active.length} {STATUS_LABEL.in_progress.toLowerCase()} · {waiting.length} {STATUS_LABEL.todo.toLowerCase()}
            </span>
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </span>
          </span>
        </Link>
      ) : (
        <p className="mt-2 text-[12.5px] text-muted-foreground">Nenhuma missão em andamento.</p>
      )}
    </section>
  );
};
