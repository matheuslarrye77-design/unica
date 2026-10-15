import { FileText, ImagePlus, ListChecks, Send, Video, X } from 'lucide-react';
import { type ChangeEvent, type FC, type FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { actor } from '@/lib/session';
import type { Attachment, PollOption } from './types';

const MAX_MEDIA = 8 * 1024 * 1024;

export type NewPostDraft = {
  body: string;
  image?: string;
  attachment?: Attachment;
  poll?: PollOption[];
};

export const CreatePost: FC<{ onPublish: (draft: NewPostDraft) => void | Promise<void> }> = ({ onPublish }) => {
  const [body, setBody] = useState('');
  const [writing, setWriting] = useState(false);
  const [image, setImage] = useState('');
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const [pollOpen, setPollOpen] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function readData(file: File, onLoad: (url: string) => void) {
    if (file.size > MAX_MEDIA) {
      toast.error('O arquivo passa de 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onLoad(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  }

  function readImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    readData(file, setImage);
  }

  function readVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    readData(file, (url) => setAttachment({ type: 'video', name: file.name, url }));
  }

  function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    readData(file, (url) => setAttachment({ type: 'document', name: file.name, url }));
  }

  function resize(element: HTMLTextAreaElement, expanded: boolean) {
    element.style.height = '0px';
    const next = expanded ? Math.min(Math.max(element.scrollHeight, 96), 180) : 40;
    element.style.height = `${next}px`;
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    const poll = pollOpen
      ? options.map((label) => label.trim()).filter(Boolean).map((label, index) => ({ id: `opt-${index}`, label, votes: 0 }))
      : undefined;
    const hasMedia = Boolean(image || attachment);
    if ((!text && !hasMedia) || (pollOpen && (poll?.length ?? 0) < 2)) return;
    try {
      await onPublish({ body: text, image: image || undefined, attachment, poll });
    } catch {
      return;
    }
    setBody('');
    setWriting(false);
    setImage('');
    setAttachment(undefined);
    setPollOpen(false);
    setOptions(['', '']);
    if (fieldRef.current) resize(fieldRef.current, false);
  }

  const ready = (body.trim().length > 0 || Boolean(image) || Boolean(attachment)) && (!pollOpen || options.filter((item) => item.trim()).length >= 2);
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

      {image ? (
        <div className="relative mt-3 overflow-hidden rounded-xl">
          <img src={image} alt="" className="max-h-80 w-full object-cover" />
          <button type="button" onClick={() => setImage('')} className="absolute right-2 top-2 rounded-full bg-background/90 p-1" aria-label="Remover foto">
            <X className="h-4 w-4" />
          </button>
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

      {attachment?.type === 'document' ? (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
          <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />{attachment.name}</span>
          <button type="button" onClick={() => setAttachment(undefined)} aria-label="Remover documento"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {pollOpen ? (
        <div className="mt-3 space-y-2">
          {options.map((option, index) => (
            <input
              key={index}
              value={option}
              onChange={(event) => setOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
              placeholder={`Opção ${index + 1}`}
              className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none focus-visible:border-primary"
            />
          ))}
          {options.length < 4 ? (
            <button type="button" onClick={() => setOptions((current) => [...current, ''])} className="text-sm font-medium text-primary">
              Adicionar opção
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={readImage} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={readVideo} />
          <input ref={fileRef} type="file" className="hidden" onChange={readFile} />
          <ComposerAction icon={ImagePlus} label="Foto" onClick={() => photoRef.current?.click()} />
          <ComposerAction icon={Video} label="Vídeo" onClick={() => videoRef.current?.click()} />
          <ComposerAction icon={FileText} label="Documento" onClick={() => fileRef.current?.click()} />
          <ComposerAction icon={ListChecks} label="Enquete" pressed={pollOpen} onClick={() => setPollOpen((open) => !open)} />
        </div>
        <button
          type="submit"
          disabled={!ready}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-[#7A2498] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send className="h-[18px] w-[18px]" />
          Publicar
        </button>
      </div>
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
