import { Link } from 'react-router-dom';
import { type FC } from 'react';
import type { SocialPost } from './types';

export const AnnouncementPost: FC<{ post: SocialPost }> = ({ post }) => {
  return (
    <div className="mt-3">
      {post.image ? <img src={post.image} alt="" className="h-40 w-full rounded-[12px] object-cover sm:h-44" /> : null}
      {post.bannerTitle ? <h3 className="mt-3 text-[15px] font-semibold leading-snug">{post.bannerTitle}</h3> : null}
      <p className="mt-1 text-[13.5px] leading-6 text-muted-foreground">{post.body}</p>
      <Link to="/announcements" className="mt-2 inline-flex text-[12.5px] font-medium text-primary hover:underline">
        Ver no jornal
      </Link>
    </div>
  );
};
