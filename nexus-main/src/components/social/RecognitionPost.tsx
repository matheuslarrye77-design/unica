import { Award } from 'lucide-react';
import { type FC } from 'react';
import type { SocialPost } from './types';
import { TrophyArt } from './TrophyArt';

export const RecognitionPost: FC<{ post: SocialPost }> = ({ post }) => {
  const name = post.recognizedName?.trim();
  const first = name?.split(' ')[0];
  return (
    <div className="mt-3">
      {first ? <h3 className="text-[15px] font-semibold leading-snug text-foreground">Reconhecimento especial para {first}!</h3> : null}
      <p className={first ? 'mt-2 text-[13.5px] leading-6 text-[#3C3952] dark:text-foreground/90' : 'text-[13.5px] leading-6'}>{post.body}</p>
      <div className="relative mt-3 overflow-hidden rounded-[14px] bg-accent px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <Award className="h-3.5 w-3.5" strokeWidth={1.75} />
              {post.tag || 'Reconhecimento'}
            </p>
            <p className="mt-2 text-[15px] font-semibold leading-snug text-accent-foreground">Você faz a diferença!</p>
            <p className="mt-1 max-w-[280px] text-[12px] leading-5 text-muted-foreground">Seu esforço e dedicação são exemplos para toda a equipe.</p>
            <p className="mt-2 text-[12px] text-muted-foreground">— Equipe Única</p>
          </div>
          <TrophyArt className="h-[92px] w-[104px] shrink-0" />
        </div>
      </div>
    </div>
  );
};
