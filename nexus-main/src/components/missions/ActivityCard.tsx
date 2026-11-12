import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, CheckCircle, ChevronDown, ChevronUp, Flag, MoreHorizontal } from 'lucide-react';
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
  CHANNEL_LABEL,
  PRIORITY_LABEL,
  missionChannel,
  STATUS_LABEL,
  type Activity,
  type ActivityStatus,
} from '@/data/activities';
import { cn } from '@/lib/utils';

const priorityStyle: Record<Activity['priority'], { pill: string; icon: string }> = {
  high: { pill: 'bg-[#EDE7FE] text-[#4600F3]', icon: 'text-[#4600F3]' },
  medium: { pill: 'bg-[#FDE7F3] text-[#DB2777]', icon: 'text-[#DB2777]' },
  low: { pill: 'bg-[#F3E8FF] text-[#6B33F6]', icon: 'text-[#6B33F6]' },
};

export function visualProgress(activity: Activity) {
  if (activity.status === 'done') return 100;
  if (activity.status === 'in_progress') return 50;
  return 0;
}

function progressColor(value: number) {
  if (value <= 0) return 'bg-red-500';
  if (value >= 100) return 'bg-[#4600F3]';
  return 'bg-[#DB2777]';
}

function cardDate(activity: Activity) {
  const value = activity.status === 'done' ? activity.completedOn ?? activity.dueDate : activity.dueDate;
  return value || 'Sem prazo';
}

export const ActivityCardView: FC<{
  activity: Activity;
  dragging?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: (status: ActivityStatus) => void;
}> = ({ activity, dragging = false, collapsed = false, onToggle, onEdit, onDelete, onMove }) => {
  const tone = priorityStyle[activity.priority];
  const progress = visualProgress(activity);
  const detail = activity.description.trim() || activity.source;
  const leadership = activity.origin === 'leadership';

  return (
    <article className={cn(
      'group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] select-none transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.09)]',
      leadership && 'border-l-4 border-l-[#6B33F6]',
      dragging && 'z-50 shadow-[0_16px_36px_rgba(15,23,42,0.12)]',
    )}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 title={activity.title} className="text-lg font-bold leading-6 text-gray-800">{activity.title}</h3>
          <span className="flex shrink-0 items-center">
            {onToggle ? (
              <button
                type="button"
                aria-label={collapsed ? `Expandir ${activity.title}` : `Minimizar ${activity.title}`}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onToggle}
              >
                {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            ) : null}
            {onEdit && onDelete ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Ações de ${activity.title}`}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
                  {onMove ? (
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
                  ) : null}
                  <DropdownMenuItem variant="destructive" onSelect={onDelete}>Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </span>
        </div>

        {collapsed ? null : (
          <>
            {detail ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-500">{detail}</p> : null}

            <div className="mt-5 flex flex-wrap gap-2">
              {leadership && missionChannel(activity) ? <span className="rounded-full bg-[#EDE7FE] px-3 py-1 text-xs font-semibold text-[#4600F3]">{CHANNEL_LABEL[missionChannel(activity)!]}</span> : null}
              {leadership ? <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">Missão</span> : null}
              <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', tone.pill)}>
                <Flag className={cn('h-3 w-3', tone.icon)} />
                {PRIORITY_LABEL[activity.priority]}
              </span>
            </div>

            <div className="my-5 border-t border-gray-100" />

            <div className="flex items-center justify-between text-sm">
              <div className="flex min-w-0 items-center gap-2 text-gray-500">
                <CalendarDays className="h-[15px] w-[15px] shrink-0" />
                <span className="truncate">{cardDate(activity)}</span>
              </div>
              <span className="font-semibold text-gray-700">{progress}%</span>
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-200">
              <div className={cn('h-full rounded-full transition-all duration-700', progressColor(progress))} style={{ width: `${progress}%` }} />
            </div>

            {progress === 100 ? (
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-[#4600F3]">
                <CheckCircle className="h-4 w-4" />
                Atividade concluída
              </div>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
};

export const SortableActivityCard: FC<{
  activity: Activity;
  collapsed?: boolean;
  canMove?: boolean;
  onToggle?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (status: ActivityStatus) => void;
}> = ({ activity, collapsed, canMove = true, onToggle, onEdit, onDelete, onMove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id, disabled: !canMove });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn('w-full', canMove && 'cursor-grab touch-none active:cursor-grabbing', isDragging && 'opacity-40')} {...attributes} {...(canMove ? listeners : {})}>
      <ActivityCardView activity={activity} collapsed={collapsed} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onMove={canMove ? onMove : undefined} />
    </div>
  );
};
