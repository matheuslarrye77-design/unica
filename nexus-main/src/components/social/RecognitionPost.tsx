import { Award } from 'lucide-react';
import { type FC } from 'react';
import { LilacWash } from './LilacWash';
import { ReadMore } from './ReadMore';
import type { SocialPost } from './types';

export const RecognitionPost: FC<{ post: SocialPost }> = ({ post }) => {
  const name = post.recognizedName?.trim();
  const first = name?.split(' ')[0];
  const title = post.bannerTitle || (first ? `Reconhecimento especial para ${first}!` : null);
  return (
    <div className="mt-3">
      {title ? <h3 className="text-[16px] font-semibold leading-6 text-foreground">{title}</h3> : null}
      <div className="mt-1.5">
        <ReadMore id={`${post.id}-reconhecimento`} text={post.body} className="text-[14.5px] leading-6 text-[#3C3952] dark:text-foreground/90" />
      </div>
      <LilacWash
        className="mt-3"
        icon={<Award className="h-5 w-5" strokeWidth={1.75} />}
        title={post.tag || 'Reconhecimento'}
        aside={<img src="/trophy.png" alt="" className="h-[112px] w-auto max-w-[140px] object-contain" />}
      >
        <p className="mt-1 text-[16px] font-semibold leading-5 text-[#6A228C]">Você faz a diferença!</p>
        <p className="mt-1 text-[13px] font-normal leading-5 text-[#8A5AA0]">Seu esforço e dedicação são exemplos para toda a equipe.</p>
        <p className="mt-2 text-[12.5px] font-medium text-[#6A228C]">— Equipe Única</p>
      </LilacWash>
    </div>
  );
};
