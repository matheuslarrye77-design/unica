import { FileText, ImagePlus, ListChecks, Video, X } from 'lucide-react';
import { type ChangeEvent, type FC, type FormEvent, useRef, useState } from 'react';
import { currentUser } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import type { Attachment, PollOption } from './types';

export type NewPostDraft = {
  body: string;
  image?: string;
  attachment?: Attachment;
  poll?: PollOption[];
};

export const CreatePost: FC<{ onPublish: (draft: NewPostDraft) => void }> = ({ onPublish }) => {
  const [body, setBody] = useState('');
  const [image, setImage] = useState('');
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const [pollOpen, setPollOpen] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function readImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result ?? ''));
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function readVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAttachment({ type: 'video', name: file.name, url: URL.createObjectURL(file) });
    event.target.value = '';
  }

  function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAttachment({ type: 'document', name: file.name });
    event.target.value = '';
  }

  function publish(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    const poll = pollOpen
      ? options.map((label) => label.trim()).filter(Boolean).map((label, index) => ({ id: `opt-${index}`, label, votes: 0 }))
      : undefined;
    if (!text || (pollOpen && (poll?.length ?? 0) < 2)) return;
    onPublish({ body: text, image: image || undefined, attachment, poll });
    setBody('');
    setImage('');
    setAttachment(undefined);
    setPollOpen(false);
    setOptions(['', '']);
  }

  const ready = body.trim().length > 0 && (!pollOpen || options.filter((item) => item.trim()).length >= 2);

  return (
    <form onSubmit={publish} className="rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(40,20,70,0.05)]">
      <div className="flex gap-3">
        <img src={currentUser.avatar} alt="" className="h-10 w-10 rounded-full bg-muted" />
        <label className="sr-only" htmlFor="novo-post">Publicação</label>
        <textarea
          id="novo-post"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
          placeholder="Compartilhe algo com a equipe..."
          className="min-h-16 w-full resize-none rounded-xl border border-border bg-muted/30 px-4 py-3 text-[15px] leading-6 outline-none placeholder:text-muted-foreground focus-visible:border-primary"
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-1">
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={readImage} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={readVideo} />
          <input ref={fileRef} type="file" className="hidden" onChange={readFile} />
          <Button type="button" variant="ghost" size="sm" onClick={() => photoRef.current?.click()}>
            <ImagePlus /> Foto
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => videoRef.current?.click()}>
            <Video /> Vídeo
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            <FileText /> Documento
          </Button>
          <Button type="button" variant="ghost" size="sm" aria-pressed={pollOpen} onClick={() => setPollOpen((open) => !open)}>
            <ListChecks /> Enquete
          </Button>
        </div>
        <Button type="submit" disabled={!ready}>Publicar</Button>
      </div>
    </form>
  );
};
