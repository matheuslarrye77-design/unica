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
import { BarChart3, Check, Mail, Plus, Search, Star, Trophy, User, Users } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  ACTIVITY_STATUSES,
  PRIORITY_LABEL,
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

const fieldClass = 'h-10 rounded-full border-[#E7DFF0] bg-white px-4 text-[13px] shadow-none';

function SourceMark({ source }: { source: string }) {
  if (source === 'E-mail') return <Mail className="h-3.5 w-3.5" />;
  if (source.startsWith('Equipe')) return <Users className="h-3.5 w-3.5" />;
  return <User className="h-3.5 w-3.5" />;
}

export const ActivityBoard: FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('painel') === 'missoes' ? 'leadership' : 'mine';
  const [store] = useState(loadActivityStore);
  const [activities, setActivities] = useState<Activity[]>(store.activities);
  const [categories, setCategories] = useState<string[]>(store.categories);
  const [query, setQuery] = useState('');
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
  const activeMissions = activities.filter((activity) => activity.origin === 'leadership' && activity.status !== 'done');

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]">
            <Check className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div>
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#2C2433]">Atividades</h1>
            <p className="mt-0.5 text-[13.5px] text-[#8A7C98]">Organize suas atividades pessoais e acompanhe as missões da liderança.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-6 border-b border-[#EDE6F3]">
        <button
          type="button"
          onClick={() => showTab('mine')}
          className={cn('inline-flex items-center gap-2 border-b-2 pb-2.5 text-[14px] font-medium', tab === 'mine' ? 'border-[#8E35B8] text-[#6A228C]' : 'border-transparent text-[#8A7C98]')}
        >
          <User className="h-4 w-4" /> Minhas atividades
        </button>
        <button
          type="button"
          onClick={() => showTab('leadership')}
          className={cn('inline-flex items-center gap-2 border-b-2 pb-2.5 text-[14px] font-medium', tab === 'leadership' ? 'border-[#8E35B8] text-[#6A228C]' : 'border-transparent text-[#8A7C98]')}
        >
          <Star className="h-4 w-4" /> Missões da liderança
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#F3E4FA] px-1.5 text-[11px] font-semibold text-[#8E35B8]">{leadershipCount}</span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#B7A8C4]" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar atividades..." className={cn(fieldClass, 'pl-10')} />
        </div>
        <Button type="button" onClick={() => openCreate('todo')} className="ml-auto h-10 rounded-full bg-[#8E35B8] px-4 hover:bg-[#7A2CA0]">
          <Plus /> Nova atividade
        </Button>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
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

        <aside className="grid gap-3">
          <section className="rounded-[22px] border border-[#F0E7F6] bg-white p-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[#2C2433]">
              <BarChart3 className="h-4 w-4 text-[#8E35B8]" /> Resumo da sua performance
            </h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative grid h-[108px] w-[108px] shrink-0 place-items-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'conic-gradient(from 250deg, #8E35B8 0 87%, #F3E4FA 87% 100%)' }}
                />
                <div className="absolute inset-[11px] rounded-full bg-white" />
                <span className="relative text-[22px] font-semibold text-[#6A228C]">87%</span>
              </div>
              <ul className="grid gap-1.5 text-[12.5px] text-[#5C5168]">
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#8E35B8]" /> <strong className="font-semibold text-[#2C2433]">12</strong> Total de atividades</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#818CF8]" /> <strong className="font-semibold text-[#2C2433]">10</strong> Concluídas</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#7C3AED]" /> <strong className="font-semibold text-[#2C2433]">2</strong> Em andamento</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#DB2777]" /> <strong className="font-semibold text-[#2C2433]">0</strong> Atrasadas</li>
              </ul>
            </div>
            <p className="mt-2 text-center text-[12px] text-[#8A7C98]">Taxa de conclusão</p>
          </section>

          <section className="rounded-[22px] border border-[#F0E7F6] bg-white p-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[#2C2433]">
                <Star className="h-4 w-4 text-[#5C6B7A]" /> Missões ativas para você
              </h2>
              <button type="button" onClick={() => showTab('leadership')} className="text-[12.5px] font-medium text-[#8E35B8]">Ver todas</button>
            </div>
            <ul className="mt-3 grid gap-3">
              {activeMissions.map((mission) => (
                <li key={mission.id} className="flex items-start gap-2.5">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-[#5C6B7A]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-snug text-[#2C2433]">{mission.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#8A7C98]">
                      <SourceMark source={mission.source} /> {mission.source}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#F4F6F8] px-2 py-0.5 text-[11px] font-medium text-[#3E4C5E]">{PRIORITY_LABEL[mission.priority]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#F8EAFB] via-[#F3DDF8] to-[#E7C4F2] px-4 py-4">
            <div className="pointer-events-none absolute -right-6 -bottom-8 h-24 w-24 rounded-full bg-[#C084E0]/40" />
            <div className="relative flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-[#C47B12] shadow-sm">
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-[#6A228C]">Destaque do time</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-[#8A5AA0]">Juntos, alcançamos resultados incríveis!</p>
              </div>
            </div>
          </section>
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
