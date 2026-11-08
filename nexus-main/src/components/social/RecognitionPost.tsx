import { type FC } from 'react';
import { ReadMore } from './ReadMore';
import { personAvatar, RecognitionArtCard } from './RecognitionArtCard';
import { firstNameOf, recognitionLine } from '@/lib/recognitionText';
import type { SocialPost } from './types';

export const RecognitionPost: FC<{ post: SocialPost; expandId?: string }> = ({ post, expandId }) => {
  const name = post.recognizedName?.trim() || '';
  const from = (post.recognizedBy?.trim() || post.author).trim();
  const line = name ? recognitionLine(from, name) : '';
  const caption = [post.caption, post.comment].filter(Boolean).join('\n').trim()
    || (post.body && post.body !== post.bannerTitle && !post.body.includes('reconheceu o excelente trabalho') ? post.body.trim() : '');
  const decorative = new Set((post.blocks ?? []).flatMap((block) => (block.type === 'image' && block.display ? [block.url] : [])));
  const listed = post.images?.length ? post.images : post.image ? [post.image] : [];
  const photos = listed.filter((url) => !decorative.has(url));
  return (
    <div className="mt-3.5">
      {line ? (
        <p className="unica-display text-[20px] leading-7 text-[#29213A]">
          {firstNameOf(from)} reconheceu <span className="text-[#3C3952]">{name}</span>
        </p>
      ) : null}
      {caption ? (
        <div className="mt-2">
          <ReadMore id={expandId ?? `${post.id}-reconhecimento`} text={caption} className="text-[15px] leading-6 text-[#514663] dark:text-foreground/90" />
        </div>
      ) : null}
      {photos.length ? (
        <div className={`mt-3 grid gap-2 ${photos.length > 1 ? 'grid-cols-2' : ''}`}>
          {photos.map((url) => <img key={url} src={url} alt="" className="max-h-72 w-full rounded-2xl object-cover" />)}
        </div>
      ) : null}
      {name ? (
        <div className="mt-3.5">
          <RecognitionArtCard name={name} avatar={personAvatar(name)} />
        </div>
      ) : null}
    </div>
  );
};
