import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalBadge, JournalRichText } from '@/components/journal/JournalVisual';
import { ComposerExtras } from '@/components/social/ComposerExtras';
import { ZoomImage } from '@/components/social/PhotoGallery';
import { PageFrame } from '@/components/shell/PageFrame';
import { useJournalArticles, useJournalSaved } from '@/components/journal/useJournal';
import { Textarea } from '@/components/ui/textarea';
import {
  addJournalComment,
  type JournalCommentMedia,
  archiveJournalArticle,
  deleteJournalComment,
  toggleJournalCommentLike,
  articleCover,
  canManageJournal,
  purgeJournalArticle,
  restoreJournalArticle,
  readingMinutes,
  toggleJournalPin,
  toggleJournalReaction,
  resolveJournalAsset,
  toggleJournalSave,
} from '@/data/journal';
import { JournalShareDialog } from '@/components/journal/JournalShareDialog';
import { currentUser } from '@/data/mockData';
import { uploadMedia } from '@/lib/feed';
import { cn } from '@/lib/utils';
import { ArrowLeft, Bookmark, FileText, Heart, Megaphone, MessageCircle, Mic, Paperclip, Pencil, Pin, RotateCcw, Send, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type FC } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const JournalAudio: FC<{ url: string; start?: number; duration?: number }> = ({ url, start = 0, duration }) => {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    const place = () => {
      if (audio.currentTime < start || (duration && audio.currentTime >= start + duration)) audio.currentTime = start;
    };
    const tick = () => {
      if (duration && audio.currentTime >= start + duration) {
        audio.pause();
        audio.currentTime = start;
      }
    };
    audio.addEventListener('play', place);
    audio.addEventListener('timeupdate', tick);
    return () => {
      audio.removeEventListener('play', place);
      audio.removeEventListener('timeupdate', tick);
    };
  }, [start, duration]);
  return <audio ref={ref} controls src={url} preload="metadata" className="w-full" />;
};

function CommentPieces({ media }: { media?: JournalCommentMedia[] }) {
  if (!media?.length) return null;
  return (
    <div className="mt-2 flex flex-col gap-2">
      {media.map((item, index) => {
        if (item.kind === 'image' || item.kind === 'gif' || item.kind === 'sticker') {
          return <img key={`${item.url}-${index}`} src={item.url} alt="" className={item.kind === 'sticker' ? 'h-24 w-24 object-contain' : 'max-h-52 w-fit rounded-xl object-cover'} />;
        }
        if (item.kind === 'video') return <video key={`${item.url}-${index}`} src={item.url} controls className="max-h-52 w-full rounded-xl" />;
        if (item.kind === 'audio') return <audio key={`${item.url}-${index}`} src={item.url} controls className="w-full" />;
        return (
          <a key={`${item.url}-${index}`} href={item.url} download={item.name} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#F6F3FF] px-3 py-2 text-sm font-medium text-[#4f33b8]">
            <FileText className="h-4 w-4" />
            {item.name || 'Arquivo'}
          </a>
        );
      })}
    </div>
  );
}

const CommentComposer: FC<{
  value: string;
  placeholder: string;
  label: string;
  onChange: (value: string) => void;
  onSend: (text: string, media: JournalCommentMedia[]) => void;
}> = ({ value, placeholder, label, onChange, onSend }) => {
  const [media, setMedia] = useState<JournalCommentMedia[]>([]);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const busy = media.some((item) => item.url.startsWith('blob:'));

  async function addFile(file: File) {
    if (media.length >= 8) {
      toast.error('Dá para enviar até 8 arquivos.');
      return;
    }
    const kind: JournalCommentMedia['kind'] = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document';
    const local = URL.createObjectURL(file);
    setMedia((current) => [...current, { kind, url: local, name: file.name }]);
    try {
      const uploaded = await uploadMedia(file);
      setMedia((current) => current.map((item) => (item.url === local ? { ...item, url: uploaded.url, name: uploaded.name || item.name } : item)));
    } catch {
      setMedia((current) => current.filter((item) => item.url !== local));
      toast.error('Não foi possível enviar o arquivo.');
    }
  }

  async function toggleRecord() {
    if (recorder.current && recorder.current.state === 'recording') {
      recorder.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = (event) => { if (event.data.size > 0) chunks.current.push(event.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        recorder.current = null;
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 1) return;
        void addFile(new File([blob], 'gravacao.webm', { type: blob.type || 'audio/webm' }));
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
      toast.error('Não foi possível gravar o áudio.');
    }
  }

  function pushPiece(kind: 'sticker' | 'gif', url: string, name: string) {
    setMedia((current) => (current.length >= 8 ? current : [...current, { kind, url, name }]));
  }

  return (
    <div className="mt-2">
      {media.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {media.map((item) => (
            <span key={item.url} className="inline-flex items-center gap-1 rounded-full bg-[#F6F3FF] px-2 py-1 text-xs font-medium text-[#4f33b8]">
              {item.name || item.kind}
              <button type="button" aria-label="Remover arquivo" onClick={() => setMedia((current) => current.filter((piece) => piece.url !== item.url))}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex items-end gap-1">
        <Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-10 flex-1" />
        <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(event) => { [...(event.target.files ?? [])].forEach((file) => void addFile(file)); event.target.value = ''; }} />
        <button type="button" aria-label="Anexar arquivo" onClick={() => fileRef.current?.click()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#3600C2] hover:bg-[#F5F1FF]"><Paperclip className="h-4 w-4" /></button>
        <button type="button" aria-label={recording ? 'Parar gravação' : 'Gravar áudio'} aria-pressed={recording} onClick={() => void toggleRecord()} className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-[#F5F1FF]', recording ? 'text-[#D6334B]' : 'text-[#3600C2]')}><Mic className="h-4 w-4" /></button>
        <ComposerExtras
          onEmoji={(emoji) => onChange(`${value}${emoji}`)}
          onSticker={(url) => pushPiece('sticker', url, 'Figurinha')}
          onGif={(url) => pushPiece('gif', url, 'GIF')}
        />
        <button type="button" aria-label={label} disabled={busy || (!value.trim() && media.length === 0)} onClick={() => { onSend(value, media); setMedia([]); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

export const JournalArticlePage: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const articles = useJournalArticles();
  const savedIds = useJournalSaved();
  const article = articles.find((item) => item.id === id);
  const [comment, setComment] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const canManage = canManageJournal(currentUser);

  if (!article || ((article.status === 'draft' || article.status === 'removed') && !canManage)) {
    return (
      <PageFrame>
        <p className="text-sm text-muted-foreground">Esta publicação não está disponível.</p>
        <Link to="/announcements" className="mt-4 inline-flex text-sm font-medium text-primary">Voltar ao Jornal</Link>
      </PageFrame>
    );
  }

  const reacted = article.reactedBy.includes(currentUser.name);

  function sendComment(text: string, parentId?: string, media?: JournalCommentMedia[]) {
    if (!article || (!text.trim() && !(media && media.length))) return;
    addJournalComment(article.id, currentUser.name, text, parentId, media);
    if (parentId) {
      setReplyDraft('');
      setReplyTo(null);
      setOpenReplies((current) => ({ ...current, [parentId]: true }));
    } else {
      setComment('');
    }
  }

  function pin() {
    if (!article) return;
    const result = toggleJournalPin(article.id);
    if (result.replacedId) toast.success('A publicação mais antiga saiu do destaque.');
  }

  function postOnMural() {
    if (!article) return;
    setShareOpen(true);
  }

  return (
    <>
    <PageFrame>
        <article className="min-w-0 flex-1">
          <Link to="/announcements" className="mb-[18px] flex w-fit items-center gap-2 text-[15px] text-gray-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" />
            Jornal
          </Link>
          <div className="mx-auto w-full max-w-[980px] rounded-3xl bg-white px-6 py-[22px] shadow-[0_2px_10px_rgba(60,40,140,0.06)] sm:px-[34px] sm:py-8">
            <div className="relative overflow-hidden rounded-[20px] bg-white p-6 shadow-[0_3px_16px_rgba(60,40,140,0.10)] before:absolute before:top-0 before:bottom-0 before:left-0 before:w-[5px] before:bg-[#6D32F5] sm:p-[34px]">
              <JournalBadge category={article.category} className="w-fit" />
              <h1 className="mt-[22px] text-[clamp(26px,4vw,38px)] font-semibold leading-[1.15] tracking-[-0.02em] text-gray-800">{article.title}</h1>
              <p className="mt-3 mb-[30px] text-[15px] text-gray-500">
                {article.author} · {new Date(article.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · {readingMinutes(article.content)} min de leitura
                {article.status === 'draft' ? ' · Rascunho' : ''}
                {article.status === 'removed' ? ' · Na lixeira' : ''}
              </p>
              {articleCover(article) ? <ZoomImage src={articleCover(article) ?? ''} className="mb-[22px] aspect-[16/8] w-full rounded-2xl object-cover" /> : null}
              <JournalRichText content={article.content} className="max-w-[70ch] space-y-[22px] text-base leading-[1.75]" />
              {article.media.length > 0 ? (
                <div className="mt-[22px] space-y-4">
                  {article.media.filter((item) => item.kind === 'image').map((item) => (
                    <ZoomImage key={item.id} src={resolveJournalAsset(item.url)} alt={item.name} className="w-full rounded-2xl" />
                  ))}
                  {article.media.filter((item) => item.kind === 'audio').map((item) => (
                    <JournalAudio key={item.id} url={resolveJournalAsset(item.url)} start={item.start} duration={item.duration} />
                  ))}
                  {article.media.filter((item) => item.kind === 'video').map((item) => (
                    <video key={item.id} controls src={resolveJournalAsset(item.url)} className="w-full rounded-2xl" />
                  ))}
                  {article.media.filter((item) => item.kind === 'document').map((item) => {
                    const ext = item.name.split('.').pop()?.toUpperCase() || 'ARQ';
                    return (
                      <a key={item.id} href={resolveJournalAsset(item.url)} download={item.name} className="flex items-center gap-3 rounded-2xl bg-[#F5F7FC] px-4 py-3 text-gray-800">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#6D32F5] shadow-[0_4px_14px_rgba(60,40,140,0.12)]"><FileText className="h-5 w-5" /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{item.name}</span>
                          <span className="text-xs text-gray-500">{ext}</span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <button type="button" aria-pressed={reacted} onClick={() => toggleJournalReaction(article.id, currentUser.name)} className={cn('inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-[14px] bg-white px-3.5 text-sm font-medium text-gray-500 shadow-[0_4px_14px_rgba(60,40,140,0.12)] transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D32F5]', reacted && 'bg-[#6D32F5] text-white')}>
                <Heart className={cn('h-4 w-4', reacted && 'fill-current')} />
                {article.reactions}
              </button>
              <button type="button" aria-label={savedIds.includes(article.id) ? 'Salva' : 'Salvar'} aria-pressed={savedIds.includes(article.id)} onClick={() => toggleJournalSave(article.id)} className={cn('grid h-11 min-w-11 place-items-center rounded-[14px] bg-white text-gray-500 shadow-[0_4px_14px_rgba(60,40,140,0.12)] transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D32F5]', savedIds.includes(article.id) && 'bg-[#6D32F5] text-white')}>
                <Bookmark className="h-4 w-4" fill={savedIds.includes(article.id) ? 'currentColor' : 'none'} />
              </button>
              <button type="button" aria-label="Comentários" onClick={() => document.getElementById('comentarios-noticia')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-[14px] bg-white px-3.5 text-sm font-medium text-gray-500 shadow-[0_4px_14px_rgba(60,40,140,0.12)] transition-transform hover:-translate-y-px">
                <MessageCircle className="h-4 w-4" />
                {article.comments.length}
              </button>
              <span className="min-w-4 flex-1 basis-full sm:basis-auto" />
              {canManage && article.status !== 'removed' ? (
                <button type="button" aria-label="Editar" onClick={() => setEditing(true)} className="grid h-11 min-w-11 place-items-center rounded-[14px] bg-white text-gray-500 shadow-[0_4px_14px_rgba(60,40,140,0.12)] transition-transform hover:-translate-y-px"><Pencil className="h-4 w-4" /></button>
              ) : null}
              {canManage && article.status === 'published' ? (
                <button type="button" aria-label={article.pinned ? 'Desafixar' : 'Fixar'} aria-pressed={article.pinned} onClick={pin} className={cn('grid h-11 min-w-11 place-items-center rounded-[14px] shadow-[0_4px_14px_rgba(60,40,140,0.12)] transition-transform hover:-translate-y-px', article.pinned ? 'bg-[#6D32F5] text-white' : 'bg-white text-gray-500')}><Pin className="h-4 w-4" fill={article.pinned ? 'currentColor' : 'none'} /></button>
              ) : null}
              {canManage && article.status === 'published' ? (
                <button type="button" aria-label="Divulgar" onClick={postOnMural} className="grid h-11 min-w-11 place-items-center rounded-[14px] bg-white text-gray-500 shadow-[0_4px_14px_rgba(60,40,140,0.12)] transition-transform hover:-translate-y-px"><Megaphone className="h-4 w-4" /></button>
              ) : null}
              {canManage && article.status === 'published' ? (
                <button type="button" aria-label="Excluir publicação" onClick={() => { if (!window.confirm('Mover esta publicação para a lixeira?')) return; archiveJournalArticle(article.id); navigate('/announcements'); }} className="grid h-11 min-w-11 place-items-center rounded-[14px] bg-white text-gray-500 shadow-[0_4px_14px_rgba(60,40,140,0.12)] transition-transform hover:-translate-y-px hover:text-[#D6334B]"><Trash2 className="h-4 w-4" /></button>
              ) : null}
              {canManage && article.status === 'removed' ? (
                <>
                  <button type="button" aria-label="Restaurar" onClick={() => { if (!window.confirm('Restaurar esta publicação?')) return; restoreJournalArticle(article.id); }} className="grid h-11 min-w-11 place-items-center rounded-[14px] bg-white text-gray-500 shadow-[0_4px_14px_rgba(60,40,140,0.12)]"><RotateCcw className="h-4 w-4" /></button>
                  <button type="button" aria-label="Excluir de vez" onClick={() => { if (!window.confirm('Excluir esta publicação de vez?')) return; purgeJournalArticle(article.id); navigate('/announcements'); }} className="grid h-11 min-w-11 place-items-center rounded-[14px] bg-white text-gray-500 shadow-[0_4px_14px_rgba(60,40,140,0.12)] hover:text-[#D6334B]"><Trash2 className="h-4 w-4" /></button>
                </>
              ) : null}
            </div>

            <section id="comentarios-noticia" className="mt-[30px] border-t border-[#E6E9F2] px-6 pt-6 sm:px-[34px]">
              <h2 className="mb-3.5 text-lg font-semibold">Comentários</h2>
              {article.comments.filter((item) => !item.replyTo).map((item) => {
                const replies = article.comments.filter((entry) => entry.replyTo === item.id);
                const open = openReplies[item.id];
                const liked = (item.likedBy ?? []).includes(currentUser.name);
                return (
                  <div key={item.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="mb-1 text-[15px] font-medium">{item.author}</p>
                        {item.text ? <p className="text-[15px] leading-6 whitespace-pre-wrap">{item.text}</p> : null}
                        <CommentPieces media={item.media} />
                        <button type="button" className="mt-1 text-xs font-semibold text-gray-500 hover:text-[#6D32F5]" onClick={() => { setReplyTo(item.id); setReplyDraft(''); }}>Responder</button>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" aria-label={liked ? 'Descurtir comentário' : 'Curtir comentário'} aria-pressed={liked} onClick={() => toggleJournalCommentLike(article.id, item.id, currentUser.name)} className={cn('grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-[#F6F3FF]', liked && 'text-[#6D32F5]')}>
                          <Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} />
                        </button>
                        {item.author === currentUser.name || canManage ? (
                          <button type="button" aria-label="Excluir comentário" className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-[#F6F3FF] hover:text-[#D6334B]" onClick={() => { if (!window.confirm('Excluir este comentário?')) return; deleteJournalComment(article.id, item.id); }}><Trash2 className="h-4 w-4" /></button>
                        ) : null}
                      </div>
                    </div>
                    {replies.length ? (
                      <button type="button" className="mt-2 text-xs font-semibold text-[#6D32F5]" onClick={() => setOpenReplies((current) => ({ ...current, [item.id]: !current[item.id] }))}>
                        {open ? 'Ocultar respostas' : `Ver todas as respostas (${replies.length})`}
                      </button>
                    ) : null}
                    {open ? replies.map((reply) => {
                      const replyLiked = (reply.likedBy ?? []).includes(currentUser.name);
                      return (
                        <div key={reply.id} className="mt-2 ml-8 flex items-start justify-between gap-3">
                          <div>
                            <p className="mb-1 text-[14px] font-medium">{reply.author}</p>
                            {reply.text ? <p className="text-[14px] leading-6 whitespace-pre-wrap">{reply.text}</p> : null}
                            <CommentPieces media={reply.media} />
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button type="button" aria-label={replyLiked ? 'Descurtir resposta' : 'Curtir resposta'} aria-pressed={replyLiked} onClick={() => toggleJournalCommentLike(article.id, reply.id, currentUser.name)} className={cn('grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-[#F6F3FF]', replyLiked && 'text-[#6D32F5]')}>
                              <Heart className="h-4 w-4" fill={replyLiked ? 'currentColor' : 'none'} />
                            </button>
                            {reply.author === currentUser.name || canManage ? (
                              <button type="button" aria-label="Excluir resposta" className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:text-[#D6334B]" onClick={() => { if (!window.confirm('Excluir este comentário?')) return; deleteJournalComment(article.id, reply.id); }}><Trash2 className="h-4 w-4" /></button>
                            ) : null}
                          </div>
                        </div>
                      );
                    }) : null}
                    {replyTo === item.id ? (
                      <div className="ml-8">
                        <CommentComposer value={replyDraft} placeholder={`Responder ${item.author}...`} label="Enviar resposta" onChange={setReplyDraft} onSend={(text, media) => sendComment(text, item.id, media)} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <CommentComposer value={comment} placeholder="Escreva um comentário..." label="Enviar comentário" onChange={setComment} onSend={(text, media) => sendComment(text, undefined, media)} />
            </section>
          </div>
        </article>
    </PageFrame>
      {canManage ? (
        <JournalEditor
          open={editing}
          article={article}
          author={currentUser.name}
          onOpenChange={setEditing}
        />
      ) : null}
      <JournalShareDialog article={article} open={shareOpen} onOpenChange={setShareOpen} onShared={() => { setShareOpen(false); navigate('/'); }} />
    </>
  );
};
