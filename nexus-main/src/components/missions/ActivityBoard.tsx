import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Check, Plus, Star, User } from 'lucide-react';
import { usePageSearch } from '@/lib/pageSearch';
import { useInstitution } from '@/lib/institution';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  ACTIVITY_STATUSES,
  activitiesInStatus,
  createActivity,
  isActivityStatus,
  loadActivityStore,
  moveActivity,
  removeActivity,
  saveActivityStore,
  updateActivity,
  type Activity,
  type ActivityDraft,
  type ActivityStatus,
} from '@/data/activities';
import { cn } from '@/lib/utils';
import { ActivityCardView } from './ActivityCard';
import { ActivityColumn } from './ActivityColumn';
import { ActivityDialog } from './ActivityDialog';

function isOverdue(activity: Activity) {
  if (activity.status === 'done' || !activity.dueDate) return false;
  return activity.dueDate < new Date().toISOString().slice(0, 10);
}

function PerformanceChart({ activities }: { activities: Activity[] }) {
  const total = activities.length;
  const done = activities.filter((item) => item.status === 'done').length;
  const progress = activities.filter((item) => item.status === 'in_progress').length;
  const overdue = activities.filter((item) => isOverdue(item)).length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (rate / 100) * circumference;

  return (
    <div className="group relative shrink-0">
      <div className="relative h-[108px] w-[108px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(70,0,243,0.12)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#4600F3"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-[stroke-dasharray] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[22px] font-light tabular-nums leading-none text-[#2C2433]">{rate}%</p>
          <p className="mt-1 text-[10px] font-extralight tracking-wide text-[#5C5168]">concluídas</p>
        </div>
      </div>
      <div className="pointer-events-none absolute top-1/2 right-[calc(100%+12px)] z-20 w-44 -translate-y-1/2 rounded-xl border border-[#EDE7FE] bg-white/95 px-3 py-2 opacity-0 shadow-[0_8px_24px_rgba(70,0,243,0.12)] transition-opacity duration-150 group-hover:opacity-100">
        <ul className="grid gap-1.5 text-[11px] font-light text-[#5C5168]">
          <li className="flex items-center justify-between gap-3"><span>Atividades</span><span className="tabular-nums text-[#2C2433]">{total}</span></li>
          <li className="flex items-center justify-between gap-3"><span>Concluídas</span><span className="tabular-nums text-[#2C2433]">{done}</span></li>
          <li className="flex items-center justify-between gap-3"><span>Em andamento</span><span className="tabular-nums text-[#2C2433]">{progress}</span></li>
          <li className="flex items-center justify-between gap-3"><span>Atrasadas</span><span className="tabular-nums text-[#2C2433]">{overdue}</span></li>
        </ul>
      </div>
    </div>
  );
}

export const ActivityBoard: FC = () => {
  const [params, setParams] = useSearchParams();
  const { isLeader: gestao } = useInstitution();
  const tab = params.get('painel') === 'missoes' ? 'leadership' : 'mine';
  const [store] = useState(loadActivityStore);
  const [activities, setActivities] = useState<Activity[]>(store.activities);
  const [categories, setCategories] = useState<string[]>(store.categories);
  const { query } = usePageSearch();
  const [dragging, setDragging] = useState<Activity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [createStatus, setCreateStatus] = useState<ActivityStatus>('todo');
  const [pendingDelete, setPendingDelete] = useState<Activity | null>(null);

  useEffect(() => {
    saveActivityStore({ activities, categories });
  }, [activities, categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const leadershipCount = activities.filter((activity) => activity.origin === 'leadership').length;
  const scoped = activities.filter((activity) => (tab === 'leadership' ? activity.origin === 'leadership' : activity.origin === 'mine'));

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return activities.filter((activity) => {
      const matchesTab = tab === 'mine' || activity.origin === 'leadership';
      const matchesTerm = !term || activity.title.toLowerCase().includes(term) || activity.description.toLowerCase().includes(term) || activity.source.toLowerCase().includes(term);
      return matchesTab && matchesTerm;
    });
  }, [activities, query, tab]);

  function columns(status: ActivityStatus) {
    return activitiesInStatus(visible, status);
  }

  function onDragStart(event: DragStartEvent) {
    const active = activities.find((activity) => activity.id === String(event.active.id)) ?? null;
    if (!canMove(active ?? undefined)) {
      setDragging(null);
      return;
    }
    setDragging(active);
  }

  function canMove(activity: Activity | undefined) {
    if (!activity) return false;
    return activity.origin !== 'leadership' || gestao;
  }

  function onDragOver(event: DragOverEvent) {
    const overId = event.over ? String(event.over.id) : '';
    const activeId = String(event.active.id);
    if (!overId || activeId === overId) return;
    setActivities((current) => {
      const active = current.find((activity) => activity.id === activeId);
      if (!canMove(active)) return current;
      const overStatus = isActivityStatus(overId) ? overId : current.find((activity) => activity.id === overId)?.status;
      if (!active || !overStatus || active.status === overStatus) return current;
      return moveActivity(current, activeId, overId);
    });
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const overId = event.over ? String(event.over.id) : '';
    if (!overId) return;
    setActivities((current) => {
      const active = current.find((activity) => activity.id === String(event.active.id));
      if (!canMove(active)) return current;
      return moveActivity(current, String(event.active.id), overId);
    });
  }

  function openCreate(status: ActivityStatus) {
    setEditing(null);
    setCreateStatus(status);
    setDialogOpen(true);
  }

  function submit(draft: ActivityDraft) {
    const today = new Date().toISOString().slice(0, 10);
    const next: ActivityDraft = {
      ...draft,
      source: editing?.source ?? draft.source ?? 'Pessoal',
      origin: editing?.origin ?? (tab === 'leadership' ? 'leadership' : 'mine'),
      completedOn: (editing?.status ?? createStatus) === 'done' ? editing?.completedOn ?? today : editing?.completedOn ?? null,
    };
    setCategories((current) => current.includes(next.category) ? current : [...current, next.category]);
    if (editing) {
      setActivities((current) => updateActivity(current, editing.id, next));
    } else {
      setActivities((current) => createActivity(current, { ...next, status: createStatus }));
    }
    setDialogOpen(false);
    setEditing(null);
  }

  function showTab(next: 'mine' | 'leadership') {
    if (next === 'leadership') setParams({ painel: 'missoes' }, { replace: true });
    else setParams({}, { replace: true });
  }

  return (
    <div>
      <section className="relative overflow-visible rounded-[22px]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
          <img src="/atividades/banner.png" alt="" className="h-full w-full object-cover object-center" />
        </div>
        <div className="relative flex min-h-[148px] items-center justify-between gap-6 px-6 py-5 pr-10">
          <div className="flex min-w-0 max-w-[52%] items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/80 text-[#4600F3] shadow-sm">
              <Check className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h1 className="text-[22px] font-light leading-tight tracking-tight text-[#2C2433]">Atividades</h1>
              <p className="mt-1 text-[13px] font-extralight leading-snug text-[#5C5168]">Organize suas atividades pessoais e acompanhe seu progresso</p>
            </div>
          </div>
          <PerformanceChart activities={scoped} />
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#EDE6F3]">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => showTab('mine')}
            className={cn('inline-flex items-center gap-1.5 border-b-2 pb-2 text-[12.5px] font-light', tab === 'mine' ? 'border-[#4600F3] text-[#3600C2]' : 'border-transparent text-[#8A7C98]')}
          >
            <User className="h-3.5 w-3.5" strokeWidth={1.5} /> Minhas atividades
          </button>
          <button
            type="button"
            onClick={() => showTab('leadership')}
            className={cn('inline-flex items-center gap-1.5 border-b-2 pb-2 text-[12.5px] font-light', tab === 'leadership' ? 'border-[#4600F3] text-[#3600C2]' : 'border-transparent text-[#8A7C98]')}
          >
            <Star className="h-3.5 w-3.5" strokeWidth={1.5} /> Missões da liderança
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#EDE7FE] px-1 text-[10px] font-normal text-[#4600F3]">{leadershipCount}</span>
          </button>
        </div>
        <Button type="button" onClick={() => openCreate('todo')} className="mb-px h-9 rounded-full bg-[#4600F3] px-3.5 text-[13px] font-light hover:bg-[#3600C2]">
          <Plus strokeWidth={1.5} /> Nova atividade
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="mt-4 grid min-w-0 grid-cols-1 items-start gap-2.5 md:grid-cols-3">
          {ACTIVITY_STATUSES.map((status) => (
            <ActivityColumn
              key={status}
              status={status}
              activities={columns(status)}
              canMoveLeadership={gestao}
              onCreate={() => openCreate(status)}
              onEdit={(activity) => { setEditing(activity); setDialogOpen(true); }}
              onDelete={setPendingDelete}
              onMove={(activity, next) => {
                if (activity.origin === 'leadership' && !gestao) return;
                setActivities((current) => moveActivity(current, activity.id, next));
              }}
            />
          ))}
        </div>
        <DragOverlay>{dragging ? <ActivityCardView activity={dragging} /> : null}</DragOverlay>
      </DndContext>

      <ActivityDialog
        open={dialogOpen}
        mode={editing ? 'edit' : 'create'}
        activity={editing}
        status={createStatus}
        categories={categories}
        onOpenChange={setDialogOpen}
        onSubmit={submit}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `"${pendingDelete.title}" será removida do quadro.` : 'Esta atividade será removida do quadro.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingDelete) setActivities((current) => removeActivity(current, pendingDelete.id));
              setPendingDelete(null);
            }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
