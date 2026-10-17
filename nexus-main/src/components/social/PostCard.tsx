import { EmojiText } from '@/components/Emoji';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, MoreHorizontal } from 'lucide-react';
import { PhotoGallery } from './PhotoGallery';
import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { AnnouncementPost } from './AnnouncementPost';
import { Comments } from './Comments';
import { EventPost } from './EventPost';
import { PollPost } from './PollPost';
import { PostActions } from './PostActions';
import { RecognitionPost } from './RecognitionPost';
import type { SocialPost } from './types';

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
  republished?: boolean;
  canDeleteComment?: (commentId: string) => boolean;
  onDeleteComment?: (commentId: string) => void;
  pendingMedia?: { kind: 'gif' | 'sticker'; url: string } | null;
  onMedia?: (media: { kind: 'gif' | 'sticker'; url: string } | null) => void;
  onGifFile?: (file: File) => void;
  repost?: { name: string; avatar: string; note: string };
  preview?: boolean;
}> = ({ post, commentDraft, onCommentDraft, onLike, onReact, onToggleSave, onShare, onToggleComments, onAddComment, onLikeComment, onVote, onRepublish, onDelete, republished, canDeleteComment, onDeleteComment, pendingMedia, onMedia, onGifFile, repost }) => {
  const plain = post.kind === 'text' || post.kind === 'image' || post.kind === 'leadership';

  return (
      <article id={post.id} className="unica-surface px-4 py-3">
      {repost ? (
        <div className="mb-3 flex items-center gap-2 text-[12px] text-muted-foreground">
          <img src={repost.avatar} alt="" className="h-6 w-6 rounded-full bg-muted" />
          <span><span className="font-medium text-foreground">{repost.name}</span> republicou</span>
        </div>
      ) : null}
      {repost?.note ? <p className="mb-3 text-[13.5px] leading-6">{repost.note}</p> : null}
      <header className="flex items-start gap-3">
        <img src={post.avatar} alt="" className="h-10 w-10 rounded-full bg-muted object-cover" />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-[14px] leading-5">
            <span className="font-semibold text-foreground">{post.author}</span>
            <span className="font-normal text-muted-foreground"> · {(post.department === 'Jornal' ? 'Jornal' : kindLabel[post.kind]) ?? post.department}</span>
          </p>
          <p className="text-[12px] leading-4 text-muted-foreground">{post.time}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Mais ações" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRepublish}>{republished ? 'Desfazer republicação' : 'Republicar'}</DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>Compartilhar</DropdownMenuItem>
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

      {plain && post.body ? <p className="mt-2 text-[13.5px] leading-5 text-[#3C3952] dark:text-foreground/90"><EmojiText text={post.body} /></p> : null}
      {post.images && post.images.length > 0 ? <PhotoGallery images={post.images} /> : post.kind === 'image' && post.image ? <img src={post.image} alt="" className="mt-3 max-h-80 w-full rounded-[12px] object-cover" /> : null}
      {post.kind === 'leadership' && post.image ? <img src={post.image} alt="" className="mt-3 max-h-80 w-full rounded-[12px] object-cover" /> : null}
      {post.attachment?.type === 'video' && post.attachment.url ? <video src={post.attachment.url} controls className="mt-3 max-h-[420px] w-full rounded-xl bg-black" /> : null}
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

      {post.kind === 'announcement' ? <AnnouncementPost post={post} /> : null}
      {post.kind === 'recognition' ? <RecognitionPost post={post} /> : null}
      {post.kind === 'poll' ? <PollPost post={post} onVote={onVote} /> : null}
      {post.kind === 'event' ? <EventPost post={post} /> : null}

      {repost ? (
        <Link to={`/publicacao/${post.id}`} className="mt-3 block text-sm font-medium text-primary">Ver publicação original</Link>
      ) : null}
      <PostActions post={post} republished={republished} onLike={onLike} onReact={onReact} onToggleSave={onToggleSave} onComment={onToggleComments} onShare={onShare} onRepublish={onRepublish} />
      {post.commentsOpen && !repost ? (
        <Comments
          inputId={`comentario-${post.id}`}
          comments={post.comments}
          draft={commentDraft}
          onDraft={onCommentDraft}
          onSubmit={onAddComment}
          onLike={onLikeComment}
          pendingMedia={pendingMedia}
          onMedia={onMedia}
          onGifFile={onGifFile}
          canDelete={canDeleteComment}
          onDelete={onDeleteComment}
        />
      ) : null}
    </article>
  );
};
