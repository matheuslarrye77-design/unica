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
  medium: 'bg-[#EDE9FE] text-[#6D28D9]',
  low: 'bg-[#E0E7FF] text-[#4338CA]',
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
    <article className={cn('relative h-[128px] overflow-hidden rounded-xl border border-[#F3EEF6] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(40,20,60,0.04)]', dragging && 'opacity-40')}>
      <div className="relative flex items-center gap-1.5">
        {leadership ? <img src="/atividades/alfinete.png" alt="" className="h-5 w-5 shrink-0 object-contain" /> : null}
        <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', leadership ? 'bg-[#F6EEFB] text-[#6A228C]' : 'bg-[#F6EEFB] text-[#8E35B8]')}>
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
        {onEdit && onDelete && onMove ? (
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
        ) : <span className="ml-auto" />}
      </div>
      <h3 title={activity.title} className="relative mt-1.5 line-clamp-2 h-[2.6em] text-[13px] font-semibold leading-snug text-[#2C2433]">{activity.title}</h3>
      {collapsed ? null : (
      <div className="relative">
      <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11.5px] font-normal text-[#8A7C98]">
        <SourceIcon source={activity.source} />
        <span className="truncate">{activity.source}</span>
      </p>
      <div className="mt-2 flex items-center gap-2">
        {when ? (
          <p className="flex min-w-0 items-center gap-1 text-[11px] font-normal text-[#8A7C98]">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span className="truncate">{done ? `Concluída em: ${when}` : `Prazo: ${when}`}</span>
          </p>
        ) : <span />}
        {done ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-[#D1FAE5] px-1.5 py-0.5 text-[10px] font-medium text-[#047857]">
            <Check className="h-3 w-3" /> Concluída
          </span>
        ) : (
          <span className={cn('ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium', priorityClass[activity.priority])}>
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
  onToggle?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (status: ActivityStatus) => void;
}> = ({ activity, collapsed, onToggle, onEdit, onDelete, onMove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="cursor-grab touch-none active:cursor-grabbing" {...attributes} {...listeners}>
      <ActivityCardView activity={activity} dragging={isDragging} collapsed={collapsed} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
    </div>
  );
};
