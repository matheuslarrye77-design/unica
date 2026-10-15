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
    <section className="unica-surface shrink-0 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold">
          <span className="unica-icon">
            <Target className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          Missões em andamento
        </h2>
        <Link to="/projects" aria-label="Abrir missões" className="rounded-full p-0.5 text-muted-foreground hover:bg-[#F1EAFE] hover:text-foreground">
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {featured ? (
        <Link to="/projects" className="mt-1.5 block rounded-[10px] px-0.5 py-0.5 hover:bg-[#F1EAFE]">
          <span className="flex items-center gap-2">
            <span className="unica-icon">
              <Target className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold leading-4">{featured.title}</span>
              <span className="block text-[11px] text-muted-foreground">
                {active.length} {STATUS_LABEL.in_progress.toLowerCase()} · {waiting.length} {STATUS_LABEL.todo.toLowerCase()}
              </span>
            </span>
          </span>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#F1EAFE]">
            <span className="block h-full rounded-full bg-[#7542C8]" style={{ width: `${percent}%` }} />
          </span>
        </Link>
      ) : (
        <p className="mt-1.5 text-[12px] text-muted-foreground">Nenhuma missão em andamento.</p>
      )}
    </section>
  );
};
