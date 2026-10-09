import { Heart, MessageCircle, Repeat2, Share2 } from 'lucide-react';
import { type FC } from 'react';
import type { SocialPost } from './types';

export const PostActions: FC<{
  post: SocialPost;
  republished?: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onRepublish: () => void;
}> = ({ post, republished = false, onLike, onComment, onShare, onRepublish }) => {
  return (
    <div className="mt-4 flex items-center gap-1 border-t border-border pt-2">
      <button
        type="button"
        onClick={onLike}
        aria-pressed={post.liked}
        className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm ${post.liked ? 'font-medium text-primary' : 'text-muted-foreground hover:bg-muted'}`}
      >
        <Heart className="h-4 w-4" fill={post.liked ? 'currentColor' : 'none'} />
        Curtir
        <span className="text-xs">{post.likes}</span>
      </button>
      <button
        type="button"
        onClick={onComment}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted"
      >
        <MessageCircle className="h-4 w-4" />
        Comentar
        <span className="text-xs">{post.comments.length}</span>
      </button>
      <button
        type="button"
        onClick={onRepublish}
        aria-pressed={republished}
        className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm ${republished ? 'font-medium text-primary' : 'text-muted-foreground hover:bg-muted'}`}
      >
        <Repeat2 className="h-4 w-4" />
        {republished ? 'Republicado' : 'Republicar'}
      </button>
      <button
        type="button"
        onClick={onShare}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted"
      >
        <Share2 className="h-4 w-4" />
        Compartilhar
        <span className="text-xs">{post.shares}</span>
      </button>
    </div>
  );
};
