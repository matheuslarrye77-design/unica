import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalBadge, JournalRichText } from '@/components/journal/JournalVisual';
import { ZoomImage } from '@/components/social/PhotoGallery';
import { PageFrame } from '@/components/shell/PageFrame';
import { useJournalArticles, useJournalSaved } from '@/components/journal/useJournal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  addJournalComment,
  archiveJournalArticle,
  deleteJournalComment,
  articleCover,
  canManageJournal,
  purgeJournalArticle,
  restoreJournalArticle,
  readingMinutes,
  toggleJournalPin,
  toggleJournalReaction,
  resolveJournalAsset,
  toggleJournalSave,
} from '@/data/journal';
import { JournalShareDialog } from '@/components/journal/JournalShareDialog';
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
  const [shareOpen, setShareOpen] = useState(false);
  const canManage = canManageJournal(currentUser);

  if (!article || ((article.status === 'draft' || article.status === 'removed') && !canManage)) {
    return (
      <PageFrame>
        <p className="text-sm text-muted-foreground">Esta publicação não está disponível.</p>
        <Link to="/announcements" className="mt-4 inline-flex text-sm font-medium text-primary">Voltar ao Jornal</Link>
      </PageFrame>
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

  function postOnMural() {
    if (!article) return;
    setShareOpen(true);
  }

  return (
    <>
    <PageFrame>
        <article className="min-w-0 flex-1">
          <Link to="/announcements" className="mb-4 flex w-fit items-center gap-2 text-base text-gray-500 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" />
            Jornal
          </Link>
          <JournalBadge category={article.category} className="w-fit" />
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-800">{article.title}</h1>
          <p className="mt-3 text-base text-gray-500">
            {article.author} · {new Date(article.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · {readingMinutes(article.content)} min de leitura
            {article.status === 'draft' ? ' · Rascunho' : ''}
            {article.status === 'removed' ? ' · Na lixeira' : ''}
          </p>
          {canManage ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {article.status !== 'removed' ? (
                <button type="button" aria-label="Editar" title="Editar" onClick={() => setEditing(true)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-blue-600">
                  <Pencil className="h-4 w-4" />
                </button>
              ) : null}
              {article.status === 'published' ? (
                <button type="button" aria-label={article.pinned ? 'Desafixar' : 'Fixar'} title={article.pinned ? 'Desafixar' : 'Fixar'} onClick={pin} className={cn('grid h-11 w-11 place-items-center rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)]', article.pinned ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-600 hover:text-blue-600')}>
                  <Pin className="h-4 w-4" fill={article.pinned ? 'currentColor' : 'none'} />
                </button>
              ) : null}
              {article.status === 'published' ? (
                <button type="button" aria-label="Publicar no mural" title="Publicar no mural" onClick={postOnMural} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-blue-600">
                  <Megaphone className="h-4 w-4" />
                </button>
              ) : null}
              {article.status === 'published' ? (
                <button type="button" aria-label="Lixeira" title="Lixeira" onClick={() => { if (!window.confirm('Mover esta publicação para a lixeira?')) return; archiveJournalArticle(article.id); navigate('/announcements'); }} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-[#DB2777]">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
              {article.status === 'removed' ? (
                <>
                  <button type="button" aria-label="Restaurar" title="Restaurar" onClick={() => { if (!window.confirm('Restaurar esta publicação?')) return; restoreJournalArticle(article.id); }} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-blue-600">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Excluir de vez" title="Excluir de vez" onClick={() => { if (!window.confirm('Excluir esta publicação de vez?')) return; purgeJournalArticle(article.id); navigate('/announcements'); }} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:text-[#DB2777]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          {articleCover(article) ? <ZoomImage src={articleCover(article) ?? ''} className="mt-6 aspect-[16/8] w-full rounded-2xl border object-cover" /> : null}
          <JournalRichText content={article.content} className="mt-6 space-y-4 text-base leading-7" />

          {article.media.length > 0 ? (
            <div className="mt-8 space-y-4">
              {article.media.filter((item) => item.kind === 'image').map((item) => (
                <ZoomImage key={item.id} src={resolveJournalAsset(item.url)} alt={item.name} className="w-full rounded-2xl border" />
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
            <button type="button" aria-label={savedIds.includes(article.id) ? 'Salva' : 'Salvar'} title={savedIds.includes(article.id) ? 'Salva' : 'Salvar'} aria-pressed={savedIds.includes(article.id)} onClick={() => toggleJournalSave(article.id)} className={cn('grid h-9 w-9 place-items-center rounded-full border', savedIds.includes(article.id) ? 'border-primary text-primary' : 'text-[#3600C2]')}>
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
      <JournalShareDialog article={article} open={shareOpen} onOpenChange={setShareOpen} onShared={() => { setShareOpen(false); navigate('/'); }} />
    </>
  );
};
