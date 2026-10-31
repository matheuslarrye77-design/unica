import { AudioTrim } from '@/components/social/AudioTrim';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { JournalCover, categoryTone } from '@/components/journal/JournalVisual';
import { useJournalCovers } from '@/components/journal/useJournal';
import {
  CONTENT_LIMIT,
  JOURNAL_CATEGORIES,
  TITLE_LIMIT,
  articleSummary,
  categoryLabel,
  categoryLocksDate,
  deleteJournalCover,
  isUserCover,
  readingMinutes,
  resolveJournalAsset,
  saveJournalArticle,
  saveJournalCover,
  type JournalArticle,
  type JournalCategory,
  type JournalMedia,
  type JournalStatus,
} from '@/data/journal';
import { uploadMedia } from '@/lib/feed';
import { cn, generateId } from '@/lib/utils';
import { Calendar, ChevronDown, Eye, FileText, Image as ImageIcon, Info, Megaphone, Paperclip, Send, Trash2, Type, X } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent, type FC } from 'react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  article?: JournalArticle | null;
  author: string;
  onOpenChange: (open: boolean) => void;
};

const COVER_MAX = 5 * 1024 * 1024;
const AUDIO_MAX = 80 * 1024 * 1024;
const VIDEO_MAX = 200 * 1024 * 1024;
const DOC_MAX = 40 * 1024 * 1024;

const dot: Record<JournalCategory, string> = {
  social: 'bg-[#8E35B8]',
  processos: 'bg-[#3A6AAD]',
  urgente: 'bg-[#E11D48]',
  treinamentos: 'bg-[#15803D]',
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

function imageFile(file: File) {
  return file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' || /\.(jpe?g|png|webp)$/i.test(file.name);
}

export const JournalEditor: FC<Props> = ({ open, article, author, onOpenChange }) => {
  const covers = useJournalCovers();
  const coverInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const documentInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<JournalCategory>('social');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [cover, setCover] = useState('');
  const [library, setLibrary] = useState(false);
  const [removingCover, setRemovingCover] = useState<string | null>(null);
  const [date, setDate] = useState(todayInput);
  const [authorName, setAuthorName] = useState(author);
  const [media, setMedia] = useState<JournalMedia[]>([]);
  const [pinned, setPinned] = useState(false);
  const [preview, setPreview] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [sending, setSending] = useState('');
  const dateLocked = categoryLocksDate(category);
  const coverUrl = resolveJournalAsset(cover);

  useEffect(() => {
    if (!open) return;
    setTitle(article?.title ?? '');
    setContent(article?.content ?? '');
    setCategory(article?.category ?? 'social');
    setCover(article && (article.cover.startsWith('lib:') || isUserCover(article.cover)) ? article.cover : '');
    setDate(article && !categoryLocksDate(article.category) ? toInputDate(article.date) : todayInput());
    setAuthorName(article?.author ?? author);
    setMedia(article?.media ?? []);
    setPinned(article?.pinned ?? false);
    setPreview(false);
    setLibrary(false);
    setAudioFile(null);
    setCategoryOpen(false);
  }, [open, article, author]);

  useEffect(() => {
    if (dateLocked) setDate(todayInput());
  }, [dateLocked]);

  async function storeImage(file: File) {
    if (!imageFile(file)) {
      toast.error('Use uma imagem JPG, PNG ou WEBP.');
      return '';
    }
    if (file.size > COVER_MAX) {
      toast.error('A imagem passa de 5 MB.');
      return '';
    }
    try {
      const asset = saveJournalCover(await compressImage(file));
      return `lib:${asset.id}`;
    } catch {
      toast.error('Não foi possível guardar a imagem na biblioteca.');
      return '';
    }
  }

  async function onCoverFile(file?: File) {
    if (!file) return;
    const stored = await storeImage(file);
    if (stored) {
      setCover(stored);
      setLibrary(false);
    }
  }

  async function addUpload(file: File, kind: JournalMedia['kind']) {
    const limit = kind === 'video' ? VIDEO_MAX : kind === 'audio' ? AUDIO_MAX : DOC_MAX;
    if (file.size > limit) {
      toast.error(kind === 'video' ? 'O vídeo passa de 200 MB.' : kind === 'audio' ? 'O áudio passa de 80 MB.' : 'O documento passa de 40 MB.');
      return;
    }
    setSending(kind);
    try {
      const uploaded = await uploadMedia(file);
      const item: JournalMedia = { id: generateId(), name: uploaded.name || file.name, kind, url: uploaded.url };
      setMedia((current) => [...current, item].slice(0, 8));
    } catch {
      toast.error('Não foi possível enviar o arquivo. Tente novamente.');
    } finally {
      setSending('');
    }
  }

  async function addImageAttachment(file?: File) {
    if (!file) return;
    const stored = await storeImage(file);
    if (!stored) return;
    const item: JournalMedia = { id: generateId(), name: file.name, kind: 'image', url: stored };
    setMedia((current) => [...current, item].slice(0, 8));
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void onCoverFile(file);
  }

  function chooseCategory(next: JournalCategory) {
    setCategory(next);
    setCategoryOpen(false);
    if (categoryLocksDate(next)) setDate(todayInput());
  }

  function publish(status: JournalStatus) {
    if (!title.trim() || !content.trim() || !authorName.trim() || !date) {
      toast.error('Preencha título, descrição e categoria.');
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

  const previewArticle = {
    title: title || 'Título da publicação',
    content,
    category,
    cover,
    media,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto rounded-[28px] border-[#E7E0F0] bg-white p-5 shadow-[0_24px_80px_rgba(70,30,110,0.16)] sm:max-w-[680px]">
        <div className="mb-4 flex items-start gap-3 pr-8">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]">
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-[22px] font-semibold tracking-tight text-[#241B33]">{article ? 'Editar publicação' : 'Nova publicação'}</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px] text-[#8A7C98]">Título, conteúdo, categoria e materiais da notícia. A imagem de capa é opcional.</DialogDescription>
          </div>
        </div>

        {audioFile ? (
          <AudioTrim
            file={audioFile}
            onCancel={() => setAudioFile(null)}
            onConfirm={(file, clip) => {
              setAudioFile(null);
              setSending('audio');
              void uploadMedia(file).then((uploaded) => {
                const item: JournalMedia = { id: generateId(), name: 'Áudio', kind: 'audio', url: uploaded.url, start: clip.start, duration: clip.duration };
                setMedia((current) => [...current, item].slice(0, 8));
              }).catch(() => {
                toast.error('Não foi possível enviar o áudio. Tente novamente.');
              }).finally(() => setSending(''));
            }}
          />
        ) : preview ? (
          <div>
            <div className="rounded-[22px] border border-[#EFE8F4] bg-white p-3.5 shadow-[0_10px_28px_rgba(80,40,120,0.06)]">
              <JournalCover article={previewArticle} />
              <h3 className="mt-3.5 text-[17px] font-semibold leading-snug text-[#1A1428]">{previewArticle.title}</h3>
              <p className="mt-2 text-[13px] leading-5 text-[#625C70]">{articleSummary(content) || 'A descrição aparece aqui.'}</p>
              <p className="mt-3 text-[12.5px] text-[#948D9E]">{new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })} · {readingMinutes(content || 'texto')} min</p>
              <p className="mt-3 text-[13.5px] font-semibold text-[#6A228C]">{authorName}</p>
            </div>
            {media.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-[#625C70]">
                {media.map((item) => <li key={item.id}>{item.kind === 'audio' ? 'Áudio' : item.kind === 'video' ? 'Vídeo' : item.kind === 'image' ? 'Imagem' : 'Documento'}: {item.name}</li>)}
              </ul>
            ) : null}
            <button type="button" onClick={() => setPreview(false)} className="mt-4 h-10 rounded-full px-4 text-sm font-semibold text-[#6A228C] hover:bg-[#F3E4FA]">Voltar à edição</button>
          </div>
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#241B33]"><Type className="h-3.5 w-3.5 text-[#8E35B8]" /> Título</span>
              <span className="relative">
                <input value={title} maxLength={TITLE_LIMIT} onChange={(event) => setTitle(event.target.value.slice(0, TITLE_LIMIT))} placeholder="Digite o título da publicação..." className="h-12 w-full rounded-2xl border border-[#E6DEEF] bg-[#FBF9FD] px-4 pr-16 text-[14px] outline-none placeholder:text-[#B0A8BA] focus:border-[#C9A4DE]" />
                <span className="absolute top-1/2 right-4 -translate-y-1/2 text-[12px] text-[#B0A8BA]">{title.length}/{TITLE_LIMIT}</span>
              </span>
            </label>
            <label className="grid gap-1.5">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#241B33]"><FileText className="h-3.5 w-3.5 text-[#8E35B8]" /> Descrição</span>
              <span className="relative">
                <textarea value={content} maxLength={CONTENT_LIMIT} onChange={(event) => setContent(event.target.value.slice(0, CONTENT_LIMIT))} placeholder="Escreva uma descrição sobre a publicação..." className="min-h-36 w-full resize-y rounded-2xl border border-[#E6DEEF] bg-[#FBF9FD] px-4 py-3 pr-16 text-[14px] outline-none placeholder:text-[#B0A8BA] focus:border-[#C9A4DE]" />
                <span className="absolute right-4 bottom-3 text-[12px] text-[#B0A8BA]">{content.length}/{CONTENT_LIMIT}</span>
              </span>
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
              <div className="relative">
                <button type="button" aria-expanded={categoryOpen} onClick={() => setCategoryOpen((current) => !current)} className="flex h-12 w-full items-center gap-2 rounded-2xl border border-[#E6DEEF] bg-white px-3 text-left text-[14px] font-medium">
                  <span className={cn('h-2.5 w-2.5 rounded-full', dot[category])} />
                  <span className="min-w-0 flex-1 truncate">{categoryLabel(category)}</span>
                  <ChevronDown className="h-4 w-4 text-[#8A7C98]" />
                </button>
                {categoryOpen ? (
                  <div className="absolute z-20 mt-1 w-full rounded-2xl border border-[#E6DEEF] bg-white p-1 shadow-[0_12px_32px_rgba(70,30,110,0.12)]">
                    {JOURNAL_CATEGORIES.map((item) => (
                      <button key={item.id} type="button" onClick={() => chooseCategory(item.id)} className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[14px]', category === item.id && categoryTone[item.id].badge)}>
                        <span className={cn('h-2.5 w-2.5 rounded-full', dot[item.id])} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <label className={cn('relative flex h-12 items-center rounded-2xl border border-[#E6DEEF] bg-white px-3', dateLocked && 'bg-[#F7F4FA] text-[#8A7C98]')}>
                <Calendar className="pointer-events-none absolute right-3 h-4 w-4 text-[#8A7C98]" />
                <input type="date" value={date} disabled={dateLocked} onChange={(event) => setDate(event.target.value)} aria-label="Data" title={dateLocked ? 'Nesta categoria a data fica no dia de hoje.' : 'Data da publicação'} className="h-full w-full bg-transparent pr-7 text-[14px] outline-none disabled:cursor-not-allowed" />
              </label>
            </div>
            <div className="grid gap-2">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#241B33]"><ImageIcon className="h-3.5 w-3.5 text-[#8E35B8]" /> Imagem de capa</span>
              <button type="button" onClick={() => setLibrary((current) => !current)} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className="overflow-hidden rounded-2xl border border-dashed border-[#D9C6E8] bg-[#FBF9FD] text-left">
                {coverUrl ? (
                  <span className="relative block">
                    <img src={coverUrl} alt="Pré-visualização da capa" className="aspect-[1400/320] w-full rounded-[18px] object-cover" />
                    <span className="absolute right-3 bottom-3 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-[#6A228C]">Trocar imagem</span>
                  </span>
                ) : (
                  <span className="flex min-h-28 flex-col items-center justify-center gap-1 px-4 py-6 text-center">
                    <span className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]"><ImageIcon className="h-6 w-6" /></span>
                    <span className="text-[14px] font-medium text-[#5C5470]">Arraste uma imagem aqui ou clique para selecionar</span>
                    <span className="text-[12px] text-[#8A7C98]">Formatos: JPG, PNG, WEBP • Tamanho máximo: 5MB</span>
                  </span>
                )}
              </button>
              {library ? (
                <div className="rounded-2xl border border-[#E6DEEF] bg-white p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold">Biblioteca de imagens</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => coverInput.current?.click()} className="rounded-full bg-[#F3E4FA] px-3 py-1.5 text-[12px] font-semibold text-[#6A228C]">Enviar nova imagem</button>
                      <button type="button" aria-label="Fechar biblioteca" onClick={() => setLibrary(false)} className="grid h-8 w-8 place-items-center rounded-full text-[#8A7C98]"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {covers.length === 0 ? <p className="py-4 text-center text-sm text-[#8A7C98]">Nenhuma imagem salva ainda. Envie uma para reutilizar nas próximas publicações.</p> : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {covers.map((item) => (
                        <div key={item.id} className="relative">
                          <button type="button" onClick={() => { setCover(`lib:${item.id}`); setLibrary(false); }} className={cn('block w-full overflow-hidden rounded-xl border', cover === `lib:${item.id}` ? 'border-[#8E35B8]' : 'border-transparent')}>
                            <img src={item.url} alt="" className="aspect-[4/3] w-full object-cover" />
                          </button>
                          {removingCover === item.id ? (
                            <button type="button" className="absolute inset-0 grid place-items-center rounded-xl bg-white/95 px-2 text-center text-[11px] font-semibold text-[#9D174D]" onClick={() => { deleteJournalCover(item.id); if (cover === `lib:${item.id}`) setCover(''); setRemovingCover(null); }}>Confirmar exclusão</button>
                          ) : (
                            <button type="button" aria-label="Excluir imagem da biblioteca" className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[#9D174D] shadow" onClick={() => setRemovingCover(item.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void onCoverFile(file); }} />
            </div>
            {media.length > 0 ? (
              <ul className="space-y-1">
                {media.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#FBF9FD] px-3 py-2 text-[13px]">
                    <span className="truncate">{item.name}</span>
                    <button type="button" className="text-[12px] font-semibold text-[#9D174D]" onClick={() => setMedia((current) => current.filter((file) => file.id !== item.id))}>Remover</button>
                  </li>
                ))}
              </ul>
            ) : null}
            {sending ? <p className="text-[12px] text-[#8A7C98]">Enviando {sending === 'audio' ? 'áudio' : sending === 'video' ? 'vídeo' : 'arquivo'}...</p> : null}
            <label className="flex items-center gap-2 text-[14px] text-[#241B33]">
              <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} className="h-4 w-4 accent-[#7A2498]" />
              Fixar como destaque
              <span title="Se já houver três publicações fixadas, a mais antiga sai do destaque." className="grid h-4 w-4 place-items-center rounded-full text-[#8A7C98]"><Info className="h-3.5 w-3.5" /></span>
            </label>
            <div className="flex items-center justify-between gap-3 border-t border-[#F0E8F4] pt-3">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-10 items-center gap-2 rounded-full border border-[#E6DEEF] bg-white px-3 text-[13px] font-semibold text-[#5C5470]">
                    <Paperclip className="h-4 w-4" /> Arquivos <ChevronDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-2xl">
                    <DropdownMenuItem onSelect={() => audioInput.current?.click()}>Enviar áudio</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => videoInput.current?.click()}>Enviar vídeo</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => imageInput.current?.click()}>Enviar imagem</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => documentInput.current?.click()}>Enviar documentos</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button type="button" onClick={() => publish('draft')} className="h-10 rounded-full px-3 text-[13px] font-semibold text-[#6A228C] hover:bg-[#F3E4FA]">Rascunho</button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Pré-visualizar" onClick={() => setPreview(true)} className="grid h-11 w-11 place-items-center rounded-full border border-[#E6DEEF] bg-white text-[#6A228C] hover:bg-[#F3E4FA]">
                  <Eye className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => publish('published')} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#7A2498] px-5 text-[14px] font-semibold text-white hover:bg-[#6A228C]">
                  <Send className="h-4 w-4" /> Publicar
                </button>
              </div>
            </div>
            <input ref={audioInput} type="file" accept="audio/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (file.size > AUDIO_MAX) { toast.error('O áudio passa de 80 MB.'); return; } setAudioFile(file); }} />
            <input ref={videoInput} type="file" accept="video/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void addUpload(file, 'video'); }} />
            <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void addImageAttachment(file); }} />
            <input ref={documentInput} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void addUpload(file, 'document'); }} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
