import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { type FC } from 'react';
import { STATUS_LABEL, type Activity, type ActivityStatus } from '@/data/activities';
import { SortableActivityCard } from './ActivityCard';

export const ActivityColumn: FC<{
  status: ActivityStatus;
  activities: Activity[];
  onCreate: () => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onMove: (activity: Activity, status: ActivityStatus) => void;
}> = ({ status, activities, onCreate, onEdit, onDelete, onMove }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const tone = {
    todo: 'border-rose-200 bg-rose-50/80',
    in_progress: 'border-amber-200 bg-amber-50/80',
    done: 'border-emerald-200 bg-emerald-50/80',
  }[status];
  const label = {
    todo: 'text-rose-800',
    in_progress: 'text-amber-800',
    done: 'text-emerald-800',
  }[status];

  return (
    <section className={`flex min-h-[32rem] flex-col rounded-2xl border p-3 ${tone} ${isOver ? 'ring-2 ring-primary/30' : ''}`}>
      <header className="flex items-center justify-between px-1">
        <h2 className={`text-sm font-semibold ${label}`}>{STATUS_LABEL[status]}</h2>
        <button type="button" aria-label={`Nova atividade em ${STATUS_LABEL[status]}`} onClick={onCreate} className="rounded-md p-1 text-muted-foreground hover:bg-background">
          <Plus className="h-4 w-4" />
        </button>
      </header>
      <p className={`px-1 pb-3 text-xs ${label}`}>{activities.length}</p>
      <div ref={setNodeRef} className="flex flex-1 flex-col gap-3">
        <SortableContext items={activities.map((activity) => activity.id)} strategy={verticalListSortingStrategy}>
          {activities.map((activity) => (
            <SortableActivityCard
              key={activity.id}
              activity={activity}
              onEdit={() => onEdit(activity)}
              onDelete={() => onDelete(activity)}
              onMove={(next) => onMove(activity, next)}
            />
          ))}
        </SortableContext>
        {activities.length === 0 ? <p className="px-1 py-6 text-center text-sm text-muted-foreground">Nenhuma atividade</p> : null}
      </div>
    </section>
  );
};
