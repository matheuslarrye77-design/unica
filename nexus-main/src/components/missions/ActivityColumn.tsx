import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Check, ChevronDown, ChevronUp, Circle, Clock } from 'lucide-react';
import { useState, type FC } from 'react';
import { STATUS_LABEL, type Activity, type ActivityStatus } from '@/data/activities';
import { cn } from '@/lib/utils';
import { SortableActivityCard } from './ActivityCard';

const tone: Record<ActivityStatus, { column: string; icon: string; count: string; group: string; action: string; Icon: typeof Circle }> = {
  todo: { column: 'border border-[#F8D0E3] bg-[#FDECF4]', icon: 'bg-[#F472B6] text-white', count: 'bg-white text-[#BE185D]', group: 'bg-white/75 text-[#BE185D]', action: 'text-[#DB2777]', Icon: Circle },
  in_progress: { column: 'border border-[#E4D9FB] bg-[#F4EEFF]', icon: 'bg-[#8A5CF8] text-white', count: 'bg-white text-[#3600C2]', group: 'bg-white/75 text-[#3600C2]', action: 'text-[#4600F3]', Icon: Clock },
  done: { column: 'border border-[#D9E0FC] bg-[#F2F4FF]', icon: 'bg-[#C4B0FC] text-white', count: 'bg-white text-[#4600F3]', group: 'bg-white/75 text-[#4600F3]', action: 'text-[#4600F3]', Icon: Check },
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
    <section className={cn('flex h-full flex-col rounded-[18px] p-2', paint.column, isOver && 'ring-2 ring-[#4600F3]/20')}>
      <header className="flex items-center gap-1.5 px-1 pb-2">
        <span className={cn('grid h-6 w-6 place-items-center rounded-full', paint.icon)}>
          <Icon className="h-3 w-3" strokeWidth={2.4} />
        </span>
        <h2 className="text-[13px] font-semibold text-[#2C2433]">{STATUS_LABEL[status]}</h2>
        <span className={cn('ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-light', paint.count)}>
          {activities.length}
        </span>
      </header>
      <div ref={setNodeRef} className="flex min-h-12 flex-1 flex-col gap-2.5">
        {leadership.length > 0 ? (
          <button
            type="button"
            onClick={() => setLeadershipOpen((open) => !open)}
            className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11.5px] font-light', paint.group)}
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
              canMove={activity.origin !== 'leadership' || canMoveLeadership}
              onToggle={() => toggle(activity.id)}
              onEdit={() => onEdit(activity)}
              onDelete={() => onDelete(activity)}
              onMove={(next) => onMove(activity, next)}
            />
          ))}
        </SortableContext>
      </div>
      <button type="button" onClick={onCreate} className={cn('mt-1.5 py-1.5 text-center text-[12px] font-light hover:opacity-80', paint.action)}>
        + Adicionar atividade
      </button>
    </section>
  );
};
