import { FileText } from 'lucide-react';
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
  onShare: () => void;
  onToggleComments: () => void;
  onAddComment: () => void;
  onLikeComment: (commentId: string) => void;
  onVote: (optionId: string) => void;
  onRepublish: () => void;
  republished?: boolean;
  canDeleteComment?: (commentId: string) => boolean;
  onDeleteComment?: (commentId: string) => void;
  repost?: { name: string; avatar: string; note: string };
  preview?: boolean;
}> = ({ post, commentDraft, onCommentDraft, onLike, onShare, onToggleComments, onAddComment, onLikeComment, onVote, onRepublish, republished, canDeleteComment, onDeleteComment, repost, preview = false }) => {
  const plain = post.kind === 'text' || post.kind === 'image' || post.kind === 'leadership';

  return (
    <article id={post.id} className="unica-surface px-3 py-2">
      {repost ? (
        <div className="mb-3 flex items-center gap-2 text-[12px] text-muted-foreground">
          <img src={repost.avatar} alt="" className="h-6 w-6 rounded-full bg-muted" />
          <span><span className="font-medium text-foreground">{repost.name}</span> republicou</span>
        </div>
      ) : null}
      {repost?.note ? <p className="mb-3 text-[13.5px] leading-6">{repost.note}</p> : null}
      <header className="flex items-center gap-3">
        <img src={post.avatar} alt="" className="h-8 w-8 rounded-full bg-muted object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] leading-5">
            <span className="font-semibold text-foreground">{post.author}</span>
            <span className="text-muted-foreground"> · {(post.department === 'Jornal' ? 'Jornal' : kindLabel[post.kind]) ?? post.department} · {post.time}</span>
            {preview ? <span className="ml-1.5 rounded-full bg-[#F1EAFE] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#55309D]">Prévia</span> : null}
          </p>
        </div>
      </header>

      {plain ? <p className="mt-1.5 text-[12.5px] leading-5 text-[#3C3952] dark:text-foreground/90">{post.body}</p> : null}
      {post.kind === 'image' && post.image ? <img src={post.image} alt="" className="mt-3 max-h-80 w-full rounded-[12px] object-cover" /> : null}
      {post.kind === 'leadership' && post.image ? <img src={post.image} alt="" className="mt-3 max-h-80 w-full rounded-[12px] object-cover" /> : null}
      {post.attachment?.type === 'video' && post.attachment.url ? <video src={post.attachment.url} controls className="mt-3 max-h-[420px] w-full rounded-xl bg-black" /> : null}
      {post.attachment?.type === 'document' ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
          <FileText className="h-4 w-4 text-primary" />
          {post.attachment.name}
        </p>
      ) : null}

      {post.kind === 'announcement' ? <AnnouncementPost post={post} /> : null}
      {post.kind === 'recognition' ? <RecognitionPost post={post} /> : null}
      {post.kind === 'poll' ? <PollPost post={post} onVote={onVote} /> : null}
      {post.kind === 'event' ? <EventPost post={post} /> : null}

      {repost ? (
        <Link to={`/publicacao/${post.id}`} className="mt-3 block text-sm font-medium text-primary">Ver publicação original</Link>
      ) : null}
      <PostActions post={post} republished={republished} onLike={onLike} onComment={onToggleComments} onShare={onShare} onRepublish={onRepublish} />
      {post.commentsOpen && !repost ? (
        <Comments
          inputId={`comentario-${post.id}`}
          comments={post.comments}
          draft={commentDraft}
          onDraft={onCommentDraft}
          onSubmit={onAddComment}
          onLike={onLikeComment}
          canDelete={canDeleteComment}
          onDelete={onDeleteComment}
        />
      ) : null}
    </article>
  );
};
