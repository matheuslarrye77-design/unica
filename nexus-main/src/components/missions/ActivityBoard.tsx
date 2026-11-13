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
import { Plus, Star } from 'lucide-react';

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
import {
  ACTIVITY_STATUSES,
  activitiesInStatus,
  createActivity,
  isActivityStatus,
  canSeeMission,
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

  const allowed = activities.filter(canSeeMission);
  const leadershipCount = allowed.filter((activity) => activity.origin === 'leadership').length;
  const scoped = allowed.filter((activity) => (tab === 'leadership' ? activity.origin === 'leadership' : true));
  const scopedDone = scoped.filter((item) => item.status === 'done').length;
  const scopedProgress = scoped.filter((item) => item.status === 'in_progress').length;
  const scopedOverdue = scoped.filter((item) => isOverdue(item)).length;

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return allowed.filter((activity) => {
      const matchesTab = tab === 'mine' || activity.origin === 'leadership';
      const matchesTerm = !term || activity.title.toLowerCase().includes(term) || activity.description.toLowerCase().includes(term) || activity.source.toLowerCase().includes(term);
      return matchesTab && matchesTerm;
    });
  }, [allowed, query, tab]);

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
    <div className="space-y-8">
      <section className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold tracking-tight text-gray-800">Atividades</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-500">
            Organize as atividades por status, acompanhe o progresso e mova o trabalho pelo quadro.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            {scoped.length} atividades · {scopedDone} concluídas · {scopedProgress} em andamento · {scopedOverdue} atrasadas
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-pressed={tab === 'leadership'}
            aria-label="Missões da liderança"
            title="Missões da liderança"
            onClick={() => showTab(tab === 'leadership' ? 'mine' : 'leadership')}
            className={cn('relative grid h-11 w-11 place-items-center rounded-2xl', tab === 'leadership' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-blue-600')}
          >
            <Star className="h-4 w-4" />
            <span className={cn('absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold', tab === 'leadership' ? 'bg-white text-blue-600' : 'bg-[#DB2777] text-white')}>{leadershipCount}</span>
          </button>
          <button
            type="button"
            onClick={() => openCreate('todo')}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" /> Nova atividade
          </button>
        </div>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-3">
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
        leadership={editing ? editing.origin === 'leadership' : tab === 'leadership'}
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
