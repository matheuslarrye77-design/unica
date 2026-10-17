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
  const [menu, setMenu] = useState(false);
  const [people, setPeople] = useState(false);
  const kinds = new Set((post.reactors ?? []).map((item) => item.kind));
  const showLike = kinds.size === 0 ? post.liked : kinds.has('like');
  const showLove = kinds.has('love') || (kinds.size === 0 && false);
  const saved = Boolean(post.saved);

  function choose(kind: 'like' | 'love') {
    setMenu(false);
    if (onReact) onReact(kind);
    else onLike();
  }

  return (
    <div className="mt-3 border-t border-border pt-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((open) => !open)}
            aria-pressed={post.liked}
            className={`inline-flex h-8 items-center gap-2 rounded-[8px] px-0.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${post.liked ? 'font-medium text-primary' : 'text-[#5C5870] hover:text-foreground'}`}
          >
            <span className="flex items-center" aria-hidden>
              {showLike || (!showLike && !showLove) ? (
                <span className="z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-white ring-2 ring-white">
                  <ThumbsUp className="h-3 w-3" fill="currentColor" />
                </span>
              ) : null}
              {showLove ? (
                <span className="-ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E11D48] text-white ring-2 ring-white">
                  <Heart className="h-3 w-3" fill="currentColor" />
                </span>
              ) : null}
            </span>
            <span onClick={(event) => { event.stopPropagation(); setPeople((open) => !open); setMenu(false); }}>{totalLabel(post.likes)}</span>
          </button>
          {menu ? (
            <div className="absolute bottom-9 left-0 z-20 flex gap-1 rounded-full border border-border bg-card p-1 shadow-md">
              <button type="button" className="rounded-full p-1.5 text-[#1877F2] hover:bg-accent" aria-label="Curtir" onClick={() => choose('like')}><ThumbsUp className="h-4 w-4" fill="currentColor" /></button>
              <button type="button" className="rounded-full p-1.5 text-[#E11D48] hover:bg-accent" aria-label="Amei" onClick={() => choose('love')}><Heart className="h-4 w-4" fill="currentColor" /></button>
            </div>
          ) : null}
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
