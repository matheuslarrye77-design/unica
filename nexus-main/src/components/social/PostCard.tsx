import { FileText } from 'lucide-react';
import { type FC } from 'react';
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
}> = ({ post, commentDraft, onCommentDraft, onLike, onShare, onToggleComments, onAddComment, onLikeComment, onVote }) => {
  const plain = post.kind === 'text' || post.kind === 'image' || post.kind === 'leadership';

  return (
    <article className="rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(40,20,70,0.05)]">
      <header className="flex items-center gap-3">
        <img src={post.avatar} alt="" className="h-11 w-11 rounded-full bg-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{post.author}</p>
            {kindLabel[post.kind] ? (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-primary">{kindLabel[post.kind]}</span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{post.role} · {post.department} · {post.time}</p>
        </div>
      </header>

      {plain ? <p className="mt-3 text-[15px] leading-7">{post.body}</p> : null}
      {post.kind === 'image' && post.image ? <img src={post.image} alt="" className="mt-3 max-h-[420px] w-full rounded-xl object-cover" /> : null}
      {post.kind === 'leadership' && post.image ? <img src={post.image} alt="" className="mt-3 max-h-[420px] w-full rounded-xl object-cover" /> : null}
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

      <PostActions post={post} onLike={onLike} onComment={onToggleComments} onShare={onShare} />
      {post.commentsOpen ? (
        <Comments
          inputId={`comentario-${post.id}`}
          comments={post.comments}
          draft={commentDraft}
          onDraft={onCommentDraft}
          onSubmit={onAddComment}
          onLike={onLikeComment}
        />
      ) : null}
    </article>
  );
};
