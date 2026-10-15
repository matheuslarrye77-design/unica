import { Award } from 'lucide-react';
import { type FC } from 'react';
import { EmojiText } from '@/components/Emoji';
import type { SocialPost } from './types';

export const RecognitionPost: FC<{ post: SocialPost }> = ({ post }) => {
  const name = post.recognizedName?.trim();
  const first = name?.split(' ')[0];
  const title = post.bannerTitle || (first ? `Reconhecimento especial para ${first}!` : null);
  return (
    <div className="mt-3">
      {title ? <h3 className="text-[16px] font-semibold leading-6 text-foreground">{title}</h3> : null}
      <div className="mt-1.5 space-y-2 text-[14.5px] leading-6 text-[#3C3952] dark:text-foreground/90">
        {post.body.split('\n').filter((line) => line.trim()).map((line) => (
          <p key={line}><EmojiText text={line} /></p>
        ))}
      </div>
      <div className="relative mt-3 flex items-center gap-4 rounded-[14px] border border-[#E8DDFB] bg-[#F0E9FF] px-5 py-4">
        <span className="pointer-events-none absolute right-[132px] top-3 h-1.5 w-1.5 rounded-full bg-[#C45B8A]" />
        <span className="pointer-events-none absolute right-6 top-5 h-2 w-1 rotate-12 rounded-sm bg-[#E4C15A]" />
        <span className="pointer-events-none absolute right-[118px] bottom-5 h-1.5 w-1.5 rounded-full bg-[#7040C8]" />
        <span className="pointer-events-none absolute right-8 bottom-6 h-1.5 w-2 -rotate-12 rounded-sm bg-[#E7A0C4]" />
        <div className="relative min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-primary">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary shadow-[0_1px_2px_rgba(112,64,200,0.12)]">
              <Award className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            {post.tag || 'Reconhecimento'}
          </p>
          <p className="mt-2 text-[16px] font-semibold leading-5 text-[#4F278F]">Você faz a diferença!</p>
          <p className="mt-1 text-[13px] leading-5 text-[#5C5870]">Seu esforço e dedicação são exemplos para toda a equipe.</p>
          <p className="mt-2 text-[12.5px] text-[#4F278F]">— Equipe Única</p>
        </div>
        <img src="/trophy.png" alt="" className="relative h-[124px] w-auto max-w-[148px] shrink-0 object-contain" />
      </div>
    </div>
  );
};
