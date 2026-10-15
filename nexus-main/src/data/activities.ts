import { generateId } from '@/lib/utils';

export type ActivityStatus = 'todo' | 'in_progress' | 'done';
export type ActivityPriority = 'high' | 'medium' | 'low';

export type ActivityOrigin = 'mine' | 'leadership';

export type Activity = {
  id: string;
  title: string;
  description: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  category: string;
  source: string;
  origin: ActivityOrigin;
  assignee: string;
  dueDate: string | null;
  completedOn: string | null;
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
  source?: string;
  origin?: ActivityOrigin;
  assignee: string;
  dueDate: string | null;
  completedOn?: string | null;
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
  'Atendimento',
  'Documentação',
  'Estudos',
  'Relatórios',
  'Reuniões',
  'Qualidade',
];

export const ACTIVITY_SOURCES = ['Pessoal', 'E-mail', 'Equipe do Chat', 'Equipe do Atendimento'];

export const ORIGIN_LABEL: Record<ActivityOrigin, string> = {
  mine: 'Minha atividade',
  leadership: 'Missão da Liderança',
};

const STORAGE_KEY = 'unica-activities';
const VERSION_KEY = 'unica-activities-version';
const STORAGE_VERSION = 'foto-2026-10-15';

const stamp = '2026-10-01T12:00:00.000Z';

function seedActivity(
  partial: Omit<Activity, 'createdAt' | 'updatedAt' | 'position'> & { position: number },
): Activity {
  return { ...partial, createdAt: stamp, updatedAt: stamp };
}

export const seedActivities: Activity[] = [
  seedActivity({
    id: 'act-atendimento',
    title: 'Reduzir o tempo de atendimento para 4 minutos',
    description: 'Missão da liderança para encurtar o primeiro atendimento no chat.',
    status: 'todo',
    priority: 'high',
    category: 'Atendimento',
    source: 'Equipe do Chat',
    origin: 'leadership',
    assignee: 'Matheus Larrie',
    dueDate: '2026-10-31',
    completedOn: null,
    position: 0,
  }),
  seedActivity({
    id: 'act-documentacao',
    title: 'Finalizar documentação do projeto',
    description: 'Fechar a documentação pessoal do projeto em andamento.',
    status: 'todo',
    priority: 'medium',
    category: 'Documentação',
    source: 'Pessoal',
    origin: 'mine',
    assignee: 'Matheus Larrie',
    dueDate: '2026-10-18',
    completedOn: null,
    position: 1,
  }),
  seedActivity({
    id: 'act-estudo',
    title: 'Estudar novas funcionalidades',
    description: 'Separar um horário para conhecer as funcionalidades novas.',
    status: 'todo',
    priority: 'low',
    category: 'Estudos',
    source: 'Pessoal',
    origin: 'mine',
    assignee: 'Matheus Larrie',
    dueDate: '2026-10-20',
    completedOn: null,
    position: 2,
  }),
  seedActivity({
    id: 'act-clientes',
    title: 'Responder clientes pendentes',
    description: 'Retomar os e-mails que ainda estão sem resposta.',
    status: 'in_progress',
    priority: 'medium',
    category: 'Atendimento',
    source: 'E-mail',
    origin: 'mine',
    assignee: 'Matheus Larrie',
    dueDate: '2026-10-17',
    completedOn: null,
    position: 0,
  }),
  seedActivity({
    id: 'act-resolucao',
    title: 'Aumentar a taxa de resolução no primeiro contato para 95%',
    description: 'Missão da liderança da equipe de atendimento.',
    status: 'in_progress',
    priority: 'high',
    category: 'Qualidade',
    source: 'Equipe do Atendimento',
    origin: 'leadership',
    assignee: 'Matheus Larrie',
    dueDate: '2026-10-20',
    completedOn: null,
    position: 1,
  }),
  seedActivity({
    id: 'act-relatorios',
    title: 'Organizar relatórios semanais',
    description: 'Montar os relatórios da semana.',
    status: 'in_progress',
    priority: 'low',
    category: 'Relatórios',
    source: 'Pessoal',
    origin: 'mine',
    assignee: 'Matheus Larrie',
    dueDate: '2026-10-17',
    completedOn: null,
    position: 2,
  }),
  seedActivity({
    id: 'act-alinhamento',
    title: 'Participar da reunião de alinhamento',
    description: 'Reunião de alinhamento concluída.',
    status: 'done',
    priority: 'medium',
    category: 'Reuniões',
    source: 'Pessoal',
    origin: 'mine',
    assignee: 'Matheus Larrie',
    dueDate: '2026-10-14',
    completedOn: '2026-10-14',
    position: 0,
  }),
  seedActivity({
    id: 'act-qualidade',
    title: 'Manter a qualidade de atendimento acima de 90%',
    description: 'Missão da liderança concluída no chat.',
    status: 'done',
    priority: 'high',
    category: 'Qualidade',
    source: 'Equipe do Chat',
    origin: 'leadership',
    assignee: 'Matheus Larrie',
    dueDate: '2026-10-13',
    completedOn: '2026-10-13',
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
    && typeof item.source === 'string'
    && (item.origin === 'mine' || item.origin === 'leadership')
    && typeof item.assignee === 'string'
    && typeof item.position === 'number';
}

export function loadActivityStore(): ActivityStore {
  try {
    if (localStorage.getItem(VERSION_KEY) !== STORAGE_VERSION) {
      localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
      localStorage.removeItem(STORAGE_KEY);
      return { activities: seedActivities, categories: DEFAULT_CATEGORIES };
    }
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

export function formatDueDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
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
  const moved: Activity = {
    ...active,
    status: overStatus,
    completedOn: overStatus === 'done' ? active.completedOn ?? new Date().toISOString().slice(0, 10) : active.completedOn,
  };
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
    source: draft.source?.trim() || 'Pessoal',
    origin: draft.origin ?? 'mine',
    assignee: draft.assignee,
    dueDate: draft.dueDate,
    completedOn: draft.completedOn ?? null,
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
          source: draft.source?.trim() || item.source,
          origin: draft.origin ?? item.origin,
          assignee: draft.assignee,
          dueDate: draft.dueDate,
          completedOn: draft.completedOn ?? item.completedOn,
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
        source: draft.source?.trim() || item.source,
        origin: draft.origin ?? item.origin,
        assignee: draft.assignee,
        dueDate: draft.dueDate,
        completedOn: draft.completedOn ?? item.completedOn,
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
