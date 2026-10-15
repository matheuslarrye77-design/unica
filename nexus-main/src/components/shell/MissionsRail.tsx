import { ChevronRight, Target } from 'lucide-react';
import { type FC } from 'react';
import { Link } from 'react-router-dom';

export const MissionsRail: FC = () => {
  return (
    <section className="unica-surface flex min-h-0 flex-1 flex-col px-3 py-2.5">
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
      <Link to="/projects" className="mt-2 flex items-center gap-2.5 rounded-[12px] border border-[#F0D4EE] bg-[#F8E8F6] px-2.5 py-2 hover:bg-accent">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-white text-primary">
          <Target className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-4">Organização do evento</span>
          <span className="mt-0.5 block text-[11.5px] text-muted-foreground">3 em andamento · 1 em revisão</span>
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white">
            <span className="block h-full rounded-full bg-primary" style={{ width: '72%' }} />
          </span>
        </span>
      </Link>
    </section>
  );
};
