import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalRail } from '@/components/journal/JournalRail';
import { JournalBadge, JournalRichText } from '@/components/journal/JournalVisual';
import { PageFrame } from '@/components/shell/PageFrame';
import { useJournalArticles, useJournalSaved } from '@/components/journal/useJournal';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Textarea } from '@/components/ui/textarea';
import {
  addJournalComment,
  archiveJournalArticle,
  deleteJournalComment,
  articleCover,
  articleSummary,
  canManageJournal,
  purgeJournalArticle,
  restoreJournalArticle,
  readingMinutes,
  toggleJournalPin,
  toggleJournalReaction,
  resolveJournalAsset,
  toggleJournalSave,
} from '@/data/journal';
import { createFeedPost } from '@/lib/feed';
import { currentUser } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { ArrowLeft, Bookmark, Heart, Megaphone, MessageCircle, Pencil, Pin, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type FC } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const JournalAudio: FC<{ url: string; start?: number; duration?: number }> = ({ url, start = 0, duration }) => {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    const place = () => {
      if (audio.currentTime < start || (duration && audio.currentTime >= start + duration)) audio.currentTime = start;
    };
    const tick = () => {
      if (duration && audio.currentTime >= start + duration) {
        audio.pause();
        audio.currentTime = start;
      }
    };
    audio.addEventListener('play', place);
    audio.addEventListener('timeupdate', tick);
    return () => {
      audio.removeEventListener('play', place);
      audio.removeEventListener('timeupdate', tick);
    };
  }, [start, duration]);
  return <audio ref={ref} controls src={url} preload="metadata" className="w-full" />;
};

export const JournalArticlePage: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const articles = useJournalArticles();
  const savedIds = useJournalSaved();
  const article = articles.find((item) => item.id === id);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [posting, setPosting] = useState(false);
  const canManage = canManageJournal(currentUser);

  if (!article || ((article.status === 'draft' || article.status === 'removed') && !canManage)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm text-muted-foreground">Esta publicação não está disponível.</p>
          <Link to="/announcements" className="mt-4 inline-flex text-sm font-medium text-primary">Voltar ao Jornal</Link>
        </div>
      </div>
    );
  }

  const reacted = article.reactedBy.includes(currentUser.name);

  function sendComment() {
    if (!article) return;
    addJournalComment(article.id, currentUser.name, comment);
    setComment('');
  }

  function pin() {
    if (!article) return;
    const result = toggleJournalPin(article.id);
    if (result.replacedId) toast.success('A publicação mais antiga saiu do destaque.');
  }

  async function postOnMural() {
    if (!article || posting) return;
    const image = articleCover(article) || resolveJournalAsset(article.cover);
    const cover = image && (image.startsWith('https://') || image.startsWith('/')) ? image : '';
    setPosting(true);
    try {
      await createFeedPost({
        body: articleSummary(article.content),
        kind: 'announcement',
        bannerTitle: article.title,
        journalHref: `/announcements/${article.id}`,
        image: cover || undefined,
        images: cover ? [cover] : undefined,
      });
      toast.success('Notícia publicada no mural.');
      navigate('/');
    } catch {
      toast.error('Não foi possível publicar no mural.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
    <PageFrame rail={<JournalRail articles={savedIds.map((savedId) => articles.find((item) => item.id === savedId && item.status === 'published')).filter((item): item is NonNullable<typeof item> => Boolean(item))} />}>
        <article className="min-w-0 flex-1">
          <Link to="/announcements" className="mb-4 flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Jornal
          </Link>
          <JournalBadge category={article.category} className="w-fit" />
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{article.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {article.author} · {new Date(article.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · {readingMinutes(article.content)} min de leitura
            {article.status === 'draft' ? ' · Rascunho' : ''}
            {article.status === 'removed' ? ' · Na lixeira' : ''}
          </p>
          {canManage ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {article.status !== 'removed' ? (
                <button type="button" aria-label="Editar" title="Editar" onClick={() => setEditing(true)} className="grid h-9 w-9 place-items-center rounded-full border border-[#E6DEEF] text-[#6A228C] hover:bg-[#F3E4FA]">
                  <Pencil className="h-4 w-4" />
                </button>
              ) : null}
              {article.status === 'published' ? (
                <button type="button" aria-label={article.pinned ? 'Desafixar' : 'Fixar'} title={article.pinned ? 'Desafixar' : 'Fixar'} onClick={pin} className={cn('grid h-9 w-9 place-items-center rounded-full border', article.pinned ? 'border-primary bg-[#F3E4FA] text-primary' : 'border-[#E6DEEF] text-[#6A228C] hover:bg-[#F3E4FA]')}>
                  <Pin className="h-4 w-4" fill={article.pinned ? 'currentColor' : 'none'} />
                </button>
              ) : null}
              {article.status === 'published' ? (
                <button type="button" aria-label="Publicar no mural" title="Publicar no mural" disabled={posting} onClick={() => void postOnMural()} className="grid h-9 w-9 place-items-center rounded-full border border-[#E6DEEF] text-[#6A228C] hover:bg-[#F3E4FA] disabled:opacity-50">
                  <Megaphone className="h-4 w-4" />
                </button>
              ) : null}
              {article.status === 'published' ? (
                <button type="button" aria-label="Lixeira" title="Lixeira" onClick={() => { if (!window.confirm('Mover esta publicação para a lixeira?')) return; archiveJournalArticle(article.id); navigate('/announcements'); }} className="grid h-9 w-9 place-items-center rounded-full border border-[#E6DEEF] text-[#9D174D] hover:bg-[#FDE7EE]">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
              {article.status === 'removed' ? (
                <>
                  <button type="button" aria-label="Restaurar" title="Restaurar" onClick={() => { if (!window.confirm('Restaurar esta publicação?')) return; restoreJournalArticle(article.id); }} className="grid h-9 w-9 place-items-center rounded-full border border-[#E6DEEF] text-[#6A228C] hover:bg-[#F3E4FA]">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Excluir de vez" title="Excluir de vez" onClick={() => { if (!window.confirm('Excluir esta publicação de vez?')) return; purgeJournalArticle(article.id); navigate('/announcements'); }} className="grid h-9 w-9 place-items-center rounded-full border border-[#E6DEEF] text-[#9D174D] hover:bg-[#FDE7EE]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          {articleCover(article) ? <img src={articleCover(article)} alt="" className="mt-6 aspect-[16/8] w-full rounded-2xl border object-cover" /> : null}
          <JournalRichText content={article.content} className="mt-6 space-y-4 text-base leading-7" />

          {article.media.length > 0 ? (
            <div className="mt-8 space-y-4">
              {article.media.filter((item) => item.kind === 'image').map((item) => (
                <img key={item.id} src={resolveJournalAsset(item.url)} alt={item.name} className="w-full rounded-2xl border" />
              ))}
              {article.media.filter((item) => item.kind === 'audio').map((item) => (
                <JournalAudio key={item.id} url={resolveJournalAsset(item.url)} start={item.start} duration={item.duration} />
              ))}
              {article.media.filter((item) => item.kind === 'video').map((item) => (
                <video key={item.id} controls src={resolveJournalAsset(item.url)} className="w-full rounded-2xl border" />
              ))}
              {article.media.filter((item) => item.kind === 'document').length > 0 ? (
                <ul className="space-y-2">
                  {article.media.filter((item) => item.kind === 'document').map((item) => (
                    <li key={item.id}>
                      <a href={resolveJournalAsset(item.url)} download={item.name} className="text-sm font-medium text-primary">{item.name}</a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex gap-3">
            <button type="button" onClick={() => toggleJournalReaction(article.id, currentUser.name)} className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm', reacted && 'border-primary text-primary')}>
              <Heart className={cn('h-4 w-4', reacted && 'fill-current')} />
              {article.reactions}
            </button>
            <button type="button" aria-label={savedIds.includes(article.id) ? 'Salva' : 'Salvar'} title={savedIds.includes(article.id) ? 'Salva' : 'Salvar'} aria-pressed={savedIds.includes(article.id)} onClick={() => toggleJournalSave(article.id)} className={cn('grid h-9 w-9 place-items-center rounded-full border', savedIds.includes(article.id) ? 'border-primary text-primary' : 'text-[#6A228C]')}>
              <Bookmark className="h-4 w-4" fill={savedIds.includes(article.id) ? 'currentColor' : 'none'} />
            </button>
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              {article.comments.length}
            </span>
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Comentários</h2>
            <div className="space-y-3">
              {article.comments.map((item) => (
                <div key={item.id} className="rounded-xl border bg-card px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{item.author}</p>
                    {item.author === currentUser.name || canManage ? (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          if (!window.confirm('Excluir este comentário?')) return;
                          deleteJournalComment(article.id, item.id);
                        }}
                      >
                        Excluir
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escreva um comentário..." />
              <Button className="w-fit" disabled={!comment.trim()} onClick={sendComment}>Comentar</Button>
            </div>
          </section>
        </article>
    </PageFrame>
      {canManage ? (
        <JournalEditor
          open={editing}
          article={article}
          author={currentUser.name}
          onOpenChange={setEditing}
        />
      ) : null}
    </>
  );
};
