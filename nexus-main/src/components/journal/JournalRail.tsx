import { categoryLabel, type JournalArticle, type JournalCategory } from '@/data/journal';
import { cn } from '@/lib/utils';
import { ChevronRight, ClipboardList } from 'lucide-react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';

const tone: Record<JournalCategory, string> = {
  social: 'bg-[#F3E4FA] text-[#7A2E9A]',
  processos: 'bg-[#F3E4FA] text-[#7A2E9A]',
  treinamentos: 'bg-[#F3E4FA] text-[#7A2E9A]',
  urgente: 'bg-[#FDE7EE] text-[#C23B5A]',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const JournalRail: FC<{
  recent: JournalArticle[];
}> = ({ recent }) => (
  <div className="rounded-2xl border border-[#E7E0F0] bg-white p-3 shadow-[0_8px_24px_rgba(70,30,110,0.04)]">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex min-w-0 items-center gap-2 text-[14px] font-semibold">
        <span className="unica-icon">
          <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
        Publicações recentes
      </h2>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
    {recent.length === 0 ? <p className="px-1 py-2 text-sm text-muted-foreground">Nenhuma publicação recente.</p> : null}
    <div className="grid grid-cols-2 gap-2.5">
      {recent.map((article) => (
        <Link key={article.id} to={`/announcements/${article.id}`} className="overflow-hidden rounded-xl border border-[#EFE7F4] bg-white hover:border-primary/30">
          <div className="relative h-[78px] bg-muted">
            {article.cover ? <img src={article.cover} alt="" className="h-full w-full object-cover" /> : null}
            <span className={cn('absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-4', tone[article.category])}>
              {categoryLabel(article.category)}
            </span>
          </div>
          <div className="p-2">
            <p className="line-clamp-2 min-h-8 text-[12px] font-semibold leading-4">{article.title}</p>
            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">
              {categoryLabel(article.category)} · {formatDate(article.date)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  </div>
);
