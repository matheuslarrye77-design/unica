import { FileText, ImagePlus, ListChecks, Send, Video, X } from 'lucide-react';
import { type ChangeEvent, type FC, type FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadMedia } from '@/lib/feed';
import { actor } from '@/lib/session';
import { ComposerExtras } from './ComposerExtras';
import { GiphyMark } from './GifPicker';
import { ImageAdjust } from './ImageAdjust';
import type { Attachment, PollOption } from './types';

const VIDEO_MAX = 200 * 1024 * 1024;
const DOC_MAX = 40 * 1024 * 1024;

export type NewPostDraft = {
  body: string;
  images?: string[];
  attachment?: Attachment;
  poll?: PollOption[];
};

export const CreatePost: FC<{ onPublish: (draft: NewPostDraft) => void | Promise<void> }> = ({ onPublish }) => {
  const [body, setBody] = useState('');
  const [writing, setWriting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [editing, setEditing] = useState<File | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const [progress, setProgress] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function openEditor(files: File[]) {
    const [next, ...rest] = files;
    setQueue(rest);
    setEditing(next ?? null);
  }

  function readImage(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].filter((file) => file.type.startsWith('image/'));
    event.target.value = '';
    if (files.length === 0) return;
    if (images.length + files.length > 10) {
      toast.error('É possível enviar até 10 fotos.');
      return;
    }
    openEditor(files);
  }

  async function confirmImage(file: File) {
    setEditing(null);
    try {
      setProgress(0);
      const uploaded = await uploadMedia(file, setProgress);
      setImages((current) => [...current, uploaded.url]);
    } catch {
      toast.error('Não foi possível enviar a foto.');
    } finally {
      setProgress(null);
      const [next, ...rest] = queue;
      setQueue(rest);
      setEditing(next ?? null);
    }
  }

  async function uploadAttachment(file: File, type: 'video' | 'document') {
    const limit = type === 'video' ? VIDEO_MAX : DOC_MAX;
    if (file.size > limit) {
      toast.error(type === 'video' ? 'O vídeo passa de 200 MB.' : 'O documento passa de 40 MB.');
      return;
    }
    try {
      setProgress(0);
      const uploaded = await uploadMedia(file, setProgress);
      setAttachment({ type, name: uploaded.name || file.name, url: uploaded.url });
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

  function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadAttachment(file, 'document');
  }

  function resize(element: HTMLTextAreaElement, expanded: boolean) {
    element.style.height = '0px';
    const next = expanded ? Math.min(Math.max(element.scrollHeight, 96), 180) : 40;
    element.style.height = `${next}px`;
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    const text = body.trim();
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
      await onPublish({ body: text, images, attachment, poll: pollOpen ? poll : undefined });
    } catch {
      setSending(false);
      return;
    }
    setSending(false);
    setBody('');
    setWriting(false);
    setImages([]);
    setAttachment(undefined);
    setPollOpen(false);
    setOptions(['', '']);
    if (fieldRef.current) resize(fieldRef.current, false);
  }

  function insertEmoji(emoji: string) {
    const field = fieldRef.current;
    const start = field?.selectionStart ?? body.length;
    const end = field?.selectionEnd ?? body.length;
    const next = body.slice(0, start) + emoji + body.slice(end);
    setBody(next);
    setWriting(true);
    requestAnimationFrame(() => {
      field?.focus();
      const cursor = start + emoji.length;
      field?.setSelectionRange(cursor, cursor);
    });
  }

  const ready = !sending && progress === null && (body.trim().length > 0 || images.length > 0 || Boolean(attachment)) && (!pollOpen || options.filter((item) => item.trim()).length >= 2);
  const user = actor();

  return (
    <form onSubmit={publish} className="unica-surface px-4 py-3">
      <div className={writing || body ? 'flex items-start gap-3' : 'flex items-center gap-3'}>
        <img src={user.avatar} alt="" className="h-10 w-10 rounded-full bg-muted object-cover" />
        <label className="sr-only" htmlFor="novo-post">Publicação</label>
        <textarea
          ref={fieldRef}
          id="novo-post"
          value={body}
          rows={1}
          onFocus={(event) => {
            setWriting(true);
            resize(event.currentTarget, true);
          }}
          onBlur={(event) => {
            if (event.currentTarget.value.trim()) return;
            setWriting(false);
            resize(event.currentTarget, false);
          }}
          onChange={(event) => {
            setBody(event.target.value);
            resize(event.currentTarget, true);
          }}
          placeholder="Compartilhe algo com a equipe..."
          className="h-10 w-full resize-none overflow-y-auto rounded-[10px] border border-border bg-[#F8F7FC] px-3 py-2 text-[13.5px] leading-5 outline-none transition-[height] duration-200 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </div>

      {images.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {images.map((src) => (
            <div key={src} className="relative">
              <img src={src} alt="" className="h-24 w-full rounded-xl object-cover" />
              <button type="button" onClick={() => setImages((current) => current.filter((item) => item !== src))} className="absolute right-1 top-1 rounded-full bg-background/90 p-1" aria-label="Remover foto">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {images.some((src) => src.includes('.giphy.com/')) ? <div className="mt-2"><GiphyMark /></div> : null}
      {progress !== null ? <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} /></div> : null}

      {attachment?.type === 'video' && attachment.url ? (
        <div className="relative mt-3 overflow-hidden rounded-xl bg-black">
          <video src={attachment.url} controls className="max-h-80 w-full" />
          <button type="button" onClick={() => setAttachment(undefined)} className="absolute right-2 top-2 rounded-full bg-background/90 p-1" aria-label="Remover vídeo">
            <X className="h-4 w-4" />
          </button>
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
          <input ref={fileRef} type="file" className="hidden" onChange={readFile} />
          <ComposerAction icon={ImagePlus} label="Foto" onClick={() => photoRef.current?.click()} />
          <ComposerAction icon={Video} label="Vídeo" onClick={() => videoRef.current?.click()} />
          <ComposerAction icon={FileText} label="Documento" onClick={() => fileRef.current?.click()} />
          <ComposerAction icon={ListChecks} label="Enquete" pressed={pollOpen} onClick={() => setPollOpen((open) => !open)} />
          <ComposerExtras onEmoji={insertEmoji} onGif={(url) => setImages((current) => (current.includes(url) || current.length >= 10 ? current : [...current, url]))} />
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
