import { Bookmark, Heart, MessageCircle, ThumbsUp } from 'lucide-react';
import { useRef, useState, type FC } from 'react';
import type { SocialPost } from './types';

function totalLabel(count: number) {
  if (count === 0) return 'Reagir';
  if (count === 1) return '1 pessoa reagiu';
  return `${count} pessoas reagiram`;
}

function LikeMark({ selected = false }: { selected?: boolean }) {
  return (
    <span className={`grid h-8 w-8 place-items-center rounded-full text-white ${selected ? 'bg-[#1877F2] ring-2 ring-white' : 'bg-[#1877F2]'}`}>
      <ThumbsUp className="h-4 w-4" fill="currentColor" />
    </span>
  );
}

function LoveMark() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#7C3AED] text-white ring-2 ring-white">
      <Heart className="h-4 w-4" fill="currentColor" />
    </span>
  );
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
  const [picker, setPicker] = useState(false);
  const [people, setPeople] = useState(false);
  const closeTimer = useRef<number | null>(null);
  function openPicker() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setPicker(true);
  }
  function scheduleClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setPicker(false), 280);
  }
  const selected = post.myReactions?.[0] ?? post.reaction ?? (post.liked ? 'like' : null);
  const saved = Boolean(post.saved);

  function choose(kind: 'like' | 'love') {
    setPicker(false);
    if (onReact) onReact(kind);
    else onLike();
  }

  return (
    <div className="mt-3 border-t border-border pt-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="relative" onMouseEnter={openPicker} onMouseLeave={scheduleClose}>
          <div className="inline-flex h-8 items-center gap-1.5 text-[13px] text-[#5C5870]">
            <button
              type="button"
              aria-label={selected === 'love' ? 'Amei' : 'Curtir'}
              aria-pressed={Boolean(selected)}
              aria-expanded={picker}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${selected === 'love' ? 'font-semibold text-[#7C3AED]' : selected === 'like' ? 'font-semibold text-[#1877F2]' : 'hover:bg-accent'}`}
              onClick={() => {
                if (picker) return;
                setPicker(true);
              }}
            >
              {selected === 'love' ? <LoveMark /> : selected === 'like' ? <LikeMark selected /> : <ThumbsUp className="ml-1 h-4 w-4" />}
              <span className="pr-1">{selected === 'love' ? 'Amei' : 'Curtir'}</span>
            </button>
            <button type="button" className="rounded-md px-1 hover:text-foreground" onClick={() => { setPeople((open) => !open); setPicker(false); }}>{totalLabel(post.likes)}</button>
          </div>
          {picker ? (
            <div className="absolute bottom-full left-0 z-20 px-1 pb-2" onMouseEnter={openPicker}>
            <div className="flex gap-2 rounded-full border border-border bg-card px-2 py-1.5 shadow-lg">
              <button type="button" aria-label="Curtir" className="rounded-full transition-transform hover:scale-110" onClick={() => choose('like')}><LikeMark /></button>
              <button type="button" aria-label="Amei" className="rounded-full transition-transform hover:scale-110" onClick={() => choose('love')}><LoveMark /></button>
            </div>
            </div>
          ) : null}
          {people ? (
            <div className="absolute bottom-10 left-0 z-20 w-52 rounded-xl border border-border bg-card p-2 text-sm shadow-md">
              {(post.reactors ?? []).length === 0 ? <p className="px-1 py-1 text-muted-foreground">Ninguém reagiu ainda.</p> : null}
              {(post.reactors ?? []).map((item, index) => (
                <p key={`${item.name}-${item.kind}-${index}`} className="flex items-center gap-2 px-1 py-1">
                  {item.kind === 'love' ? <Heart className="h-3.5 w-3.5 text-[#7C3AED]" fill="currentColor" /> : <ThumbsUp className="h-3.5 w-3.5 text-[#1877F2]" fill="currentColor" />}
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
