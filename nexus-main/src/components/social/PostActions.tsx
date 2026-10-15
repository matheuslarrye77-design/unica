import { Bookmark, Heart, MessageCircle, ThumbsUp } from 'lucide-react';
import { useState, type FC } from 'react';
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
}> = ({ post, onLike, onComment }) => {
  const comments = post.comments.length;
  const [saved, setSaved] = useState(false);
  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
      <button
        type="button"
        onClick={onLike}
        aria-pressed={post.liked}
        className={`inline-flex h-8 items-center gap-2 rounded-[8px] px-0.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${post.liked ? 'font-medium text-primary' : 'text-[#5C5870] hover:text-foreground'}`}
      >
        <span className="flex items-center" aria-hidden>
          <span className="z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-white ring-2 ring-white">
            <ThumbsUp className="h-3 w-3" fill="currentColor" />
          </span>
          <span className="-ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#8E35B8] text-white ring-2 ring-white">
            <Heart className="h-3 w-3" fill="currentColor" />
          </span>
        </span>
        {likeLabel(post.likes)}
      </button>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onComment}
          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[13px] text-[#5C5870] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <MessageCircle className="h-4 w-4" />
          {comments === 1 ? '1 comentário' : `${comments} comentários`}
        </button>
        <button
          type="button"
          onClick={() => setSaved((value) => !value)}
          aria-pressed={saved}
          aria-label={saved ? 'Remover dos favoritos' : 'Favoritar'}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${saved ? 'text-primary' : 'text-[#5C5870] hover:text-foreground'}`}
        >
          <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
};
