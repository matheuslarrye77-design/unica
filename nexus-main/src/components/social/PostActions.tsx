import { Heart, MessageCircle, Repeat2, Share2 } from 'lucide-react';
import { type FC } from 'react';
import type { SocialPost } from './types';

function likeLabel(count: number) {
  if (count === 0) return 'Curtir';
  if (count === 1) return '1 pessoa curtiu isso';
  return `${count} pessoas curtiram isso`;
}

export const PostActions: FC<{
  post: SocialPost;
  republished?: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onRepublish: () => void;
}> = ({ post, republished = false, onLike, onComment, onShare, onRepublish }) => {
  const comments = post.comments.length;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
      <button
        type="button"
        onClick={onLike}
        aria-pressed={post.liked}
        className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-1.5 text-[12.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${post.liked ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Heart className="h-4 w-4" fill={post.liked ? 'currentColor' : 'none'} />
        {likeLabel(post.likes)}
      </button>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onComment}
          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[12.5px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <MessageCircle className="h-4 w-4" />
          {comments === 1 ? '1 comentário' : `${comments} comentários`}
        </button>
        <button
          type="button"
          onClick={onRepublish}
          aria-pressed={republished}
          className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[12.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${republished ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Repeat2 className="h-4 w-4" />
          {republished ? 'Republicado' : 'Republicar'}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[12.5px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Share2 className="h-4 w-4" />
          Compartilhar
        </button>
      </div>
    </div>
  );
};
