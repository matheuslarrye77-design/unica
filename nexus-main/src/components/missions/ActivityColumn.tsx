import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Check, ChevronDown, ChevronUp, Circle, Clock } from 'lucide-react';
import { useState, type FC } from 'react';
import { STATUS_LABEL, type Activity, type ActivityStatus } from '@/data/activities';
import { cn } from '@/lib/utils';
import { SortableActivityCard } from './ActivityCard';

const tone: Record<ActivityStatus, { column: string; icon: string; count: string; Icon: typeof Circle }> = {
  todo: { column: 'border border-[#F6C9D4] bg-[#FDE7EE]', icon: 'bg-white text-[#E23B6A]', count: 'bg-white text-[#E23B6A]', Icon: Circle },
  in_progress: { column: 'border border-[#F3E0B0] bg-[#FFF4D6]', icon: 'bg-white text-[#D08912]', count: 'bg-white text-[#C47B12]', Icon: Clock },
  done: { column: 'border border-[#C9EBD6] bg-[#E7F8EE]', icon: 'bg-white text-[#1F9D55]', count: 'bg-white text-[#1F9D55]', Icon: Check },
};

export const ActivityColumn: FC<{
  status: ActivityStatus;
  activities: Activity[];
  onCreate: () => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onMove: (activity: Activity, status: ActivityStatus) => void;
}> = ({ status, activities, onCreate, onEdit, onDelete, onMove }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const paint = tone[status];
  const Icon = paint.Icon;
  const [leadershipOpen, setLeadershipOpen] = useState(true);
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const leadership = activities.filter((activity) => activity.origin === 'leadership');
  const mine = activities.filter((activity) => activity.origin !== 'leadership');
  const visible = [...(leadershipOpen ? leadership : []), ...mine];

  function toggle(id: string) {
    setFolded((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <section className={cn('flex flex-col rounded-[22px] p-2.5', paint.column, isOver && 'ring-2 ring-[#8E35B8]/25')}>
      <header className="flex items-center gap-2 px-1 pb-2.5">
        <span className={cn('grid h-7 w-7 place-items-center rounded-full', paint.icon)}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        <h2 className="text-[15px] font-semibold text-[#2C2433]">{STATUS_LABEL[status]}</h2>
        <span className={cn('ml-auto grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[12px] font-semibold', paint.count)}>
          {activities.length}
        </span>
      </header>
      <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2.5">
        {leadership.length > 0 ? (
          <button
            type="button"
            onClick={() => setLeadershipOpen((open) => !open)}
            className="flex items-center gap-2 rounded-xl bg-white/70 px-2.5 py-1.5 text-left text-[12.5px] font-semibold text-[#E23B6A]"
          >
            {leadershipOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Missões da liderança
            <span className="ml-auto text-[11px] font-medium">{leadership.length}</span>
          </button>
        ) : null}
        <SortableContext items={visible.map((activity) => activity.id)} strategy={verticalListSortingStrategy}>
          {visible.map((activity) => (
            <SortableActivityCard
              key={activity.id}
              activity={activity}
              collapsed={folded[activity.id] === true}
              onToggle={() => toggle(activity.id)}
              onEdit={() => onEdit(activity)}
              onDelete={() => onDelete(activity)}
              onMove={(next) => onMove(activity, next)}
            />
          ))}
        </SortableContext>
      </div>
      {status === 'done' ? (
        <div className="relative mt-3 overflow-hidden rounded-2xl px-4 py-7 text-center">
          <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-[#F3E4FA]" />
          <div className="pointer-events-none absolute -right-4 -bottom-6 h-20 w-20 rounded-full bg-[#EBD4F6]/80" />
          <div className="relative mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#8E35B8] text-white shadow-[0_8px_18px_rgba(142,53,184,0.28)]">
            <Check className="h-5 w-5" strokeWidth={2.6} />
          </div>
          <p className="relative mt-3 text-[15px] font-semibold text-[#6A228C]">Parabéns!</p>
          <p className="relative text-[13px] text-[#8A6A9C]">Você está indo muito bem!</p>
        </div>
      ) : (
        <button type="button" onClick={onCreate} className="mt-2 py-2 text-center text-[13.5px] font-medium text-[#8E35B8] hover:text-[#6A228C]">
          + Adicionar atividade
        </button>
      )}
    </section>
  );
};
