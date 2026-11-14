import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SystemMark } from '@/components/documents/SystemMark';
import { PageHero } from '@/components/social/LilacWash';
import { PageFrame } from '@/components/shell/PageFrame';
import {
  DOCUMENT_CATEGORIES,
  canManageDocuments,
  categoryLabel,
  deleteDocument,
  downloadDocument,
  loadDocuments,
  newDocumentId,
  registerDownload,
  saveDocument,
  ORIGIN_SYSTEMS,
  systemLabel,
  toggleFavorite,
  type CompanyDocument,
  type DocumentCategory,
  type DocumentSystem,
} from '@/data/documents';
import { currentUser } from '@/data/mockData';
import { assertPermission, useInstitution } from '@/lib/institution';
import { cn } from '@/lib/utils';
import { Bookmark, CalendarDays, Download, FileText, Filter, MoreHorizontal, Plus, Search } from 'lucide-react';
import { authHeaders } from '@/lib/session';
import { useEffect, useMemo, useState, type FC } from 'react';
import { toast } from 'sonner';

type SortMode = 'az' | 'za' | 'recent' | 'old' | 'accessed';
type CategoryFilter = 'todos' | DocumentCategory;

const sorts: { id: SortMode; label: string }[] = [
  { id: 'az', label: 'A–Z' },
  { id: 'za', label: 'Z–A' },
  { id: 'recent', label: 'Mais recentes' },
  { id: 'old', label: 'Mais antigos' },
  { id: 'accessed', label: 'Mais acessados' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export const ResourcesPage: FC = () => {
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [category, setCategory] = useState<CategoryFilter>('todos');
  const [system, setSystem] = useState<'todos' | DocumentSystem>('todos');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>('az');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<CompanyDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyDocument | null>(null);
  const { canUploadDocuments: canSend } = useInstitution();
  const canManage = canManageDocuments(currentUser);

  useEffect(() => {
    loadDocuments().then(setDocuments).catch(() => toast.error('Não foi possível abrir a central de documentos.'));
    void fetch('/api/document-favorites', { credentials: 'include', headers: authHeaders() })
      .then((response) => response.json() as Promise<{ ids: string[] }>)
      .then((data) => setFavoriteIds(data.ids ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const url = URL.createObjectURL(selected.file);
    setPreviewUrl(url);
    if (selected.file.type.startsWith('text/') || selected.fileType.startsWith('text/')) {
      selected.file.text().then(setPreviewText).catch(() => setPreviewText(''));
    } else {
      setPreviewText('');
    }
    return () => URL.revokeObjectURL(url);
  }, [selected]);

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    const list = documents.filter((document) => {
      if (!document.published && !canManage && !canSend) return false;
      if (category !== 'todos' && document.category !== category) return false;
      if (system !== 'todos' && document.system !== system) return false;
      if (!text) return true;
      const haystack = `${document.title} ${document.subtitle} ${document.description} ${systemLabel(document.system)} ${categoryLabel(document.category)}`.toLowerCase();
      return haystack.includes(text);
    });
    return list.sort((a, b) => {
      if (sort === 'az') return a.title.localeCompare(b.title, 'pt-BR');
      if (sort === 'za') return b.title.localeCompare(a.title, 'pt-BR');
      if (sort === 'old') return a.updatedAt.localeCompare(b.updatedAt);
      if (sort === 'accessed') return b.downloads - a.downloads;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [documents, category, system, search, sort, canManage, canSend]);

  const featured = documents.filter((document) => document.featured && document.published && (category === 'todos' || document.category === category) && (system === 'todos' || document.system === system)).slice(0, 3);

  function upsert(document: CompanyDocument) {
    setDocuments((current) => {
      const exists = current.some((item) => item.id === document.id);
      return (exists ? current.map((item) => (item.id === document.id ? document : item)) : [document, ...current]);
    });
    setSelected((current) => (current?.id === document.id ? document : current));
  }

  async function favorite(document: CompanyDocument) {
    const next = await toggleFavorite(document, currentUser.id);
    upsert(next);
    const ids = next.favorites.includes(currentUser.id)
      ? [...new Set([...favoriteIds, next.id])]
      : favoriteIds.filter((id) => id !== next.id);
    setFavoriteIds(ids);
    const response = await fetch('/api/document-favorites', { method: 'PUT', credentials: 'include', headers: authHeaders(), body: JSON.stringify({ ids }) });
    if (!response.ok) toast.error('Não foi possível salvar.');
  }

  function isSaved(document: CompanyDocument) {
    return favoriteIds.includes(document.id) || document.favorites.includes(currentUser.id);
  }

  async function download(document: CompanyDocument) {
    downloadDocument(document);
    upsert(await registerDownload(document));
  }

  async function remove(document: CompanyDocument) {
    await deleteDocument(document.id);
    setDocuments((current) => current.filter((item) => item.id !== document.id));
    setSelected((current) => (current?.id === document.id ? null : current));
  }

  function openEditor(document?: CompanyDocument) {
    setEditing(document ?? null);
    setEditorOpen(true);
  }

  const filtering = category !== 'todos' || system !== 'todos' || sort !== 'az';
  const listed = savedOnly ? visible.filter(isSaved) : visible;

  return (
    <>
    <PageFrame>
          <div className="mb-6">
            <PageHero
              align="start"
              icon={<FileText className="h-5 w-5" strokeWidth={1.75} />}
              title="Documentos"
              subtitle="Encontre procedimentos, requerimentos, orientações e documentos internos."
              aside={canSend ? (
                <button type="button" onClick={() => openEditor()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500">
                  <Plus className="h-4 w-4" />
                  Enviar documento
                </button>
              ) : null}
            />
          </div>

          <div className="relative mb-5 flex items-center gap-2">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar documentos" className="h-full w-full bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-400" />
            </label>
            <button type="button" aria-expanded={filterOpen} aria-label="Filtrar documentos" onClick={() => setFilterOpen((value) => !value)} className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', filtering || filterOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-blue-600')}>
              <Filter className="h-4 w-4" />
            </button>
            {filterOpen ? (
              <div className="absolute top-12 right-0 z-20 max-h-80 w-56 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                <button type="button" onClick={() => { setCategory('todos'); setSystem('todos'); setSort('az'); setFilterOpen(false); }} className="block w-full rounded-xl px-3 py-2 text-left text-base font-semibold text-gray-600 hover:text-blue-600">Limpar filtros</button>
                {DOCUMENT_CATEGORIES.map((item) => (
                  <button key={item.id} type="button" onClick={() => { setCategory(item.id); setFilterOpen(false); }} className={cn('block w-full rounded-xl px-3 py-2 text-left text-base font-semibold', category === item.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600')}>{item.label}</button>
                ))}
                {ORIGIN_SYSTEMS.map((item) => (
                  <button key={item.id} type="button" onClick={() => { setSystem(item.id); setFilterOpen(false); }} className={cn('block w-full rounded-xl px-3 py-2 text-left text-base font-semibold', system === item.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600')}>{item.label}</button>
                ))}
                {sorts.map((item) => (
                  <button key={item.id} type="button" onClick={() => { setSort(item.id); setFilterOpen(false); }} className={cn('block w-full rounded-xl px-3 py-2 text-left text-base font-semibold', sort === item.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600')}>{item.label}</button>
                ))}
              </div>
            ) : null}
          </div>

          {featured.length > 0 && !search.trim() && !savedOnly ? (
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-bold text-gray-800">Fixados</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {featured.map((document) => {
                  const saved = isSaved(document);
                  return (
                    <article key={document.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                      <button type="button" onClick={() => setSelected(document)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                        <SystemMark system={document.system} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-gray-500">{categoryLabel(document.category)} · {systemLabel(document.system)}</span>
                          <span className="mt-1 block text-base font-bold leading-6 text-gray-800">{document.title}</span>
                          <span className="mt-1 block text-sm leading-6 text-gray-500">{document.subtitle}</span>
                          <span className="mt-3 flex items-center gap-1.5 text-sm text-gray-400"><CalendarDays className="h-3.5 w-3.5" />{formatDate(document.updatedAt)}</span>
                        </span>
                      </button>
                      <button type="button" aria-label={saved ? 'Remover dos salvos' : 'Salvar'} aria-pressed={saved} onClick={() => void favorite(document)} className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]', saved ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600')}>
                        <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section id="todos-documentos">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-800">{savedOnly ? 'Salvos' : 'Todos os documentos'}</h2>
              <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly((value) => !value)} className={cn('inline-flex h-11 items-center rounded-2xl px-4 text-base font-semibold', savedOnly ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-blue-600')}>Salvos</button>
            </div>
            {listed.length === 0 ? (
              <p className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center text-base text-gray-500 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">{savedOnly ? 'Nenhum documento salvo.' : 'Nenhum documento encontrado.'}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {listed.map((document) => {
                  const saved = isSaved(document);
                  return (
                    <article key={document.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                      <button type="button" onClick={() => setSelected(document)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <SystemMark system={document.system} />
                        <span className="min-w-0">
                          <span className="block text-base font-bold text-gray-800">{document.title}</span>
                          <span className="mt-0.5 block text-sm text-gray-500">{categoryLabel(document.category)} · {systemLabel(document.system)}{document.published ? '' : ' · Rascunho'}</span>
                          <span className="mt-0.5 block text-sm text-gray-500">{document.subtitle}</span>
                          <span className="mt-1.5 block text-sm text-gray-400">Atualizado em {formatDate(document.updatedAt)}</span>
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button type="button" aria-label={saved ? 'Remover dos salvos' : 'Salvar'} aria-pressed={saved} onClick={() => void favorite(document)} className={cn('grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]', saved ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600')}>
                          <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
                        </button>
                        <button type="button" aria-label="Baixar" onClick={() => void download(document)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-blue-600">
                          <Download className="h-4 w-4" />
                        </button>
                        {canSend ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" aria-label="Mais ações" className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-blue-600"><MoreHorizontal className="h-4 w-4" /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditor(document)}>Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void saveDocument({ ...document, published: !document.published, updatedAt: new Date().toISOString() }).then(() => upsert({ ...document, published: !document.published, updatedAt: new Date().toISOString() }))}>{document.published ? 'Despublicar' : 'Publicar'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void saveDocument({ ...document, featured: !document.featured }).then(() => upsert({ ...document, featured: !document.featured }))}>{document.featured ? 'Desafixar' : 'Fixar'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void remove(document)}>Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
    </PageFrame>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent overlayClassName="bg-slate-900/25 backdrop-blur-md" className="max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-100 shadow-[0_8px_24px_rgba(15,23,42,0.08)] sm:max-w-2xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight text-gray-800">{selected.title}</DialogTitle>
                <DialogDescription className="text-base text-gray-500">{selected.subtitle}</DialogDescription>
              </DialogHeader>
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4" />{selected.fileName}</p>
              <p className="text-sm leading-6">{selected.description}</p>
              <dl className="grid gap-1 text-sm text-muted-foreground">
                <div>Categoria: <span className="text-foreground">{categoryLabel(selected.category)}</span></div>
                <div>Sistema: <span className="text-foreground">{systemLabel(selected.system)}</span></div>
                <div>Autor: <span className="text-foreground">{selected.author}</span></div>
                <div>Publicação: <span className="text-foreground">{formatDate(selected.publishedAt)}</span></div>
                <div>Atualização: <span className="text-foreground">{formatDate(selected.updatedAt)}</span></div>
                <div>Arquivo: <span className="text-foreground">{selected.fileName}</span></div>
              </dl>
              {previewText ? <pre className="max-h-48 overflow-auto rounded-xl bg-muted p-3 text-sm whitespace-pre-wrap">{previewText}</pre> : null}
              {previewUrl && selected.file.type.startsWith('image/') ? <img src={previewUrl} alt="" className="rounded-xl" /> : null}
              {previewUrl && selected.file.type === 'application/pdf' ? <iframe title={selected.title} src={previewUrl} className="h-72 w-full rounded-xl border" /> : null}
              <DialogFooter>
                {previewUrl ? <Button variant="outline" className="h-11 rounded-2xl px-4 text-base" onClick={() => window.open(previewUrl, '_blank')}>Abrir</Button> : null}
                <Button variant="outline" className="h-11 rounded-2xl px-4 text-base" onClick={() => void download(selected)}>Baixar</Button>
                <Button className="h-11 rounded-2xl px-4 text-base" onClick={() => void favorite(selected)}>{isSaved(selected) ? 'Salvo' : 'Salvar'}</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {canSend ? (
        <DocumentEditor
          open={editorOpen}
          document={editing}
          onOpenChange={setEditorOpen}
          onSaved={(document) => { upsert(document); setEditorOpen(false); }}
        />
      ) : null}
    </>
  );
};

const DocumentEditor: FC<{
  open: boolean;
  document: CompanyDocument | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (document: CompanyDocument) => void;
}> = ({ open, document, onOpenChange, onSaved }) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('procedimentos');
  const [system, setSystem] = useState<DocumentSystem>('pincel');
  const [author, setAuthor] = useState(currentUser.name);
  const [date, setDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [featured, setFeatured] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(document?.title ?? '');
    setSubtitle(document?.subtitle ?? '');
    setDescription(document?.description ?? '');
    setCategory(document?.category ?? 'procedimentos');
    setSystem(document?.system ?? 'pincel');
    setAuthor(document?.author ?? currentUser.name);
    setDate((document?.publishedAt ?? new Date().toISOString()).slice(0, 10));
    setFile(null);
    setFeatured(document?.featured ?? false);
  }, [open, document]);

  async function submit(published: boolean) {
    try {
      await assertPermission('documents');
    } catch {
      toast.error('Você não tem permissão para enviar documentos.');
      return;
    }
    if (system !== 'pincel' && system !== 'prominas') {
      toast.error('Selecione Pincel Atômico ou Prominas.');
      return;
    }
    if (!title.trim() || !subtitle.trim() || !description.trim() || !author.trim() || !date) {
      toast.error('Preencha título, subtítulo, descrição, categoria, sistema, data e autor.');
      return;
    }
    if (!document && !file) {
      toast.error('Envie o arquivo do documento.');
      return;
    }
    const storedFile = file ? new Blob([await file.arrayBuffer()], { type: file.type || 'application/octet-stream' }) : document!.file;
    const next: CompanyDocument = {
      id: document?.id ?? newDocumentId(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      category,
      system,
      author: author.trim(),
      publishedAt: new Date(`${date}T12:00:00`).toISOString(),
      updatedAt: new Date().toISOString(),
      published,
      featured,
      fileName: file?.name ?? document!.fileName,
      fileType: file?.type || document?.fileType || 'application/octet-stream',
      file: storedFile,
      thumbnail: system === 'prominas' ? '/marcas/prominas.png' : '/marcas/pincel.png',
      downloads: document?.downloads ?? 0,
      favorites: document?.favorites ?? [],
    };
    await saveDocument(next);
    toast.success(published ? 'Documento publicado.' : 'Documento salvo sem publicação.');
    onSaved(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="bg-slate-900/25 backdrop-blur-md" className="max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-100 shadow-[0_8px_24px_rgba(15,23,42,0.08)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-gray-800">{document ? 'Editar documento' : 'Enviar documento'}</DialogTitle>
          <DialogDescription className="text-base text-gray-500">Categoria, sistema e arquivo ficam disponíveis para a equipe.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2"><Label htmlFor="doc-titulo" className="text-sm font-medium text-gray-600">Título</Label><Input id="doc-titulo" value={title} onChange={(event) => setTitle(event.target.value)} className="!h-11 rounded-2xl border-gray-100 bg-white text-base" /></div>
          <div className="grid gap-2"><Label htmlFor="doc-sub" className="text-sm font-medium text-gray-600">Subtítulo</Label><Input id="doc-sub" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className="!h-11 rounded-2xl border-gray-100 bg-white text-base" /></div>
          <div className="grid gap-2"><Label htmlFor="doc-desc" className="text-sm font-medium text-gray-600">Descrição</Label><Textarea id="doc-desc" value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-2xl border-gray-100 bg-white text-base" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
                <SelectTrigger className="!h-11 w-full rounded-2xl border-gray-100 bg-white text-base"><SelectValue /></SelectTrigger>
                <SelectContent>{DOCUMENT_CATEGORIES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Sistema de origem</Label>
              <Select value={system === 'pincel' || system === 'prominas' ? system : undefined} onValueChange={(value) => setSystem(value as DocumentSystem)}>
                <SelectTrigger className="!h-11 w-full rounded-2xl border-gray-100 bg-white text-base"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{ORIGIN_SYSTEMS.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
              {system === 'pincel' || system === 'prominas' ? <SystemMark system={system} size="md" /> : null}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="doc-data" className="text-sm font-medium text-gray-600">Data</Label><Input id="doc-data" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="!h-11 rounded-2xl border-gray-100 bg-white text-base" /></div>
            <div className="grid gap-2"><Label htmlFor="doc-autor" className="text-sm font-medium text-gray-600">Autor</Label><Input id="doc-autor" value={author} onChange={(event) => setAuthor(event.target.value)} className="!h-11 rounded-2xl border-gray-100 bg-white text-base" /></div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="doc-arquivo">Arquivo</Label>
            <Input id="doc-arquivo" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,.txt" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />Fixar na central</label>
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-11 rounded-2xl px-4 text-base" onClick={() => void submit(false)}>Salvar sem publicar</Button>
          <Button className="h-11 rounded-2xl px-4 text-base" onClick={() => void submit(true)}>Publicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
