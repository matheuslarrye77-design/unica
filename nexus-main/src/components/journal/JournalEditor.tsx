import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { JournalCover } from '@/components/journal/JournalVisual';
import {
  JOURNAL_CATEGORIES,
  isUserCover,
  mediaKind,
  saveJournalArticle,
  type JournalArticle,
  type JournalCategory,
  type JournalMedia,
  type JournalStatus,
} from '@/data/journal';
import { useEffect, useState, type FC } from 'react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  article?: JournalArticle | null;
  author: string;
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

function compressImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('canvas'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    image.src = url;
  });
}

export const JournalEditor: FC<Props> = ({ open, article, author, onOpenChange }) => {
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
    setCover(article && isUserCover(article.cover) ? article.cover : '');
    setDate(article ? toInputDate(article.date) : todayInput());
    setAuthorName(article?.author ?? author);
    setMedia(article?.media ?? []);
    setPinned(article?.pinned ?? false);
  }, [open, article, author]);

  async function onCoverFile(file?: File) {
    if (!file) return;
    setCover(file.type.startsWith('image/') ? await compressImage(file) : await readFile(file));
  }

  async function onAttachments(files: FileList | null) {
    if (!files?.length) return;
    const next = await Promise.all([...files].slice(0, 6).map(async (file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      kind: mediaKind(file),
      url: file.type.startsWith('image/') ? await compressImage(file) : await readFile(file),
    })));
    setMedia((current) => [...current, ...next].slice(0, 6));
  }

  function publish(status: JournalStatus) {
    if (!title.trim() || !content.trim() || !authorName.trim() || !date) {
      toast.error('Preencha título, conteúdo, categoria, data e autor.');
      return;
    }
    try {
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
      if (result.replacedId) toast.success('Publicação salva. A mais antiga saiu do destaque.');
      else toast.success(status === 'draft' ? 'Rascunho salvo.' : 'Publicação salva.');
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível salvar. A imagem pode ter ficado grande demais.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{article ? 'Editar publicação' : 'Nova publicação'}</DialogTitle>
          <DialogDescription>Título, conteúdo, categoria e materiais da notícia. A imagem de capa é opcional.</DialogDescription>
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
            <div className="flex flex-wrap gap-2">
              <Label htmlFor="jornal-capa" className="inline-flex h-9 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium">
                {cover ? 'Substituir imagem' : 'Enviar imagem'}
              </Label>
              {cover ? <Button type="button" variant="outline" onClick={() => setCover('')}>Remover imagem</Button> : null}
            </div>
            <input id="jornal-capa" type="file" accept="image/*" className="sr-only" onChange={(event) => void onCoverFile(event.target.files?.[0])} />
            {cover ? <img src={cover} alt="Pré-visualização da capa" className="h-36 w-full rounded-xl object-cover" /> : (
              <>
                <p className="text-sm text-muted-foreground">Sem imagem, a publicação usa a capa da categoria.</p>
                <JournalCover article={{ title, content, category, cover: '', media: [] }} />
              </>
            )}
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
            <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
            Fixar em destaque. Se já houver três, a mais antiga sai.
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
