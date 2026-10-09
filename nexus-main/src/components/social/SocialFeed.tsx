import { Sun } from 'lucide-react';
import { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getTimeBasedGreeting } from '@/lib/utils';
import { cancelRepost, commentFeedPost, createFeedPost, deleteFeedComment, likeFeedPost, loadFeed, republishPost, shareFeedPost, type Repost } from '@/lib/feed';
import { actor } from '@/lib/session';
import { isLeader, useInstitution } from '@/lib/institution';
import { CreatePost, type NewPostDraft } from './CreatePost';
import { PostCard } from './PostCard';
import { RecognitionComposer } from './RecognitionComposer';
import type { SocialPost } from './types';

export const SocialFeed: FC<{ mode?: 'mural' | 'recognition' }> = ({ mode = 'mural' }) => {
  const user = actor();
  const { canRecognize } = useInstitution();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [reposts, setReposts] = useState<Repost[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [shareId, setShareId] = useState<string | null>(null);
  const [repostId, setRepostId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const firstName = user.name.split(' ')[0];

  useEffect(() => {
    const refresh = () => {
      void loadFeed().then((feed) => {
        setPosts(feed.posts);
        setReposts(feed.reposts);
      }).catch(() => toast.error('Não foi possível abrir o mural.'));
    };
    refresh();
    window.addEventListener('unica-feed-refresh', refresh);
    return () => window.removeEventListener('unica-feed-refresh', refresh);
  }, []);

  function replace(post: SocialPost) {
    setPosts((current) => current.map((item) => (item.id === post.id ? { ...post, commentsOpen: item.commentsOpen } : item)));
  }

  async function publish(draft: NewPostDraft) {
    const result = await createFeedPost({ body: draft.body, image: draft.image, attachment: draft.attachment, poll: draft.poll });
    setPosts((current) => [result.post, ...current]);
  }

  async function writeLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('textarea');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand('copy');
      input.remove();
      if (!copied) throw new Error('copy');
    }
  }

  async function share(post: SocialPost) {
    const url = `${window.location.origin}/publicacao/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Única', text: post.body, url });
      else {
        await writeLink(url);
        toast.success('Link copiado.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setShareId(null);
        return;
      }
      try {
        await writeLink(url);
        toast.success('Link copiado.');
      } catch {
        toast.error('Não foi possível compartilhar.');
        return;
      }
    }
    const result = await shareFeedPost(post.id);
    replace(result.post);
    setShareId(null);
  }

  async function copy(post: SocialPost) {
    const url = `${window.location.origin}/publicacao/${post.id}`;
    try {
      await writeLink(url);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar o link.');
      return;
    }
    const result = await shareFeedPost(post.id);
    replace(result.post);
    setShareId(null);
  }

  async function sendRepost(post: SocialPost) {
    try {
      const result = await republishPost(post.id, note);
      setReposts((current) => [result.repost, ...current]);
      setNote('');
      setRepostId(null);
    } catch (error) {
      toast.error(error instanceof Error && error.message === '409' ? 'Você já republicou esta publicação.' : 'Não foi possível republicar.');
    }
  }

  function canDelete(post: SocialPost, commentId: string) {
    const comment = post.comments.find((item) => item.id === commentId);
    if (!comment) return false;
    return comment.authorId === user.id || comment.author === user.name || post.authorId === user.id || post.author === user.name || isLeader(user);
  }

  const mine = new Set(reposts.filter((item) => item.userId === user.id).map((item) => item.originalId));
  const visiblePosts = mode === 'recognition' ? posts.filter((post) => post.kind === 'recognition') : posts;
  const visibleReposts = mode === 'recognition'
    ? reposts.filter((repost) => posts.find((post) => post.id === repost.originalId)?.kind === 'recognition')
    : reposts;

  return (
    <div className="flex w-full flex-col gap-6">
      {mode === 'recognition' ? null : <section className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(40,20,70,0.05)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
          <Sun className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{getTimeBasedGreeting()}, {firstName}!</h1>
          <p className="text-sm text-muted-foreground">Que hoje seja um dia incrível.</p>
        </div>
      </section>}

      {mode === 'recognition' ? (canRecognize ? <RecognitionComposer onCreated={() => window.dispatchEvent(new Event('unica-feed-refresh'))} /> : null) : <CreatePost onPublish={(draft) => void publish(draft)} />}

      {mode === 'recognition' && visiblePosts.length === 0 && visibleReposts.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground shadow-[0_1px_2px_rgba(40,20,70,0.05)]">Nenhum reconhecimento ainda.</p>
      ) : null}

      {visibleReposts.map((repost) => {
        const original = posts.find((post) => post.id === repost.originalId);
        if (!original) return null;
        return (
          <PostCard
            key={repost.id}
            post={{ ...original, commentsOpen: false }}
            commentDraft=""
            republished={repost.userId === user.id}
            repost={{ name: repost.userName, avatar: repost.avatar, note: repost.note }}
            onCommentDraft={() => undefined}
            onLike={() => undefined}
            onShare={() => setShareId(original.id)}
            onToggleComments={() => undefined}
            onAddComment={() => undefined}
            onLikeComment={() => undefined}
            onVote={() => undefined}
            onRepublish={() => {
              if (repost.userId === user.id) {
                void cancelRepost(repost.id).then(() => setReposts((current) => current.filter((item) => item.id !== repost.id)));
              }
            }}
          />
        );
      })}

      {visiblePosts.map((post) => (
        <div key={post.id}>
          <PostCard
            post={post}
            republished={mine.has(post.id)}
            commentDraft={drafts[post.id] ?? ''}
            onCommentDraft={(value) => setDrafts((current) => ({ ...current, [post.id]: value }))}
            onLike={() => void likeFeedPost(post.id).then((result) => replace(result.post))}
            onShare={() => setShareId(post.id)}
            onToggleComments={() => setPosts((current) => current.map((item) => item.id === post.id ? { ...item, commentsOpen: !item.commentsOpen } : item))}
            onAddComment={() => {
              const text = (drafts[post.id] ?? '').trim();
              if (!text) return;
              void commentFeedPost(post.id, text).then((result) => {
                replace({ ...result.post, commentsOpen: true });
                setDrafts((current) => ({ ...current, [post.id]: '' }));
              });
            }}
            onLikeComment={() => undefined}
            onVote={() => undefined}
            onRepublish={() => {
              const existing = reposts.find((item) => item.userId === user.id && item.originalId === post.id);
              if (existing) {
                void cancelRepost(existing.id).then(() => setReposts((current) => current.filter((item) => item.id !== existing.id)));
                return;
              }
              setRepostId(post.id);
              setNote('');
            }}
            canDeleteComment={(commentId) => canDelete(post, commentId)}
            onDeleteComment={(commentId) => {
              if (!window.confirm('Excluir este comentário?')) return;
              void deleteFeedComment(post.id, commentId).then((result) => replace({ ...result.post, commentsOpen: true }));
            }}
          />
          {shareId === post.id ? (
            <div className="mt-2 flex gap-2 rounded-xl border bg-card p-3 text-sm">
              <button type="button" className="rounded-lg border px-3 py-1.5" onClick={() => void copy(post)}>Copiar link</button>
              <button type="button" className="rounded-lg border px-3 py-1.5" onClick={() => void share(post)}>Compartilhar</button>
              <button type="button" className="rounded-lg px-3 py-1.5 text-muted-foreground" onClick={() => setShareId(null)}>Cancelar</button>
            </div>
          ) : null}
          {repostId === post.id ? (
            <form className="mt-2 rounded-xl border bg-card p-3" onSubmit={(event) => { event.preventDefault(); void sendRepost(post); }}>
              <label className="text-sm font-medium" htmlFor={`nota-${post.id}`}>Comentário da republicação</label>
              <textarea id={`nota-${post.id}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcional" className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
              <div className="mt-2 flex gap-2">
                <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">Republicar</button>
                <button type="button" className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground" onClick={() => setRepostId(null)}>Cancelar</button>
              </div>
            </form>
          ) : null}
        </div>
      ))}
    </div>
  );
};
