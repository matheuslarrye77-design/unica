import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronUp, Plus, Star } from 'lucide-react';
import { useState, type FC } from 'react';
import { STATUS_LABEL, type Activity, type ActivityStatus } from '@/data/activities';
import { cn } from '@/lib/utils';
import { SortableActivityCard } from './ActivityCard';

const tone: Record<ActivityStatus, { mark: string }> = {
  todo: { mark: 'bg-[#4C7BD9]' },
  in_progress: { mark: 'bg-[#8878D6]' },
  done: { mark: 'bg-[#3D9A6A]' },
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
    <section className={cn(
      'flex min-w-0 flex-col rounded-[12px] border border-[rgba(45,40,70,0.05)] bg-white/60 p-2.5 md:min-w-[220px]',
      isOver && 'border-[rgba(136,120,214,0.35)] bg-white/80',
    )}>
      <header className="flex items-center gap-2 px-1 pb-2.5 pt-0.5">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', paint.mark)} />
        <h2 className="text-[14px] font-medium tracking-[-0.01em] text-[#252631]">{STATUS_LABEL[status]}</h2>
        <span className="ml-auto text-[12px] font-normal tabular-nums text-[#777987]">{activities.length}</span>
        <button
          type="button"
          onClick={onCreate}
          aria-label={`Adicionar atividade em ${STATUS_LABEL[status]}`}
          className="grid h-6 w-6 place-items-center rounded-[7px] text-[#777987] transition-colors duration-[180ms] hover:bg-white hover:text-[#8878D6]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.7} />
        </button>
      </header>
      <div ref={setNodeRef} className="flex min-h-12 flex-1 flex-col gap-2">
        {leadership.length > 0 ? (
          <button
            type="button"
            onClick={() => setLeadershipOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded-[8px] px-1.5 py-1 text-left text-[12px] font-medium text-[#6E62C4] transition-colors duration-[180ms] hover:bg-white/80"
          >
            {leadershipOpen ? <ChevronUp className="h-3 w-3" strokeWidth={1.6} /> : <ChevronDown className="h-3 w-3" strokeWidth={1.6} />}
            <Star className="h-3 w-3" strokeWidth={1.6} />
            Missões da liderança
            <span className="ml-auto text-[11px] font-normal tabular-nums text-[#777987]">{leadership.length}</span>
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
      <button
        type="button"
        onClick={onCreate}
        className="mt-1.5 flex items-center justify-center gap-1 rounded-[8px] py-1.5 text-[12px] font-normal text-[#8A8498] transition-colors duration-[180ms] hover:bg-white hover:text-[#8878D6]"
      >
        <Plus className="h-3 w-3" strokeWidth={1.7} />
        Adicionar
      </button>
    </section>
  );
};
