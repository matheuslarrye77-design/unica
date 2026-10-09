import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalRail } from '@/components/journal/JournalRail';
import { PageFrame } from '@/components/shell/PageFrame';
import { useJournalArticles } from '@/components/journal/useJournal';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Textarea } from '@/components/ui/textarea';
import {
  addJournalComment,
  deleteJournalComment,
  canManageJournal,
  categoryLabel,
  toggleJournalPin,
  toggleJournalReaction,
  type JournalCategory,
} from '@/data/journal';
import { currentUser } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { ArrowLeft, Heart, MessageCircle, Pin } from 'lucide-react';
import { useState, type FC } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const tone: Record<JournalCategory, string> = {
  processos: 'bg-violet-100 text-violet-800',
  urgente: 'bg-rose-100 text-rose-800',
  social: 'bg-amber-100 text-amber-800',
  treinamentos: 'bg-emerald-100 text-emerald-800',
};

export const JournalArticlePage: FC = () => {
  const { id } = useParams();
  const articles = useJournalArticles();
  const article = articles.find((item) => item.id === id);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const canManage = canManageJournal(currentUser);
  const published = articles.filter((item) => item.status === 'published').sort((a, b) => b.date.localeCompare(a.date));

  if (!article || (article.status === 'draft' && !canManage)) {
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
    const ok = toggleJournalPin(article.id);
    if (!ok) toast.error('O destaque aceita no máximo 3 publicações.');
  }

  return (
    <>
    <PageFrame rail={<JournalRail recent={published.slice(0, 6)} />}>
        <article className="min-w-0 flex-1">
          <Link to="/announcements" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Jornal
          </Link>
          <p className={cn('mb-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium', tone[article.category])}>{categoryLabel(article.category)}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{article.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {article.author} · {new Date(article.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            {article.status === 'draft' ? ' · Rascunho' : ''}
          </p>
          {canManage ? (
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button>
              {article.status === 'published' ? (
                <Button variant="outline" size="sm" className="gap-2" onClick={pin}>
                  <Pin className="h-4 w-4" />
                  {article.pinned ? 'Desafixar' : 'Fixar'}
                </Button>
              ) : null}
            </div>
          ) : null}
          {article.cover ? <img src={article.cover} alt="" className="mt-6 aspect-[16/8] w-full rounded-2xl border object-cover" /> : null}
          <div className="mt-6 space-y-4 text-base leading-7 whitespace-pre-wrap">{article.content}</div>

          {article.media.length > 0 ? (
            <div className="mt-8 space-y-4">
              {article.media.filter((item) => item.kind === 'image').map((item) => (
                <img key={item.id} src={item.url} alt={item.name} className="w-full rounded-2xl border" />
              ))}
              {article.media.filter((item) => item.kind === 'audio').map((item) => (
                <div key={item.id}>
                  <p className="mb-1 text-sm font-medium">{item.name}</p>
                  <audio controls src={item.url} className="w-full" />
                </div>
              ))}
              {article.media.filter((item) => item.kind === 'video').map((item) => (
                <div key={item.id}>
                  <p className="mb-1 text-sm font-medium">{item.name}</p>
                  <video controls src={item.url} className="w-full rounded-2xl border" />
                </div>
              ))}
              {article.media.filter((item) => item.kind === 'document').length > 0 ? (
                <ul className="space-y-2">
                  {article.media.filter((item) => item.kind === 'document').map((item) => (
                    <li key={item.id}>
                      <a href={item.url} download={item.name} className="text-sm font-medium text-primary">{item.name}</a>
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
          pinnedCount={published.filter((item) => item.pinned).length}
          onOpenChange={setEditing}
        />
      ) : null}
    </>
  );
};
