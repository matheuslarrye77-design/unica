import { generateId } from '@/lib/utils';


export type JournalCategory = 'processos' | 'urgente' | 'social' | 'treinamentos';
export type JournalStatus = 'published' | 'draft';
export type JournalMediaKind = 'image' | 'audio' | 'video' | 'document';

export type JournalMedia = {
  id: string;
  name: string;
  kind: JournalMediaKind;
  url: string;
  start?: number;
  duration?: number;
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
  pinnedAt?: string;
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
export const TITLE_LIMIT = 150;
export const CONTENT_LIMIT = 2000;
const STORAGE_KEY = 'unica-journal';
const SAVED_KEY = 'unica-journal-saved';
const COVERS_KEY = 'unica-journal-covers';
const JOURNAL_VERSION = 'foto-2026-10-15';

export function categoryLocksDate(category: JournalCategory) {
  return category === 'processos' || category === 'urgente';
}

export function canManageJournal(user: { role: string; department?: string }) {
  return /admin|líder|lider|coordena|diret|vp\b|chief|head|gerente/i.test(user.role)
    || /comunica/i.test(user.department ?? '');
}

export function categoryLabel(category: JournalCategory) {
  return JOURNAL_CATEGORIES.find((item) => item.id === category)?.label ?? category;
}

// Capas antigas da biblioteca não entram como foto enviada.
const LIBRARY_COVER = /^\/jornal\/(?:capas\/|[^/]+\.svg$)/i;

export type JournalCoverAsset = { id: string; url: string; createdAt: string };

export function journalCovers(): JournalCoverAsset[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(COVERS_KEY) ?? '[]') as JournalCoverAsset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function resolveJournalAsset(value: string) {
  if (!value.startsWith('lib:')) return value;
  return journalCovers().find((item) => item.id === value.slice(4))?.url ?? '';
}

export function saveJournalCover(url: string) {
  const asset: JournalCoverAsset = { id: generateId(), url, createdAt: new Date().toISOString() };
  const next = [asset, ...journalCovers().filter((item) => item.url !== url)].slice(0, 40);
  localStorage.setItem(COVERS_KEY, JSON.stringify(next));
  notify();
  return asset;
}

export function deleteJournalCover(id: string) {
  localStorage.setItem(COVERS_KEY, JSON.stringify(journalCovers().filter((item) => item.id !== id)));
  notify();
}

export function isUserCover(cover: string) {
  const value = resolveJournalAsset(cover.trim());
  if (!value || LIBRARY_COVER.test(value)) return false;
  return value.startsWith('data:image/') || value.startsWith('blob:') || value.startsWith('/api/') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
}

export function articleCover(article: Pick<JournalArticle, 'cover' | 'media'>) {
  const cover = resolveJournalAsset(article.cover);
  if (isUserCover(cover)) return cover;
  const image = article.media.find((item) => item.kind === 'image' && isUserCover(item.url));
  return image ? resolveJournalAsset(image.url) : '';
}

const IMAGE_MARK = /\{\{img:lib:[a-z0-9]+\}\}/g;

export function journalPlainText(content: string) {
  return content.replace(IMAGE_MARK, ' ').replace(/\s+/g, ' ').trim();
}

export type JournalPiece =
  | { id: string; kind: 'text'; text: string }
  | { id: string; kind: 'image'; ref: string };

export function parseJournalPieces(content: string): JournalPiece[] {
  const parts = content.split(/(\{\{img:lib:[a-z0-9]+\}\})/g).filter((part) => part !== '');
  if (parts.length === 0) return [{ id: 'texto', kind: 'text', text: '' }];
  const pieces: JournalPiece[] = parts.map((part, index) => {
    const mark = part.match(/^\{\{img:(lib:[a-z0-9]+)\}\}$/);
    if (mark?.[1]) return { id: `img-${index}`, kind: 'image', ref: mark[1] };
    return { id: `texto-${index}`, kind: 'text', text: part.replace(/^\n/, '').replace(/\n$/, '') };
  });
  if (pieces[0]?.kind !== 'text') pieces.unshift({ id: 'texto-inicio', kind: 'text', text: '' });
  if (pieces[pieces.length - 1]?.kind !== 'text') pieces.push({ id: 'texto-fim', kind: 'text', text: '' });
  return pieces;
}

export function serializeJournalPieces(pieces: JournalPiece[]) {
  return pieces
    .map((piece) => (piece.kind === 'text' ? piece.text.replace(/^\s+|\s+$/g, '') : `{{img:${piece.ref}}}`))
    .filter((part) => part !== '')
    .join('\n');
}

export function readingMinutes(content: string) {
  const words = journalPlainText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function articleSummary(content: string) {
  const clean = journalPlainText(content);
  return clean.length > 160 ? `${clean.slice(0, 157)}…` : clean;
}

export function mediaKind(file: File): JournalMediaKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return 'document';
}

const THREAD_LINES = ['Combinado.', 'Vou avisar a equipe.', 'Ficou claro.', 'Pode seguir assim.'];
const THREAD_VOICES = ['Ana Santos', 'Caio Mendes', 'João Ferreira', 'Lívia Ramos'];

function thread(prefix: string, count: number): JournalComment[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    author: THREAD_VOICES[index % THREAD_VOICES.length],
    text: THREAD_LINES[index % THREAD_LINES.length],
    date: '2026-10-14T15:00:00.000Z',
  }));
}

const seed: JournalArticle[] = [
  {
    id: 'j-roteiro',
    title: 'Roteiro da integração de novos colaboradores',
    content: 'O roteiro de integração apresenta a Única, as áreas e o primeiro mês de quem chega.\n\nA visita começa na recepção, segue pela Comunicação e termina com o time de destino. O material de apoio fica nesta publicação.',
    category: 'social',
    cover: '/jornal/capas/integracao.jpg',
    date: '2026-10-14T18:00:00.000Z',
    author: 'Helena Duarte',
    status: 'published',
    pinned: true,
    pinnedAt: '2026-10-14T09:00:00.000Z',
    media: [],
    comments: thread('roteiro', 24),
    reactions: 1,
    reactedBy: [],
  },
  {
    id: 'j-atualizacao',
    title: 'Atualização dos processos internos',
    content: 'Os processos internos foram revisados para deixar cada etapa com um responsável e um prazo visível.\n\nA planilha de acompanhamento passa a ser a referência única. A orientação anterior deixa de valer.',
    category: 'processos',
    cover: '/jornal/capas/teclado.jpg',
    date: '2026-10-13T18:00:00.000Z',
    author: 'João Ferreira',
    status: 'published',
    pinned: true,
    pinnedAt: '2026-10-13T18:00:00.000Z',
    media: [],
    comments: thread('atualizacao', 11),
    reactions: 0,
    reactedBy: [],
  },
  {
    id: 'j-manutencao',
    title: 'Manutenção no sistema de acesso',
    content: 'O sistema de acesso entra em manutenção para atualizar as credenciais e o registro de entrada.\n\nDurante a janela, use a recepção para liberar visitantes. O retorno previsto é no mesmo dia.',
    category: 'urgente',
    cover: '/jornal/capas/monitores.jpg',
    date: '2026-10-13T16:00:00.000Z',
    author: 'Helena Duarte',
    status: 'published',
    pinned: true,
    pinnedAt: '2026-10-13T16:00:00.000Z',
    media: [],
    comments: thread('manutencao', 18),
    reactions: 1,
    reactedBy: [],
  },
  {
    id: 'j-endo',
    title: 'Campanha de Endomarketing — Juntos somos mais fortes',
    content: 'A campanha de endomarketing começa nesta semana. A ideia é celebrar o que a equipe já construiu e deixar visível o que vem pela frente.\n\nParticipe das ações no auditório, acompanhe os comunicados e compartilhe um registro do seu time. As peças oficiais ficam disponíveis para quem for publicar nos canais internos.\n\nQuem quiser sugerir uma história da própria área pode falar com a Comunicação.',
    category: 'social',
    cover: '/jornal/fotos/equipe.jpg',
    date: '2026-10-14T12:00:00.000Z',
    author: 'Helena Duarte',
    status: 'published',
    pinned: false,
    media: [],
    comments: [{ id: 'c1', author: 'Ana Santos', text: 'A equipe de Design já separou os registros da semana.', date: '2026-10-14T12:00:00.000Z' }],
    reactions: 24,
    reactedBy: [],
  },
  {
    id: 'j-matricula',
    title: 'Novo procedimento de matrícula',
    content: 'O fluxo de matrícula muda a partir desta segunda. O registro da aluna ou do aluno passa a ser conferido em duas etapas antes da confirmação.\n\nA primeira etapa continua na secretaria. A segunda é a validação acadêmica, que precisa estar concluída no mesmo dia.\n\nO passo a passo completo está descrito abaixo e substitui a orientação anterior.',
    category: 'processos',
    cover: '/jornal/fotos/processos.jpg',
    date: '2026-10-13T14:00:00.000Z',
    author: 'João Ferreira',
    status: 'published',
    pinned: false,
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
    date: '2026-10-13T12:00:00.000Z',
    author: 'Helena Duarte',
    status: 'published',
    pinned: false,
    media: [],
    comments: [{ id: 'c2', author: 'Caio Mendes', text: 'Vou avisar o atendimento da noite.', date: '2026-10-13T12:00:00.000Z' }],
    reactions: 18,
    reactedBy: [],
  },
  {
    id: 'j-reuniao',
    title: 'Reunião geral na sexta',
    content: 'Na sexta, às 14h, a reunião geral acontece no auditório principal. A pauta cobre a campanha interna, o calendário do semestre e um ponto trazido por cada área.\n\nLevem uma decisão que o time precisa tomar junto. A duração prevista é de uma hora.',
    category: 'social',
    cover: '/jornal/capas/reuniao.jpg',
    date: '2026-10-12T15:00:00.000Z',
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
    date: '2026-10-11T15:00:00.000Z',
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
    category: 'processos',
    cover: '/jornal/capas/palestra.jpg',
    date: '2026-10-10T15:00:00.000Z',
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
    date: '2026-10-09T15:00:00.000Z',
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
    date: '2026-10-08T15:00:00.000Z',
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
    date: '2026-10-07T15:00:00.000Z',
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
    date: '2026-10-06T15:00:00.000Z',
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
    date: '2026-10-05T15:00:00.000Z',
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
    date: '2026-10-14T09:00:00.000Z',
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
    if (localStorage.getItem('unica-journal-version') !== JOURNAL_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem('unica-journal-version', JOURNAL_VERSION);
      return seed;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as JournalArticle[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seed;
    let changed = false;
    const migrated = parsed.map((article) => {
      let next = article;
      const cover = article.id === 'j-atualizacao' && article.cover === '/jornal/fotos/processos.jpg'
        ? '/jornal/capas/teclado.jpg'
        : article.cover === '/jornal/capas/evento.jpg'
          ? '/jornal/fotos/equipe.jpg'
          : article.id === 'j-matricula' && article.cover === '/jornal/capas/processos.jpg'
            ? '/jornal/fotos/processos.jpg'
            : LEGACY_COVERS[article.cover];
      if (cover && cover !== article.cover) next = { ...next, cover };
      if (next.pinned && !next.pinnedAt) next = { ...next, pinnedAt: next.date };
      if (next !== article) changed = true;
      return next;
    });
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return seed;
  }
}

function commit(next: JournalArticle[]) {
  const previous = articles;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    articles = previous;
    throw new Error('storage');
  }
  articles = next;
  listeners.forEach((listener) => listener());
}

function notify() {
  articles = articles.slice();
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
    .sort((a, b) => (b.pinnedAt ?? b.date).localeCompare(a.pinnedAt ?? a.date))
    .slice(0, PIN_LIMIT);
}

function withPin(list: JournalArticle[], id: string, pinned: boolean, stamp?: string) {
  if (!pinned) {
    return { list: list.map((article) => (article.id === id ? { ...article, pinned: false, pinnedAt: undefined } : article)), replacedId: undefined as string | undefined };
  }
  let next = list;
  const current = next.find((article) => article.id === id);
  const already = Boolean(current?.pinned && stamp);
  let replacedId: string | undefined;
  if (!already) {
    const pinnedOnes = next.filter((article) => article.pinned && article.status === 'published' && article.id !== id);
    if (pinnedOnes.length >= PIN_LIMIT) {
      const oldest = [...pinnedOnes].sort((a, b) => (a.pinnedAt ?? a.date).localeCompare(b.pinnedAt ?? b.date))[0];
      replacedId = oldest?.id;
      if (oldest) next = next.map((article) => (article.id === oldest.id ? { ...article, pinned: false, pinnedAt: undefined } : article));
    }
  }
  const pinnedAt = stamp ?? new Date().toISOString();
  next = next.map((article) => (article.id === id ? { ...article, pinned: true, pinnedAt } : article));
  return { list: next, replacedId };
}

function fitJournalContent(content: string) {
  const trimmed = content.trim();
  if (journalPlainText(trimmed).length <= CONTENT_LIMIT) return trimmed;
  return trimmed.slice(0, CONTENT_LIMIT);
}

function publicationDate(category: JournalCategory, value: string) {
  if (categoryLocksDate(category)) {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return `${local.toISOString().slice(0, 10)}T12:00:00`;
  }
  return value.includes('T') ? value : `${value}T12:00:00`;
}

export function saveJournalArticle(draft: JournalDraft, id?: string) {
  const current = id ? articles.find((article) => article.id === id) : undefined;
  const articleId = id ?? generateId();
  const next: JournalArticle = {
    id: articleId,
    title: draft.title.trim().slice(0, TITLE_LIMIT),
    content: fitJournalContent(draft.content),
    category: draft.category,
    cover: draft.cover,
    date: new Date(publicationDate(draft.category, draft.date)).toISOString(),
    author: draft.author.trim(),
    status: draft.status,
    pinned: false,
    pinnedAt: current?.pinnedAt,
    media: draft.media,
    comments: current?.comments ?? [],
    reactions: current?.reactions ?? 0,
    reactedBy: current?.reactedBy ?? [],
  };
  const listed = id ? articles.map((article) => (article.id === id ? next : article)) : [next, ...articles];
  const pinned = withPin(listed, articleId, draft.pinned && draft.status === 'published', current?.pinned ? current.pinnedAt : undefined);
  commit(pinned.list);
  return { article: pinned.list.find((article) => article.id === articleId) ?? next, replacedId: pinned.replacedId };
}

export function deleteJournalArticle(id: string) {
  const current = articles.find((article) => article.id === id);
  if (!current || current.status !== 'draft') return false;
  commit(articles.filter((article) => article.id !== id));
  const saved = savedJournalIds().filter((item) => item !== id);
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  return true;
}

export function toggleJournalPin(id: string) {
  const article = articles.find((item) => item.id === id);
  if (!article || article.status !== 'published') return { ok: false as const };
  const pinned = withPin(articles, id, !article.pinned, article.pinned ? article.pinnedAt : undefined);
  commit(pinned.list);
  return { ok: true as const, pinned: !article.pinned, replacedId: pinned.replacedId };
}

export function savedJournalIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toggleJournalSave(id: string) {
  const current = savedJournalIds();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  notify();
  return next.includes(id);
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

export function deleteJournalComment(articleId: string, commentId: string) {
  commit(articles.map((article) => (article.id === articleId ? { ...article, comments: article.comments.filter((comment) => comment.id !== commentId) } : article)));
}
