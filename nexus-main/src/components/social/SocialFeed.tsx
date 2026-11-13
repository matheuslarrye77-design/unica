import { MuralTop } from './MuralTop';
import { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cancelRepost, commentFeedPost, createFeedPost, deleteFeedComment, deleteFeedPost, likeFeedComment, likeFeedPost, loadFeed, republishPost, saveFeedPost, shareFeedPost, updateFeedPost, uploadMedia, voteFeedPost, type Repost } from '@/lib/feed';
import { actor, useDemoProfile } from '@/lib/session';
import { isLeader, refreshMoods, useInstitution } from '@/lib/institution';
import { usePageSearch } from '@/lib/pageSearch';
import { CreatePost, type NewPostDraft } from './CreatePost';
import { articleCover, articleSummary, getJournalArticles } from '@/data/journal';
import { useSearchParams } from 'react-router-dom';
import { ExpandProvider } from './ReadMore';
import { FeedPreview } from './FeedPreview';
import { PostCard } from './PostCard';
import { RecognitionComposer } from './RecognitionComposer';
import type { CommentMedia, SocialPost } from './types';

export const SocialFeed: FC<{ mode?: 'mural' | 'recognition'; preview?: boolean }> = ({ mode = 'mural', preview = false }) => {
  const demo = useDemoProfile();
  const user = actor();
  const [params, setParams] = useSearchParams();
  const { isLeader: gestao } = useInstitution();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [reposts, setReposts] = useState<Repost[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [commentMedia, setCommentMedia] = useState<Record<string, CommentMedia | null>>({});
  const [savedOnly, setSavedOnly] = useState(false);
  const query = usePageSearch().query;
  const [feedError, setFeedError] = useState(false);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [repostId, setRepostId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const feedTicket = useRef(0);
  const feedWarned = useRef(false);
  const newsId = mode === 'mural' ? params.get('noticia') : null;
  const news = newsId ? getJournalArticles().find((item) => item.id === newsId && item.status === 'published') : undefined;
  const journalShare = news
    ? { id: news.id, title: news.title, summary: articleSummary(news.content), href: `/announcements/${news.id}`, cover: articleCover(news) || undefined }
    : null;

  useEffect(() => {
    if (!newsId) return;
    document.getElementById('novo-post')?.focus();
  }, [newsId]);

  function holdFeed() {
    feedTicket.current += 1;
  }

  useEffect(() => {
    const refresh = () => {
      const ticket = ++feedTicket.current;
      void loadFeed().then((feed) => {
        if (ticket !== feedTicket.current) return;
        feedWarned.current = false;
        setFeedError(false);
        setPosts((current) => feed.posts.map((post) => {
          const previous = current.find((item) => item.id === post.id);
          return previous ? { ...post, commentsOpen: previous.commentsOpen } : post;
        }));
        setReposts(feed.reposts);
      }).catch(() => {
        if (ticket !== feedTicket.current) return;
        setFeedError(true);
        if (feedWarned.current) return;
        feedWarned.current = true;
        toast.error('Não foi possível abrir o mural. As publicações já carregadas foram mantidas.');
      });
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
      const result = await createFeedPost({
        body: draft.body,
        images: draft.images,
        image: draft.images?.[0],
        blocks: draft.blocks,
        attachment: draft.attachment,
        poll: draft.poll,
        audience: draft.audience,
        mood: draft.mood,
        moodAudience: draft.moodAudience,
        shareMood: draft.shareMood,
        kind: draft.kind,
        bannerTitle: draft.bannerTitle,
        journalHref: draft.journalHref,
        nonce: draft.nonce,
      });
      if (draft.mood && draft.shareMood !== false) await refreshMoods().catch(() => undefined);
      holdFeed();
      setPosts((current) => [result.post, ...current]);
      toast.success('Publicação enviada.');
    } catch {
      toast.error('Não foi possível salvar. A publicação não foi gravada.');
      throw new Error('publish');
    }
  }

  async function removePost(post: SocialPost) {
    if (!window.confirm('Excluir esta publicação?')) return;
    try {
      await deleteFeedPost(post.id);
      holdFeed();
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

  function matchesQuery(post: SocialPost) {
    const needle = query.trim().toLowerCase();
    if (!needle || mode !== 'mural') return true;
    const texts = [
      post.body,
      post.bannerTitle ?? '',
      ...(post.blocks ?? []).flatMap((block) => (block.type === 'text' ? [block.text] : [])),
    ];
    return texts.join('\n').toLowerCase().includes(needle);
  }

  const visiblePosts = (mode === 'recognition' ? posts.filter((post) => post.kind === 'recognition') : posts).filter((post) => (!savedOnly || post.saved) && matchesQuery(post));
  function canRemove(post: SocialPost) {
    return post.authorId === user.id || post.author === user.name;
  }
  const visibleReposts = (mode === 'recognition'
    ? reposts.filter((repost) => posts.find((post) => post.id === repost.originalId)?.kind === 'recognition')
    : reposts
  ).filter((repost) => !savedOnly || Boolean(posts.find((post) => post.id === repost.originalId)?.saved));

  function undoRepost(id: string) {
    void cancelRepost(id).then(() => setReposts((current) => current.filter((item) => item.id !== id))).catch(() => toast.error('Não foi possível desfazer a republicação.'));
  }

  function renderFeedPost(post: SocialPost, cardKey = post.id, repost?: Repost) {
    const mineRepost = reposts.find((item) => item.userId === user.id && item.originalId === post.id);
    return (
      <div key={cardKey}>
        <PostCard
          anchorId={cardKey}
          post={{ ...post, commentsOpen: openCard === cardKey }}
          republished={repost ? repost.userId === user.id : Boolean(mineRepost)}
          repost={repost ? { name: repost.userName, avatar: repost.avatar, note: repost.note } : undefined}
          commentDraft={drafts[post.id] ?? ''}
          onCommentDraft={(value) => setDrafts((current) => ({ ...current, [post.id]: value }))}
          onLike={() => void likeFeedPost(post.id, 'like').then((result) => { holdFeed(); replace(result.post); }).catch(() => toast.error('Não foi possível registrar a reação.'))}
          onReact={(kind) => void likeFeedPost(post.id, kind).then((result) => { holdFeed(); replace(result.post); }).catch(() => toast.error('Não foi possível registrar a reação.'))}
          onToggleSave={() => void saveFeedPost(post.id).then((result) => replace(result.post)).catch(() => toast.error('Não foi possível salvar a publicação.'))}
          onShare={() => setShareId(cardKey)}
          onToggleComments={() => {
            const open = openCard !== cardKey;
            setOpenCard(open ? cardKey : null);
            if (open) window.setTimeout(() => document.getElementById(`comentario-${cardKey}`)?.focus(), 0);
          }}
          onAddComment={() => {
            const text = (drafts[post.id] ?? '').trim();
            const media = commentMedia[post.id];
            if (media?.url.startsWith('blob:')) {
              toast.error('Espere o arquivo terminar de enviar.');
              return;
            }
            if (!text && !media) return;
            void commentFeedPost(post.id, text, media ?? undefined).then((result) => {
              holdFeed();
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
          onPasteFile={(file) => {
            const kind = file.type.startsWith('video/') ? 'video' : 'image';
            const local = URL.createObjectURL(file);
            setCommentMedia((current) => ({ ...current, [post.id]: { kind, url: local } }));
            void uploadMedia(file).then((uploaded) => {
              URL.revokeObjectURL(local);
              setCommentMedia((current) => ({ ...current, [post.id]: { kind, url: uploaded.url } }));
            }).catch(() => {
              URL.revokeObjectURL(local);
              setCommentMedia((current) => ({ ...current, [post.id]: null }));
              toast.error('Não foi possível colar o arquivo.');
            });
          }}
          onLikeComment={(commentId) => void likeFeedComment(post.id, commentId).then((result) => replace({ ...result.post, commentsOpen: true })).catch(() => toast.error('Não foi possível curtir o comentário.'))}
          onVote={(optionId) => void voteFeedPost(post.id, optionId).then((result) => replace(result.post)).catch(() => toast.error('Não foi possível registrar o voto.'))}
          onRepublish={() => {
            if (repost?.userId === user.id) {
              undoRepost(repost.id);
              return;
            }
            if (!repost && mineRepost) {
              undoRepost(mineRepost.id);
              return;
            }
            if (mineRepost) {
              toast.error('Você já republicou esta publicação.');
              return;
            }
            setRepostId(cardKey);
            setNote('');
          }}
          onDelete={!repost && canRemove(post) ? () => void removePost(post) : undefined}
          onSaveEdit={mode === 'mural' && !repost && canRemove(post) && post.kind !== 'recognition' ? async (draft) => {
            try {
              const result = await updateFeedPost(post.id, draft);
              holdFeed();
              replace(result.post);
              toast.success('Publicação atualizada.');
            } catch {
              toast.error('Não foi possível salvar. A publicação não foi alterada.');
              throw new Error('edit');
            }
          } : undefined}
          canDeleteComment={(commentId) => canDelete(post, commentId)}
          onDeleteComment={(commentId) => {
            if (!window.confirm('Excluir este comentário?')) return;
            void deleteFeedComment(post.id, commentId).then((result) => replace({ ...result.post, commentsOpen: true })).catch(() => toast.error('Não foi possível excluir o comentário.'));
          }}
        />
        {shareId === cardKey ? (
          <div className="mt-2 flex gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <button type="button" className="inline-flex h-11 items-center rounded-2xl bg-white px-4 text-base font-semibold text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-blue-600" onClick={() => void copy(post)}>Copiar link</button>
            <button type="button" className="inline-flex h-11 items-center rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500" onClick={() => void share(post)}>Compartilhar</button>
            <button type="button" className="inline-flex h-11 items-center rounded-2xl px-4 text-base font-semibold text-gray-500 hover:text-gray-800" onClick={() => setShareId(null)}>Cancelar</button>
          </div>
        ) : null}
        {repostId === cardKey ? (
          <form className="mt-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]" onSubmit={(event) => { event.preventDefault(); void sendRepost(post); }}>
            <label className="text-sm font-medium text-gray-600" htmlFor={`nota-${cardKey}`}>Comentário da republicação</label>
            <textarea id={`nota-${cardKey}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcional" className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-3 py-2 text-base text-gray-800 outline-none" />
            <div className="mt-3 flex gap-2">
              <button type="submit" className="inline-flex h-11 items-center rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500">Republicar</button>
              <button type="button" className="inline-flex h-11 items-center rounded-2xl bg-white px-4 text-base font-semibold text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-blue-600" onClick={() => setRepostId(null)}>Cancelar</button>
            </div>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <ExpandProvider>
    <div className="flex w-full flex-col gap-6">
      {mode === 'recognition' ? null : <MuralTop />}

      {mode === 'recognition' ? (gestao ? <RecognitionComposer onCreated={() => window.dispatchEvent(new Event('unica-feed-refresh'))} /> : null) : <CreatePost onPublish={publish} journal={journalShare} onClearJournal={() => setParams({}, { replace: true })} />}

      {mode === 'mural' ? (
        <div className="flex justify-end">
          <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly((value) => !value)} className={`inline-flex h-11 items-center rounded-2xl px-4 text-base font-semibold ${savedOnly ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-blue-600'}`}>Salvos</button>
        </div>
      ) : null}

      {mode === 'mural' && feedError && posts.length === 0 ? (
        <p className="unica-surface px-5 py-8 text-center text-[13px] text-muted-foreground">Não foi possível carregar as publicações. Nada foi apagado do mural.</p>
      ) : null}

      {savedOnly && visiblePosts.length === 0 && visibleReposts.length === 0 ? <p className="unica-surface px-5 py-8 text-center text-[13px] text-muted-foreground">Nenhuma publicação salva.</p> : null}

      {preview && mode === 'mural' ? <FeedPreview /> : null}

      {mode === 'recognition' && visiblePosts.length === 0 && visibleReposts.length === 0 ? (
        <p className="unica-surface px-5 py-8 text-center text-[13px] text-muted-foreground">Nenhum reconhecimento ainda.</p>
      ) : null}

      {visibleReposts.map((repost) => {
        const original = posts.find((post) => post.id === repost.originalId);
        if (!original) return null;
        return renderFeedPost(original, `repost-${repost.id}`, repost);
      })}

      {visiblePosts.map((post) => renderFeedPost(post))}
    </div>
    </ExpandProvider>
  );
};
