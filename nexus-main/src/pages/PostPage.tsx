import { Header } from '@/components/Header';
import { PostCard } from '@/components/social/PostCard';
import { loadFeed } from '@/lib/feed';
import type { SocialPost } from '@/components/social/types';
import { type FC, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export const PostPage: FC = () => {
  const { id } = useParams();
  const [post, setPost] = useState<SocialPost | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void loadFeed().then((feed) => {
      const found = feed.posts.find((item) => item.id === id) ?? null;
      setPost(found);
      setMissing(!found);
    }).catch(() => setMissing(true));
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/" className="mb-4 inline-flex text-sm font-medium text-primary">Voltar ao mural</Link>
        {missing ? <p className="text-sm text-muted-foreground">Esta publicação não está disponível.</p> : null}
        {post ? (
          <PostCard
            post={{ ...post, commentsOpen: true }}
            commentDraft=""
            onCommentDraft={() => undefined}
            onLike={() => undefined}
            onShare={() => undefined}
            onToggleComments={() => undefined}
            onAddComment={() => undefined}
            onLikeComment={() => undefined}
            onVote={() => undefined}
            onRepublish={() => undefined}
          />
        ) : null}
      </div>
    </div>
  );
};
