import { Emoji } from '@/components/Emoji';
import { MOODS } from '@/components/shell/TeamMood';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Award, FileText, Lock, MoreHorizontal } from 'lucide-react';
import { PhotoGallery, ZoomImage } from './PhotoGallery';
import { ReadMore } from './ReadMore';
import { useEffect, useRef, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { AnnouncementPost } from './AnnouncementPost';
import { Comments } from './Comments';
import { EventPost } from './EventPost';
import { PollPost } from './PollPost';
import { PostActions } from './PostActions';
import { RecognitionPost } from './RecognitionPost';
import type { CommentMedia, SocialPost } from './types';

const AudioClip: FC<{ url: string; start: number; duration?: number }> = ({ url, start, duration }) => {
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
  return <audio ref={ref} src={url} controls preload="metadata" className="w-full" />;
};

const kindLabel: Partial<Record<SocialPost['kind'], string>> = {
  leadership: 'Liderança',
  announcement: 'Comunicado',
  recognition: 'Reconhecimento',
  poll: 'Enquete',
  event: 'Evento',
};

export const PostCard: FC<{
  post: SocialPost;
  commentDraft: string;
  onCommentDraft: (value: string) => void;
  onLike: () => void;
  onReact?: (kind: 'like' | 'love') => void;
  onToggleSave?: () => void;
  onShare: () => void;
  onToggleComments: () => void;
  onAddComment: () => void;
  onLikeComment: (commentId: string) => void;
  onVote: (optionId: string) => void;
  onRepublish: () => void;
  onDelete?: () => void;
  onSaveEdit?: (draft: { body: string; bannerTitle?: string }) => void | Promise<void>;
  republished?: boolean;
  canDeleteComment?: (commentId: string) => boolean;
  onDeleteComment?: (commentId: string) => void;
  pendingMedia?: CommentMedia | null;
  onMedia?: (media: CommentMedia | null) => void;
  onPasteFile?: (file: File) => void;
  onGifFile?: (file: File) => void;
  repost?: { name: string; avatar: string; note: string };
  anchorId?: string;
  preview?: boolean;
}> = ({ post, commentDraft, onCommentDraft, onLike, onReact, onToggleSave, onShare, onToggleComments, onAddComment, onLikeComment, onVote, onRepublish, onDelete, onSaveEdit, republished, canDeleteComment, onDeleteComment, pendingMedia, onMedia, onGifFile, onPasteFile, repost, anchorId }) => {
  const plain = post.kind === 'text' || post.kind === 'image' || post.kind === 'leadership';
  const domId = anchorId ?? post.id;
  const composed = post.kind === 'recognition' || post.kind === 'announcement';
  const blocks = (post.blocks ?? []).filter((block) => !(post.kind === 'poll' && block.type === 'text'));
  const decorations = composed ? blocks.filter((block) => block.type === 'image' && block.display) : [];
  const mood = MOODS.find((item) => item.emoji === post.mood);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [editTitle, setEditTitle] = useState(post.bannerTitle ?? '');
  const [savingEdit, setSavingEdit] = useState(false);
  const recognition = post.kind === 'recognition';

  return (
      <article id={domId} className="unica-surface p-5">
      {repost ? (
        <div className="mb-3 flex items-center gap-2 text-[12px] text-muted-foreground">
          <img src={repost.avatar} alt="" className="h-6 w-6 rounded-full bg-muted" />
          <span><span className="font-medium text-foreground">{repost.name}</span> republicou</span>
        </div>
      ) : null}
      {repost?.note ? <p className="mb-3 text-[13.5px] leading-6">{repost.note}</p> : null}
      <header className="flex items-start gap-3">
        <img src={post.avatar} alt="" className={`${recognition ? 'h-11 w-11' : 'h-10 w-10'} rounded-full bg-muted object-cover`} />
        <div className="min-w-0 flex-1 pt-0.5">
          {recognition ? (
            <>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="truncate text-[15px] font-medium leading-5 text-[var(--ds-ink)]">{post.author}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EFEDFC] px-2.5 py-0.5 text-[11px] font-medium text-[#7065C5]">
                  <Award className="h-3 w-3" />
                  Reconhecimento
                </span>
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[12px] leading-4 text-[#827A91]">
                <span>{post.time}</span>
                {post.audience === 'management' ? <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Somente a gestão</span> : null}
                {mood ? <span className="inline-flex items-center gap-1 text-[#4600F3]"><Emoji emoji={mood.emoji} className="h-3.5 w-3.5" />{mood.label}</span> : null}
              </p>
            </>
          ) : (
            <>
              <p className="truncate text-[14px] leading-5">
                <span className="font-semibold text-foreground">{post.author}</span>
                <span className="font-normal text-muted-foreground"> · {(post.department === 'Jornal' ? 'Jornal' : kindLabel[post.kind]) ?? post.department}</span>
              </p>
              <p className="flex flex-wrap items-center gap-x-1 text-[12px] leading-4 text-muted-foreground">
                <span>{post.time}</span>
                {post.audience === 'management' ? <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Somente a gestão</span> : null}
                {mood ? <span className="inline-flex items-center gap-1 text-[#3600C2]"><Emoji emoji={mood.emoji} className="h-3.5 w-3.5" />{mood.label}</span> : null}
              </p>
            </>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Mais ações" className={`flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${recognition ? 'text-[#827A91]' : 'text-muted-foreground'}`}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRepublish}>{republished ? 'Desfazer republicação' : 'Republicar'}</DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>Compartilhar</DropdownMenuItem>
            {onSaveEdit && !repost ? (
              <DropdownMenuItem onSelect={() => {
                setEditBody(post.body);
                setEditTitle(post.bannerTitle ?? '');
                setEditing(true);
              }}>
                Editar
              </DropdownMenuItem>
            ) : null}
            {onDelete ? (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => {
                  window.setTimeout(() => onDelete(), 0);
                }}
              >
                Excluir
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {editing && onSaveEdit ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (savingEdit) return;
            setSavingEdit(true);
            void Promise.resolve(onSaveEdit({ body: editBody.trim(), bannerTitle: editTitle.trim() || undefined }))
              .then(() => setEditing(false))
              .finally(() => setSavingEdit(false));
          }}
        >
          <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Título (opcional)" />
          <textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} className="min-h-[88px] w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="submit" disabled={savingEdit} className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">{savingEdit ? 'Salvando...' : 'Salvar'}</button>
            <button type="button" className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground" onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </form>
      ) : !composed && blocks.length > 0 ? (
        <div className="mt-2 space-y-2">
          {blocks.map((block, index) => {
            if (block.type === 'text') return <ReadMore key={`${domId}-texto-${index}`} id={`${domId}-texto-${index}`} text={block.text} className="text-[13.5px] leading-5 text-[#3C3952] dark:text-foreground/90" />;
            if (block.display === 'sticker' || block.display === 'gif') return <ZoomImage key={`${post.id}-imagem-${index}`} src={block.url} alt={block.display === 'gif' ? 'GIF' : 'Figurinha'} className="h-24 w-24 rounded-xl bg-[#F5F1FF] object-contain" />;
            return <ZoomImage key={`${post.id}-imagem-${index}`} src={block.url} className="max-h-[480px] w-full rounded-[12px] bg-[#F6F4FC] object-contain" />;
          })}
        </div>
      ) : (
        <>
          {plain && post.body ? <div className="mt-2"><ReadMore id={`${domId}-texto`} text={post.body} className="text-[13.5px] leading-5 text-[#3C3952] dark:text-foreground/90" /></div> : null}
          {post.kind !== 'announcement' && post.kind !== 'recognition' && post.images && post.images.length > 0 ? <PhotoGallery images={post.images} /> : post.kind === 'image' && post.image ? <ZoomImage src={post.image} className="mt-3 max-h-80 w-full rounded-[12px] object-contain bg-[#F6F4FC]" /> : null}
        </>
      )}
      {decorations.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {decorations.map((block, index) => (
            block.type === 'image' ? <ZoomImage key={`${post.id}-extra-${index}`} src={block.url} alt={block.display === 'gif' ? 'GIF' : 'Figurinha'} className="h-24 w-24 rounded-xl bg-[#F5F1FF] object-contain" /> : null
          ))}
        </div>
      ) : null}
      {post.kind === 'leadership' && post.image ? <ZoomImage src={post.image} className="mt-3 max-h-80 w-full rounded-[12px] object-cover" /> : null}
      {post.attachment?.type === 'video' && post.attachment.url ? <video src={post.attachment.url} controls preload="metadata" className="mt-3 max-h-[420px] w-full rounded-xl bg-black" /> : null}
      {post.attachment?.type === 'audio' && post.attachment.url ? (
        <div className="mt-3 rounded-xl border border-border px-3 py-2">
          <AudioClip url={post.attachment.url} start={post.attachment.start ?? 0} duration={post.attachment.duration} />
        </div>
      ) : null}
      {post.attachment?.type === 'document' ? (
        post.attachment.url ? (
          <a href={post.attachment.url} download={post.attachment.name} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            {post.attachment.name}
          </a>
        ) : (
          <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
            <FileText className="h-4 w-4 text-primary" />
            {post.attachment.name}
          </p>
        )
      ) : null}

      {post.kind === 'announcement' ? <AnnouncementPost post={post} expandId={`${domId}-noticia`} /> : null}
      {post.kind === 'recognition' ? <RecognitionPost post={post} expandId={`${domId}-reconhecimento`} /> : null}
      {post.kind === 'poll' ? <PollPost post={post} onVote={onVote} expandId={`${domId}-enquete`} /> : null}
      {post.kind !== 'poll' && post.poll && post.poll.length > 0 ? <PollPost post={post} onVote={onVote} optionsOnly expandId={`${domId}-enquete`} /> : null}
      {post.kind === 'event' ? <EventPost post={post} expandId={`${domId}-evento`} /> : null}

      {repost ? (
        <Link to={`/publicacao/${post.id}`} className="mt-3 block text-sm font-medium text-primary">Ver publicação original</Link>
      ) : null}
      <PostActions post={post} tone={recognition ? 'recognition' : 'default'} republished={republished} onLike={onLike} onReact={onReact} onToggleSave={onToggleSave} onComment={onToggleComments} onShare={onShare} onRepublish={onRepublish} />
      {post.commentsOpen ? (
        <Comments
          inputId={`comentario-${domId}`}
          comments={post.comments}
          draft={commentDraft}
          onDraft={onCommentDraft}
          onSubmit={onAddComment}
          onLike={onLikeComment}
          pendingMedia={pendingMedia}
          onMedia={onMedia}
          onGifFile={onGifFile}
          onPasteFile={onPasteFile}
          canDelete={canDeleteComment}
          onDelete={onDeleteComment}
        />
      ) : null}
    </article>
  );
};
