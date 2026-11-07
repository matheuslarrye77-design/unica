import { Link } from 'react-router-dom';
import { type FC } from 'react';
import { Megaphone } from 'lucide-react';
import { LilacWash } from './LilacWash';
import { ReadMore } from './ReadMore';
import { categoryLabel, type JournalCategory } from '@/data/journal';
import type { SocialPost } from './types';

export const AnnouncementPost: FC<{ post: SocialPost; expandId?: string }> = ({ post, expandId }) => {
  const href = post.journalHref || '/announcements';
  const title = post.bannerTitle || 'Notícia do jornal';
  const category = post.journalCategory ? categoryLabel(post.journalCategory as JournalCategory) : null;
  const excerpt = post.journalExcerpt || '';
  const caption = post.caption || (post.body && post.body !== title && post.body !== excerpt ? post.body : '');
  const decorative = new Set((post.blocks ?? []).flatMap((block) => (block.type === 'image' && block.display ? [block.url] : [])));
  const listed = post.images?.length ? post.images : post.image ? [post.image] : [];
  const photos = listed.filter((url) => !decorative.has(url));
  return (
    <div className="mt-3">
      <p className="text-[16px] font-semibold leading-6 text-foreground">{title}</p>
      {category ? <p className="mt-0.5 text-[12px] font-semibold tracking-wide text-[#8E35B8]">{category}</p> : null}
      {photos[0] ? <img src={photos[0]} alt="" className="mt-2 max-h-72 w-full rounded-2xl object-cover" /> : null}
      {excerpt ? (
        <div className="mt-2">
          <ReadMore id={`${expandId ?? post.id}-noticia-original`} text={excerpt} className="text-[14px] leading-6 text-[#3C3952]" />
        </div>
      ) : null}
      {caption ? (
        <div className="mt-2">
          <ReadMore id={expandId ?? `${post.id}-noticia`} text={caption} className="text-[14.5px] leading-6 text-[#3C3952] dark:text-foreground/90" />
        </div>
      ) : null}
      {post.comment ? <p className="mt-2 text-[13.5px] leading-6 text-[#5C5168]">{post.comment}</p> : null}
      {photos.slice(1).length ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {photos.slice(1).map((url) => <img key={url} src={url} alt="" className="max-h-48 w-full rounded-xl object-cover" />)}
        </div>
      ) : null}
      <Link to={href} className="mt-3 block rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-[#8E35B8]/40">
        <LilacWash
          icon={<Megaphone className="h-5 w-5" strokeWidth={1.75} />}
          title={title}
          aside={photos[0] ? <img src={photos[0]} alt="" className="h-[88px] w-[120px] rounded-2xl object-cover shadow-sm" /> : undefined}
        >
          <p className="mt-1 text-[16px] font-semibold leading-5 text-[#6A228C]">Nova publicação no jornal</p>
          <p className="mt-1 text-[13px] font-normal leading-5 text-[#8A5AA0]">Toque neste card para abrir a notícia completa.</p>
        </LilacWash>
      </Link>
    </div>
  );
};
