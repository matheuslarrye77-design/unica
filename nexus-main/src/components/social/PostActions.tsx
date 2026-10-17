import { Bookmark, Heart, MessageCircle, ThumbsUp } from 'lucide-react';
import { useState, type FC } from 'react';
import type { SocialPost } from './types';

function totalLabel(count: number) {
  if (count === 0) return 'Reagir';
  if (count === 1) return '1 pessoa reagiu';
  return `${count} pessoas reagiram`;
}

export const PostActions: FC<{
  post: SocialPost;
  republished?: boolean;
  onLike: () => void;
  onReact?: (kind: 'like' | 'love') => void;
  onComment: () => void;
  onShare: () => void;
  onRepublish: () => void;
  onToggleSave?: () => void;
}> = ({ post, onLike, onReact, onComment, onToggleSave }) => {
  const comments = post.comments.length;
  const [people, setPeople] = useState(false);
  const mine = new Set(post.myReactions ?? (post.reaction ? [post.reaction] : post.liked ? ['like'] : []));
  const saved = Boolean(post.saved);

  function choose(kind: 'like' | 'love') {
    if (onReact) onReact(kind);
    else onLike();
  }

  return (
    <div className="mt-3 border-t border-border pt-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <div className="inline-flex h-8 items-center gap-1.5 text-[13px] text-[#5C5870]">
            <button type="button" aria-label="Curtir com joinha" aria-pressed={mine.has('like')} className={`grid h-8 w-8 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${mine.has('like') ? 'bg-[#E8F1FF] text-[#1877F2]' : 'hover:bg-accent'}`} onClick={() => choose('like')}>
              <ThumbsUp className="h-4 w-4" fill={mine.has('like') ? 'currentColor' : 'none'} />
            </button>
            <button type="button" aria-label="Curtir com coração" aria-pressed={mine.has('love')} className={`grid h-8 w-8 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${mine.has('love') ? 'bg-[#F3E8FF]' : 'hover:bg-accent'}`} onClick={() => choose('love')}>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#7C3AED] text-white">
                <Heart className="h-3 w-3" fill="currentColor" />
              </span>
            </button>
            <button type="button" className="rounded-md px-1 hover:text-foreground" onClick={() => setPeople((open) => !open)}>{totalLabel(post.likes)}</button>
          </div>
          {people ? (
            <div className="absolute bottom-9 left-0 z-20 w-52 rounded-xl border border-border bg-card p-2 text-sm shadow-md">
              {(post.reactors ?? []).length === 0 ? <p className="px-1 py-1 text-muted-foreground">Ninguém reagiu ainda.</p> : null}
              {(post.reactors ?? []).map((item, index) => (
                <p key={`${item.name}-${index}`} className="flex items-center gap-2 px-1 py-1">
                  {item.kind === 'love' ? <Heart className="h-3.5 w-3.5 text-[#E11D48]" fill="currentColor" /> : <ThumbsUp className="h-3.5 w-3.5 text-[#1877F2]" fill="currentColor" />}
                  {item.name}
                </p>
              ))}
            </div>
          ) : null}
        </div>
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
            onClick={onToggleSave}
            aria-pressed={saved}
            aria-label={saved ? 'Remover dos salvos' : 'Salvar publicação'}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${saved ? 'text-primary' : 'text-[#5C5870] hover:text-foreground'}`}
          >
            <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  );
};
