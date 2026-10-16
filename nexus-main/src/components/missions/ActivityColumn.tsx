import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Check, ChevronDown, ChevronUp, Circle, Clock } from 'lucide-react';
import { useState, type FC } from 'react';
import { STATUS_LABEL, type Activity, type ActivityStatus } from '@/data/activities';
import { cn } from '@/lib/utils';
import { SortableActivityCard } from './ActivityCard';

const tone: Record<ActivityStatus, { column: string; icon: string; count: string; group: string; action: string; Icon: typeof Circle }> = {
  todo: { column: 'border border-[#F9A8D4] bg-[#FBCFE8]', icon: 'bg-[#DB2777] text-white', count: 'bg-white text-[#DB2777]', group: 'bg-[#FCE7F3] text-[#DB2777]', action: 'text-[#DB2777]', Icon: Circle },
  in_progress: { column: 'border border-[#C4B5FD] bg-[#DDD6FE]', icon: 'bg-[#7C3AED] text-white', count: 'bg-white text-[#7C3AED]', group: 'bg-[#EDE9FE] text-[#7C3AED]', action: 'text-[#7C3AED]', Icon: Clock },
  done: { column: 'border border-[#A5B4FC] bg-[#C7D2FE]', icon: 'bg-[#818CF8] text-white', count: 'bg-white text-[#818CF8]', group: 'bg-[#E0E7FF] text-[#818CF8]', action: 'text-[#818CF8]', Icon: Check },
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
            className={cn('flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[12.5px] font-semibold', paint.group)}
          >
            {leadershipOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <img src="/atividades/alfinete.png" alt="" className="h-4 w-4 object-contain" />
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
          <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-[#E0E7FF]" />
          <div className="pointer-events-none absolute -right-4 -bottom-6 h-20 w-20 rounded-full bg-[#C7D2FE]/80" />
          <div className="relative mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#818CF8] text-white shadow-[0_8px_18px_rgba(129,140,248,0.35)]">
            <Check className="h-5 w-5" strokeWidth={2.6} />
          </div>
          <p className="relative mt-3 text-[15px] font-semibold text-[#6366F1]">Parabéns!</p>
          <p className="relative text-[13px] text-[#818CF8]">Você está indo muito bem!</p>
        </div>
      ) : (
        <button type="button" onClick={onCreate} className={cn('mt-2 py-2 text-center text-[13.5px] font-medium hover:opacity-80', paint.action)}>
          + Adicionar atividade
        </button>
      )}
    </section>
  );
};
