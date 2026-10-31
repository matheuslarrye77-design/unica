import { JournalBadge, JournalCover } from '@/components/journal/JournalVisual';
import type { JournalArticle } from '@/data/journal';
import { ChevronRight, ClipboardList } from 'lucide-react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';

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
        <Link key={article.id} to={`/announcements/${article.id}`} className="flex h-full flex-col overflow-hidden rounded-xl border border-[#EFE7F4] bg-white hover:border-primary/30">
          <div className="h-[72px] overflow-hidden">
            <JournalCover article={article} compact />
          </div>
          <div className="flex flex-1 flex-col p-2">
            <JournalBadge category={article.category} className="w-fit px-2 py-1 text-[11px]" />
            <p className="mt-1.5 line-clamp-2 min-h-8 text-[12px] font-semibold leading-4">{article.title}</p>
            <p className="mt-auto pt-1.5 text-[11px] leading-4 text-[#8A7C98]">{formatDate(article.date)}</p>
          </div>
        </Link>
      ))}
    </div>
  </div>
);
