import { generateId } from '@/lib/utils';

export type DocumentCategory = 'procedimentos' | 'requerimentos' | 'navegacao';
export type DocumentSystem = 'pincel' | 'prominas';

export type CompanyDocument = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: DocumentCategory;
  system: DocumentSystem;
  author: string;
  publishedAt: string;
  updatedAt: string;
  published: boolean;
  featured: boolean;
  fileName: string;
  fileType: string;
  file: Blob;
  thumbnail: string;
  downloads: number;
  favorites: string[];
};

export const DOCUMENT_CATEGORIES: { id: DocumentCategory; label: string }[] = [
  { id: 'procedimentos', label: 'Procedimentos' },
  { id: 'requerimentos', label: 'Requerimentos' },
  { id: 'navegacao', label: 'Navegação' },
];

export const DOCUMENT_SYSTEMS: { id: DocumentSystem; label: string }[] = [
  { id: 'pincel', label: 'Pincel Atômico' },
  { id: 'prominas', label: 'Prominas' },
];

export const ORIGIN_SYSTEMS = DOCUMENT_SYSTEMS.filter((item) => item.id === 'pincel' || item.id === 'prominas');

export const DOCUMENT_THUMBNAILS = [
  { id: 'procedimento', label: 'Procedimento', src: '/jornal/processos.svg' },
  { id: 'formulario', label: 'Formulário', src: '/jornal/megafone.svg' },
  { id: 'documento', label: 'Documento', src: '/jornal/processos.svg' },
  { id: 'pincel', label: 'Pincel', src: '/jornal/tecnologia.svg' },
  { id: 'prominas', label: 'ProMinas', src: '/jornal/treinamento.svg' },
  { id: 'treinamento', label: 'Treinamento', src: '/jornal/treinamento.svg' },
  { id: 'orientacao', label: 'Orientação', src: '/jornal/palestra.svg' },
  { id: 'importante', label: 'Importante', src: '/jornal/aviso.svg' },
  { id: 'sistema', label: 'Sistema', src: '/jornal/tecnologia.svg' },
  { id: 'calendario', label: 'Calendário', src: '/jornal/calendario.svg' },
] as const;

const DB_NAME = 'unica-documentos';
const STORE = 'documents';
const VERSION_KEY = 'unica-documentos-version';
const STORAGE_VERSION = 'foto-2026-10-15';

export function canManageDocuments(user: { role: string; department?: string }) {
  return /admin|líder|lider|coordena|diret|vp\b|chief|head|gerente/i.test(user.role)
    || /comunica/i.test(user.department ?? '');
}

export function categoryLabel(id: DocumentCategory) {
  return DOCUMENT_CATEGORIES.find((item) => item.id === id)?.label ?? id;
}

export function systemLabel(id: DocumentSystem) {
  return DOCUMENT_SYSTEMS.find((item) => item.id === id)?.label ?? id;
}

function textFile(title: string, body: string) {
  return new Blob([`${title}\n\n${body}\n`], { type: 'text/plain' });
}

function seed(): CompanyDocument[] {
  const item = (
    partial: Omit<CompanyDocument, 'file' | 'fileType' | 'downloads' | 'favorites' | 'published' | 'publishedAt' | 'updatedAt'> & { body: string; date: string; favorite?: boolean },
  ): CompanyDocument => {
    const stamp = `${partial.date}T15:00:00.000Z`;
    return {
      id: partial.id,
      title: partial.title,
      subtitle: partial.subtitle,
      description: partial.description,
      category: partial.category,
      system: partial.system,
      author: partial.author,
      publishedAt: stamp,
      updatedAt: stamp,
      published: true,
      featured: partial.featured,
      fileName: partial.fileName,
      fileType: 'text/plain',
      file: textFile(partial.title, partial.body),
      thumbnail: partial.system === 'prominas' ? '/marcas/prominas.svg' : '/marcas/pincel.svg',
      downloads: 0,
      favorites: partial.favorite ? ['1'] : [],
    };
  };
  return [
    item({
      id: 'doc-pontividade',
      title: 'Concessão de pontividade',
      subtitle: 'Como registrar a pontividade no Pincel',
      description: 'Orientações para realização do procedimento de concessão de pontividade.',
      category: 'procedimentos',
      system: 'pincel',
      author: 'Helena Duarte',
      featured: true,
      favorite: true,
      fileName: 'concessao-de-pontividade.txt',
      thumbnail: '/marcas/pincel.svg',
      date: '2026-10-13',
      body: 'Abra o Pincel Atômico, localize o aluno e registre a pontividade conforme a autorização da coordenação. Confira o período letivo antes de salvar.',
    }),
    item({
      id: 'doc-certificados',
      title: 'Onde encontrar certificados',
      subtitle: 'Caminho dentro do Pincel',
      description: 'Passo a passo para localizar a emissão de certificados.',
      category: 'navegacao',
      system: 'pincel',
      author: 'João Ferreira',
      featured: true,
      fileName: 'onde-encontrar-certificados.txt',
      thumbnail: '/marcas/pincel.svg',
      date: '2026-10-11',
      body: 'No Pincel Atômico, entre em Acadêmico, depois Documentos e Certificados. A busca por nome do aluno abre a emissão.',
    }),
    item({
      id: 'doc-declaracao',
      title: 'Requerimento de declaração',
      subtitle: 'Formulário da secretaria',
      description: 'Modelo para solicitar declaração de matrícula ou frequência.',
      category: 'requerimentos',
      system: 'prominas',
      author: 'Ana Santos',
      featured: true,
      fileName: 'requerimento-de-declaracao.txt',
      thumbnail: '/marcas/prominas.svg',
      date: '2026-10-07',
      body: 'Preencha nome, curso e o tipo de declaração no Prominas. A devolução segue o prazo informado no próprio requerimento.',
    }),
    item({
      id: 'doc-prominas',
      title: 'Acesso ao Prominas',
      subtitle: 'Primeiro acesso e recuperação',
      description: 'Como entrar no Prominas e o que fazer quando o acesso não abre.',
      category: 'navegacao',
      system: 'prominas',
      author: 'Caio Mendes',
      featured: true,
      favorite: true,
      fileName: 'acesso-prominas.txt',
      thumbnail: '/marcas/prominas.svg',
      date: '2026-10-05',
      body: 'Use o usuário institucional. Se a senha falhar, a recuperação fica na tela inicial do Prominas, antes de abrir um chamado.',
    }),
    item({
      id: 'doc-boletim',
      title: 'Como acessar o boletim',
      subtitle: 'Consulta no Prominas',
      description: 'Orientação para consultar o boletim.',
      category: 'navegacao',
      system: 'prominas',
      author: 'Marina Costa',
      featured: false,
      favorite: true,
      fileName: 'como-acessar-boletim.txt',
      thumbnail: '/marcas/prominas.svg',
      date: '2026-10-09',
      body: 'No Prominas, o boletim fica em Vida acadêmica. A consulta usa o mesmo perfil institucional.',
    }),
    item({
      id: 'doc-financeiro',
      title: 'Fechamento financeiro do mês',
      subtitle: 'Procedimento no Prominas',
      description: 'O que conferir antes de encerrar o movimento financeiro.',
      category: 'procedimentos',
      system: 'prominas',
      author: 'Helena Duarte',
      featured: false,
      favorite: true,
      fileName: 'fechamento-financeiro.txt',
      thumbnail: '/marcas/prominas.svg',
      date: '2026-10-04',
      body: 'Confira boletos em aberto, acordos e o relatório do dia no Prominas. O fechamento só segue com a conferência registrada.',
    }),
    item({
      id: 'doc-rematricula',
      title: 'Formulário de rematrícula',
      subtitle: 'Requerimento do Prominas',
      description: 'Documento usado na rematrícula do período seguinte.',
      category: 'requerimentos',
      system: 'prominas',
      author: 'Lívia Ramos',
      featured: false,
      fileName: 'formulario-rematricula.txt',
      thumbnail: '/marcas/prominas.svg',
      date: '2026-10-02',
      body: 'O formulário reúne dados cadastrais, curso e a confirmação de continuidade. Anexe o comprovante quando houver pendência.',
    }),
    item({
      id: 'doc-atendimento',
      title: 'Orientação de atendimento',
      subtitle: 'Registro no Pincel Atômico',
      description: 'Como conduzir os pedidos mais comuns no atendimento.',
      category: 'procedimentos',
      system: 'pincel',
      author: 'João Ferreira',
      featured: false,
      fileName: 'orientacao-de-atendimento.txt',
      thumbnail: '/marcas/pincel.svg',
      date: '2026-10-01',
      body: 'Identifique o pedido no Pincel Atômico, confira o cadastro e registre o protocolo antes de encaminhar para outra área.',
    }),
  ];
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadDocuments(): Promise<CompanyDocument[]> {
  const db = await openDb();
  let refresh = false;
  try {
    refresh = localStorage.getItem(VERSION_KEY) !== STORAGE_VERSION;
  } catch {
    refresh = false;
  }
  if (refresh) {
    const clear = db.transaction(STORE, 'readwrite');
    clear.objectStore(STORE).clear();
    await txDone(clear);
    try {
      localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
    } catch {
      /* the next visit tries the photo seed again */
    }
  }
  const tx = db.transaction(STORE, 'readonly');
  const rows = await new Promise<CompanyDocument[]>((resolve, reject) => {
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as CompanyDocument[]);
    request.onerror = () => reject(request.error);
  });
  if (rows.length > 0) return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const initial = seed();
  const write = db.transaction(STORE, 'readwrite');
  initial.forEach((document) => write.objectStore(STORE).put(document));
  await txDone(write);
  return initial;
}

async function put(document: CompanyDocument) {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(document);
  await txDone(tx);
}

export async function saveDocument(document: CompanyDocument) {
  await put(document);
}

export async function deleteDocument(id: string) {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
}

export async function toggleFavorite(document: CompanyDocument, userId: string) {
  const favorites = document.favorites.includes(userId)
    ? document.favorites.filter((id) => id !== userId)
    : [...document.favorites, userId];
  const next = { ...document, favorites };
  await put(next);
  return next;
}

export async function registerDownload(document: CompanyDocument) {
  const next = { ...document, downloads: document.downloads + 1 };
  await put(next);
  return next;
}

export function downloadDocument(document: CompanyDocument) {
  const url = URL.createObjectURL(document.file);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function newDocumentId() {
  return generateId();
}
