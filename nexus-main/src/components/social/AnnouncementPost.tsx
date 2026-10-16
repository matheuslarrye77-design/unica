import { Link } from 'react-router-dom';
import { type FC } from 'react';
import { Megaphone } from 'lucide-react';
import { EmojiText } from '@/components/Emoji';
import { LilacWash } from './LilacWash';
import type { SocialPost } from './types';

export const AnnouncementPost: FC<{ post: SocialPost }> = ({ post }) => {
  return (
    <LilacWash
      className="mt-3"
      icon={<Megaphone className="h-5 w-5" strokeWidth={1.75} />}
      title={post.bannerTitle || 'Jornal'}
    >
      <p className="mt-1 line-clamp-2 text-[13px] font-normal leading-5 text-[#8A5AA0]"><EmojiText text={post.body} /></p>
      <Link to="/announcements" className="mt-2 inline-flex text-[12.5px] font-medium text-[#8E35B8] hover:underline">
        Ver no jornal
      </Link>
    </LilacWash>
  );
};
