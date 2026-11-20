import { type FC } from 'react';
import { ZoomImage } from './PhotoGallery';
import { PollPost } from './PollPost';
import { ReadMore } from './ReadMore';
import { personAvatar, RecognitionArtCard } from './RecognitionArtCard';
import { firstNameOf, recognitionLine } from '@/lib/recognitionText';
import type { SocialPost } from './types';

export const RecognitionPost: FC<{ post: SocialPost; expandId?: string; onVote?: (optionId: string) => void }> = ({ post, expandId, onVote }) => {
  const name = post.recognizedName?.trim() || '';
  const from = (post.recognizedBy?.trim() || post.author).trim();
  const line = name ? recognitionLine(from, name) : '';
  const rawCaption = [post.caption, post.comment].filter(Boolean).join('\n').trim()
    || (post.body && post.body !== post.bannerTitle && !post.body.includes('reconheceu o excelente trabalho') ? post.body.trim() : '');
  const caption = rawCaption.replace(/legenda da publicação \(opcional\)/gi, '').trim();
  const decorative = new Set((post.blocks ?? []).flatMap((block) => (block.type === 'image' && block.display ? [block.url] : [])));
  const listed = post.images?.length ? post.images : post.image ? [post.image] : [];
  const photos = listed.filter((url) => !decorative.has(url));
  const stickers = (post.blocks ?? []).filter((block) => block.type === 'image' && block.display);
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
      {stickers.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {stickers.map((block, index) => block.type === 'image' ? <ZoomImage key={`${block.url}-${index}`} src={block.url} alt={block.display === 'gif' ? 'GIF' : 'Figurinha'} className="h-24 w-24 rounded-xl bg-[#F5F1FF] object-contain" /> : null)}
        </div>
      ) : null}
      {post.poll && post.poll.length > 0 && onVote ? <PollPost post={post} onVote={onVote} optionsOnly expandId={`${post.id}-enquete`} /> : null}
      {photos.length ? (
        <div className={`mt-3 grid gap-2 ${photos.length > 1 ? 'grid-cols-2' : ''}`}>
          {photos.map((url) => <ZoomImage key={url} src={url} className="max-h-72 w-full rounded-2xl object-cover" />)}
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
