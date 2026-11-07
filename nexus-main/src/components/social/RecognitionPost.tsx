import { Award } from 'lucide-react';
import { type FC } from 'react';
import { LilacWash } from './LilacWash';
import { ReadMore } from './ReadMore';
import { recognitionHeadline } from '@/lib/recognitionText';
import type { SocialPost } from './types';

export const RecognitionPost: FC<{ post: SocialPost; expandId?: string }> = ({ post, expandId }) => {
  const name = post.recognizedName?.trim();
  const from = post.recognizedBy?.trim() || post.author;
  const title = post.bannerTitle || (name ? recognitionHeadline(from, name, Boolean(post.receivedRecognition) || from === name) : null);
  const extras = [post.caption, post.comment].filter(Boolean) as string[];
  const photos = post.images?.length ? post.images : post.image ? [post.image] : [];
  return (
    <div className="mt-3">
      {title ? <h3 className="text-[16px] font-semibold leading-6 text-foreground">{title}</h3> : null}
      {from && name ? (
        <p className="mt-1 text-[12.5px] text-[#8A7C98]">
          {post.receivedRecognition ? `${name} recebeu de ${from}` : `${from} reconheceu ${name}`}
        </p>
      ) : null}
      <div className="mt-1.5">
        <ReadMore id={expandId ?? `${post.id}-reconhecimento`} text={post.body} className="text-[14.5px] leading-6 text-[#3C3952] dark:text-foreground/90" />
      </div>
      {extras.map((item) => (
        <p key={item} className="mt-2 text-[13.5px] leading-6 text-[#5C5168]">{item}</p>
      ))}
      {photos.length ? (
        <div className={`mt-3 grid gap-2 ${photos.length > 1 ? 'grid-cols-2' : ''}`}>
          {photos.map((url) => <img key={url} src={url} alt="" className="max-h-72 w-full rounded-2xl object-cover" />)}
        </div>
      ) : null}
      <LilacWash
        className="mt-3"
        icon={<Award className="h-5 w-5" strokeWidth={1.75} />}
        title={post.tag || 'Reconhecimento'}
        aside={<img src="/trophy.png" alt="" className="h-[112px] w-auto max-w-[140px] object-contain" />}
      >
        <p className="mt-1 text-[16px] font-semibold leading-5 text-[#6A228C]">{title || 'Você faz a diferença!'}</p>
        <p className="mt-1 text-[13px] font-normal leading-5 text-[#8A5AA0]">Seu esforço e dedicação são exemplos para toda a equipe.</p>
        <p className="mt-2 text-[12.5px] font-medium text-[#6A228C]">— Equipe Única</p>
      </LilacWash>
    </div>
  );
};
