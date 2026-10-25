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
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState('');
  const [editing, setEditing] = useState<File | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const [progress, setProgress] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
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
    setImages((current) => current.length >= 10 ? current : [...current, url]);
    setWriting(true);
  }

  function readImage(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].filter((file) => file.type.startsWith('image/'));
    event.target.value = '';
    const photos = files.filter((file) => file.type !== 'image/gif');
    const gifs = files.filter((file) => file.type === 'image/gif');
    const count = images.length;
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
      return false;
    }
    try {
      setProgress(0);
      const uploaded = await uploadMedia(file, setProgress);
      setAttachment({ type, name: uploaded.name || file.name, url: uploaded.url, start: clip?.start, duration: clip?.duration });
      return true;
    } catch {
      toast.error('Não foi possível enviar o arquivo. Tente novamente.');
      return false;
    } finally {
      setProgress(null);
    }
  }

  function clearVideo() {
    setVideoPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return '';
    });
    setAttachment((current) => current?.type === 'video' ? undefined : current);
  }

  function readVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > VIDEO_MAX) {
      toast.error('O vídeo passa de 200 MB.');
      return;
    }
    const local = URL.createObjectURL(file);
    setVideoPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return local;
    });
    void uploadAttachment(file, 'video').then((ok) => {
      if (!ok) {
        URL.revokeObjectURL(local);
        setVideoPreview((current) => current === local ? '' : current);
      }
    });
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
      if (file.size > VIDEO_MAX) {
        toast.error('O vídeo passa de 200 MB.');
        return;
      }
      const local = URL.createObjectURL(file);
      setVideoPreview((current) => {
        if (current.startsWith('blob:')) URL.revokeObjectURL(current);
        return local;
      });
      void uploadAttachment(file, 'video').then((ok) => {
        if (!ok) {
          URL.revokeObjectURL(local);
          setVideoPreview((current) => current === local ? '' : current);
        }
      });
      return;
    }
    if (images.length >= 10) {
      toast.error('É possível enviar até 10 fotos.');
      return;
    }
    void uploadImage(file);
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    const content: PostBlock[] = [];
    if (text.trim()) content.push({ type: 'text', text: text.trim() });
    images.forEach((url) => content.push({ type: 'image', url }));
    const body = text.trim();
    const labels = pollOpen ? options.map((label) => label.trim()).filter(Boolean) : [];
    const poll = labels.map((label, index) => ({ id: `opt-${index}`, label, votes: 0 }));
    if (pollOpen && new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) {
      toast.error('As opções da enquete não podem se repetir.');
      return;
    }
    const hasMedia = images.length > 0 || Boolean(attachment);
    if ((!body && !hasMedia) || (pollOpen && labels.length < 2)) return;
    setSending(true);
    try {
      await onPublish({ body, images, blocks: content, attachment, poll: pollOpen ? poll : undefined });
    } catch {
      setSending(false);
      return;
    }
    setSending(false);
    setWriting(false);
    setText('');
    setImages([]);
    clearVideo();
    setAttachment(undefined);
    setPollOpen(false);
    setOptions(['', '']);
  }

  function insertEmoji(emoji: string) {
    const field = fieldRef.current;
    const start = field?.selectionStart ?? text.length;
    const end = field?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    setWriting(true);
  }

  const textReady = Boolean(text.trim());
  const imageReady = images.length > 0;
  const ready = !sending && progress === null && (textReady || imageReady || Boolean(attachment)) && (!pollOpen || options.filter((item) => item.trim()).length >= 2);
  const user = actor();
  const expanded = writing || textReady || imageReady;

  return (
    <form onSubmit={publish} className="unica-surface px-4 py-3">
      <div className={expanded ? 'flex items-start gap-3' : 'flex items-center gap-3'}>
        <img src={user.avatar} alt="" className="h-10 w-10 rounded-full bg-muted object-cover" />
        <div className="min-w-0 flex-1">
          <div className="rounded-[10px] border border-border bg-[#F8F7FC] px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
            <textarea
              ref={fieldRef}
              id="novo-post"
              aria-label="Publicação"
              value={text}
              rows={1}
              onFocus={(event) => {
                setWriting(true);
                event.currentTarget.style.height = '0px';
                event.currentTarget.style.height = `${Math.min(Math.max(event.currentTarget.scrollHeight, 40), 180)}px`;
              }}
              onPaste={pasteMedia}
              onChange={(event) => {
                setText(event.target.value);
                event.currentTarget.style.height = '0px';
                event.currentTarget.style.height = `${Math.min(Math.max(event.currentTarget.scrollHeight, 40), 180)}px`;
              }}
              placeholder="Compartilhe algo com a equipe..."
              className="w-full resize-none overflow-y-auto bg-transparent text-[13.5px] leading-5 outline-none placeholder:text-muted-foreground"
            />
            {images.length > 0 ? (
              <div className="mt-2 space-y-2">
                {images.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative">
                    <img src={url} alt="" className="max-h-80 w-full rounded-xl object-contain" />
                    <button type="button" onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded-full bg-background/90 p-1" aria-label="Remover foto">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {progress !== null ? (
        <div className="mt-3">
          <p className="mb-1 text-xs text-muted-foreground">{progress === 0 && videoPreview && attachment?.type !== 'video' ? 'Preparando o vídeo...' : `Enviando ${Math.round(progress * 100)}%`}</p>
          <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        </div>
      ) : null}

      {videoPreview || (attachment?.type === 'video' && attachment.url) ? (
        <div className="relative mt-3 overflow-hidden rounded-xl bg-black">
          <video src={videoPreview || attachment?.url} controls preload="metadata" playsInline className="max-h-80 w-full" />
          <button type="button" onClick={clearVideo} className="absolute right-2 top-2 rounded-full bg-background/90 p-1" aria-label="Remover vídeo">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {attachment?.type === 'audio' && attachment.url ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="flex items-center gap-2"><AudioLines className="h-4 w-4 text-primary" />{attachment.name}</span>
            <span className="mt-1 block text-xs text-muted-foreground">Trecho de {Math.max(1, Math.round(attachment.duration ?? 0))} s</span>
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
          <ComposerExtras onEmoji={insertEmoji} onGif={(url) => { if (images.length < 10) placeImage(url); }} />
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
      {audioFile ? <AudioTrim file={audioFile} onCancel={() => setAudioFile(null)} onConfirm={(clipFile, clip) => { setAudioFile(null); void uploadAttachment(clipFile, 'audio', clip); }} /> : null}
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
