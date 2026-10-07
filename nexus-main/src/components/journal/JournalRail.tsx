import { categoryLabel, type JournalArticle } from '@/data/journal';
import { cn } from '@/lib/utils';
import type { FC } from 'react';
import { Link } from 'react-router-dom';

const filters = [
  { id: 'todos', label: 'Todos' },
  { id: 'processos', label: 'Processos' },
  { id: 'urgente', label: 'Urgente' },
  { id: 'social', label: 'Social' },
  { id: 'treinamentos', label: 'Treinamentos' },
] as const;

export const JournalRail: FC<{
  category: string;
  recent: JournalArticle[];
  onCategory: (category: string) => void;
}> = ({ category, recent, onCategory }) => (
  <div className="rounded-2xl border bg-card p-3">
    <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">Categorias</p>
    <div className="flex flex-col">
      {filters.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onCategory(item.id)}
          className={cn(
            'rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
            category === item.id ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
    <p className="mt-4 mb-1 px-1 text-xs font-medium text-muted-foreground">Publicações recentes</p>
    <div className="flex flex-col gap-1">
      {recent.map((article) => (
        <Link key={article.id} to={`/announcements/${article.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
          {article.cover ? <img src={article.cover} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" /> : <span className="h-16 w-16 shrink-0 rounded-md bg-muted" />}
          <span className="min-w-0">
            <span className="line-clamp-2 text-sm font-medium leading-snug">{article.title}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {categoryLabel(article.category)} · {new Date(article.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </span>
        </Link>
      ))}
    </div>
  </div>
);
