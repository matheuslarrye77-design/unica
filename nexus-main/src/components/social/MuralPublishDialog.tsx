import { ComposerExtras } from '@/components/social/ComposerExtras';
import { AudioTrim } from '@/components/social/AudioTrim';
import { JournalNewsCard } from '@/components/social/JournalNewsCard';
import { PostCard } from '@/components/social/PostCard';
import { ExpandProvider } from '@/components/social/ReadMore';
import { personAvatar, RecognitionArtCard } from '@/components/social/RecognitionArtCard';
import type { RecognitionDraft } from '@/components/social/RecognitionComposer';
import type { Attachment, PollOption, PostBlock, SocialPost } from '@/components/social/types';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { articleCover, articleSummary, categoryLabel, type JournalArticle } from '@/data/journal';
import { teamRoster } from '@/data/team';
import { createFeedPost, uploadMedia } from '@/lib/feed';
import { recognitionLine } from '@/lib/recognitionText';
import { actor } from '@/lib/session';
import { ChevronDown, Eye, FileText, ImagePlay, ListChecks, Loader2, Megaphone, Mic, Paperclip, Pencil, Send, Smile, Sparkles, Sticker, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FC } from 'react';
import { toast } from 'sonner';

const MAX = 10000;
const CAPTION_MAX = 300;
const AUDIO_MAX = 80 * 1024 * 1024;
const DOC_MAX = 40 * 1024 * 1024;
const VIDEO_MAX = 200 * 1024 * 1024;
const tags = ['Colaboração', 'Atendimento', 'Entrega', 'Cultura'];

type Piece = { id: string; url: string; display?: 'sticker' | 'gif' };

type ExistingRecognition = {
  id: string;
  from: string;
  to: string;
  quote: string;
  received?: boolean;
  tag?: string;
  caption?: string;
  comment?: string;
  photos?: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & (
  | { source: 'recognition-new'; onCreated: (draft: RecognitionDraft, published: boolean) => void }
  | { source: 'recognition-existing'; item: ExistingRecognition; onPublished: () => void }
  | { source: 'journal'; article: JournalArticle; onShared?: () => void }
);

function kindOf(file: File) {
  if (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(file.name)) return 'image';
  if (file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(file.name)) return 'video';
  if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|webm)$/i.test(file.name)) return 'audio';
  return 'document';
}

export const MuralPublishDialog: FC<Props> = (props) => {
  const { open, onOpenChange } = props;
  const user = actor();
  const field = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [text, setText] = useState('');
  const [personId, setPersonId] = useState('');
  const [tag, setTag] = useState(tags[0]);
  const [photos, setPhotos] = useState<Piece[]>([]);
  const [stickers, setStickers] = useState<Piece[]>([]);
  const [gifs, setGifs] = useState<Piece[]>([]);
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [panel, setPanel] = useState<'emoji' | 'sticker' | 'gif' | null>(null);
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const others = teamRoster.filter((person) => person.id !== user.id);
  const journal = props.source === 'journal' ? props.article : null;
  const existing = props.source === 'recognition-existing' ? props.item : null;

  function resetFromProps() {
    setMenu(false);
    setPanel(null);
    setPreview(false);
    setPollOpen(false);
    setPollQuestion('');
    setOptions(['', '']);
    setAttachment(undefined);
    setAudioFile(null);
    setStickers([]);
    setGifs([]);
    setProgress(null);
    if (props.source === 'recognition-existing') {
      setText((props.item.caption || props.item.quote || '').slice(0, CAPTION_MAX));
      setPhotos((props.item.photos ?? []).map((url) => ({ id: url, url })));
      setTag(props.item.tag && tags.includes(props.item.tag) ? props.item.tag : tags[0]);
      setPersonId('');
      return;
    }
    setText('');
    setPhotos([]);
    setPersonId('');
    setTag(tags[0]);
  }

  useEffect(() => {
    if (!open) return;
    resetFromProps();
    return () => {
      const active = recorder.current;
      if (active && active.state !== 'inactive') active.stop();
    };
    // Fresh draft each time the window opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    if (sending) return;
    onOpenChange(false);
  }

  function insertEmoji(emoji: string) {
    const node = field.current;
    setText((current) => {
      const start = node?.selectionStart ?? current.length;
      const end = node?.selectionEnd ?? current.length;
      const next = (current.slice(0, start) + emoji + current.slice(end)).slice(0, props.source === 'journal' ? MAX : CAPTION_MAX);
      const caret = start + emoji.length;
      requestAnimationFrame(() => {
        node?.focus();
        node?.setSelectionRange(caret, caret);
      });
      return next;
    });
  }

  function addPiece(setter: (value: Piece[] | ((current: Piece[]) => Piece[])) => void, url: string, display?: 'sticker' | 'gif') {
    const count = photos.length + stickers.length + gifs.length;
    if (count >= 10) {
      toast.error('É possível enviar até 10 imagens.');
      return;
    }
    setter((current) => [...current, { id: `${display ?? 'foto'}-${Date.now()}-${current.length}`, url, display }]);
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
      setAttachment({ type, name: type === 'audio' ? 'Áudio' : (uploaded.name || file.name), url: uploaded.url, start: clip?.start, duration: clip?.duration });
    } catch {
      toast.error('Não foi possível enviar o arquivo.');
    } finally {
      setProgress(null);
    }
  }

  async function takeFiles(list: File[]) {
    for (const file of list) {
      const kind = kindOf(file);
      if (kind === 'image') {
        try {
          setProgress(0);
          const uploaded = await uploadMedia(file, setProgress);
          if (file.type === 'image/gif') addPiece(setGifs, uploaded.url, 'gif');
          else addPiece(setPhotos, uploaded.url);
        } catch {
          toast.error('Não foi possível enviar a imagem.');
        } finally {
          setProgress(null);
        }
        continue;
      }
      if (kind === 'audio') {
        if (file.size > AUDIO_MAX) {
          toast.error('O áudio passa de 80 MB.');
          continue;
        }
        setAudioFile(file);
        continue;
      }
      await uploadAttachment(file, kind === 'video' ? 'video' : 'document');
    }
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const list = [...(event.target.files ?? [])];
    event.target.value = '';
    void takeFiles(list);
  }

  async function toggleRecord() {
    if (recorder.current && recorder.current.state === 'recording') {
      recorder.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Este navegador não grava áudio.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const media = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        recorder.current = null;
        const blob = new Blob(chunks.current, { type: media.mimeType || 'audio/webm' });
        if (blob.size < 1) return;
        setAudioFile(new File([blob], 'gravacao.webm', { type: blob.type || 'audio/webm' }));
      };
      recorder.current = media;
      media.start();
      setRecording(true);
    } catch {
      toast.error('Não foi possível usar o microfone.');
    }
  }

  const person = teamRoster.find((item) => item.id === personId);
  const received = existing ? Boolean(existing.received) : false;
  const recognizedName = existing ? existing.to : (person?.name ?? '');
  const fromName = existing ? existing.from : user.name;
  const cover = journal ? articleCover(journal) : '';
  const photoUrls = [...(cover ? [cover] : []), ...photos.map((item) => item.url)];
  const labels = pollOpen ? options.map((item) => item.trim()).filter(Boolean) : [];
  const poll: PollOption[] | undefined = labels.length ? labels.map((label, index) => ({ id: `opt-${index}`, label, votes: 0 })) : undefined;

  function blocks(): PostBlock[] | undefined {
    const decorative = stickers.length + gifs.length > 0;
    if (!decorative && photoUrls.length === 0) return undefined;
    if (!decorative) return undefined;
    return [
      ...photoUrls.map((url) => ({ type: 'image' as const, url })),
      ...stickers.map((item) => ({ type: 'image' as const, url: item.url, display: 'sticker' as const })),
      ...gifs.map((item) => ({ type: 'image' as const, url: item.url, display: 'gif' as const })),
    ];
  }

  const isRecognition = props.source !== 'journal';
  const textMax = isRecognition ? CAPTION_MAX : MAX;
  const headline = recognizedName ? recognitionLine(fromName, recognizedName) : '';
  const recognizedAvatar = recognizedName ? personAvatar(recognizedName) : '';
  const authorAvatar = teamRoster.find((item) => item.name === fromName)?.avatar || user.avatar;

  function previewPost(): SocialPost {
    const built = blocks();
    const images = built ? built.flatMap((block) => (block.type === 'image' ? [block.url] : [])) : photoUrls;
    const body = (pollOpen && pollQuestion.trim() ? pollQuestion.trim() : text.trim()) || (journal ? articleSummary(journal.content) : '');
    return {
      id: 'previa-publicacao',
      kind: journal ? 'announcement' : 'recognition',
      author: user.name,
      role: user.role,
      department: journal ? 'Jornal' : 'Reconhecimento',
      avatar: user.avatar,
      time: 'agora',
      body,
      images,
      blocks: built,
      attachment,
      poll,
      likes: 0,
      liked: false,
      shares: 0,
      shared: false,
      comments: [],
      commentsOpen: false,
      bannerTitle: journal ? journal.title : (headline || undefined),
      journalHref: journal ? `/announcements/${journal.id}` : undefined,
      journalCategory: journal?.category,
      journalExcerpt: journal ? articleSummary(journal.content) : undefined,
      recognizedName: journal ? undefined : recognizedName,
      recognizedBy: journal ? undefined : fromName,
      receivedRecognition: journal ? undefined : received,
      tag: journal ? undefined : (existing?.tag || tag),
      caption: journal ? (text.trim() || undefined) : (text.trim() || undefined),
      comment: existing?.comment || undefined,
    };
  }

  const ready = (() => {
    if (sending || progress !== null || recording) return false;
    if (pollOpen && (labels.length < 2 || new Set(labels.map((item) => item.toLowerCase())).size !== labels.length)) return false;
    if (props.source === 'journal') return true;
    if (!recognizedName || (props.source === 'recognition-new' && !person)) return false;
    return true;
  })();

  async function publish() {
    if (!ready || sending) return;
    if (pollOpen && new Set(labels.map((item) => item.toLowerCase())).size !== labels.length) {
      toast.error('As opções da enquete não podem se repetir.');
      return;
    }
    const built = blocks();
    const message = (pollOpen && pollQuestion.trim() ? pollQuestion.trim() : text.trim());
    setSending(true);
    try {
      if (props.source === 'journal') {
        const article = props.article;
        await createFeedPost({
          body: message || articleSummary(article.content),
          kind: 'announcement',
          bannerTitle: article.title,
          journalHref: `/announcements/${article.id}`,
          images: built ? undefined : photoUrls,
          blocks: built,
          attachment,
          poll,
          caption: message || undefined,
          journalCategory: article.category,
          journalExcerpt: articleSummary(article.content),
          nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        });
        toast.success('Notícia publicada no mural.');
        onOpenChange(false);
        props.onShared?.();
        return;
      }
      const publishedTag = existing?.tag || tag;
      await createFeedPost({
        body: message,
        kind: 'recognition',
        recognizedName,
        recognizedBy: fromName,
        receivedRecognition: received,
        tag: publishedTag,
        caption: message || undefined,
        comment: existing?.comment,
        images: built ? undefined : photoUrls,
        blocks: built,
        attachment,
        poll,
        bannerTitle: recognizedName,
        nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      });
      toast.success('Reconhecimento publicado no mural.');
      if (props.source === 'recognition-new') {
        props.onCreated({
          name: recognizedName,
          fromName,
          message,
          tag: publishedTag,
          caption: message,
          comment: existing?.comment || '',
          photos: photos.map((item) => item.url),
          received,
        }, true);
      } else {
        props.onPublished();
      }
      onOpenChange(false);
    } catch (error) {
      const denied = error instanceof Error && (error.message === '403' || /permissão/i.test(error.message));
      toast.error(denied ? 'Você não tem permissão para publicar no mural.' : 'Não foi possível publicar no mural.');
    } finally {
      setSending(false);
    }
  }

  const tool = 'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F3EFFF] text-[#4600F3] transition-colors hover:bg-[#E8E0FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4600F3]/40';
  const face = 'inline-flex h-11 shrink-0 items-center justify-center gap-0.5 rounded-full bg-[#F3EFFF] px-2.5 text-[#4600F3] transition-colors hover:bg-[#E8E0FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4600F3]/40';

  return (
    <>
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[#2A0094]/35 backdrop-blur-md"
        className={`gap-0 overflow-visible border-0 bg-white p-0 shadow-[0_24px_70px_rgba(70,0,243,0.22)] rounded-[28px] ${isRecognition ? 'sm:max-w-[680px]' : 'sm:max-w-[640px]'}`}
      >
        <DialogDescription className="sr-only">{isRecognition ? 'Compartilhe um reconhecimento com sua equipe.' : 'Escreva o conteúdo e publique no mural.'}</DialogDescription>
        <div className="flex max-h-[min(760px,calc(100dvh-2rem))] flex-col">
          <div className="flex items-start gap-3 px-5 pb-3 pt-5">
            <span className={`grid h-11 w-11 shrink-0 place-items-center ${isRecognition ? 'rounded-full bg-[#4600F3] text-white' : 'rounded-2xl bg-[#EDE7FE] text-[#4600F3]'}`}>
              <Megaphone className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[22px] font-bold tracking-tight text-[#1C0066]">Publicar no mural</DialogTitle>
              {isRecognition ? <p className="mt-0.5 text-[13px] text-[#8A7C98]">Compartilhe um reconhecimento com sua equipe.</p> : null}
            </div>
            <button type="button" aria-label="Fechar" onClick={close} disabled={sending} className="grid h-9 w-9 place-items-center rounded-full text-[#6B6280] hover:bg-[#F3EFFF]">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
            {props.source === 'recognition-new' ? (
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-[12.5px] text-[#5C5168]">
                  Pessoa reconhecida
                  <select className="h-9 rounded-xl border border-[#D8CEF6] bg-white px-3 text-sm text-[#241B33]" value={personId} onChange={(event) => setPersonId(event.target.value)}>
                    <option value="">Selecione</option>
                    {others.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-[12.5px] text-[#5C5168]">
                  Etiqueta
                  <select className="h-9 rounded-xl border border-[#D8CEF6] bg-white px-3 text-sm text-[#241B33]" value={tag} onChange={(event) => setTag(event.target.value)}>
                    {tags.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
            ) : null}

            {isRecognition && headline ? (
              <div className="relative mb-3 flex items-center gap-3 overflow-hidden rounded-[22px] px-3 py-2.5">
                <img src="/cards/fundo-pequeno.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center" />
                <img src={authorAvatar} alt="" className="relative h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-2 ring-white" />
                <p className="min-w-0 flex-1 text-[16px] font-semibold leading-5 text-[#241B33]">
                  {fromName.split(/\s+/)[0]} reconheceu <span className="text-[#3600C2]">{recognizedName}</span>
                </p>
                <Sparkles className="h-5 w-5 shrink-0 text-[#8A5CF8]" />
              </div>
            ) : null}

            {preview && !isRecognition ? (
              <ExpandProvider>
                <PostCard
                  preview
                  post={previewPost()}
                  commentDraft=""
                  onCommentDraft={() => undefined}
                  onLike={() => undefined}
                  onShare={() => undefined}
                  onToggleComments={() => undefined}
                  onAddComment={() => undefined}
                  onLikeComment={() => undefined}
                  onVote={() => undefined}
                  onRepublish={() => undefined}
                />
              </ExpandProvider>
            ) : (
              <>
                <div className={`relative rounded-2xl border border-[#D8CEF6] bg-white px-4 pb-8 pt-3 focus-within:border-[#8A5CF8] focus-within:ring-2 focus-within:ring-[#EDE7FE] ${isRecognition ? 'flex items-start gap-2' : ''}`}>
                  {isRecognition ? <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-[#4600F3]" /> : null}
                  {journal ? <p className="mb-1 text-[12px] font-semibold text-[#4600F3]">Legenda da publicação (opcional)</p> : null}
                  <textarea
                    ref={field}
                    value={text}
                    maxLength={textMax}
                    onChange={(event) => setText(event.target.value.slice(0, textMax))}
                    placeholder={isRecognition ? 'Adicione uma legenda (opcional)...' : (journal ? '' : 'Digite o conteúdo da sua publicação…')}
                    className={`w-full resize-none bg-transparent text-[15px] leading-6 text-[#241B33] outline-none placeholder:text-[#B7A8C4] ${isRecognition || journal ? 'min-h-[52px]' : 'min-h-[190px]'}`}
                  />
                  {journal ? (
                    <div className="mt-3">
                      <JournalNewsCard
                        title={journal.title}
                        category={categoryLabel(journal.category)}
                        excerpt={articleSummary(journal.content)}
                        href={`/announcements/${journal.id}`}
                      />
                    </div>
                  ) : null}
                  <span className="pointer-events-none absolute bottom-3 right-4 text-[12.5px] text-[#B7A8C4]">{text.length}/{textMax}</span>
                </div>
                {isRecognition && recognizedName ? (
                  <div className="mt-3">
                    <RecognitionArtCard name={recognizedName} avatar={recognizedAvatar} />
                  </div>
                ) : null}

                {photos.length || stickers.length || gifs.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {photos.map((item) => (
                      <div key={item.id} className="relative">
                        <img src={item.url} alt="" className="h-20 w-20 rounded-xl object-cover" />
                        <button type="button" aria-label="Remover imagem" onClick={() => setPhotos((current) => current.filter((piece) => piece.id !== item.id))} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-[#3600C2]"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                    {[...stickers, ...gifs].map((item) => (
                      <div key={item.id} className="relative">
                        <img src={item.url} alt={item.display === 'gif' ? 'GIF' : 'Figurinha'} className="h-20 w-20 rounded-xl bg-[#F5F1FF] object-contain" />
                        <button type="button" aria-label={item.display === 'gif' ? 'Remover GIF' : 'Remover figurinha'} onClick={() => {
                          if (item.display === 'gif') setGifs((current) => current.filter((piece) => piece.id !== item.id));
                          else setStickers((current) => current.filter((piece) => piece.id !== item.id));
                        }} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-[#3600C2]"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {progress !== null ? (
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-[#8A7C98]">Enviando {Math.round(progress * 100)}%</p>
                    <div className="h-1 overflow-hidden rounded-full bg-[#EDE7FE]"><div className="h-full bg-[#4600F3]" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
                  </div>
                ) : null}

                {attachment?.type === 'audio' && attachment.url ? (
                  <div className="relative mt-3 rounded-xl border border-border px-3 py-2">
                    <audio src={attachment.url} controls preload="metadata" className="w-full" />
                    <button type="button" aria-label="Remover áudio" onClick={() => setAttachment(undefined)} className="absolute right-2 top-2 rounded-full bg-background/90 p-1"><X className="h-4 w-4" /></button>
                  </div>
                ) : null}

                {attachment?.type === 'video' && attachment.url ? (
                  <div className="relative mt-3 overflow-hidden rounded-xl bg-black">
                    <video src={attachment.url} controls preload="metadata" playsInline className="max-h-64 w-full" />
                    <button type="button" aria-label="Remover vídeo" onClick={() => setAttachment(undefined)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1"><X className="h-4 w-4" /></button>
                  </div>
                ) : null}

                {attachment?.type === 'document' ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-primary" />{attachment.name}</span>
                    <button type="button" aria-label="Remover arquivo" onClick={() => setAttachment(undefined)}><X className="h-4 w-4" /></button>
                  </div>
                ) : null}

                {pollOpen ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-[12.5px] font-medium text-[#3600C2]">Enquete</p>
                    <input
                      value={pollQuestion}
                      onChange={(event) => setPollQuestion(event.target.value)}
                      placeholder="Pergunta da enquete"
                      className="h-10 w-full rounded-xl border border-[#D8CEF6] px-3 text-sm outline-none focus-visible:border-[#8A5CF8]"
                    />
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          value={option}
                          onChange={(event) => setOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                          placeholder={`Alternativa ${index + 1}`}
                          className="h-10 min-w-0 flex-1 rounded-xl border border-[#D8CEF6] px-3 text-sm outline-none focus-visible:border-[#8A5CF8]"
                        />
                        {options.length > 2 ? <button type="button" aria-label={`Remover alternativa ${index + 1}`} onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X className="h-4 w-4" /></button> : null}
                      </div>
                    ))}
                    {options.length < 12 ? (
                      <button type="button" onClick={() => setOptions((current) => [...current, ''])} className="text-sm font-medium text-[#4600F3]">Adicionar alternativa</button>
                    ) : null}
                    <button type="button" onClick={() => { setPollOpen(false); setPollQuestion(''); setOptions(['', '']); }} className="text-[12.5px] text-[#8A7C98]">Remover enquete</button>
                  </div>
                ) : null}

                {panel ? (
                  <div className="mt-3 rounded-2xl border border-[#EFE6F4] bg-white p-2 shadow-sm">
                    <ComposerExtras
                      embedded={panel}
                      onEmoji={insertEmoji}
                      onSticker={(url) => { addPiece(setStickers, url, 'sticker'); setPanel(null); }}
                      onGif={(url) => { addPiece(setGifs, url, 'gif'); setPanel(null); }}
                      onPicked={() => setPanel(null)}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="relative flex flex-wrap items-center gap-2 border-t border-[#F3E8F8] px-4 py-3">
            <input ref={fileRef} type="file" multiple className="hidden" onChange={onFiles} />
            <button type="button" aria-label="Anexar arquivo" title="Anexar arquivo" onClick={() => fileRef.current?.click()} className={tool}><Paperclip className="h-[18px] w-[18px]" /></button>
            <span className="h-6 w-px bg-[#D8CEF6]" />
            <button type="button" aria-label={recording ? 'Parar gravação' : 'Gravar áudio'} aria-pressed={recording} title={recording ? 'Parar gravação' : 'Gravar áudio'} onClick={() => void toggleRecord()} className={`${tool} ${recording ? 'bg-[#4600F3] text-white' : ''}`}><Mic className="h-[18px] w-[18px]" /></button>
            <span className="h-6 w-px bg-[#D8CEF6]" />
            <button type="button" aria-label="Conteúdo interativo" aria-expanded={menu} title="Figurinhas, GIFs, enquetes e emojis" onClick={() => { setMenu((value) => !value); setPreview(false); }} className={`${face} ${menu || panel || pollOpen ? 'ring-2 ring-[#D8CEF6]' : ''}`}>
              <Smile className="h-[18px] w-[18px]" />
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {menu ? (
              <div role="menu" aria-label="Conteúdo interativo" className="absolute bottom-16 left-4 z-20 w-48 rounded-2xl border border-[#EFE6F4] bg-white p-1 shadow-lg">
                <MenuItem icon={Sticker} label="Figurinhas" onClick={() => { setPanel('sticker'); setMenu(false); setPreview(false); }} />
                <MenuItem icon={ImagePlay} label="GIFs" onClick={() => { setPanel('gif'); setMenu(false); setPreview(false); }} />
                <MenuItem icon={ListChecks} label="Enquetes" onClick={() => { setPollOpen(true); setPanel(null); setMenu(false); setPreview(false); }} />
                <MenuItem icon={Smile} label="Emojis" onClick={() => { setPanel('emoji'); setMenu(false); setPreview(false); }} />
              </div>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              {isRecognition ? (
                <button type="button" disabled={sending} onClick={close} className="inline-flex h-11 items-center rounded-full border border-[#D8CEF6] px-5 text-[14px] font-semibold text-[#3600C2] hover:bg-[#F8F6FF]">
                  Cancelar
                </button>
              ) : (
                <button type="button" aria-label="Pré-visualizar publicação" aria-pressed={preview} title="Pré-visualizar publicação" onClick={() => { setPreview((value) => !value); setMenu(false); }} className={`${tool} ${preview ? 'ring-2 ring-[#4600F3]/30' : ''}`}>
                  <Eye className="h-[18px] w-[18px]" />
                </button>
              )}
              <button type="button" disabled={!ready} onClick={() => void publish()} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#4600F3] px-5 text-[14px] font-semibold text-white hover:bg-[#3600C2] disabled:cursor-not-allowed disabled:opacity-50">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publicar
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {audioFile ? <AudioTrim file={audioFile} onCancel={() => setAudioFile(null)} onConfirm={(clipFile, clip) => { setAudioFile(null); void uploadAttachment(clipFile, 'audio', clip); }} /> : null}
    </>
  );
};

const MenuItem: FC<{ icon: FC<{ className?: string }>; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button type="button" role="menuitem" onClick={onClick} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[13.5px] text-[#3C3952] hover:bg-[#F5F1FF]">
    <Icon className="h-4 w-4 text-[#4600F3]" />
    {label}
  </button>
);
