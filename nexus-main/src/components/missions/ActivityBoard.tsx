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
import { Plus, Star, User } from 'lucide-react';

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

  const leadershipCount = activities.filter((activity) => activity.origin === 'leadership').length;
  const scoped = activities.filter((activity) => (tab === 'leadership' ? activity.origin === 'leadership' : activity.origin === 'mine'));
  const scopedDone = scoped.filter((item) => item.status === 'done').length;
  const scopedProgress = scoped.filter((item) => item.status === 'in_progress').length;
  const scopedOverdue = scoped.filter((item) => isOverdue(item)).length;

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
    <div className="space-y-8">
      <section className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-700">
          Quadro de atividades
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-gray-800">Atividades</h1>
        <p className="max-w-2xl text-base leading-7 text-gray-500">
          Organize as atividades por status, acompanhe o progresso e mova o trabalho pelo quadro.
        </p>
        <p className="text-sm text-gray-500">
          {scoped.length} atividades · {scopedDone} concluídas · {scopedProgress} em andamento · {scopedOverdue} atrasadas
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => showTab('mine')}
            className={cn('inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors', tab === 'mine' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600')}
          >
            <User className="h-4 w-4" /> Minhas atividades
          </button>
          <button
            type="button"
            onClick={() => showTab('leadership')}
            className={cn('inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors', tab === 'leadership' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600')}
          >
            <Star className="h-4 w-4" /> Missões da liderança
            <span className={cn('grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]', tab === 'leadership' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700')}>{leadershipCount}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => openCreate('todo')}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Nova atividade
        </button>
      </div>

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
