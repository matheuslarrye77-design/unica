import { Award } from 'lucide-react';
import { type FC } from 'react';
import type { SocialPost } from './types';
import { TrophyArt } from './TrophyArt';

export const RecognitionPost: FC<{ post: SocialPost }> = ({ post }) => {
  const name = post.recognizedName?.trim();
  const first = name?.split(' ')[0];
  const title = post.bannerTitle || (first ? `Reconhecimento especial para ${first}!` : null);
  return (
    <div className="mt-2">
      {title ? <h3 className="text-[13px] font-semibold leading-4 text-foreground">{title}</h3> : null}
      <p className="mt-1 line-clamp-2 text-[12px] leading-4 text-[#3C3952] dark:text-foreground/90">{post.body}</p>
      <div className="relative mt-1.5 overflow-hidden rounded-[10px] border border-[#E6DAFF] bg-[#F1EAFE] px-2.5 py-2">
        <span className="pointer-events-none absolute -right-2 -top-3 h-12 w-12 rounded-full bg-[#E6DAFF]" />
        <span className="pointer-events-none absolute right-14 bottom-1 h-1.5 w-1.5 rounded-full bg-[#F5B4D0]" />
        <span className="pointer-events-none absolute right-20 top-2 h-1.5 w-1.5 rounded-full bg-[#F6D56A]" />
        <div className="relative flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <span className="unica-icon">
                <Award className="h-3 w-3" strokeWidth={1.75} />
              </span>
              {post.tag || 'Reconhecimento'}
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-4 text-[#55309D]">Você faz a diferença!</p>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">Seu esforço e dedicação são exemplos para toda a equipe.</p>
          </div>
          <TrophyArt className="h-16 w-20 shrink-0" />
        </div>
      </div>
    </div>
  );
};
