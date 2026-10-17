import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Check, ChevronDown, ChevronUp, Circle, Clock } from 'lucide-react';
import { useState, type FC } from 'react';
import { STATUS_LABEL, type Activity, type ActivityStatus } from '@/data/activities';
import { cn } from '@/lib/utils';
import { SortableActivityCard } from './ActivityCard';

const tone: Record<ActivityStatus, { column: string; icon: string; count: string; group: string; action: string; Icon: typeof Circle }> = {
  todo: { column: 'border border-[#F8D0E3] bg-[#FDECF4]', icon: 'bg-[#F472B6] text-white', count: 'bg-white text-[#BE185D]', group: 'bg-white/75 text-[#BE185D]', action: 'text-[#DB2777]', Icon: Circle },
  in_progress: { column: 'border border-[#E4D9FB] bg-[#F4EEFF]', icon: 'bg-[#A78BFA] text-white', count: 'bg-white text-[#6D28D9]', group: 'bg-white/75 text-[#6D28D9]', action: 'text-[#7C3AED]', Icon: Clock },
  done: { column: 'border border-[#D9E0FC] bg-[#F2F4FF]', icon: 'bg-[#A5B4FC] text-white', count: 'bg-white text-[#4338CA]', group: 'bg-white/75 text-[#4338CA]', action: 'text-[#6366F1]', Icon: Check },
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
    <section className={cn('flex flex-col rounded-[18px] p-2', paint.column, isOver && 'ring-2 ring-[#8E35B8]/20')}>
      <header className="flex items-center gap-1.5 px-1 pb-2">
        <span className={cn('grid h-6 w-6 place-items-center rounded-full', paint.icon)}>
          <Icon className="h-3 w-3" strokeWidth={2.4} />
        </span>
        <h2 className="text-[13px] font-semibold text-[#2C2433]">{STATUS_LABEL[status]}</h2>
        <span className={cn('ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold', paint.count)}>
          {activities.length}
        </span>
      </header>
      <div ref={setNodeRef} className="flex min-h-12 flex-col gap-2">
        {leadership.length > 0 ? (
          <button
            type="button"
            onClick={() => setLeadershipOpen((open) => !open)}
            className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11.5px] font-medium', paint.group)}
          >
            {leadershipOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <img src="/atividades/alfinete.png" alt="" className="h-3.5 w-3.5 object-contain" />
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
        <div className="relative mt-2 overflow-hidden rounded-xl px-3 py-4 text-center">
          <div className="pointer-events-none absolute -left-6 bottom-0 h-16 w-16 rounded-full bg-[#E0E7FF]/80" />
          <div className="pointer-events-none absolute -right-4 -bottom-4 h-14 w-14 rounded-full bg-[#C7D2FE]/50" />
          <div className="relative mx-auto grid h-9 w-9 place-items-center rounded-full bg-[#A5B4FC] text-white">
            <Check className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <p className="relative mt-2 text-[13px] font-semibold text-[#4338CA]">Parabéns!</p>
          <p className="relative text-[11.5px] font-normal text-[#6366F1]">Você está indo muito bem!</p>
        </div>
      ) : (
        <button type="button" onClick={onCreate} className={cn('mt-1.5 py-1.5 text-center text-[12px] font-medium hover:opacity-80', paint.action)}>
          + Adicionar atividade
        </button>
      )}
    </section>
  );
};
