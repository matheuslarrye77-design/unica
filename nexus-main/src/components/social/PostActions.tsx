import { Bookmark, Heart, MessageCircle, ThumbsUp } from 'lucide-react';
import { useRef, useState, type FC } from 'react';
import type { SocialPost } from './types';

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

function MiniReaction({ kind }: { kind: 'like' | 'love' }) {
  const Icon = kind === 'love' ? Heart : ThumbsUp;
  return (
    <span className={`grid h-[18px] w-[18px] place-items-center rounded-full text-white ring-2 ring-card ${kind === 'love' ? 'bg-[#7C3AED]' : 'bg-[#1877F2]'}`}>
      <Icon className="h-2.5 w-2.5" fill="currentColor" />
    </span>
  );
}

export const PostActions: FC<{
  post: SocialPost;
  tone?: 'default' | 'recognition';
  republished?: boolean;
  onLike: () => void;
  onReact?: (kind: 'like' | 'love') => void;
  onComment: () => void;
  onShare: () => void;
  onRepublish: () => void;
  onToggleSave?: () => void;
}> = ({ post, tone = 'default', onLike, onReact, onComment, onToggleSave }) => {
  const comments = post.comments.length;
  const [picker, setPicker] = useState(false);
  const [people, setPeople] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const readyToReact = useRef(false);
  function openPicker() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setPicker(true);
  }
  function scheduleClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setPicker(false);
      readyToReact.current = false;
    }, 280);
  }
  const selected = post.myReactions?.[0] ?? post.reaction ?? (post.liked ? 'like' : null);
  const saved = Boolean(post.saved);
  const reactors = post.reactors ?? [];
  const likeNamed = reactors.filter((item) => item.kind === 'like').length;
  const loveNamed = reactors.filter((item) => item.kind === 'love').length;
  const unnamedLikes = Math.max(0, post.likes - reactors.length);
  const badges = [
    { kind: 'like' as const, count: likeNamed + unnamedLikes },
    { kind: 'love' as const, count: loveNamed },
  ].filter((item) => item.count > 0).sort((a, b) => b.count - a.count || (a.kind === 'like' ? -1 : 1));
  const likePeople = reactors.filter((item) => item.kind === 'like');
  const lovePeople = reactors.filter((item) => item.kind === 'love');

  function choose(kind: 'like' | 'love') {
    setPicker(false);
    readyToReact.current = false;
    if (onReact) onReact(kind);
    else onLike();
  }

  const recognition = tone === 'recognition';

  return (
    <div className="mt-3">
      {post.likes > 0 ? (
        <div className="relative mb-2 flex items-center">
          <button
            type="button"
            className="inline-flex items-center rounded-full py-0.5 pr-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-expanded={people}
            aria-label={`${post.likes} ${post.likes === 1 ? 'reação' : 'reações'}`}
            onClick={() => { setPeople((open) => !open); setPicker(false); }}
          >
            <span className="flex items-center pl-0.5">
              {badges.map((item, index) => (
                <span key={item.kind} className={index > 0 ? '-ml-1' : ''}>
                  <MiniReaction kind={item.kind} />
                </span>
              ))}
            </span>
            <span className="ml-1.5 text-[13px] text-[#5C5870]">{post.likes}</span>
          </button>
          {people ? (
            <div className="absolute bottom-full left-0 z-20 mb-2 w-56 rounded-xl border border-border bg-card p-2 text-sm shadow-md">
              {likePeople.length > 0 ? (
                <div className="mb-1">
                  <p className="px-1 py-1 text-[12px] font-semibold text-[#1877F2]">Curtir</p>
                  {likePeople.map((item, index) => (
                    <p key={`like-${item.name}-${index}`} className="flex items-center gap-2 px-1 py-1">
                      <ThumbsUp className="h-3.5 w-3.5 text-[#1877F2]" fill="currentColor" />
                      {item.name}
                    </p>
                  ))}
                </div>
              ) : null}
              {lovePeople.length > 0 ? (
                <div>
                  <p className="px-1 py-1 text-[12px] font-semibold text-[#7C3AED]">Amei</p>
                  {lovePeople.map((item, index) => (
                    <p key={`love-${item.name}-${index}`} className="flex items-center gap-2 px-1 py-1">
                      <Heart className="h-3.5 w-3.5 text-[#7C3AED]" fill="currentColor" />
                      {item.name}
                    </p>
                  ))}
                </div>
              ) : null}
              {unnamedLikes > 0 ? <p className="px-1 py-1 text-muted-foreground">{reactors.length === 0 ? (unnamedLikes === 1 ? '1 curtida' : `${unnamedLikes} curtidas`) : (unnamedLikes === 1 ? 'e 1 curtida anterior' : `e ${unnamedLikes} curtidas anteriores`)}</p> : null}
              {reactors.length === 0 && unnamedLikes === 0 ? <p className="px-1 py-1 text-muted-foreground">Ninguém reagiu ainda.</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={`border-t pt-2.5 ${recognition ? 'border-[#E9E2F2]' : 'border-border'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center ${recognition ? 'gap-3' : ''}`}>
        <div className="relative" onMouseEnter={openPicker} onMouseLeave={scheduleClose}>
          <div className={`inline-flex h-8 items-center gap-1.5 ${recognition ? 'text-[14px] text-[#7135C9]' : 'text-[13px] text-[#5C5870]'}`}>
            <button
              type="button"
              aria-label={selected === 'love' ? 'Amei' : 'Curtir'}
              aria-pressed={Boolean(selected)}
              aria-expanded={picker}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                recognition
                  ? selected
                    ? 'font-semibold text-[#5020A8]'
                    : 'text-[#7135C9] hover:bg-[#F4EDFF]'
                  : selected === 'love'
                    ? 'font-semibold text-[#7C3AED]'
                    : selected === 'like'
                      ? 'font-semibold text-[#1877F2]'
                      : 'hover:bg-accent'
              }`}
              onClick={() => {
                if (readyToReact.current) {
                  choose(selected === 'love' ? 'love' : 'like');
                  return;
                }
                readyToReact.current = true;
                setPicker(true);
              }}
            >
              {recognition ? (
                <ThumbsUp className="ml-1 h-4 w-4" fill={selected === 'like' ? 'currentColor' : 'none'} />
              ) : selected === 'love' ? <LoveMark /> : selected === 'like' ? <LikeMark selected /> : <ThumbsUp className="ml-1 h-4 w-4" />}
              <span className="pr-1">{!recognition && selected === 'love' ? 'Amei' : 'Curtir'}</span>
            </button>
          </div>
          {picker ? (
            <div className="absolute bottom-full left-0 z-20 px-1 pb-2" onMouseEnter={openPicker}>
            <div className="flex gap-2 rounded-full border border-border bg-card px-2 py-1.5 shadow-lg">
              <button type="button" aria-label="Curtir" className="rounded-full transition-transform hover:scale-110" onClick={() => choose('like')}><LikeMark /></button>
              <button type="button" aria-label="Amei" className="rounded-full transition-transform hover:scale-110" onClick={() => choose('love')}><LoveMark /></button>
            </div>
            </div>
          ) : null}
        </div>
        {recognition ? <span className="h-5 w-px bg-[#E9E2F2]" /> : null}
        {recognition ? (
          <button
            type="button"
            onClick={onComment}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[14px] text-[#7135C9] hover:bg-[#F4EDFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <MessageCircle className="h-4 w-4" />
            {comments === 1 ? '1 comentário' : `${comments} comentários`}
          </button>
        ) : null}
        </div>
        <div className="flex items-center gap-1">
        {recognition ? null : (
          <button
            type="button"
            onClick={onComment}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[13px] text-[#5C5870] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <MessageCircle className="h-4 w-4" />
            {comments === 1 ? '1 comentário' : `${comments} comentários`}
          </button>
        )}
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={saved ? 'Remover dos salvos' : 'Salvar publicação'}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
            recognition
              ? saved ? 'text-[#7135C9]' : 'text-[#7135C9] hover:bg-[#F4EDFF]'
              : saved ? 'text-primary' : 'text-[#5C5870] hover:text-foreground'
          }`}
        >
          <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
        </button>
        </div>
      </div>
      </div>
    </div>
  );
};
