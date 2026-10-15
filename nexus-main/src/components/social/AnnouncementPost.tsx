import { Link } from 'react-router-dom';
import { type FC } from 'react';
import type { SocialPost } from './types';

export const AnnouncementPost: FC<{ post: SocialPost }> = ({ post }) => {
  return (
    <div className="mt-1.5">
      {post.image ? <img src={post.image} alt="" className="h-14 w-full rounded-[10px] border border-[#E6DAFF] object-cover" /> : <div className="flex h-14 items-center justify-center rounded-[10px] border border-dashed border-[#E6DAFF] bg-[#F1EAFE] text-[12px] text-[#55309D]">Capa do jornal</div>}
      {post.bannerTitle ? <h3 className="mt-1.5 text-[13px] font-semibold leading-4">{post.bannerTitle}</h3> : null}
      <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-muted-foreground">{post.body}</p>
      <Link to="/announcements" className="mt-1 inline-flex text-[12px] font-medium text-primary hover:underline">
        Ver no jornal
      </Link>
    </div>
  );
};
