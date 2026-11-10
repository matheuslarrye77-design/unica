import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, Check, ChevronDown, ChevronUp, Clock, Mail, MoreHorizontal, Star, User, Users } from 'lucide-react';
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
  type Activity,
  type ActivityStatus,
} from '@/data/activities';
import { cn } from '@/lib/utils';

const priorityTone: Record<Activity['priority'], { dot: string; text: string }> = {
  high: { dot: 'bg-[#E25B84]', text: 'text-[#C43B68]' },
  medium: { dot: 'bg-[#4C7BD9]', text: 'text-[#3E68C4]' },
  low: { dot: 'bg-[#A4A8B5]', text: 'text-[#777987]' },
};

function SourceIcon({ source }: { source: string }) {
  if (source === 'E-mail') return <Mail className="h-3 w-3 shrink-0" strokeWidth={1.6} />;
  if (source.startsWith('Equipe')) return <Users className="h-3 w-3 shrink-0" strokeWidth={1.6} />;
  return <User className="h-3 w-3 shrink-0" strokeWidth={1.6} />;
}

function shortDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
}

function isOverdue(activity: Activity) {
  if (activity.status === 'done' || !activity.dueDate) return false;
  return activity.dueDate < new Date().toISOString().slice(0, 10);
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
  const done = activity.status === 'done';
  const overdue = isOverdue(activity);
  const when = shortDate(done ? activity.completedOn ?? activity.dueDate : activity.dueDate);
  const leadership = activity.origin === 'leadership';
  const priority = priorityTone[activity.priority];
  const whenLabel = done ? `Concluída em ${when}` : overdue ? `Prazo atrasado: ${when}` : `Prazo: ${when}`;

  return (
    <article className={cn(
      'relative overflow-hidden rounded-[9px] border border-[rgba(45,40,70,0.09)] bg-white px-3 py-2.5 shadow-[0_2px_7px_rgba(40,35,65,0.035)] transition-shadow duration-[180ms] hover:shadow-[0_3px_10px_rgba(40,35,65,0.05)]',
      dragging && 'opacity-40',
    )}>
      <div className="flex items-center gap-1.5">
        {leadership ? <Star className="h-3 w-3 shrink-0 text-[#8878D6]" strokeWidth={1.6} /> : null}
        <span className="min-w-0 truncate text-[11px] font-normal text-[#777987]">{activity.category}</span>
        <span className="ml-auto flex items-center">
        {onToggle ? (
          <button
            type="button"
            aria-label={collapsed ? `Expandir ${activity.title}` : `Minimizar ${activity.title}`}
            className="rounded-[6px] p-0.5 text-[#9A96A8] hover:bg-[#F4F2FB] hover:text-[#252631]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onToggle}
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.6} /> : <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.6} />}
          </button>
        ) : null}
        {onEdit && onDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Ações de ${activity.title}`}
                className="ml-auto rounded-[6px] p-0.5 text-[#9A96A8] hover:bg-[#F4F2FB] hover:text-[#252631]"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.6} />
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
      <h3 title={activity.title} className="mt-1.5 line-clamp-2 text-[13.5px] font-medium leading-snug tracking-[-0.01em] text-[#252631]">{activity.title}</h3>
      {collapsed ? null : (
        <div>
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12px] font-normal text-[#777987]">
            <SourceIcon source={activity.source} />
            <span className="truncate">{activity.source}</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            {when ? (
              <p title={whenLabel} className={cn('flex min-w-0 items-center gap-1 text-[11.5px] font-normal', overdue ? 'text-[#D97706]' : 'text-[#777987]')}>
                {overdue ? <Clock className="h-3 w-3 shrink-0" strokeWidth={1.6} /> : <CalendarDays className="h-3 w-3 shrink-0" strokeWidth={1.6} />}
                <span className="truncate">{when}</span>
              </p>
            ) : <span />}
            {done ? (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-normal text-[#2F8F62]">
                <Check className="h-3 w-3" strokeWidth={1.7} /> Concluída
              </span>
            ) : (
              <span className={cn('ml-auto inline-flex shrink-0 items-center gap-1.5 text-[11px] font-normal', priority.text)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', priority.dot)} />
                {PRIORITY_LABEL[activity.priority]}
              </span>
            )}
          </div>
        </div>
      )}
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
    <div ref={setNodeRef} style={style} className={cn('w-full', canMove && 'cursor-grab touch-none active:cursor-grabbing')} {...attributes} {...(canMove ? listeners : {})}>
      <ActivityCardView activity={activity} dragging={isDragging} collapsed={collapsed} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onMove={canMove ? onMove : undefined} />
    </div>
  );
};
