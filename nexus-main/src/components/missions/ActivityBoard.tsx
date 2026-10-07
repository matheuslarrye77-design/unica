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
import { Plus, Search } from 'lucide-react';
import { type FC, useEffect, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ACTIVITY_ASSIGNEES,
  ACTIVITY_STATUSES,
  PRIORITY_LABEL,
  activitiesInStatus,
  activityCountLabel,
  createActivity,
  isActivityStatus,
  loadActivityStore,
  moveActivity,
  removeActivity,
  saveActivityStore,
  updateActivity,
  type Activity,
  type ActivityDraft,
  type ActivityPriority,
  type ActivityStatus,
} from '@/data/activities';
import { ActivityCardView } from './ActivityCard';
import { ActivityColumn } from './ActivityColumn';
import { ActivityDialog } from './ActivityDialog';

const priorities: ActivityPriority[] = ['high', 'medium', 'low'];

export const ActivityBoard: FC = () => {
  const [store] = useState(loadActivityStore);
  const [activities, setActivities] = useState<Activity[]>(store.activities);
  const [categories, setCategories] = useState<string[]>(store.categories);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<'all' | ActivityPriority>('all');
  const [assignee, setAssignee] = useState('all');
  const [category, setCategory] = useState('all');
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

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return activities.filter((activity) => {
      const matchesTerm = !term || activity.title.toLowerCase().includes(term) || activity.description.toLowerCase().includes(term);
      const matchesPriority = priority === 'all' || activity.priority === priority;
      const matchesAssignee = assignee === 'all' || activity.assignee === assignee;
      const matchesCategory = category === 'all' || activity.category === category;
      return matchesTerm && matchesPriority && matchesAssignee && matchesCategory;
    });
  }, [activities, query, priority, assignee, category]);

  function columns(status: ActivityStatus) {
    return activitiesInStatus(visible, status);
  }

  function onDragStart(event: DragStartEvent) {
    setDragging(activities.find((activity) => activity.id === String(event.active.id)) ?? null);
  }

  function onDragOver(event: DragOverEvent) {
    const overId = event.over ? String(event.over.id) : '';
    const activeId = String(event.active.id);
    if (!overId || activeId === overId) return;
    setActivities((current) => {
      const active = current.find((activity) => activity.id === activeId);
      const overStatus = isActivityStatus(overId) ? overId : current.find((activity) => activity.id === overId)?.status;
      if (!active || !overStatus || active.status === overStatus) return current;
      return moveActivity(current, activeId, overId);
    });
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const overId = event.over ? String(event.over.id) : '';
    if (!overId) return;
    setActivities((current) => moveActivity(current, String(event.active.id), overId));
  }

  function openCreate(status: ActivityStatus) {
    setEditing(null);
    setCreateStatus(status);
    setDialogOpen(true);
  }

  function submit(draft: ActivityDraft) {
    setCategories((current) => current.includes(draft.category) ? current : [...current, draft.category]);
    if (editing) {
      setActivities((current) => updateActivity(current, editing.id, draft));
    } else {
      setActivities((current) => createActivity(current, { ...draft, status: createStatus }));
    }
    setDialogOpen(false);
    setEditing(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Missões</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organize, acompanhe e conclua suas atividades.</p>
        </div>
        <Button onClick={() => openCreate('todo')}>
          <Plus /> Nova atividade
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar atividades..." className="pl-9" />
        </div>
        <Select value={priority} onValueChange={(value) => setPriority(value as 'all' | ActivityPriority)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {priorities.map((item) => <SelectItem key={item} value={item}>{PRIORITY_LABEL[item]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {ACTIVITY_ASSIGNEES.map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">{activityCountLabel(visible.length)}</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
          {ACTIVITY_STATUSES.map((status) => (
            <ActivityColumn
              key={status}
              status={status}
              activities={columns(status)}
              onCreate={() => openCreate(status)}
              onEdit={(activity) => { setEditing(activity); setDialogOpen(true); }}
              onDelete={setPendingDelete}
              onMove={(activity, next) => setActivities((current) => moveActivity(current, activity.id, next))}
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
