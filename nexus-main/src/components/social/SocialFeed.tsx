import { Sun } from 'lucide-react';
import { LilacWash } from './LilacWash';
import { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getTimeBasedGreeting } from '@/lib/utils';
import { cancelRepost, commentFeedPost, createFeedPost, deleteFeedComment, deleteFeedPost, likeFeedComment, likeFeedPost, loadFeed, republishPost, saveFeedPost, shareFeedPost, uploadMedia, voteFeedPost, type Repost } from '@/lib/feed';
import { actor, useDemoProfile } from '@/lib/session';
import { isLeader, useInstitution } from '@/lib/institution';
import { CreatePost, type NewPostDraft } from './CreatePost';
import { FeedPreview } from './FeedPreview';
import { PostCard } from './PostCard';
import { RecognitionComposer } from './RecognitionComposer';
import type { SocialPost } from './types';

export const SocialFeed: FC<{ mode?: 'mural' | 'recognition'; preview?: boolean }> = ({ mode = 'mural', preview = false }) => {
  const demo = useDemoProfile();
  const user = actor();
  const { canRecognize } = useInstitution();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [reposts, setReposts] = useState<Repost[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [commentMedia, setCommentMedia] = useState<Record<string, { kind: 'gif' | 'sticker'; url: string } | null>>({});
  const [savedOnly, setSavedOnly] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [repostId, setRepostId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const firstName = user.name.split(' ')[0];

  useEffect(() => {
    const refresh = () => {
      void loadFeed().then((feed) => {
        setPosts((current) => feed.posts.map((post) => {
          const previous = current.find((item) => item.id === post.id);
          return previous ? { ...post, commentsOpen: previous.commentsOpen } : post;
        }));
        setReposts(feed.reposts);
      }).catch(() => toast.error('Não foi possível abrir o mural.'));
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener('unica-feed-refresh', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('unica-feed-refresh', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [demo]);

  function replace(post: SocialPost) {
    setPosts((current) => current.map((item) => (item.id === post.id ? { ...post, commentsOpen: item.commentsOpen } : item)));
  }

  async function publish(draft: NewPostDraft) {
    try {
      const result = await createFeedPost({ body: draft.body, images: draft.images, image: draft.images?.[0], attachment: draft.attachment, poll: draft.poll });
      setPosts((current) => [result.post, ...current]);
      toast.success('Publicação enviada.');
    } catch {
      toast.error('Não foi possível publicar.');
      throw new Error('publish');
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
  const visiblePosts = (mode === 'recognition' ? posts.filter((post) => post.kind === 'recognition') : posts).filter((post) => !savedOnly || post.saved);
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
          onLike={() => void likeFeedPost(post.id, 'like').then((result) => replace(result.post)).catch(() => toast.error('Não foi possível registrar a reação.'))}
          onReact={(kind) => void likeFeedPost(post.id, kind).then((result) => replace(result.post)).catch(() => toast.error('Não foi possível registrar a reação.'))}
          onToggleSave={() => void saveFeedPost(post.id).then((result) => replace(result.post)).catch(() => toast.error('Não foi possível salvar a publicação.'))}
          onShare={() => setShareId(post.id)}
          onToggleComments={() => setPosts((current) => current.map((item) => item.id === post.id ? { ...item, commentsOpen: !item.commentsOpen } : item))}
          onAddComment={() => {
            const text = (drafts[post.id] ?? '').trim();
            const media = commentMedia[post.id];
            if (!text && !media) return;
            void commentFeedPost(post.id, text, media ?? undefined).then((result) => {
              replace({ ...result.post, commentsOpen: true });
              setDrafts((current) => ({ ...current, [post.id]: '' }));
              setCommentMedia((current) => ({ ...current, [post.id]: null }));
            }).catch(() => toast.error('Não foi possível comentar.'));
          }}
          pendingMedia={commentMedia[post.id]}
          onMedia={(media) => setCommentMedia((current) => ({ ...current, [post.id]: media }))}
          onGifFile={(file) => {
            void uploadMedia(file).then((uploaded) => setCommentMedia((current) => ({ ...current, [post.id]: { kind: 'gif', url: uploaded.url } }))).catch(() => toast.error('Não foi possível enviar o GIF.'));
          }}
          onLikeComment={(commentId) => void likeFeedComment(post.id, commentId).then((result) => replace({ ...result.post, commentsOpen: true })).catch(() => toast.error('Não foi possível curtir o comentário.'))}
          onVote={(optionId) => void voteFeedPost(post.id, optionId).then((result) => replace(result.post)).catch(() => toast.error('Não foi possível registrar o voto.'))}
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
        <LilacWash
          className="min-h-[118px]"
          icon={<Sun className="h-6 w-6" strokeWidth={1.75} />}
          title={<h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#6A228C]">{getTimeBasedGreeting()}, {firstName}!</h1>}
        >
          <p className="mt-1 text-[13.5px] font-normal text-[#8A5AA0]">Que hoje seja um dia incrível.</p>
        </LilacWash>
      )}

      {mode === 'recognition' ? (canRecognize ? <RecognitionComposer onCreated={() => window.dispatchEvent(new Event('unica-feed-refresh'))} /> : null) : <CreatePost onPublish={publish} />}

      {mode === 'mural' ? (
        <div className="flex justify-end">
          <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly((value) => !value)} className={`rounded-full px-3 py-1 text-[13px] ${savedOnly ? 'bg-accent text-primary' : 'text-[#5C5870] hover:bg-accent'}`}>Salvos</button>
        </div>
      ) : null}

      {savedOnly && visiblePosts.length === 0 ? <p className="unica-surface px-5 py-8 text-center text-[13px] text-muted-foreground">Nenhuma publicação salva.</p> : null}

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

      {visiblePosts.map(renderFeedPost)}
    </div>
  );
};
