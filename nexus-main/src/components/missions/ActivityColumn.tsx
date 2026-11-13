import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronUp, Plus, Star } from 'lucide-react';
import { useState, type FC } from 'react';
import { STATUS_LABEL, type Activity, type ActivityStatus } from '@/data/activities';
import { cn } from '@/lib/utils';
import { SortableActivityCard } from './ActivityCard';

const tone: Record<ActivityStatus, string> = {
  todo: 'bg-yellow-500',
  in_progress: 'bg-blue-500',
  done: 'bg-green-500',
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
  const [leadershipOpen, setLeadershipOpen] = useState(true);
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const leadership = activities.filter((activity) => activity.origin === 'leadership');
  const mine = activities.filter((activity) => activity.origin !== 'leadership');
  const visible = [...(leadershipOpen ? leadership : []), ...mine];

  function toggle(id: string) {
    setFolded((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <section className="flex min-h-[520px] flex-col rounded-3xl border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <header className="sticky top-0 z-10 rounded-t-3xl border-b border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn('h-3 w-3 shrink-0 rounded-full shadow-md', tone[status])} />
            <h2 className="truncate text-lg font-bold text-gray-800">{STATUS_LABEL[status]}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-gray-100 px-3 text-sm font-bold text-gray-700">
              {activities.length}
            </span>
            <button
              type="button"
              onClick={onCreate}
              aria-label={`Adicionar atividade em ${STATUS_LABEL[status]}`}
              className="grid h-9 w-9 place-items-center rounded-full text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-4 p-4 transition-colors duration-300',
          isOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : 'bg-gray-50',
        )}
      >
        <button
          type="button"
          onClick={() => setLeadershipOpen((open) => !open)}
          className="flex h-11 items-center gap-2 rounded-2xl bg-white px-3 text-left text-sm font-semibold text-violet-700 shadow-sm"
        >
          {leadershipOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <Star className="h-4 w-4" />
          Missões da liderança
          <span className="ml-auto text-xs font-bold text-gray-500">{leadership.length}</span>
        </button>

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

        {visible.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
            <h3 className="text-lg font-semibold text-gray-700">Nenhuma atividade</h3>
            <p className="mt-2 max-w-[220px] text-sm text-gray-500">Arraste um card para cá ou crie uma atividade.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
};
