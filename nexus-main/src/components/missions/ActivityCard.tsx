import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal } from 'lucide-react';
import { type FC } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ACTIVITY_STATUSES,
  PRIORITY_LABEL,
  STATUS_LABEL,
  firstName,
  formatDueDate,
  type Activity,
  type ActivityStatus,
} from '@/data/activities';
import { cn } from '@/lib/utils';

const priorityClass: Record<Activity['priority'], string> = {
  high: 'border-red-200 bg-red-50 text-red-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-border bg-muted text-muted-foreground',
};

export const ActivityCardView: FC<{
  activity: Activity;
  dragging?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: (status: ActivityStatus) => void;
}> = ({ activity, dragging = false, onEdit, onDelete, onMove }) => {
  const due = formatDueDate(activity.dueDate);

  return (
    <article className={cn('rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(40,20,70,0.05)]', dragging && 'opacity-40')}>
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-semibold leading-5">{activity.title}</h3>
        {onEdit && onDelete && onMove ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Ações de ${activity.title}`}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Mover para...</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {ACTIVITY_STATUSES.map((status) => (
                    <DropdownMenuItem key={status} disabled={status === activity.status} onSelect={() => onMove(status)}>
                      {STATUS_LABEL[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {activity.description ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{activity.description}</p> : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={cn('rounded-md border px-1.5 py-0.5 text-[11px] font-medium', priorityClass[activity.priority])}>
          {PRIORITY_LABEL[activity.priority]}
        </span>
        <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {activity.category}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Responsável: {firstName(activity.assignee)}</p>
      {due ? <p className="mt-0.5 text-xs text-muted-foreground">Prazo: {due}</p> : null}
    </article>
  );
};

export const SortableActivityCard: FC<{
  activity: Activity;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (status: ActivityStatus) => void;
}> = ({ activity, onEdit, onDelete, onMove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="cursor-grab touch-none active:cursor-grabbing" {...attributes} {...listeners}>
      <ActivityCardView activity={activity} dragging={isDragging} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
    </div>
  );
};
