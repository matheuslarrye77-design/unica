import { Link } from 'react-router-dom';
import { type FC } from 'react';
import { EmojiText } from '@/components/Emoji';
import type { SocialPost } from './types';

export const AnnouncementPost: FC<{ post: SocialPost }> = ({ post }) => {
  return (
    <div className="mt-3 flex gap-3">
      {post.image ? <img src={post.image} alt="" className="h-[72px] w-[128px] shrink-0 rounded-[10px] border border-[#E8DDFB] object-cover" /> : <div className="flex h-[72px] w-[128px] shrink-0 items-center justify-center rounded-[10px] border border-dashed border-[#E8DDFB] bg-[#F0E9FF] text-[12px] text-accent-foreground">Capa do jornal</div>}
      <div className="min-w-0">
        {post.bannerTitle ? <h3 className="text-[15px] font-semibold leading-5">{post.bannerTitle}</h3> : null}
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-muted-foreground"><EmojiText text={post.body} /></p>
        <Link to="/announcements" className="mt-1 inline-flex text-[12.5px] font-medium text-primary hover:underline">
          Ver no jornal
        </Link>
      </div>
    </div>
  );
};
