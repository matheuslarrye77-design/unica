import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalRail } from '@/components/journal/JournalRail';
import { JournalCover, categoryTone } from '@/components/journal/JournalVisual';
import { PageFrame } from '@/components/shell/PageFrame';
import { useJournalArticles, useJournalSaved } from '@/components/journal/useJournal';
import { Input } from '@/components/ui/input';
import { articleSummary, canManageJournal, readingMinutes, toggleJournalSave, type JournalArticle, type JournalCategory } from '@/data/journal';
import { currentUser } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Bookmark, Calendar, ChevronRight, ClipboardList, Clock, Newspaper, Plus, Search } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const FeaturedCard: FC<{ article: JournalArticle; saved: boolean }> = ({ article, saved }) => {
  const minutes = readingMinutes(article.content);
  return (
    <Link to={`/announcements/${article.id}`} className="group flex flex-col rounded-[22px] border border-[#EFE8F4] bg-white p-3.5 shadow-[0_10px_28px_rgba(80,40,120,0.06)]">
      <JournalCover article={article} />
      <h3 className="mt-3.5 line-clamp-2 min-h-[46px] text-[17px] font-semibold leading-[1.28] tracking-tight text-[#1A1428] group-hover:text-[#6A228C]">{article.title}</h3>
      <p className="mt-2 line-clamp-3 min-h-[60px] text-[13px] leading-5 text-[#625C70]">{articleSummary(article.content)}</p>
      <div className="mt-3.5 flex items-center gap-4 text-[12.5px] text-[#948D9E]">
        <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />{formatDate(article.date)}</span>
        <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" strokeWidth={1.75} />{minutes} min</span>
      </div>
      <div className="mt-auto flex items-center gap-2 pt-3.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#7A2498] text-[10px] font-bold tracking-tight text-white">U1</span>
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#6A228C]">{article.author}</span>
        <button
          type="button"
          aria-label={saved ? 'Remover dos salvos' : 'Salvar'}
          aria-pressed={saved}
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleJournalSave(article.id); }}
          className={cn('grid h-7 w-7 place-items-center rounded-full', saved ? 'text-[#7A2498]' : 'text-[#C9BED6] hover:text-[#8E35B8]')}
        >
          <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
        </button>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#C9BED6] transition-colors group-hover:text-[#8E35B8]" />
      </div>
    </Link>
  );
};

export const CompanyAnnouncementsPage: FC = () => {
  const articles = useJournalArticles();
  const savedIds = useJournalSaved();
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
  const showingDefault = category === 'todos' && !query;
  const visible = published.filter((article) => {
    const matchesCategory = category === 'todos' || article.category === category;
    const matchesSearch = `${article.title} ${article.content} ${article.author}`.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
  const featured = [...visible.filter((article) => article.pinned)].sort((a, b) => (b.pinnedAt ?? b.date).localeCompare(a.pinnedAt ?? a.date)).slice(0, 3);
  const featuredIds = new Set(featured.map((article) => article.id));
  const cards = showingDefault ? featured : visible;
  const recent = showingDefault ? published.filter((article) => !featuredIds.has(article.id)) : [];
  const drafts = articles.filter((article) => article.status === 'draft');
  const savedArticles = savedIds.map((id) => published.find((article) => article.id === id)).filter((article): article is JournalArticle => Boolean(article));

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
    <>
    <PageFrame rail={<JournalRail articles={savedArticles} />}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]">
                <Newspaper className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#241B33]">Jornal</h1>
                <p className="mt-0.5 text-[13.5px] text-[#8A7C98]">Notícias e comunicados internos da Única</p>
              </div>
            </div>
            {canManage ? (
              <button type="button" onClick={openCreate} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Nova publicação
              </button>
            ) : null}
          </div>

          <label className="relative mb-4 block">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título ou conteúdo..." className="h-11 rounded-xl border-[#E6DEEF] bg-white pl-10 shadow-[0_1px_2px_rgba(40,20,70,0.04)]" />
          </label>

          {canManage && drafts.length > 0 && showingDefault ? (
            <section className="mb-4 rounded-2xl border border-[#E7E0F0] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(40,20,70,0.04)]">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold">
                <span className="unica-icon">
                  <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
                Rascunhos
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                {drafts.map((article) => (
                  <button key={article.id} type="button" onClick={() => openDraft(article)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E7E0F0] px-3 py-2.5 text-left text-[13.5px] hover:bg-[#FBF8FC]">
                    <span className="truncate">{article.title}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mb-5 flex flex-wrap justify-center gap-2">
            {([
              ['todos', 'Todos'],
              ['processos', 'Processos'],
              ['urgente', 'Urgente'],
              ['social', 'Social'],
              ['treinamentos', 'Treinamentos'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => selectCategory(id)}
                className={cn('rounded-full px-3 py-1.5 text-[13px] font-semibold', category === id ? (id === 'todos' ? 'bg-[#F3E4FA] text-[#6A228C]' : categoryTone[id as JournalCategory].badge) : 'font-medium text-muted-foreground hover:bg-white hover:text-foreground')}
              >
                {label}
              </button>
            ))}
          </div>

          <section>
            <h2 className="mb-3 text-[18px] font-semibold">{showingDefault ? 'Em destaque' : 'Publicações'}</h2>
            {cards.length === 0 ? (
              <p className="rounded-2xl border border-[#E7E0F0] bg-white px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma publicação encontrada.</p>
            ) : (
              <div className="grid items-stretch gap-3 md:grid-cols-3">
                {cards.map((article) => <FeaturedCard key={article.id} article={article} saved={savedIds.includes(article.id)} />)}
              </div>
            )}
          </section>
          {recent.length > 0 ? (
            <section className="mt-8">
              <h2 className="mb-3 text-[18px] font-semibold">Publicações recentes</h2>
              <div className="grid items-stretch gap-3 md:grid-cols-3">
                {recent.map((article) => <FeaturedCard key={article.id} article={article} saved={savedIds.includes(article.id)} />)}
              </div>
            </section>
          ) : null}
    </PageFrame>
      {canManage ? (
        <JournalEditor
          open={editorOpen}
          article={editing}
          author={currentUser.name}
          onOpenChange={setEditorOpen}
        />
      ) : null}
    </>
  );
};
