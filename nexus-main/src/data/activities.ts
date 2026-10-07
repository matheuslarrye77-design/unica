import { generateId } from '@/lib/utils';

export type ActivityStatus = 'todo' | 'in_progress' | 'done';
export type ActivityPriority = 'high' | 'medium' | 'low';

export type Activity = {
  id: string;
  title: string;
  description: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  category: string;
  assignee: string;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type ActivityDraft = {
  title: string;
  description: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  category: string;
  assignee: string;
  dueDate: string | null;
};

export const ACTIVITY_STATUSES: ActivityStatus[] = ['todo', 'in_progress', 'done'];

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  done: 'Concluídas',
};

export const PRIORITY_LABEL: Record<ActivityPriority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export const ACTIVITY_ASSIGNEES = [
  'João Ferreira',
  'Ana Santos',
  'Helena Duarte',
  'Marina Costa',
  'Lívia Ramos',
  'Caio Mendes',
  'Matheus Larrie',
];

export const DEFAULT_CATEGORIES = [
  'Marketing',
  'Institucional',
  'Eventos',
  'Comunicação',
  'Acadêmico',
  'Tecnologia',
];

const STORAGE_KEY = 'unica-activities';

const stamp = '2026-10-01T12:00:00.000Z';

function seedActivity(
  partial: Omit<Activity, 'createdAt' | 'updatedAt' | 'position'> & { position: number },
): Activity {
  return { ...partial, createdAt: stamp, updatedAt: stamp };
}

export const seedActivities: Activity[] = [
  seedActivity({
    id: 'act-campanha',
    title: 'Criar campanha de matrícula',
    description: 'Planejar campanha de divulgação para o próximo período letivo.',
    status: 'todo',
    priority: 'high',
    category: 'Marketing',
    assignee: 'João Ferreira',
    dueDate: '2026-10-15',
    position: 0,
  }),
  seedActivity({
    id: 'act-material',
    title: 'Revisar material institucional',
    description: 'Conferir textos e peças da identidade visual.',
    status: 'todo',
    priority: 'medium',
    category: 'Institucional',
    assignee: 'Ana Santos',
    dueDate: null,
    position: 1,
  }),
  seedActivity({
    id: 'act-eventos',
    title: 'Atualizar página de eventos',
    description: 'Incluir a agenda do semestre no site.',
    status: 'todo',
    priority: 'low',
    category: 'Eventos',
    assignee: 'Lívia Ramos',
    dueDate: '2026-10-20',
    position: 2,
  }),
  seedActivity({
    id: 'act-pagina',
    title: 'Desenvolver nova página',
    description: 'Montar a página de cursos da unidade.',
    status: 'in_progress',
    priority: 'high',
    category: 'Comunicação',
    assignee: 'Marina Costa',
    dueDate: null,
    position: 0,
  }),
  seedActivity({
    id: 'act-integracao',
    title: 'Configurar integração',
    description: 'Ligar o calendário acadêmico ao feed.',
    status: 'in_progress',
    priority: 'medium',
    category: 'Tecnologia',
    assignee: 'Caio Mendes',
    dueDate: '2026-10-18',
    position: 1,
  }),
  seedActivity({
    id: 'act-comunicado',
    title: 'Publicar comunicado',
    description: 'Divulgar a campanha de endomarketing.',
    status: 'done',
    priority: 'medium',
    category: 'Comunicação',
    assignee: 'Helena Duarte',
    dueDate: null,
    position: 0,
  }),
  seedActivity({
    id: 'act-calendario',
    title: 'Revisar calendário acadêmico',
    description: 'Validar feriados e recessos do semestre.',
    status: 'done',
    priority: 'low',
    category: 'Acadêmico',
    assignee: 'Matheus Larrie',
    dueDate: null,
    position: 1,
  }),
];

export type ActivityStore = {
  activities: Activity[];
  categories: string[];
};

export function isActivityStatus(value: string): value is ActivityStatus {
  return value === 'todo' || value === 'in_progress' || value === 'done';
}

function isActivity(value: unknown): value is Activity {
  if (!value || typeof value !== 'object') return false;
  const item = value as Activity;
  return typeof item.id === 'string'
    && typeof item.title === 'string'
    && typeof item.description === 'string'
    && isActivityStatus(item.status)
    && (item.priority === 'high' || item.priority === 'medium' || item.priority === 'low')
    && typeof item.category === 'string'
    && typeof item.assignee === 'string'
    && typeof item.position === 'number';
}

export function loadActivityStore(): ActivityStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activities: seedActivities, categories: DEFAULT_CATEGORIES };
    const parsed = JSON.parse(raw) as ActivityStore;
    if (!Array.isArray(parsed.activities) || !parsed.activities.every(isActivity)) {
      return { activities: seedActivities, categories: DEFAULT_CATEGORIES };
    }
    const categories = Array.isArray(parsed.categories)
      ? parsed.categories.filter((item) => typeof item === 'string' && item.trim())
      : DEFAULT_CATEGORIES;
    return {
      activities: parsed.activities,
      categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES,
    };
  } catch {
    return { activities: seedActivities, categories: DEFAULT_CATEGORIES };
  }
}

export function saveActivityStore(store: ActivityStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function activitiesInStatus(activities: Activity[], status: ActivityStatus) {
  return activities.filter((item) => item.status === status).sort((a, b) => a.position - b.position);
}

export function firstName(name: string) {
  return name.split(' ')[0] ?? name;
}

const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

export function formatDueDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function activityCountLabel(count: number) {
  return count === 1 ? '1 atividade' : `${count} atividades`;
}

function reorder<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  const [item] = next.splice(from, 1);
  if (!item) return items;
  next.splice(to, 0, item);
  return next;
}

function reindex(items: Activity[], status: ActivityStatus, updatedId?: string) {
  const now = new Date().toISOString();
  return items.map((item, position) => ({
    ...item,
    status,
    position,
    updatedAt: item.id === updatedId ? now : item.updatedAt,
  }));
}

export function moveActivity(activities: Activity[], activeId: string, overId: string): Activity[] {
  const active = activities.find((item) => item.id === activeId);
  if (!active) return activities;
  const overStatus = isActivityStatus(overId)
    ? overId
    : activities.find((item) => item.id === overId)?.status;
  if (!overStatus) return activities;

  if (active.status === overStatus) {
    if (isActivityStatus(overId)) return activities;
    const ordered = activitiesInStatus(activities, active.status);
    const oldIndex = ordered.findIndex((item) => item.id === activeId);
    const newIndex = ordered.findIndex((item) => item.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return activities;
    const next = new Map(activities.map((item) => [item.id, item]));
    reindex(reorder(ordered, oldIndex, newIndex), overStatus, activeId).forEach((item) => next.set(item.id, item));
    return activities.map((item) => next.get(item.id) ?? item);
  }

  const source = activitiesInStatus(activities, active.status).filter((item) => item.id !== activeId);
  const destination = activitiesInStatus(activities, overStatus);
  const moved: Activity = { ...active, status: overStatus };
  if (isActivityStatus(overId)) {
    destination.push(moved);
  } else {
    const index = destination.findIndex((item) => item.id === overId);
    destination.splice(index < 0 ? destination.length : index, 0, moved);
  }

  const next = new Map(activities.map((item) => [item.id, item]));
  reindex(source, active.status).forEach((item) => next.set(item.id, item));
  reindex(destination, overStatus, activeId).forEach((item) => next.set(item.id, item));
  return activities.map((item) => next.get(item.id) ?? item);
}

export function createActivity(activities: Activity[], draft: ActivityDraft): Activity[] {
  const column = activitiesInStatus(activities, draft.status);
  const now = new Date().toISOString();
  const activity: Activity = {
    id: generateId(),
    title: draft.title.trim(),
    description: draft.description.trim(),
    status: draft.status,
    priority: draft.priority,
    category: draft.category.trim(),
    assignee: draft.assignee,
    dueDate: draft.dueDate,
    position: column.length,
    createdAt: now,
    updatedAt: now,
  };
  return [...activities, activity];
}

export function updateActivity(activities: Activity[], id: string, draft: ActivityDraft): Activity[] {
  const current = activities.find((item) => item.id === id);
  if (!current) return activities;
  if (current.status !== draft.status) {
    const moved = moveActivity(activities, id, draft.status);
    return moved.map((item) => item.id === id
      ? {
          ...item,
          title: draft.title.trim(),
          description: draft.description.trim(),
          priority: draft.priority,
          category: draft.category.trim(),
          assignee: draft.assignee,
          dueDate: draft.dueDate,
          updatedAt: new Date().toISOString(),
        }
      : item);
  }
  return activities.map((item) => item.id === id
    ? {
        ...item,
        title: draft.title.trim(),
        description: draft.description.trim(),
        priority: draft.priority,
        category: draft.category.trim(),
        assignee: draft.assignee,
        dueDate: draft.dueDate,
        updatedAt: new Date().toISOString(),
      }
    : item);
}

export function removeActivity(activities: Activity[], id: string): Activity[] {
  const current = activities.find((item) => item.id === id);
  if (!current) return activities;
  const remaining = activities.filter((item) => item.id !== id);
  const column = reindex(activitiesInStatus(remaining, current.status), current.status);
  const next = new Map(remaining.map((item) => [item.id, item]));
  column.forEach((item) => next.set(item.id, item));
  return remaining.map((item) => next.get(item.id) ?? item);
}
