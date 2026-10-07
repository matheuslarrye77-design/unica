import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  COVER_LIBRARY,
  JOURNAL_CATEGORIES,
  PIN_LIMIT,
  mediaKind,
  saveJournalArticle,
  type JournalArticle,
  type JournalCategory,
  type JournalMedia,
  type JournalStatus,
} from '@/data/journal';
import { cn } from '@/lib/utils';
import { useEffect, useState, type FC } from 'react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  article?: JournalArticle | null;
  author: string;
  pinnedCount: number;
  onOpenChange: (open: boolean) => void;
};

function todayInput() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toInputDate(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const JournalEditor: FC<Props> = ({ open, article, author, pinnedCount, onOpenChange }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<JournalCategory>('social');
  const [cover, setCover] = useState('');
  const [date, setDate] = useState(todayInput);
  const [authorName, setAuthorName] = useState(author);
  const [media, setMedia] = useState<JournalMedia[]>([]);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(article?.title ?? '');
    setContent(article?.content ?? '');
    setCategory(article?.category ?? 'social');
    setCover(article?.cover ?? '');
    setDate(article ? toInputDate(article.date) : todayInput());
    setAuthorName(article?.author ?? author);
    setMedia(article?.media ?? []);
    setPinned(article?.pinned ?? false);
  }, [open, article, author]);

  const pinAvailable = pinned || Boolean(article?.pinned) || pinnedCount < PIN_LIMIT;

  async function onCoverFile(file?: File) {
    if (!file) return;
    setCover(await readFile(file));
  }

  async function onAttachments(files: FileList | null) {
    if (!files?.length) return;
    const next = await Promise.all([...files].slice(0, 6).map(async (file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      kind: mediaKind(file),
      url: await readFile(file),
    })));
    setMedia((current) => [...current, ...next].slice(0, 6));
  }

  function publish(status: JournalStatus) {
    if (!title.trim() || !content.trim() || !authorName.trim() || !date) {
      toast.error('Preencha título, conteúdo, categoria, data e autor.');
      return;
    }
    if (status === 'published' && !cover) {
      toast.error('Selecione ou envie uma imagem de capa antes de publicar.');
      return;
    }
    const result = saveJournalArticle({
      title,
      content,
      category,
      cover,
      date,
      author: authorName,
      status,
      pinned,
      media,
    }, article?.id);
    if (result.pinBlocked) toast.error('Já existem 3 publicações fixadas. Esta foi salva sem destaque.');
    else toast.success(status === 'draft' ? 'Rascunho salvo.' : 'Publicação salva.');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{article ? 'Editar publicação' : 'Nova publicação'}</DialogTitle>
          <DialogDescription>Título, conteúdo, categoria, capa e materiais da notícia.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="jornal-titulo">Título</Label>
            <Input id="jornal-titulo" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="jornal-conteudo">Descrição</Label>
            <Textarea id="jornal-conteudo" value={content} onChange={(event) => setContent(event.target.value)} className="min-h-32" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as JournalCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOURNAL_CATEGORIES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jornal-data">Data</Label>
              <Input id="jornal-data" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="jornal-autor">Autor</Label>
            <Input id="jornal-autor" value={authorName} onChange={(event) => setAuthorName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Imagem de capa</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {COVER_LIBRARY.map((item) => (
                <button key={item.id} type="button" onClick={() => setCover(item.src)} className={cn('overflow-hidden rounded-lg border', cover === item.src ? 'ring-2 ring-primary' : '')} title={item.label}>
                  <img src={item.src} alt={item.label} className="aspect-[16/9] w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Label htmlFor="jornal-capa" className="inline-flex h-9 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium">
                {cover ? 'Substituir imagem' : 'Enviar imagem'}
              </Label>
              {cover ? <Button type="button" variant="outline" onClick={() => setCover('')}>Remover imagem</Button> : null}
            </div>
            <input id="jornal-capa" type="file" accept="image/*" className="sr-only" onChange={(event) => void onCoverFile(event.target.files?.[0])} />
            {cover ? <img src={cover} alt="Pré-visualização da capa" className="h-36 w-full rounded-xl object-cover" /> : <p className="text-sm text-muted-foreground">Nenhuma capa selecionada. Escolha uma foto da biblioteca ou envie a sua.</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="jornal-anexos">Áudio, vídeo, imagens e documentos</Label>
            <Input id="jornal-anexos" type="file" multiple accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" onChange={(event) => void onAttachments(event.target.files)} />
            {media.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {media.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{item.name}</span>
                    <button type="button" className="text-xs" onClick={() => setMedia((current) => current.filter((file) => file.id !== item.id))}>Remover</button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} disabled={!pinAvailable} onChange={(event) => setPinned(event.target.checked)} />
            Fixar em destaque {pinAvailable ? '' : `(limite de ${PIN_LIMIT})`}
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => publish('draft')}>Salvar como rascunho</Button>
          <Button type="button" onClick={() => publish('published')}>Publicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
