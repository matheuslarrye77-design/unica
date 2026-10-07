import { type FC } from 'react';
import type { SocialPost } from './types';

export const PollPost: FC<{ post: SocialPost; onVote: (optionId: string) => void }> = ({ post, onVote }) => {
  const total = (post.poll ?? []).reduce((sum, option) => sum + option.votes, 0);
  return (
    <div className="mt-3">
      <p className="text-sm leading-6">{post.body}</p>
      <ul className="mt-3 space-y-2">
        {(post.poll ?? []).map((option) => {
          const percent = total === 0 ? 0 : Math.round((option.votes / total) * 100);
          const selected = post.votedId === option.id;
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => onVote(option.id)}
                className={`relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left text-sm ${selected ? 'border-primary' : 'border-border hover:border-primary/40'}`}
              >
                <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${post.votedId ? percent : 0}%` }} />
                <span className="relative flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  {post.votedId ? <span className="text-xs text-muted-foreground">{percent}%</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
