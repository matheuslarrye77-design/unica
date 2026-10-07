import { Link } from 'react-router-dom';
import { type FC } from 'react';
import type { SocialPost } from './types';

export const AnnouncementPost: FC<{ post: SocialPost }> = ({ post }) => {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-primary/15 bg-accent sm:flex">
      {post.image ? <img src={post.image} alt="" className="h-44 w-full object-cover sm:h-auto sm:w-56" /> : null}
      <div className="flex flex-1 flex-col justify-center gap-2 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Comunicado da Única</p>
        <h3 className="text-base font-semibold leading-snug">{post.bannerTitle}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{post.body}</p>
        <Link to="/announcements" className="inline-flex h-9 w-fit items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">
          Ver comunicado
        </Link>
      </div>
    </div>
  );
};
