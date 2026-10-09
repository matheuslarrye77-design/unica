import { categoryLabel, type JournalArticle } from '@/data/journal';
import type { FC } from 'react';
import { Link } from 'react-router-dom';

export const JournalRail: FC<{
  recent: JournalArticle[];
}> = ({ recent }) => (
  <div className="rounded-2xl border bg-card p-3">
    <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">Publicações recentes</p>
    <div className="flex flex-col gap-1">
      {recent.length === 0 ? <p className="px-2 py-2 text-sm text-muted-foreground">Nenhuma publicação recente.</p> : null}
      {recent.map((article) => (
        <Link key={article.id} to={`/announcements/${article.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
          {article.cover ? <img src={article.cover} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" /> : null}
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
