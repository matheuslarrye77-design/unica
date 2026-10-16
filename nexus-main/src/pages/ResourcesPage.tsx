import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SystemMark } from '@/components/documents/SystemMark';
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
import { CalendarDays, ChevronRight, Download, FileText, Filter, MoreHorizontal, Plus, Search, Star } from 'lucide-react';
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
  const [query, setQuery] = useState('');
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
    const text = query.trim().toLowerCase();
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
  }, [documents, category, system, query, sort, canManage, canSend]);

  const featured = documents.filter((document) => document.featured && document.published && (category === 'todos' || document.category === category) && (system === 'todos' || document.system === system)).slice(0, 3);
  const favoriteOrder = ['doc-pontividade', 'doc-boletim', 'doc-financeiro', 'doc-prominas'];
  const favorites = documents
    .filter((document) => (favoriteIds.includes(document.id) || document.favorites.includes(currentUser.id)) && (document.published || canManage || canSend))
    .sort((a, b) => {
      const left = favoriteOrder.indexOf(a.id);
      const right = favoriteOrder.indexOf(b.id);
      return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
    });

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
    if (!response.ok) toast.error('Não foi possível salvar o favorito.');
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

  return (
    <>
    <PageFrame rail={
          <section className="rounded-[22px] border border-[#F0E7F6] bg-white p-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[#2C2433]">
                <Star className="h-4 w-4 fill-[#8E35B8] text-[#8E35B8]" /> Meus favoritos
              </h2>
              <button type="button" onClick={() => document.getElementById('todos-documentos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="text-[12.5px] font-medium text-[#8E35B8]">Ver todos</button>
            </div>
            {favorites.length === 0 ? <p className="px-1 py-3 text-[13px] text-[#8A7C98]">Nenhum favorito ainda.</p> : (
              <ul className="mt-3 grid gap-2">
                {favorites.map((document) => (
                  <li key={document.id}>
                    <button type="button" onClick={() => setSelected(document)} className="flex w-full items-center gap-2.5 rounded-xl px-1 py-1.5 text-left hover:bg-[#FBF7FC]">
                      <SystemMark system={document.system} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[#2C2433]">{document.title}</span>
                        <span className="block truncate text-[11.5px] text-[#8A7C98]">{categoryLabel(document.category)} · {systemLabel(document.system)}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#C4B6D4]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
    }>
          <section>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]">
                <FileText className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <div>
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#241B33]">Central de Documentos</h1>
            <p className="mt-1 text-[13.5px] text-[#8A7C98]">Encontre procedimentos, requerimentos, orientações e documentos internos.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="relative block min-w-[220px] max-w-xl flex-1">
                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#B7A8C4]" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar documentos..." className="h-11 rounded-xl border-[#E7DFF0] bg-white pl-10 shadow-none" />
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="h-11 rounded-xl border-[#E7DFF0] bg-white px-4 text-[#5C5168] shadow-none">
                    <Filter className="h-4 w-4" /> Filtrar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => { setCategory('todos'); setSystem('todos'); setSort('az'); }}>Limpar filtros</DropdownMenuItem>
                  {DOCUMENT_CATEGORIES.map((item) => (
                    <DropdownMenuItem key={item.id} onClick={() => setCategory(item.id)}>{item.label}</DropdownMenuItem>
                  ))}
                  {ORIGIN_SYSTEMS.map((item) => (
                    <DropdownMenuItem key={item.id} onClick={() => setSystem(item.id)}>{item.label}</DropdownMenuItem>
                  ))}
                  {sorts.map((item) => (
                    <DropdownMenuItem key={item.id} onClick={() => setSort(item.id)}>{item.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </section>

          {featured.length > 0 && !query ? (
            <section className="mt-6">
              <h2 className="mb-3 flex items-center gap-2 text-[16px] font-semibold text-[#2C2433]">
                <Star className="h-4 w-4 fill-[#8E35B8] text-[#8E35B8]" /> Fixados
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                {featured.map((document) => (
                  <button key={document.id} type="button" onClick={() => setSelected(document)} className="flex items-start gap-3 rounded-2xl border border-[#F0E7F6] bg-white p-3.5 text-left shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
                    <SystemMark system={document.system} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] text-[#8A7C98]">{categoryLabel(document.category)} · {systemLabel(document.system)}</span>
                      <span className="mt-1 block text-[14.5px] font-semibold leading-snug text-[#2C2433]">{document.title}</span>
                      <span className="mt-1 block text-[12.5px] leading-snug text-[#8A7C98]">{document.subtitle}</span>
                      <span className="mt-3 flex items-center gap-1.5 text-[12px] text-[#8A7C98]"><CalendarDays className="h-3.5 w-3.5" />{formatDate(document.updatedAt)}</span>
                    </span>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#C4B6D4]" />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section id="todos-documentos" className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[16px] font-semibold text-[#2C2433]">Todos os documentos</h2>
              {canSend ? <Button className="h-9 rounded-xl bg-[#8E35B8] hover:bg-[#7A2CA0]" onClick={() => openEditor()}><Plus className="h-4 w-4" />Enviar documento</Button> : null}
            </div>
            {visible.length === 0 ? (
              <p className="rounded-2xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">Nenhum documento encontrado.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {visible.map((document) => {
                  const favored = document.favorites.includes(currentUser.id);
                  return (
                    <article key={document.id} className="flex items-center gap-4 rounded-2xl border border-[#F0E7F6] bg-white px-4 py-3 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
                      <button type="button" onClick={() => setSelected(document)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <SystemMark system={document.system} />
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold text-[#2C2433]">{document.title}</span>
                          <span className="mt-0.5 block text-[12px] text-[#8A7C98]">{categoryLabel(document.category)} · {systemLabel(document.system)}{document.published ? '' : ' · Rascunho'}</span>
                          <span className="mt-0.5 block text-[13px] text-[#5C5168]">{document.subtitle}</span>
                          <span className="mt-1.5 block text-[12px] text-[#8A7C98]">Atualizado em {formatDate(document.updatedAt)}</span>
                        </span>
                      </button>
                      <div className="flex items-start gap-1">
                        <button type="button" aria-label={favored ? 'Remover dos favoritos' : 'Favoritar'} onClick={() => void favorite(document)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                          <Star className={cn('h-4 w-4', favored && 'fill-primary text-primary')} />
                        </button>
                        <button type="button" aria-label="Baixar" onClick={() => void download(document)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                          <Download className="h-4 w-4" />
                        </button>
                        {canSend ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" aria-label="Mais ações" className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>{selected.subtitle}</DialogDescription>
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
                {previewUrl ? <Button variant="outline" onClick={() => window.open(previewUrl, '_blank')}>Abrir</Button> : null}
                <Button variant="outline" onClick={() => void download(selected)}>Baixar</Button>
                <Button onClick={() => void favorite(selected)}>{selected.favorites.includes(currentUser.id) ? 'Favorito' : 'Favoritar'}</Button>
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{document ? 'Editar documento' : 'Enviar documento'}</DialogTitle>
          <DialogDescription>Categoria, sistema e arquivo ficam disponíveis para a equipe.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2"><Label htmlFor="doc-titulo">Título</Label><Input id="doc-titulo" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="doc-sub">Subtítulo</Label><Input id="doc-sub" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="doc-desc">Descrição</Label><Textarea id="doc-desc" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOCUMENT_CATEGORIES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Sistema de origem</Label>
              <Select value={system === 'pincel' || system === 'prominas' ? system : undefined} onValueChange={(value) => setSystem(value as DocumentSystem)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{ORIGIN_SYSTEMS.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
              {system === 'pincel' || system === 'prominas' ? <SystemMark system={system} size="md" /> : null}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="doc-data">Data</Label><Input id="doc-data" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="doc-autor">Autor</Label><Input id="doc-autor" value={author} onChange={(event) => setAuthor(event.target.value)} /></div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="doc-arquivo">Arquivo</Label>
            <Input id="doc-arquivo" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,.txt" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />Fixar na central</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => void submit(false)}>Salvar sem publicar</Button>
          <Button onClick={() => void submit(true)}>Publicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
