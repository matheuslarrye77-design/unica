import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, Check, ChevronDown, ChevronUp, Mail, MoreHorizontal, User, Users } from 'lucide-react';
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
  ORIGIN_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  formatDueDate,
  type Activity,
  type ActivityStatus,
} from '@/data/activities';
import { cn } from '@/lib/utils';

const priorityClass: Record<Activity['priority'], string> = {
  high: 'bg-[#FCE7F3] text-[#BE185D]',
  medium: 'bg-[#EDE9FE] text-[#3600C2]',
  low: 'bg-[#E0E7FF] text-[#4600F3]',
};

function SourceIcon({ source }: { source: string }) {
  if (source === 'E-mail') return <Mail className="h-3 w-3" />;
  if (source.startsWith('Equipe')) return <Users className="h-3 w-3" />;
  return <User className="h-3 w-3" />;
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
  const when = formatDueDate(done ? activity.completedOn ?? activity.dueDate : activity.dueDate);
  const leadership = activity.origin === 'leadership';

  return (
    <article className={cn('relative overflow-hidden rounded-[22px] px-4 py-3', dragging && 'opacity-40')}>
      <img src="/cards/fundo-claro.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/40 via-white/16 to-transparent" />
      <div className="relative flex items-center gap-1.5">
        {leadership ? <img src="/atividades/alfinete.png" alt="" className="h-5 w-5 shrink-0 object-contain" /> : null}
        <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-light', leadership ? 'bg-[#F3EFFF] text-[#3600C2]' : 'bg-[#F3EFFF] text-[#4600F3]')}>
          {ORIGIN_LABEL[activity.origin]}
        </span>
        {onToggle ? (
          <button
            type="button"
            aria-label={collapsed ? `Expandir ${activity.title}` : `Minimizar ${activity.title}`}
            className="rounded-md p-0.5 text-[#B7A8C4] hover:bg-white/70"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onToggle}
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        ) : null}
        {onEdit && onDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Ações de ${activity.title}`}
                className="ml-auto rounded-md p-0.5 text-[#B7A8C4] hover:bg-[#F8F2FB]"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
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
        ) : <span className="ml-auto" />}
      </div>
      <h3 title={activity.title} className="relative mt-2 line-clamp-2 text-[15px] font-light leading-snug text-[#2C2438]">{activity.title}</h3>
      {collapsed ? null : (
      <div className="relative">
      <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[12px] font-extralight text-[#5C5168]">
        <SourceIcon source={activity.source} />
        <span className="truncate">{activity.source}</span>
      </p>
      <div className="mt-2 flex items-end gap-2">
        {when ? (
          <p className="flex min-w-0 items-center gap-1 text-[11px] font-extralight text-[#5C5168]">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span className="truncate">{done ? `Concluída em: ${when}` : `Prazo: ${when}`}</span>
          </p>
        ) : <span />}
        {done ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-[#D1FAE5] px-1.5 py-0.5 text-[10px] font-light text-[#047857]">
            <Check className="h-3 w-3" strokeWidth={1.5} /> Concluída
          </span>
        ) : (
          <span className={cn('ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-light', priorityClass[activity.priority])}>
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
