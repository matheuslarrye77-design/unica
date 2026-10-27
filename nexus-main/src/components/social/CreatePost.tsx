import { AudioLines, FileText, ImagePlus, ListChecks, Lock, Plus, Send, Smile, Video, X } from 'lucide-react';
import { type ChangeEvent, type ClipboardEvent, type DragEvent, type FC, type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Emoji } from '@/components/Emoji';
import { MOODS } from '@/components/shell/TeamMood';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatClip } from '@/lib/audioClip';
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
  audience?: 'team' | 'management';
  mood?: string;
  moodAudience?: 'team' | 'management' | 'self';
  shareMood?: boolean;
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
  const [blocks, setBlocks] = useState<DraftBlock[]>([{ id: 'texto', type: 'text', text: '' }]);
  const [videoPreview, setVideoPreview] = useState('');
  const [editing, setEditing] = useState<File | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const [progress, setProgress] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const [over, setOver] = useState(false);
  const [moodId, setMoodId] = useState<string | null>(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const [audience, setAudience] = useState<'team' | 'management'>('team');
  const [moodAudience, setMoodAudience] = useState<'team' | 'management' | 'self'>('team');
  const [shareMood, setShareMood] = useState(true);
  const focusId = useRef('texto');
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
    let focus = focusId.current;
    setBlocks((current) => {
      if (current.filter((block) => block.type === 'image').length >= 10) return current;
      const index = Math.max(0, current.findIndex((block) => block.id === focusId.current));
      const next = [...current];
      next.splice(index + 1, 0, { id: imageId, type: 'image', url });
      if (next[index + 2]?.type !== 'text') {
        next.splice(index + 2, 0, { id: textId, type: 'text', text: '' });
        focus = textId;
      } else if (next[index + 2]?.type === 'text') {
        focus = next[index + 2].id;
      }
      return next;
    });
    focusId.current = focus;
    setWriting(true);
    requestAnimationFrame(() => fields.current[focus]?.focus());
  }

  function addImages(files: File[]) {
    const photos = files.filter((file) => file.type !== 'image/gif');
    const gifs = files.filter((file) => file.type === 'image/gif');
    const count = blocks.filter((block) => block.type === 'image').length;
    if (count + files.length > 10) {
      toast.error('É possível enviar até 10 fotos.');
      return;
    }
    gifs.forEach((file) => void uploadImage(file));
    if (photos.length > 0) openEditor(photos);
    setWriting(true);
  }

  function readImage(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].filter((file) => file.type.startsWith('image/'));
    event.target.value = '';
    addImages(files);
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
      setAttachment({ type, name: type === 'audio' ? 'Áudio' : (uploaded.name || file.name), url: uploaded.url, start: clip?.start, duration: clip?.duration });
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

  function takeVideo(file: File) {
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
    setWriting(true);
  }

  function readVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) takeVideo(file);
  }

  function takeAudio(file: File) {
    if (file.size > AUDIO_MAX) {
      toast.error('O áudio passa de 80 MB.');
      return;
    }
    setAudioFile(file);
    setWriting(true);
  }

  function readAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) takeAudio(file);
  }

  function fileKind(file: File) {
    if (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(file.name)) return 'image';
    if (file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(file.name)) return 'video';
    if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac)$/i.test(file.name)) return 'audio';
    return 'document';
  }

  function receiveFiles(files: File[]) {
    const images = files.filter((file) => fileKind(file) === 'image');
    const video = files.find((file) => fileKind(file) === 'video');
    const audio = files.find((file) => fileKind(file) === 'audio');
    const document = files.find((file) => fileKind(file) === 'document');
    if (images.length > 0) addImages(images);
    if (video) takeVideo(video);
    if (audio) takeAudio(audio);
    if (document) void uploadAttachment(document, 'document');
    if (files.length > 0) setWriting(true);
  }

  function onDropFiles(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setOver(false);
    receiveFiles([...event.dataTransfer.files]);
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
    const body = content.flatMap((block) => block.type === 'text' ? [block.text] : []).join('\n\n');
    const images = content.flatMap((block) => block.type === 'image' ? [block.url] : []);
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
      const feeling = MOODS.find((item) => item.id === moodId);
      await onPublish({
        body,
        images,
        blocks: content,
        attachment,
        poll: pollOpen ? poll : undefined,
        audience,
        mood: feeling?.emoji,
        moodAudience: feeling ? moodAudience : undefined,
        shareMood: Boolean(feeling) && shareMood,
      });
    } catch {
      setSending(false);
      return;
    }
    setSending(false);
    setWriting(false);
    setBlocks([{ id: 'texto', type: 'text', text: '' }]);
    focusId.current = 'texto';
    clearVideo();
    setAttachment(undefined);
    setPollOpen(false);
    setOptions(['', '']);
    setMoodId(null);
    setMoodOpen(false);
    setAudience('team');
    setMoodAudience('team');
    setShareMood(true);
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

  function onBlockKey(event: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    const field = event.currentTarget;
    const atStart = field.selectionStart === 0 && field.selectionEnd === 0;
    const atEnd = field.selectionStart === field.value.length && field.selectionEnd === field.value.length;
    if ((event.key === 'Backspace' || event.key === 'Delete') && atStart) {
      const previous = blocks[index - 1];
      if (previous?.type === 'image') {
        event.preventDefault();
        const earlier = blocks[index - 2];
        removeImage(previous.id);
        if (earlier?.type === 'text') requestAnimationFrame(() => fields.current[earlier.id]?.focus());
        return;
      }
    }
    if (event.key === 'Delete' && atEnd) {
      const next = blocks[index + 1];
      if (next?.type === 'image') {
        event.preventDefault();
        removeImage(next.id);
      }
    }
  }

  function removeImage(id: string) {
    setBlocks((current) => {
      const next: DraftBlock[] = [];
      for (const block of current) {
        if (block.id === id) continue;
        const previous = next[next.length - 1];
        if (block.type === 'text' && previous?.type === 'text') {
          previous.text = [previous.text, block.text].filter(Boolean).join('\n');
          continue;
        }
        next.push(block);
      }
      if (!next.some((block) => block.type === 'text')) next.unshift({ id: 'texto', type: 'text', text: '' });
      return next;
    });
  }

  const textReady = blocks.some((block) => block.type === 'text' && block.text.trim());
  const imageReady = blocks.some((block) => block.type === 'image');
  const ready = !sending && progress === null && (textReady || imageReady || Boolean(attachment)) && (!pollOpen || options.filter((item) => item.trim()).length >= 2);
  const user = actor();
  const expanded = writing || textReady || imageReady;
  const feeling = MOODS.find((item) => item.id === moodId);
  const audienceLabel = audience === 'management' ? 'Somente a gestão' : 'Todos da equipe';
  const moodLabel = moodAudience === 'self' ? 'Somente eu' : moodAudience === 'management' ? 'Somente a gestão' : 'Todos da equipe';

  return (
    <form
      onSubmit={publish}
      onDragOver={(event) => {
        if (![...event.dataTransfer.types].includes('Files')) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDropFiles}
      className="unica-surface relative px-4 py-3"
    >
      <div className={expanded ? 'flex items-start gap-3' : 'flex items-center gap-3'}>
        <img src={user.avatar} alt="" className="h-10 w-10 rounded-full bg-muted object-cover" />
        <div className="min-w-0 flex-1">
          <div className={`rounded-2xl border bg-white px-3 py-2 focus-within:border-[#E4C8EE] focus-within:ring-2 focus-within:ring-[#F3E4FA] ${over ? 'border-[#8E35B8] ring-2 ring-[#F3E4FA]' : 'border-[#EDE7F3]'}`}>
            {blocks.map((block, index) => block.type === 'text' ? (
              <textarea
                key={block.id}
                ref={(node) => { fields.current[block.id] = node; }}
                id={index === 0 ? 'novo-post' : undefined}
                aria-label="Publicação"
                value={block.text}
                rows={1}
                onFocus={(event) => {
                  focusId.current = block.id;
                  setWriting(true);
                  event.currentTarget.style.height = '0px';
                  event.currentTarget.style.height = `${Math.min(Math.max(event.currentTarget.scrollHeight, index === 0 ? 40 : 32), 180)}px`;
                }}
                onPaste={pasteMedia}
                onKeyDown={(event) => onBlockKey(event, index)}
                onChange={(event) => {
                  const value = event.target.value;
                  setBlocks((current) => current.map((item) => item.id === block.id && item.type === 'text' ? { ...item, text: value } : item));
                  event.currentTarget.style.height = '0px';
                  event.currentTarget.style.height = `${Math.min(Math.max(event.currentTarget.scrollHeight, index === 0 ? 40 : 32), 180)}px`;
                }}
                placeholder={index === 0 ? 'Compartilhe algo com a equipe...' : ''}
                className={`w-full resize-none overflow-y-auto bg-transparent text-[13.5px] leading-5 outline-none placeholder:text-muted-foreground ${index === 0 ? '' : 'mt-2 min-h-8'}`}
              />
            ) : (
              <div key={block.id} className="relative mt-2">
                <img src={block.url} alt="" className="max-h-80 w-full rounded-xl object-contain" />
                <button type="button" onClick={() => removeImage(block.id)} className="absolute right-1 top-1 rounded-full bg-background/90 p-1" aria-label="Remover foto">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
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
          <span className="flex min-w-0 items-center gap-2 text-sm"><AudioLines className="h-4 w-4 text-primary" />Trecho de {formatClip(attachment.duration ?? 0)}</span>
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {feeling ? (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F8EAFB] px-2.5 py-1 text-[13px] text-[#6A228C]">
            <Emoji emoji={feeling.emoji} className="h-4 w-4" />
            <span>{feeling.label}</span>
            <button type="button" className="rounded-full px-1 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" onClick={() => setMoodOpen(true)}>Alterar</button>
            <button type="button" aria-label="Remover sentimento" className="rounded-full p-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" onClick={() => { setMoodId(null); setMoodOpen(false); }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <button type="button" aria-expanded={moodOpen} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[13px] text-[#6A228C] hover:bg-[#F8EAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" onClick={() => setMoodOpen((open) => !open)}>
            <Smile className="h-4 w-4" />
            Como você está?
          </button>
        )}
        <PrivacyMenu noun="Publicação" label={audienceLabel} options={[{ id: 'team', label: 'Todos da equipe' }, { id: 'management', label: 'Somente a gestão' }]} value={audience} onChange={(value) => setAudience(value as 'team' | 'management')} />
        {feeling ? <PrivacyMenu noun="Sentimento" label={moodLabel} options={[{ id: 'team', label: 'Todos da equipe' }, { id: 'management', label: 'Somente a gestão' }, { id: 'self', label: 'Somente eu' }]} value={moodAudience} onChange={(value) => setMoodAudience(value as 'team' | 'management' | 'self')} /> : null}
        {feeling ? (
          <label className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <input type="checkbox" checked={shareMood} onChange={(event) => setShareMood(event.target.checked)} className="accent-[#8E35B8]" />
            Atualizar humor da equipe
          </label>
        ) : null}
      </div>
      {moodOpen ? (
        <div className="relative">
          <button type="button" aria-label="Fechar sentimentos" className="fixed inset-0 z-[70] cursor-default" onClick={() => setMoodOpen(false)} />
          <div role="listbox" aria-label="Como você está?" className="absolute z-[80] mt-1 w-48 rounded-xl border border-[#EDE7F3] bg-white p-1 shadow-sm" onKeyDown={(event) => { if (event.key === 'Escape') setMoodOpen(false); }}>
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                type="button"
                role="option"
                aria-selected={moodId === mood.id}
                onClick={() => { setMoodId(mood.id); setMoodOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${moodId === mood.id ? 'bg-[#F3E4FA] text-[#6A228C]' : 'text-[#3C3952] hover:bg-[#F8F7FC]'}`}
              >
                <Emoji emoji={mood.emoji} className="h-4 w-4" />
                {mood.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={readImage} />
        <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={readVideo} />
        <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={readAudio} />
        <input ref={fileRef} type="file" className="hidden" onChange={readFile} />
        <ComposerAction icon={ImagePlus} label="Foto" onClick={() => photoRef.current?.click()} />
        <ComposerAction icon={Video} label="Vídeo" onClick={() => videoRef.current?.click()} />
        <ComposerAction icon={AudioLines} label="Áudio" onClick={() => audioRef.current?.click()} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Adicionar conteúdo" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#6A228C] hover:bg-[#F8EAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              <Plus className="h-[18px] w-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => fileRef.current?.click()}>
              <FileText className="h-4 w-4" />
              Documento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPollOpen((open) => !open)}>
              <ListChecks className="h-4 w-4" />
              {pollOpen ? 'Fechar enquete' : 'Enquete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ComposerExtras onEmoji={insertEmoji} onGif={(url) => { if (blocks.filter((block) => block.type === 'image').length < 10) placeImage(url); }} />
        <button
          type="submit"
          disabled={!ready}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-[#8E35B8] px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-[#7A2498] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send className="h-3.5 w-3.5" />
          {sending ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
      {editing ? <ImageAdjust file={editing} onCancel={() => { setEditing(null); setQueue([]); }} onConfirm={(file) => void confirmImage(file)} /> : null}
      {audioFile ? <AudioTrim file={audioFile} onCancel={() => setAudioFile(null)} onConfirm={(clipFile, clip) => { setAudioFile(null); void uploadAttachment(clipFile, 'audio', clip); }} /> : null}
    </form>
  );
};

const ComposerAction: FC<{ icon: FC<{ className?: string }>; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-[#6A228C] hover:bg-[#F8EAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
  >
    <Icon className="h-[18px] w-[18px]" />
    {label}
  </button>
);

const PrivacyMenu: FC<{ noun: string; label: string; options: { id: string; label: string }[]; value: string; onChange: (value: string) => void }> = ({ noun, label, options, value, onChange }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label={`${noun}: ${label}`} className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full px-2 text-[12px] text-[#6A228C] hover:bg-[#F8EAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{noun}: {label}</span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      {options.map((option) => (
        <DropdownMenuItem key={option.id} onClick={() => onChange(option.id)}>
          <span className={option.id === value ? 'font-semibold text-[#6A228C]' : ''}>{option.label}</span>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);
