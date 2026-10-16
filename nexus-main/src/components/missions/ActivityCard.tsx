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
  high: 'bg-[#FFD0E6] text-[#E2186A]',
  medium: 'bg-[#FFE56A] text-[#C45A00]',
  low: 'bg-[#7AF0CC] text-[#0B8A68]',
};

function SourceIcon({ source }: { source: string }) {
  if (source === 'E-mail') return <Mail className="h-3.5 w-3.5" />;
  if (source.startsWith('Equipe')) return <Users className="h-3.5 w-3.5" />;
  return <User className="h-3.5 w-3.5" />;
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
    <article className={cn('relative overflow-hidden rounded-2xl border bg-white px-3.5 py-3 shadow-[0_8px_22px_rgba(80,40,120,0.05)]', leadership ? 'border-[#E7C4F2] bg-[#F8EAFB]' : 'border-[#F0E7F6]', dragging && 'opacity-40')}>
      <div className="relative flex items-start gap-2">
        {leadership ? <img src="/atividades/alfinete.png" alt="" className="mt-0.5 h-8 w-8 shrink-0 object-contain" /> : null}
        <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium', leadership ? 'bg-white text-[#6A228C]' : 'bg-[#F3E4FA] text-[#8E35B8]')}>
          {ORIGIN_LABEL[activity.origin]}
        </span>
        {onToggle ? (
          <button
            type="button"
            aria-label={collapsed ? `Expandir ${activity.title}` : `Minimizar ${activity.title}`}
            className="rounded-md p-1 text-[#B7A8C4] hover:bg-white/70"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onToggle}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        ) : null}
        {onEdit && onDelete && onMove ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Ações de ${activity.title}`}
                className="ml-auto rounded-md p-1 text-[#B7A8C4] hover:bg-[#F8F2FB]"
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
        ) : <span className="ml-auto" />}
      </div>
      <h3 className="relative mt-2 text-[14.5px] font-semibold leading-snug text-[#2C2433]">{activity.title}</h3>
      {collapsed ? null : (
      <div className="relative">
      <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[#8A7C98]">
        <SourceIcon source={activity.source} />
        {activity.source}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        {when ? (
          <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-[#8A7C98]">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{done ? `Concluída em: ${when}` : `Prazo: ${when}`}</span>
          </p>
        ) : <span />}
        {done ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-[#7AF0CC] px-2 py-0.5 text-[11px] font-medium text-[#0B8A68]">
            <Check className="h-3 w-3" /> Concluída
          </span>
        ) : (
          <span className={cn('ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', priorityClass[activity.priority])}>
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
