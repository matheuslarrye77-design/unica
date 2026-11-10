import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState, type FC } from 'react';
import { STATUS_LABEL, type Activity, type ActivityStatus } from '@/data/activities';
import { cn } from '@/lib/utils';
import { SortableActivityCard } from './ActivityCard';

const tone: Record<ActivityStatus, { mark: string }> = {
  todo: { mark: 'bg-[#8B83D6]' },
  in_progress: { mark: 'bg-[#7065C5]' },
  done: { mark: 'bg-[#5B8C7A]' },
};

export const ActivityColumn: FC<{
  status: ActivityStatus;
  activities: Activity[];
  canMoveLeadership?: boolean;
  onCreate: () => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onMove: (activity: Activity, status: ActivityStatus) => void;
}> = ({ status, activities, canMoveLeadership = false, onCreate, onEdit, onDelete, onMove }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const paint = tone[status];
  const [leadershipOpen, setLeadershipOpen] = useState(true);
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const leadership = activities.filter((activity) => activity.origin === 'leadership');
  const mine = activities.filter((activity) => activity.origin !== 'leadership');
  const visible = [...(leadershipOpen ? leadership : []), ...mine];

  function toggle(id: string) {
    setFolded((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <section className={cn('flex h-full min-w-[240px] flex-col rounded-[var(--ds-radius)] bg-[var(--ds-surface)] p-3', isOver && 'ring-1 ring-[var(--ds-purple)]/20')}>
      <header className="flex items-center gap-2 px-1 pb-3">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', paint.mark)} />
        <h2 className="text-[13px] font-medium text-[var(--ds-ink)]">{STATUS_LABEL[status]}</h2>
        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 text-[11px] font-normal text-[var(--ds-muted)]">
          {activities.length}
        </span>
      </header>
      <div ref={setNodeRef} className="flex min-h-12 flex-1 flex-col gap-2">
        {leadership.length > 0 ? (
          <button
            type="button"
            onClick={() => setLeadershipOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded-[12px] bg-white px-2 py-1.5 text-left text-[11.5px] font-medium text-[var(--ds-purple)]"
          >
            {leadershipOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <img src="/atividades/alfinete.png" alt="" className="h-3.5 w-3.5 object-contain" />
            Missões da liderança
            <span className="ml-auto text-[11px] font-medium text-[#858593]">{leadership.length}</span>
          </button>
        ) : null}
        <SortableContext items={visible.map((activity) => activity.id)} strategy={verticalListSortingStrategy}>
          {visible.map((activity) => (
            <SortableActivityCard
              key={activity.id}
              activity={activity}
              collapsed={folded[activity.id] === true}
              canMove={activity.origin !== 'leadership' || canMoveLeadership}
              onToggle={() => toggle(activity.id)}
              onEdit={() => onEdit(activity)}
              onDelete={() => onDelete(activity)}
              onMove={(next) => onMove(activity, next)}
            />
          ))}
        </SortableContext>
      </div>
      <button type="button" onClick={onCreate} className="mt-2 rounded-[12px] py-2 text-center text-[12px] font-medium text-[var(--ds-muted)] transition-colors duration-[180ms] hover:bg-white hover:text-[var(--ds-purple)]">
        + Adicionar atividade
      </button>
    </section>
  );
};
