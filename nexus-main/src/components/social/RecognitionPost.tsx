import { Award } from 'lucide-react';
import { type FC } from 'react';
import type { SocialPost } from './types';

export const RecognitionPost: FC<{ post: SocialPost }> = ({ post }) => {
  return (
    <div className="mt-3 rounded-xl border border-primary/15 bg-accent px-4 py-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <Award className="h-4 w-4" />
        Reconheça alguém da equipe
      </p>
      <h3 className="mt-2 text-lg font-semibold">Parabéns, {post.recognizedName}!</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{post.body}</p>
    </div>
  );
};
