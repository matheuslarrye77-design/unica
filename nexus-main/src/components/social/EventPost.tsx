import { CalendarDays, MapPin } from 'lucide-react';
import { type FC } from 'react';
import { Link } from 'react-router-dom';
import type { SocialPost } from './types';

export const EventPost: FC<{ post: SocialPost }> = ({ post }) => {
  return (
    <div className="mt-3">
      <p className="text-sm leading-6">{post.body}</p>
      <div className="mt-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-primary" />
          {post.eventWhen}
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {post.eventWhere}
        </p>
        <Link to="/calendar" className="mt-3 inline-flex text-sm font-semibold text-primary">
          Ver no calendário
        </Link>
      </div>
    </div>
  );
};
