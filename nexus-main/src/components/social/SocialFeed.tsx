import { Sun } from 'lucide-react';
import { type FC, useState } from 'react';
import { currentUser } from '@/data/mockData';
import { getTimeBasedGreeting } from '@/lib/utils';
import { CreatePost, type NewPostDraft } from './CreatePost';
import { PostCard } from './PostCard';
import { samplePosts } from './samplePosts';
import type { SocialPost } from './types';

const avatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

export const SocialFeed: FC = () => {
  const [posts, setPosts] = useState<SocialPost[]>(samplePosts);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const firstName = currentUser.name.split(' ')[0];

  function update(id: string, change: (post: SocialPost) => SocialPost) {
    setPosts((current) => current.map((post) => (post.id === id ? change(post) : post)));
  }

  function publish(draft: NewPostDraft) {
    const post: SocialPost = {
      id: `post-${Date.now()}`,
      kind: draft.poll ? 'poll' : draft.image ? 'image' : 'text',
      author: currentUser.name,
      role: currentUser.role,
      department: currentUser.department,
      avatar: currentUser.avatar,
      time: 'agora',
      body: draft.body,
      image: draft.image,
      attachment: draft.attachment,
      likes: 0,
      liked: false,
      shares: 0,
      shared: false,
      comments: [],
      commentsOpen: false,
      poll: draft.poll,
      votedId: draft.poll ? null : undefined,
    };
    setPosts((current) => [post, ...current]);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(40,20,70,0.05)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
          <Sun className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{getTimeBasedGreeting()}, {firstName}!</h1>
          <p className="text-sm text-muted-foreground">Que hoje seja um dia incrível.</p>
        </div>
      </section>

      <CreatePost onPublish={publish} />

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          commentDraft={drafts[post.id] ?? ''}
          onCommentDraft={(value) => setDrafts((current) => ({ ...current, [post.id]: value }))}
          onLike={() => update(post.id, (item) => ({ ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) }))}
          onShare={() => update(post.id, (item) => ({ ...item, shared: !item.shared, shares: item.shares + (item.shared ? -1 : 1) }))}
          onToggleComments={() => update(post.id, (item) => ({ ...item, commentsOpen: !item.commentsOpen }))}
          onAddComment={() => {
            const text = (drafts[post.id] ?? '').trim();
            if (!text) return;
            update(post.id, (item) => ({
              ...item,
              comments: [
                ...item.comments,
                { id: `c-${Date.now()}`, author: currentUser.name, avatar: currentUser.avatar || avatar(currentUser.name), body: text, time: 'agora', likes: 0, liked: false },
              ],
            }));
            setDrafts((current) => ({ ...current, [post.id]: '' }));
          }}
          onLikeComment={(commentId) =>
            update(post.id, (item) => ({
              ...item,
              comments: item.comments.map((comment) =>
                comment.id === commentId ? { ...comment, liked: !comment.liked, likes: comment.likes + (comment.liked ? -1 : 1) } : comment
              ),
            }))
          }
          onVote={(optionId) =>
            update(post.id, (item) => {
              if (!item.poll || item.votedId) return item;
              return {
                ...item,
                votedId: optionId,
                poll: item.poll.map((option) => (option.id === optionId ? { ...option, votes: option.votes + 1 } : option)),
              };
            })
          }
        />
      ))}
    </div>
  );
};
