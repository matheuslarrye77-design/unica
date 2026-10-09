import { Award } from 'lucide-react';
import { type FC } from 'react';
import { directoryPeople } from '@/lib/institution';
import type { SocialPost } from './types';

export const RecognitionPost: FC<{ post: SocialPost }> = ({ post }) => {
  const person = directoryPeople.find((item) => item.name === post.recognizedName || item.name.split(' ')[0] === post.recognizedName);
  return (
    <div className="mt-3 rounded-xl border border-primary/15 bg-accent px-4 py-4">
      <div className="flex items-center gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Award className="h-4 w-4" />
          Reconhecimento
        </p>
        {post.tag ? <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-primary">{post.tag}</span> : null}
      </div>
      <div className="mt-3 flex items-center gap-3">
        {person?.avatar ? <img src={person.avatar} alt="" className="h-10 w-10 rounded-full bg-card" /> : null}
        <div>
          <p className="text-xs text-muted-foreground">Pessoa reconhecida</p>
          <h3 className="text-sm font-semibold">{post.recognizedName}</h3>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6">{post.body}</p>
    </div>
  );
};
