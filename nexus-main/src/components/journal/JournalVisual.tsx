import { articleCover, articleSummary, categoryLabel, type JournalArticle, type JournalCategory } from '@/data/journal';
import { cn } from '@/lib/utils';
import { ClipboardList, GraduationCap, Megaphone, Users, type LucideIcon } from 'lucide-react';
import type { FC } from 'react';

export const categoryTone: Record<JournalCategory, { badge: string; panel: string; icon: string }> = {
  social: { badge: 'bg-[#F3E4FA] text-[#6A228C]', panel: 'bg-[#F8EEFB]', icon: 'text-[#8E35B8]' },
  processos: { badge: 'bg-[#E4EEF9] text-[#1E4E8C]', panel: 'bg-[#EEF4FB]', icon: 'text-[#1E4E8C]' },
  urgente: { badge: 'bg-[#FDE7EE] text-[#9D174D]', panel: 'bg-[#FDF0F4]', icon: 'text-[#BE185D]' },
  treinamentos: { badge: 'bg-[#E5F6EC] text-[#166534]', panel: 'bg-[#F0FAF4]', icon: 'text-[#15803D]' },
};

const categoryIcon: Record<JournalCategory, LucideIcon> = {
  social: Users,
  processos: ClipboardList,
  urgente: Megaphone,
  treinamentos: GraduationCap,
};

export const JournalBadge: FC<{ category: JournalCategory; className?: string }> = ({ category, className }) => (
  <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none', categoryTone[category].badge, className)}>
    {categoryLabel(category)}
  </span>
);

export const JournalCover: FC<{ article: Pick<JournalArticle, 'title' | 'content' | 'category' | 'cover' | 'media'>; compact?: boolean }> = ({ article, compact }) => {
  const image = articleCover(article);
  const tone = categoryTone[article.category];
  const Icon = categoryIcon[article.category];
  if (image) return <img src={image} alt="" className="h-full w-full object-cover" />;
  if (compact) {
    return (
      <div className={cn('grid h-full w-full place-items-center', tone.panel)}>
        <span className={cn('grid h-8 w-8 place-items-center rounded-full bg-white/85', tone.icon)}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>
    );
  }
  return (
    <div className={cn('flex h-full min-h-[196px] flex-col justify-between rounded-xl p-4', tone.panel)}>
      <span className={cn('grid h-11 w-11 place-items-center rounded-2xl bg-white/85', tone.icon)}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="mt-4">
        <p className="line-clamp-3 text-[16px] font-semibold leading-snug text-[#241B33] group-hover:text-[#8E35B8]">{article.title || categoryLabel(article.category)}</p>
        {article.content.trim() ? <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-5 text-[#5C5470]">{articleSummary(article.content)}</p> : null}
      </div>
    </div>
  );
};
