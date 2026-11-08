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
    <section className="flex h-full flex-col rounded-2xl border border-[#EDE7FE] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(40,20,60,0.04)]">
      <h2 className="text-[12px] font-medium tracking-wide text-[#8A7C98]">Resumo da sua performance</h2>
      <div className="mt-4 grid place-items-center">
        <div className="relative h-[112px] w-[112px]">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#F3EEFF" strokeWidth="10" />
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
            <p className="text-[24px] font-medium tabular-nums leading-none text-[#2C2433]">{rate}%</p>
            <p className="mt-1 text-[10px] font-medium tracking-wide text-[#8A7C98]">concluído</p>
          </div>
        </div>
      </div>
      <ul className="mt-4 grid gap-2.5 text-[12px] text-[#5C5168]">
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#2C2433]" />Atividades</span>
          <strong className="font-medium tabular-nums text-[#2C2433]">{total}</strong>
        </li>
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#4600F3]" />Concluídas</span>
          <strong className="font-medium tabular-nums text-[#2C2433]">{done}</strong>
        </li>
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#8A5CF8]" />Em andamento</span>
          <strong className="font-medium tabular-nums text-[#2C2433]">{progress}</strong>
        </li>
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#FB7185]" />Atrasadas</span>
          <strong className="font-medium tabular-nums text-[#2C2433]">{overdue}</strong>
        </li>
      </ul>
    </section>
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EDE7FE] text-[#4600F3]">
            <Check className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <div>
            <h1 className="text-[22px] font-medium leading-tight tracking-tight text-[#2C2433]">Atividades</h1>
            <p className="mt-0.5 text-[12px] font-normal text-[#8A7C98]">Organize suas atividades pessoais e acompanhe as missões da liderança.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-w-0 flex-col items-stretch gap-3 lg:flex-row">
        <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDE6F3]">
        <div className="flex gap-5">
          <button
            type="button"
            onClick={() => showTab('mine')}
            className={cn('inline-flex items-center gap-1.5 border-b-2 pb-2 text-[12.5px] font-medium', tab === 'mine' ? 'border-[#4600F3] text-[#3600C2]' : 'border-transparent text-[#8A7C98]')}
          >
            <User className="h-3.5 w-3.5" /> Minhas atividades
          </button>
          <button
            type="button"
            onClick={() => showTab('leadership')}
            className={cn('inline-flex items-center gap-1.5 border-b-2 pb-2 text-[12.5px] font-medium', tab === 'leadership' ? 'border-[#4600F3] text-[#3600C2]' : 'border-transparent text-[#8A7C98]')}
          >
            <Star className="h-3.5 w-3.5" /> Missões da liderança
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#EDE7FE] px-1 text-[10px] font-semibold text-[#4600F3]">{leadershipCount}</span>
          </button>
        </div>
        <Button type="button" onClick={() => openCreate('todo')} className="mb-2 h-9 rounded-full bg-[#4600F3] px-3.5 text-[13px] hover:bg-[#3600C2]">
          <Plus /> Nova atividade
        </Button>
      </div>

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <div className="mt-4 grid h-full min-w-0 grid-cols-1 items-stretch gap-2.5 md:grid-cols-3">
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
        </div>

        <aside className="w-full shrink-0 lg:w-[280px] lg:self-stretch">
          <PerformanceChart activities={scoped} />
        </aside>
      </div>

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
