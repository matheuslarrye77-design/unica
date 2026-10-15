import { Sun } from 'lucide-react';
import { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getTimeBasedGreeting } from '@/lib/utils';
import { cancelRepost, commentFeedPost, createFeedPost, deleteFeedComment, deleteFeedPost, likeFeedPost, loadFeed, republishPost, shareFeedPost, type Repost } from '@/lib/feed';
import { actor } from '@/lib/session';
import { isLeader, useInstitution } from '@/lib/institution';
import { CreatePost, type NewPostDraft } from './CreatePost';
import { FeedPreview } from './FeedPreview';
import { PostCard } from './PostCard';
import { RecognitionComposer } from './RecognitionComposer';
import type { SocialPost } from './types';

export const SocialFeed: FC<{ mode?: 'mural' | 'recognition'; preview?: boolean }> = ({ mode = 'mural', preview = false }) => {
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
    try {
      const result = await createFeedPost({ body: draft.body, image: draft.image, attachment: draft.attachment, poll: draft.poll });
      setPosts((current) => [result.post, ...current]);
      toast.success('Publicação enviada.');
    } catch {
      toast.error('Não foi possível publicar.');
    }
  }

  async function removePost(post: SocialPost) {
    if (!window.confirm('Excluir esta publicação?')) return;
    try {
      await deleteFeedPost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setReposts((current) => current.filter((item) => item.originalId !== post.id));
      toast.success('Publicação excluída.');
    } catch {
      toast.error('Não foi possível excluir a publicação.');
    }
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
  const freshPosts = visiblePosts.filter((post) => post.time === 'agora');
  const olderPosts = visiblePosts.filter((post) => post.time !== 'agora');
  function canRemove(post: SocialPost) {
    return post.authorId === user.id || post.author === user.name || isLeader(user);
  }
  const visibleReposts = mode === 'recognition'
    ? reposts.filter((repost) => posts.find((post) => post.id === repost.originalId)?.kind === 'recognition')
    : reposts;

  function renderFeedPost(post: SocialPost) {
    return (
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
          onDelete={canRemove(post) ? () => void removePost(post) : undefined}
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
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {mode === 'recognition' ? null : (
        <section className="relative isolate min-h-[118px] overflow-hidden rounded-[22px] border border-white/80 bg-white px-5 py-4 shadow-[0_18px_40px_rgba(142,53,184,0.10)]">
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_100%_0%,#F8D9F2_0%,rgba(248,217,242,0)_52%),radial-gradient(80%_120%_at_0%_100%,#F3E4FA_0%,rgba(243,228,250,0)_46%)]" />
          <span className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[#E7C4F2]/70 blur-2xl" />
          <span className="pointer-events-none absolute right-16 bottom-0 h-16 w-40 rounded-full bg-[#F7D7EA]/80 blur-xl" />
          <svg className="pointer-events-none absolute right-0 top-0 h-full w-[46%]" viewBox="0 0 280 120" fill="none" aria-hidden>
            <path d="M40 98c40-48 78-18 118-46 28-20 62-34 122-28" stroke="#E7C4F2" strokeWidth="18" strokeLinecap="round" />
            <path d="M70 112c36-34 84-10 122-30 24-12 48-16 88-8" stroke="#F6D5EA" strokeWidth="10" strokeLinecap="round" />
          </svg>
          <div className="relative flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white/80 text-primary shadow-[inset_0_0_0_1px_rgba(142,53,184,0.12),0_8px_18px_rgba(142,53,184,0.12)]">
              <Sun className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{getTimeBasedGreeting()}, {firstName}!</h1>
              <p className="mt-1 text-[13.5px] text-muted-foreground">Que hoje seja um dia incrível.</p>
            </div>
            <p className="unica-script relative hidden w-[158px] shrink-0 -rotate-6 text-right text-[22px] leading-[1.15] text-primary lg:block">
              <span className="block whitespace-nowrap">Juntos</span>
              <span className="block whitespace-nowrap">vamos mais</span>
              <span className="block whitespace-nowrap">longe!</span>
            </p>
          </div>
        </section>
      )}

      {mode === 'recognition' ? (canRecognize ? <RecognitionComposer onCreated={() => window.dispatchEvent(new Event('unica-feed-refresh'))} /> : null) : <CreatePost onPublish={(draft) => void publish(draft)} />}

      {mode === 'mural' ? freshPosts.map(renderFeedPost) : null}

      {preview && mode === 'mural' ? <FeedPreview /> : null}

      {mode === 'recognition' && visiblePosts.length === 0 && visibleReposts.length === 0 ? (
        <p className="unica-surface px-5 py-8 text-center text-[13px] text-muted-foreground">Nenhum reconhecimento ainda.</p>
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

      {(mode === 'mural' ? olderPosts : visiblePosts).map(renderFeedPost)}
    </div>
  );
};
