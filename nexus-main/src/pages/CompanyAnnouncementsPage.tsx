import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalRail } from '@/components/journal/JournalRail';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { useJournalArticles } from '@/components/journal/useJournal';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { articleSummary, canManageJournal, categoryLabel, type JournalArticle, type JournalCategory } from '@/data/journal';
import { currentUser } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Heart, MessageCircle, Plus, Search } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const filters = [
  { id: 'todos', label: 'Todos' },
  { id: 'processos', label: 'Processos' },
  { id: 'urgente', label: 'Urgente' },
  { id: 'social', label: 'Social' },
  { id: 'treinamentos', label: 'Treinamentos' },
] as const;

const tone: Record<JournalCategory, string> = {
  processos: 'bg-violet-100 text-violet-800',
  urgente: 'bg-rose-100 text-rose-800',
  social: 'bg-amber-100 text-amber-800',
  treinamentos: 'bg-emerald-100 text-emerald-800',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const Meta: FC<{ article: JournalArticle }> = ({ article }) => (
  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span className={cn('rounded-full px-2 py-0.5 font-medium', tone[article.category])}>{categoryLabel(article.category)}</span>
    <span>{formatDate(article.date)}</span>
    <span>{article.author}</span>
    <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{article.reactions}</span>
    <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{article.comments.length}</span>
  </p>
);

export const CompanyAnnouncementsPage: FC = () => {
  const articles = useJournalArticles();
  const [params, setParams] = useSearchParams();
  const category = params.get('categoria') ?? 'todos';
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<JournalArticle | null>(null);
  const canManage = canManageJournal(currentUser);

  const published = useMemo(
    () => articles.filter((article) => article.status === 'published').sort((a, b) => b.date.localeCompare(a.date)),
    [articles],
  );
  const query = search.trim().toLowerCase();
  const visible = published.filter((article) => {
    const matchesCategory = category === 'todos' || article.category === category;
    const matchesSearch = `${article.title} ${article.content} ${article.author}`.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
  const featured = visible.filter((article) => article.pinned).slice(0, 3);
  const featuredIds = new Set(featured.map((article) => article.id));
  const recent = visible.filter((article) => !featuredIds.has(article.id));
  const drafts = articles.filter((article) => article.status === 'draft');

  function selectCategory(next: string) {
    if (next === 'todos') setParams({}, { replace: true });
    else setParams({ categoria: next }, { replace: true });
  }

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openDraft(article: JournalArticle) {
    setEditing(article);
    setEditorOpen(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex w-full flex-col gap-8 px-4 py-6 lg:flex-row lg:items-start sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Jornal</h1>
              <p className="mt-1 text-sm text-muted-foreground">Notícias e comunicados internos da Única</p>
            </div>
            {canManage ? (
              <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Nova publicação</Button>
            ) : null}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectCategory(item.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  category === item.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="relative mb-8 block">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título ou conteúdo..." className="pl-9" />
          </label>

          {canManage && drafts.length > 0 && category === 'todos' && !query ? (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Rascunhos</h2>
              <div className="flex flex-col gap-2">
                {drafts.map((article) => (
                  <button key={article.id} type="button" onClick={() => openDraft(article)} className="rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-muted/40">
                    {article.title}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {featured.length > 0 ? (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold">Em destaque</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {featured.map((article) => (
                  <Link key={article.id} to={`/announcements/${article.id}`} className="group overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgba(40,20,70,0.05)]">
                    {article.cover ? <img src={article.cover} alt="" className="h-36 w-full object-cover" /> : null}
                    <div className="space-y-2 p-3">
                      <Meta article={article} />
                      <h3 className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-primary">{article.title}</h3>
                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{articleSummary(article.content)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-lg font-semibold">Publicações recentes</h2>
            {recent.length === 0 ? (
              <p className="rounded-2xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma publicação encontrada.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {recent.map((article) => (
                  <Link key={article.id} to={`/announcements/${article.id}`} className="group grid gap-4 rounded-xl border bg-card p-3 shadow-[0_1px_2px_rgba(40,20,70,0.05)] sm:grid-cols-[9rem_1fr]">
                    {article.cover ? <img src={article.cover} alt="" className="h-24 w-full rounded-lg object-cover" /> : null}
                    <div className="space-y-2 py-1 pr-2">
                      <Meta article={article} />
                      <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">{article.title}</h3>
                      <p className="text-sm leading-6 text-muted-foreground">{articleSummary(article.content)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
        <RightSidebar>
          <JournalRail category={category} recent={published.slice(0, 6)} onCategory={selectCategory} />
        </RightSidebar>
      </div>
      {canManage ? (
        <JournalEditor
          open={editorOpen}
          article={editing}
          author={currentUser.name}
          pinnedCount={published.filter((article) => article.pinned).length}
          onOpenChange={setEditorOpen}
        />
      ) : null}
    </div>
  );
};
