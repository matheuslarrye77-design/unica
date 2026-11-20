import { type FC } from 'react';
import { ReadMore } from './ReadMore';
import type { SocialPost } from './types';

export const PollPost: FC<{ post: SocialPost; onVote: (optionId: string) => void; expandId?: string; optionsOnly?: boolean }> = ({ post, onVote, expandId, optionsOnly = false }) => {
  const total = (post.poll ?? []).reduce((sum, option) => sum + option.votes, 0);
  const picked = new Set(post.votedIds?.length ? post.votedIds : post.votedId ? [post.votedId] : []);
  const revealed = picked.size > 0 || post.pollClosed;
  const closes = post.pollClosesAt ? new Date(post.pollClosesAt) : null;
  return (
    <div className="mt-3">
      {optionsOnly ? null : <ReadMore id={expandId ?? `${post.id}-enquete`} text={post.body} className="text-sm leading-6" />}
      {post.pollMultiple || closes ? (
        <p className="mt-2 text-[12px] text-muted-foreground">
          {[post.pollMultiple ? 'Pode marcar mais de uma' : '', closes ? `Encerra ${closes.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : '', post.pollClosed ? 'Encerrada' : ''].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {(post.poll ?? []).map((option) => {
          const percent = total === 0 ? 0 : Math.round((option.votes / total) * 100);
          const selected = picked.has(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={post.pollClosed}
                onClick={() => onVote(option.id)}
                className={`relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left text-sm disabled:cursor-default ${selected ? 'border-primary' : 'border-border hover:border-primary/40'}`}
              >
                <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${revealed ? percent : 0}%` }} />
                <span className="relative flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  {revealed ? <span className="text-xs text-muted-foreground">{percent}%</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
