import { generateId } from '@/lib/utils';

export type JournalCategory = 'processos' | 'urgente' | 'social' | 'treinamentos';
export type JournalStatus = 'published' | 'draft';
export type JournalMediaKind = 'image' | 'audio' | 'video' | 'document';

export type JournalMedia = {
  id: string;
  name: string;
  kind: JournalMediaKind;
  url: string;
};

export type JournalComment = {
  id: string;
  author: string;
  text: string;
  date: string;
};

export type JournalArticle = {
  id: string;
  title: string;
  content: string;
  category: JournalCategory;
  cover: string;
  date: string;
  author: string;
  status: JournalStatus;
  pinned: boolean;
  media: JournalMedia[];
  comments: JournalComment[];
  reactions: number;
  reactedBy: string[];
};

export type JournalDraft = {
  title: string;
  content: string;
  category: JournalCategory;
  cover: string;
  date: string;
  author: string;
  status: JournalStatus;
  pinned: boolean;
  media: JournalMedia[];
};

export const JOURNAL_CATEGORIES: { id: JournalCategory; label: string; description: string }[] = [
  { id: 'processos', label: 'Processos', description: 'Procedimentos, mudanças operacionais e orientações' },
  { id: 'urgente', label: 'Urgente', description: 'Avisos que pedem atenção imediata' },
  { id: 'social', label: 'Social', description: 'Reuniões, eventos e ações internas' },
  { id: 'treinamentos', label: 'Treinamentos', description: 'Cursos, workshops e materiais de aprendizagem' },
];

export const COVER_LIBRARY = [
  { id: 'reuniao', label: 'Reunião', src: '/jornal/capas/reuniao.jpg' },
  { id: 'treinamento', label: 'Treinamento', src: '/jornal/capas/treinamento.jpg' },
  { id: 'palestra', label: 'Palestra', src: '/jornal/capas/palestra.jpg' },
  { id: 'processos', label: 'Processos', src: '/jornal/capas/processos.jpg' },
  { id: 'urgente', label: 'Urgente', src: '/jornal/capas/urgente.jpg' },
  { id: 'evento', label: 'Evento', src: '/jornal/capas/evento.jpg' },
  { id: 'equipe', label: 'Equipe', src: '/jornal/capas/equipe.jpg' },
  { id: 'tecnologia', label: 'Tecnologia', src: '/jornal/capas/tecnologia.jpg' },
  { id: 'calendario', label: 'Calendário', src: '/jornal/capas/calendario.jpg' },
] as const;

const LEGACY_COVERS: Record<string, string> = {
  '/jornal/evento.svg': '/jornal/capas/evento.jpg',
  '/jornal/processos.svg': '/jornal/capas/processos.jpg',
  '/jornal/aviso.svg': '/jornal/capas/urgente.jpg',
  '/jornal/reuniao.svg': '/jornal/capas/reuniao.jpg',
  '/jornal/treinamento.svg': '/jornal/capas/treinamento.jpg',
  '/jornal/palestra.svg': '/jornal/capas/palestra.jpg',
  '/jornal/equipe.svg': '/jornal/capas/equipe.jpg',
  '/jornal/calendario.svg': '/jornal/capas/calendario.jpg',
  '/jornal/tecnologia.svg': '/jornal/capas/tecnologia.jpg',
  '/jornal/megafone.svg': '/jornal/capas/evento.jpg',
};

export const PIN_LIMIT = 3;
const STORAGE_KEY = 'unica-journal';

export function canManageJournal(user: { role: string; department?: string }) {
  return /admin|líder|lider|coordena|diret|vp\b|chief|head|gerente/i.test(user.role)
    || /comunica/i.test(user.department ?? '');
}

export function categoryLabel(category: JournalCategory) {
  return JOURNAL_CATEGORIES.find((item) => item.id === category)?.label ?? category;
}

export function articleSummary(content: string) {
  const clean = content.replace(/\s+/g, ' ').trim();
  return clean.length > 160 ? `${clean.slice(0, 157)}…` : clean;
}

export function mediaKind(file: File): JournalMediaKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return 'document';
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

const seed: JournalArticle[] = [
  {
    id: 'j-endo',
    title: 'Campanha de Endomarketing — Juntos somos mais fortes',
    content: 'A campanha de endomarketing começa nesta semana. A ideia é celebrar o que a equipe já construiu e deixar visível o que vem pela frente.\n\nParticipe das ações no auditório, acompanhe os comunicados e compartilhe um registro do seu time. As peças oficiais ficam disponíveis para quem for publicar nos canais internos.\n\nQuem quiser sugerir uma história da própria área pode falar com a Comunicação.',
    category: 'social',
    cover: '/jornal/capas/evento.jpg',
    date: daysAgo(0),
    author: 'Helena Duarte',
    status: 'published',
    pinned: true,
    media: [],
    comments: [{ id: 'c1', author: 'Ana Santos', text: 'A equipe de Design já separou os registros da semana.', date: daysAgo(0) }],
    reactions: 24,
    reactedBy: [],
  },
  {
    id: 'j-matricula',
    title: 'Novo procedimento de matrícula',
    content: 'O fluxo de matrícula muda a partir desta segunda. O registro da aluna ou do aluno passa a ser conferido em duas etapas antes da confirmação.\n\nA primeira etapa continua na secretaria. A segunda é a validação acadêmica, que precisa estar concluída no mesmo dia.\n\nO passo a passo completo está descrito abaixo e substitui a orientação anterior.',
    category: 'processos',
    cover: '/jornal/capas/processos.jpg',
    date: daysAgo(1),
    author: 'João Ferreira',
    status: 'published',
    pinned: true,
    media: [],
    comments: [],
    reactions: 11,
    reactedBy: [],
  },
  {
    id: 'j-sistemas',
    title: 'Interrupção programada dos sistemas',
    content: 'Na quinta-feira, das 22h às 23h30, o ambiente acadêmico ficará indisponível para manutenção.\n\nSalve os registros em andamento antes desse horário. Atendimentos presenciais seguem normalmente.\n\nSe algo continuar fora depois das 23h30, avise a coordenação imediatamente.',
    category: 'urgente',
    cover: '/jornal/capas/urgente.jpg',
    date: daysAgo(1),
    author: 'Helena Duarte',
    status: 'published',
    pinned: true,
    media: [],
    comments: [{ id: 'c2', author: 'Caio Mendes', text: 'Vou avisar o atendimento da noite.', date: daysAgo(1) }],
    reactions: 18,
    reactedBy: [],
  },
  {
    id: 'j-reuniao',
    title: 'Reunião geral na sexta',
    content: 'Na sexta, às 14h, a reunião geral acontece no auditório principal. A pauta cobre a campanha interna, o calendário do semestre e um ponto trazido por cada área.\n\nLevem uma decisão que o time precisa tomar junto. A duração prevista é de uma hora.',
    category: 'social',
    cover: '/jornal/capas/reuniao.jpg',
    date: daysAgo(2),
    author: 'Helena Duarte',
    status: 'published',
    pinned: false,
    media: [],
    comments: [],
    reactions: 9,
    reactedBy: [],
  },
  {
    id: 'j-produto',
    title: 'Treinamento de produto para quem entrou neste semestre',
    content: 'O treinamento de produto acontece no dia 17 de outubro, das 14h às 16h, na Sala 2 do bloco acadêmico.\n\nÉ voltado para quem entrou neste semestre. As vagas são limitadas e a presença precisa ser confirmada no calendário.\n\nO material de apoio fica nesta publicação depois do encontro.',
    category: 'treinamentos',
    cover: '/jornal/capas/treinamento.jpg',
    date: daysAgo(3),
    author: 'Lívia Ramos',
    status: 'published',
    pinned: false,
    media: [],
    comments: [],
    reactions: 7,
    reactedBy: [],
  },
  {
    id: 'j-palestra',
    title: 'Palestra de integração das áreas acadêmicas',
    content: 'Na próxima terça, a palestra de integração reúne secretaria, coordenação e comunicação. O tema é como uma informação sai da área e chega ao restante da empresa sem se perder.\n\nO encontro é aberto. Chegue alguns minutos antes para acomodar a equipe.',
    category: 'social',
    cover: '/jornal/capas/palestra.jpg',
    date: daysAgo(4),
    author: 'Marina Costa',
    status: 'published',
    pinned: false,
    media: [],
    comments: [],
    reactions: 6,
    reactedBy: [],
  },
  {
    id: 'j-workshop',
    title: 'Workshop de atendimento ao aluno',
    content: 'O workshop cobre as conversas mais comuns do balcão: rematrícula, documentos pendentes e mudança de turma.\n\nHaverá exercícios curtos e um roteiro para levar de volta à equipe. Quem já participou da edição anterior pode ir só ao segundo horário.',
    category: 'treinamentos',
    cover: '/jornal/capas/treinamento.jpg',
    date: daysAgo(5),
    author: 'Lívia Ramos',
    status: 'published',
    pinned: false,
    media: [],
    comments: [],
    reactions: 4,
    reactedBy: [],
  },
  {
    id: 'j-fechamento',
    title: 'Orientações para o fechamento do mês',
    content: 'Antes do fechamento, cada área confere pendências abertas e registra o que ficou para o mês seguinte.\n\nO prazo interno é a última sexta útil. Documentos sem responsável não entram no fechamento e voltam para a área de origem.',
    category: 'processos',
    cover: '/jornal/capas/processos.jpg',
    date: daysAgo(6),
    author: 'João Ferreira',
    status: 'published',
    pinned: false,
    media: [],
    comments: [],
    reactions: 5,
    reactedBy: [],
  },
  {
    id: 'j-confraternizacao',
    title: 'Confraternização da equipe no fim do mês',
    content: 'A confraternização será na área comum, depois do expediente, no último dia útil do mês.\n\nA presença é livre. Quem tiver restrição alimentar pode avisar a Comunicação até a semana anterior.',
    category: 'social',
    cover: '/jornal/capas/equipe.jpg',
    date: daysAgo(8),
    author: 'Ana Santos',
    status: 'published',
    pinned: false,
    media: [],
    comments: [],
    reactions: 15,
    reactedBy: [],
  },
  {
    id: 'j-calendario',
    title: 'Calendário acadêmico do semestre',
    content: 'O calendário do semestre foi atualizado com feriados, recessos e as datas de conselho. A versão anterior deixa de valer.\n\nUse esta publicação como referência quando for marcar reunião ou treinamento em cima de um dia letivo.',
    category: 'processos',
    cover: '/jornal/capas/calendario.jpg',
    date: daysAgo(9),
    author: 'Matheus Larrie',
    status: 'published',
    pinned: false,
    media: [],
    comments: [],
    reactions: 8,
    reactedBy: [],
  },
  {
    id: 'j-tecnologia',
    title: 'Canal único para chamados de tecnologia',
    content: 'Pedidos de acesso, equipamento e sistema passam a entrar por um único canal. Mensagens soltas no chat deixam de valer como abertura de chamado.\n\nDescreva o que parou, quem é afetado e desde quando. Isso encurta o retorno.',
    category: 'urgente',
    cover: '/jornal/capas/tecnologia.jpg',
    date: daysAgo(10),
    author: 'Caio Mendes',
    status: 'published',
    pinned: false,
    media: [],
    comments: [],
    reactions: 3,
    reactedBy: [],
  },
  {
    id: 'j-rascunho',
    title: 'Roteiro da integração de novos colaboradores',
    content: 'Rascunho do roteiro de boas-vindas. Ainda falta a ordem das visitas e o material de apoio.',
    category: 'treinamentos',
    cover: '/jornal/capas/treinamento.jpg',
    date: daysAgo(0),
    author: 'Helena Duarte',
    status: 'draft',
    pinned: false,
    media: [],
    comments: [],
    reactions: 0,
    reactedBy: [],
  },
];

let articles = readStored();
const listeners = new Set<() => void>();

function readStored(): JournalArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as JournalArticle[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seed;
    let changed = false;
    const migrated = parsed.map((article) => {
      const cover = LEGACY_COVERS[article.cover];
      if (!cover) return article;
      changed = true;
      return { ...article, cover };
    });
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return seed;
  }
}

function commit(next: JournalArticle[]) {
  articles = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export function getJournalArticles() {
  return articles;
}

export function subscribeJournal(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function pinnedArticles(list = articles) {
  return list
    .filter((article) => article.status === 'published' && article.pinned)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, PIN_LIMIT);
}

export function saveJournalArticle(draft: JournalDraft, id?: string) {
  const current = id ? articles.find((article) => article.id === id) : undefined;
  const othersPinned = articles.filter((article) => article.pinned && article.id !== id).length;
  const pinned = draft.pinned && (draft.status === 'draft' ? false : othersPinned < PIN_LIMIT || Boolean(current?.pinned));
  const next: JournalArticle = {
    id: id ?? generateId(),
    title: draft.title.trim(),
    content: draft.content.trim(),
    category: draft.category,
    cover: draft.cover,
    date: new Date(draft.date.includes('T') ? draft.date : `${draft.date}T12:00:00`).toISOString(),
    author: draft.author.trim(),
    status: draft.status,
    pinned: draft.status === 'published' ? pinned : false,
    media: draft.media,
    comments: current?.comments ?? [],
    reactions: current?.reactions ?? 0,
    reactedBy: current?.reactedBy ?? [],
  };
  commit(id ? articles.map((article) => (article.id === id ? next : article)) : [next, ...articles]);
  return { article: next, pinBlocked: draft.pinned && draft.status === 'published' && !pinned };
}

export function toggleJournalPin(id: string) {
  const article = articles.find((item) => item.id === id);
  if (!article || article.status !== 'published') return false;
  if (!article.pinned && pinnedArticles().length >= PIN_LIMIT) return false;
  commit(articles.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item)));
  return true;
}

export function toggleJournalReaction(id: string, name: string) {
  commit(articles.map((article) => {
    if (article.id !== id) return article;
    const reacted = article.reactedBy.includes(name);
    return {
      ...article,
      reactedBy: reacted ? article.reactedBy.filter((person) => person !== name) : [...article.reactedBy, name],
      reactions: Math.max(0, article.reactions + (reacted ? -1 : 1)),
    };
  }));
}

export function addJournalComment(id: string, author: string, text: string) {
  const comment: JournalComment = { id: generateId(), author, text: text.trim(), date: new Date().toISOString() };
  if (!comment.text) return;
  commit(articles.map((article) => (article.id === id ? { ...article, comments: [...article.comments, comment] } : article)));
}
