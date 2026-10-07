import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_SYSTEMS,
  DOCUMENT_THUMBNAILS,
  canManageDocuments,
  categoryLabel,
  deleteDocument,
  downloadDocument,
  loadDocuments,
  newDocumentId,
  registerDownload,
  saveDocument,
  systemLabel,
  toggleFavorite,
  type CompanyDocument,
  type DocumentCategory,
  type DocumentSystem,
} from '@/data/documents';
import { currentUser } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Download, MoreHorizontal, Plus, Search, Star } from 'lucide-react';
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

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const ResourcesPage: FC = () => {
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [category, setCategory] = useState<CategoryFilter>('todos');
  const [system, setSystem] = useState<'todos' | DocumentSystem>('todos');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('az');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selected, setSelected] = useState<CompanyDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyDocument | null>(null);
  const canManage = canManageDocuments(currentUser);

  useEffect(() => {
    loadDocuments().then(setDocuments).catch(() => toast.error('Não foi possível abrir a central de documentos.'));
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
      if (!document.published && !canManage) return false;
      if (category !== 'todos' && document.category !== category) return false;
      if (system !== 'todos' && document.system !== system) return false;
      if (onlyFavorites && !document.favorites.includes(currentUser.id)) return false;
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
  }, [documents, category, system, query, sort, onlyFavorites, canManage]);

  const featured = documents.filter((document) => document.featured && document.published && (category === 'todos' || document.category === category) && (system === 'todos' || document.system === system));
  const favorites = documents.filter((document) => document.favorites.includes(currentUser.id) && (document.published || canManage));

  function upsert(document: CompanyDocument) {
    setDocuments((current) => {
      const exists = current.some((item) => item.id === document.id);
      return (exists ? current.map((item) => (item.id === document.id ? document : item)) : [document, ...current]);
    });
    setSelected((current) => (current?.id === document.id ? document : current));
  }

  async function favorite(document: CompanyDocument) {
    upsert(await toggleFavorite(document, currentUser.id));
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
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex w-full flex-col gap-8 px-4 py-6 lg:flex-row lg:items-start sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Central de Documentos</h1>
              <p className="mt-1 text-sm text-muted-foreground">Encontre procedimentos, requerimentos, orientações e documentos internos.</p>
            </div>
            <div className="flex gap-2">
              {canManage ? <Button className="gap-2" onClick={() => openEditor()}><Plus className="h-4 w-4" />Enviar documento</Button> : null}
            </div>
          </div>

          <div className="mb-8 flex flex-col gap-3 sm:flex-row">
            <label className="relative block flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar documentos..." className="pl-9" />
            </label>
            <Select value={system} onValueChange={(value) => setSystem(value as 'todos' | DocumentSystem)}>
              <SelectTrigger className="sm:w-52"><SelectValue placeholder="Sistema/Área" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os sistemas</SelectItem>
                {DOCUMENT_SYSTEMS.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Ordenar" /></SelectTrigger>
              <SelectContent>
                {sorts.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {featured.length > 0 && !onlyFavorites && !query ? (
            <section className="mb-10">
              <h2 className="mb-3 text-lg font-semibold">Destaques</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {featured.slice(0, 3).map((document) => (
                  <button key={document.id} type="button" onClick={() => setSelected(document)} className="overflow-hidden rounded-2xl border bg-card text-left shadow-[0_1px_2px_rgba(40,20,70,0.04)]">
                    <img src={document.thumbnail} alt="" className="h-32 w-full object-cover" />
                    <div className="space-y-1 p-4">
                      <p className="text-xs text-muted-foreground">{categoryLabel(document.category)} · {systemLabel(document.system)}</p>
                      <h3 className="font-semibold">{document.title}</h3>
                      <p className="text-sm text-muted-foreground">{document.subtitle}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(document.updatedAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-lg font-semibold">Todos os documentos</h2>
            {visible.length === 0 ? (
              <p className="rounded-2xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">Nenhum documento encontrado.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {visible.map((document) => {
                  const favored = document.favorites.includes(currentUser.id);
                  return (
                    <article key={document.id} className="grid gap-4 rounded-2xl border bg-card p-3 shadow-[0_1px_2px_rgba(40,20,70,0.04)] sm:grid-cols-[7rem_1fr_auto]">
                      <button type="button" onClick={() => setSelected(document)} className="text-left sm:contents">
                        <img src={document.thumbnail} alt="" className="h-24 w-full rounded-xl object-cover sm:h-full" />
                        <span className="block py-1">
                          <span className="block font-semibold">{document.title}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{categoryLabel(document.category)} · {systemLabel(document.system)}{document.published ? '' : ' · Rascunho'}</span>
                          <span className="mt-1 block text-sm text-muted-foreground">{document.subtitle}</span>
                          <span className="mt-2 block text-xs text-muted-foreground">Atualizado em {formatDate(document.updatedAt)}</span>
                        </span>
                      </button>
                      <div className="flex items-start gap-1">
                        <button type="button" aria-label={favored ? 'Remover dos favoritos' : 'Favoritar'} onClick={() => void favorite(document)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                          <Star className={cn('h-4 w-4', favored && 'fill-primary text-primary')} />
                        </button>
                        <button type="button" aria-label="Baixar" onClick={() => void download(document)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                          <Download className="h-4 w-4" />
                        </button>
                        {canManage ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" aria-label="Mais ações" className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditor(document)}>Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void saveDocument({ ...document, published: !document.published, updatedAt: new Date().toISOString() }).then(() => upsert({ ...document, published: !document.published, updatedAt: new Date().toISOString() }))}>{document.published ? 'Despublicar' : 'Publicar'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void saveDocument({ ...document, featured: !document.featured }).then(() => upsert({ ...document, featured: !document.featured }))}>{document.featured ? 'Remover destaque' : 'Definir destaque'}</DropdownMenuItem>
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
        </div>

        <RightSidebar>
          <div className="rounded-2xl border bg-sidebar p-3 text-sidebar-foreground">
            <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">Categorias</p>
            {([{ id: 'todos', label: 'Todos' }, ...DOCUMENT_CATEGORIES] as const).map((item) => (
              <button key={item.id} type="button" onClick={() => { setCategory(item.id); setOnlyFavorites(false); }} className={cn('block w-full rounded-lg px-3 py-2 text-left text-sm font-medium', category === item.id && !onlyFavorites ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>
                {item.label}
              </button>
            ))}
            <p className="mt-4 mb-1 px-1 text-xs font-medium text-muted-foreground">Filtros rápidos</p>
            <button type="button" onClick={() => { setSort('recent'); setOnlyFavorites(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">Mais recentes</button>
            <button type="button" onClick={() => { setSort('accessed'); setOnlyFavorites(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">Mais acessados</button>
            <button type="button" onClick={() => setOnlyFavorites((value) => !value)} className={cn('block w-full rounded-lg px-3 py-2 text-left text-sm font-medium', onlyFavorites ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>Favoritos</button>
            <p className="mt-4 mb-1 px-1 text-xs font-medium text-muted-foreground">Meus favoritos</p>
            {favorites.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum favorito ainda.</p> : favorites.slice(0, 6).map((document) => (
              <button key={document.id} type="button" onClick={() => setSelected(document)} className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">{document.title}</button>
            ))}
          </div>
        </RightSidebar>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>{selected.subtitle}</DialogDescription>
              </DialogHeader>
              <img src={selected.thumbnail} alt="" className="h-40 w-full rounded-xl object-cover" />
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

      {canManage ? (
        <DocumentEditor
          open={editorOpen}
          document={editing}
          onOpenChange={setEditorOpen}
          onSaved={(document) => { upsert(document); setEditorOpen(false); }}
        />
      ) : null}
    </div>
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
  const [thumbnail, setThumbnail] = useState<string>(DOCUMENT_THUMBNAILS[0].src);
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
    setThumbnail(document?.thumbnail ?? DOCUMENT_THUMBNAILS[0].src);
    setFile(null);
    setFeatured(document?.featured ?? false);
  }, [open, document]);

  async function submit(published: boolean) {
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
      thumbnail,
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
              <Label>Sistema/Área</Label>
              <Select value={system} onValueChange={(value) => setSystem(value as DocumentSystem)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOCUMENT_SYSTEMS.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
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
          <div className="grid gap-2">
            <Label>Imagem</Label>
            <div className="grid grid-cols-5 gap-2">
              {DOCUMENT_THUMBNAILS.map((item) => (
                <button key={item.id} type="button" title={item.label} onClick={() => setThumbnail(item.src)} className={cn('overflow-hidden rounded-lg border', thumbnail === item.src && 'ring-2 ring-primary')}>
                  <img src={item.src} alt={item.label} className="aspect-[8/5] w-full object-cover" />
                </button>
              ))}
            </div>
            <Label htmlFor="doc-thumb" className="inline-flex h-9 w-fit cursor-pointer items-center rounded-lg border px-3 text-sm font-medium">Enviar imagem</Label>
            <input id="doc-thumb" className="sr-only" type="file" accept="image/*" onChange={(event) => { const image = event.target.files?.[0]; if (image) void readFile(image).then(setThumbnail); }} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />Definir como destaque</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => void submit(false)}>Salvar sem publicar</Button>
          <Button onClick={() => void submit(true)}>Publicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
