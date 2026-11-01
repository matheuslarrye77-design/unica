import { Link } from 'react-router-dom';
import { type FC } from 'react';
import { Megaphone } from 'lucide-react';
import { LilacWash } from './LilacWash';
import { ReadMore } from './ReadMore';
import type { SocialPost } from './types';

export const AnnouncementPost: FC<{ post: SocialPost; expandId?: string }> = ({ post, expandId }) => {
  const href = post.journalHref || '/announcements';
  const title = post.bannerTitle || 'Notícia do jornal';
  const caption = post.body && post.body !== title ? post.body : '';
  return (
    <div className="mt-3">
      {caption ? (
        <div className="mb-1.5">
          <ReadMore id={expandId ?? `${post.id}-noticia`} text={caption} className="text-[14.5px] leading-6 text-[#3C3952] dark:text-foreground/90" />
        </div>
      ) : null}
      <Link to={href} className="block rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-[#8E35B8]/40">
        <LilacWash
          icon={<Megaphone className="h-5 w-5" strokeWidth={1.75} />}
          title={title}
          aside={post.image ? <img src={post.image} alt="" className="h-[88px] w-[120px] rounded-2xl object-cover shadow-sm" /> : undefined}
        >
          <p className="mt-1 text-[16px] font-semibold leading-5 text-[#6A228C]">Nova publicação no jornal</p>
          <p className="mt-1 text-[13px] font-normal leading-5 text-[#8A5AA0]">Toque neste card para abrir a notícia completa.</p>
        </LilacWash>
      </Link>
    </div>
  );
};
