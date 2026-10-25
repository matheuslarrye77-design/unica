import { AudioLines, FileText, ImagePlus, ListChecks, Send, Video, X } from 'lucide-react';
import { type ChangeEvent, type ClipboardEvent, type FC, type FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadMedia } from '@/lib/feed';
import { actor } from '@/lib/session';
import { AudioTrim } from './AudioTrim';
import { ComposerExtras } from './ComposerExtras';
import { ImageAdjust } from './ImageAdjust';
import type { Attachment, PollOption, PostBlock } from './types';

const VIDEO_MAX = 200 * 1024 * 1024;
const DOC_MAX = 40 * 1024 * 1024;
const AUDIO_MAX = 80 * 1024 * 1024;

type DraftBlock = { id: string; type: 'text'; text: string } | { id: string; type: 'image'; url: string };

export type NewPostDraft = {
  body: string;
  images?: string[];
  blocks?: PostBlock[];
  attachment?: Attachment;
  poll?: PollOption[];
};

function clipboardFile(data: DataTransfer | null) {
  if (!data) return null;
  const direct = [...data.files].find((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
  if (direct) return direct;
  for (const item of data.items) {
    if (item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('video/'))) return item.getAsFile();
  }
  return null;
}

export const CreatePost: FC<{ onPublish: (draft: NewPostDraft) => void | Promise<void> }> = ({ onPublish }) => {
  const [writing, setWriting] = useState(false);
  const [blocks, setBlocks] = useState<DraftBlock[]>([{ id: 'texto-inicial', type: 'text', text: '' }]);
  const [editing, setEditing] = useState<File | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const [progress, setProgress] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const focusId = useRef('texto-inicial');
  const fields = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function openEditor(files: File[]) {
    const [next, ...rest] = files;
    setQueue(rest);
    setEditing(next ?? null);
  }

  function placeImage(url: string) {
    const imageId = `imagem-${Date.now()}`;
    const textId = `texto-${Date.now()}`;
    setBlocks((current) => {
      const index = Math.max(0, current.findIndex((block) => block.id === focusId.current));
      const next = [...current];
      next.splice(index + 1, 0, { id: imageId, type: 'image', url }, { id: textId, type: 'text', text: '' });
      return next;
    });
    focusId.current = textId;
    setWriting(true);
  }

  function readImage(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].filter((file) => file.type.startsWith('image/'));
    event.target.value = '';
    const photos = files.filter((file) => file.type !== 'image/gif');
    const gifs = files.filter((file) => file.type === 'image/gif');
    const count = blocks.filter((block) => block.type === 'image').length;
    if (count + files.length > 10) {
      toast.error('É possível enviar até 10 fotos.');
      return;
    }
    gifs.forEach((file) => void uploadImage(file));
    if (photos.length > 0) openEditor(photos);
  }

  async function uploadImage(file: File) {
    try {
      setProgress(0);
      const uploaded = await uploadMedia(file, setProgress);
      placeImage(uploaded.url);
    } catch {
      toast.error('Não foi possível enviar a foto.');
    } finally {
      setProgress(null);
    }
  }

  async function confirmImage(file: File) {
    setEditing(null);
    await uploadImage(file);
    const [next, ...rest] = queue;
    setQueue(rest);
    setEditing(next ?? null);
  }

  async function uploadAttachment(file: File, type: 'video' | 'document' | 'audio', clip?: { start: number; duration: number }) {
    const limit = type === 'video' ? VIDEO_MAX : type === 'audio' ? AUDIO_MAX : DOC_MAX;
    if (file.size > limit) {
      toast.error(type === 'video' ? 'O vídeo passa de 200 MB.' : type === 'audio' ? 'O áudio passa de 80 MB.' : 'O documento passa de 40 MB.');
      return;
    }
    try {
      setProgress(0);
      const uploaded = await uploadMedia(file, setProgress);
      setAttachment({ type, name: uploaded.name || file.name, url: uploaded.url, start: clip?.start, duration: clip?.duration });
    } catch {
      toast.error('Não foi possível enviar o arquivo. Tente novamente.');
    } finally {
      setProgress(null);
    }
  }

  function readVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadAttachment(file, 'video');
  }

  function readAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > AUDIO_MAX) {
      toast.error('O áudio passa de 80 MB.');
      return;
    }
    setAudioFile(file);
  }

  function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadAttachment(file, 'document');
  }

  function pasteMedia(event: ClipboardEvent<HTMLTextAreaElement>) {
    const file = clipboardFile(event.clipboardData);
    if (!file) return;
    event.preventDefault();
    if (file.type.startsWith('video/')) {
      void uploadAttachment(file, 'video');
      return;
    }
    if (blocks.filter((block) => block.type === 'image').length >= 10) {
      toast.error('É possível enviar até 10 fotos.');
      return;
    }
    void uploadImage(file);
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    const content: PostBlock[] = [];
    for (const block of blocks) {
      if (block.type === 'image') content.push({ type: 'image', url: block.url });
      else if (block.text.trim()) content.push({ type: 'text', text: block.text.trim() });
    }
    const text = content.filter((block) => block.type === 'text').map((block) => block.text).join('\n\n');
    const images = content.filter((block) => block.type === 'image').map((block) => block.url);
    const labels = pollOpen ? options.map((label) => label.trim()).filter(Boolean) : [];
    const poll = labels.map((label, index) => ({ id: `opt-${index}`, label, votes: 0 }));
    if (pollOpen && new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) {
      toast.error('As opções da enquete não podem se repetir.');
      return;
    }
    const hasMedia = images.length > 0 || Boolean(attachment);
    if ((!text && !hasMedia) || (pollOpen && labels.length < 2)) return;
    setSending(true);
    try {
      await onPublish({ body: text, images, blocks: content, attachment, poll: pollOpen ? poll : undefined });
    } catch {
      setSending(false);
      return;
    }
    setSending(false);
    setWriting(false);
    setBlocks([{ id: 'texto-inicial', type: 'text', text: '' }]);
    focusId.current = 'texto-inicial';
    setAttachment(undefined);
    setPollOpen(false);
    setOptions(['', '']);
  }

  function insertEmoji(emoji: string) {
    const id = focusId.current;
    const field = fields.current[id];
    setBlocks((current) => current.map((block) => {
      if (block.type !== 'text' || block.id !== id) return block;
      const start = field?.selectionStart ?? block.text.length;
      const end = field?.selectionEnd ?? block.text.length;
      return { ...block, text: block.text.slice(0, start) + emoji + block.text.slice(end) };
    }));
    setWriting(true);
  }

  const textReady = blocks.some((block) => block.type === 'text' && block.text.trim());
  const imageReady = blocks.some((block) => block.type === 'image');
  const ready = !sending && progress === null && (textReady || imageReady || Boolean(attachment)) && (!pollOpen || options.filter((item) => item.trim()).length >= 2);
  const user = actor();
  const expanded = writing || textReady || imageReady;

  return (
    <form onSubmit={publish} className="unica-surface px-4 py-3">
      <div className={expanded ? 'flex items-start gap-3' : 'flex items-center gap-3'}>
        <img src={user.avatar} alt="" className="h-10 w-10 rounded-full bg-muted object-cover" />
        <div className="min-w-0 flex-1 space-y-2">
          {blocks.map((block, index) => block.type === 'text' ? (
            <textarea
              key={block.id}
              ref={(node) => { fields.current[block.id] = node; }}
              id={index === 0 ? 'novo-post' : undefined}
              aria-label={index === 0 ? 'Publicação' : 'Continuar texto'}
              value={block.text}
              rows={1}
              onFocus={(event) => {
                focusId.current = block.id;
                setWriting(true);
                event.currentTarget.style.height = '0px';
                event.currentTarget.style.height = `${Math.min(Math.max(event.currentTarget.scrollHeight, 40), 180)}px`;
              }}
              onPaste={pasteMedia}
              onChange={(event) => {
                const value = event.target.value;
                setBlocks((current) => current.map((item) => item.id === block.id && item.type === 'text' ? { ...item, text: value } : item));
                event.currentTarget.style.height = '0px';
                event.currentTarget.style.height = `${Math.min(Math.max(event.currentTarget.scrollHeight, 40), 180)}px`;
              }}
              placeholder={index === 0 ? 'Compartilhe algo com a equipe...' : 'Continue o texto...'}
              className="w-full resize-none overflow-y-auto rounded-[10px] border border-border bg-[#F8F7FC] px-3 py-2 text-[13.5px] leading-5 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          ) : (
            <div key={block.id} className="relative">
              <img src={block.url} alt="" className="max-h-80 w-full rounded-xl bg-[#F8F7FC] object-contain" />
              <button type="button" onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))} className="absolute right-1 top-1 rounded-full bg-background/90 p-1" aria-label="Remover foto">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {progress !== null ? (
        <div className="mt-3">
          <p className="mb-1 text-xs text-muted-foreground">Enviando {Math.round(progress * 100)}%</p>
          <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        </div>
      ) : null}

      {attachment?.type === 'video' && attachment.url ? (
        <div className="relative mt-3 overflow-hidden rounded-xl bg-black">
          <video src={attachment.url} controls className="max-h-80 w-full" />
          <button type="button" onClick={() => setAttachment(undefined)} className="absolute right-2 top-2 rounded-full bg-background/90 p-1" aria-label="Remover vídeo">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {attachment?.type === 'audio' && attachment.url ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="flex items-center gap-2"><AudioLines className="h-4 w-4 text-primary" />{attachment.name}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{(attachment.duration ?? 0) < 60 ? `Trecho de ${Math.round(attachment.duration ?? 0)} s` : `Trecho de ${Math.max(1, Math.round((attachment.duration ?? 0) / 60))} min`}</span>
          </span>
          <button type="button" onClick={() => setAttachment(undefined)} aria-label="Remover áudio"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {attachment?.type === 'document' ? (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
          <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />{attachment.name}</span>
          <button type="button" onClick={() => setAttachment(undefined)} aria-label="Remover documento"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {pollOpen ? (
        <div className="mt-3 space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={option}
                onChange={(event) => setOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                placeholder={`Opção ${index + 1}`}
                className="h-10 min-w-0 flex-1 rounded-xl border border-border px-3 text-sm outline-none focus-visible:border-primary"
              />
              {options.length > 2 ? <button type="button" aria-label={`Remover opção ${index + 1}`} onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X className="h-4 w-4" /></button> : null}
            </div>
          ))}
          {options.length < 12 ? (
            <button type="button" onClick={() => setOptions((current) => [...current, ''])} className="text-sm font-medium text-primary">
              Adicionar opção
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={readImage} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={readVideo} />
          <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={readAudio} />
          <input ref={fileRef} type="file" className="hidden" onChange={readFile} />
          <ComposerAction icon={ImagePlus} label="Foto" onClick={() => photoRef.current?.click()} />
          <ComposerAction icon={Video} label="Vídeo" onClick={() => videoRef.current?.click()} />
          <ComposerAction icon={AudioLines} label="Áudio" onClick={() => audioRef.current?.click()} />
          <ComposerAction icon={FileText} label="Documento" onClick={() => fileRef.current?.click()} />
          <ComposerAction icon={ListChecks} label="Enquete" pressed={pollOpen} onClick={() => setPollOpen((open) => !open)} />
          <ComposerExtras onEmoji={insertEmoji} onGif={(url) => { if (blocks.filter((block) => block.type === 'image').length < 10) placeImage(url); }} />
        </div>
        <button
          type="submit"
          disabled={!ready}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-[#7A2498] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send className="h-[18px] w-[18px]" />
          {sending ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
      {editing ? <ImageAdjust file={editing} onCancel={() => { setEditing(null); setQueue([]); }} onConfirm={(file) => void confirmImage(file)} /> : null}
      {audioFile ? <AudioTrim file={audioFile} onCancel={() => setAudioFile(null)} onConfirm={(clip) => { const file = audioFile; setAudioFile(null); void uploadAttachment(file, 'audio', clip); }} /> : null}
    </form>
  );
};

const ComposerAction: FC<{ icon: FC<{ className?: string }>; label: string; pressed?: boolean; onClick: () => void }> = ({ icon: Icon, label, pressed, onClick }) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={onClick}
    className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-2.5 text-[13px] font-medium text-[#25233A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${pressed ? 'border-primary/40 bg-accent' : 'border-border bg-card hover:bg-[#F8EAFB] dark:text-foreground'}`}
  >
    <Icon className="h-[18px] w-[18px] text-primary" />
    {label}
  </button>
);
