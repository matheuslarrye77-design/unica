import { articleCover, categoryLabel, type JournalArticle, type JournalCategory } from '@/data/journal';
import { cn } from '@/lib/utils';
import { FileText, GraduationCap, TriangleAlert, Users, type LucideIcon } from 'lucide-react';
import type { FC } from 'react';

export const categoryTone: Record<JournalCategory, { badge: string; badgeText: string; header: string; icon: string }> = {
  social: {
    badge: 'bg-[#F3E4FA] text-[#6A228C]',
    badgeText: 'text-[#6A228C]',
    header: 'bg-gradient-to-r from-[#F7EEFB] to-[#E6D2F6]',
    icon: 'text-[#8E35B8]',
  },
  processos: {
    badge: 'bg-[#E4EEF9] text-[#1E4E8C]',
    badgeText: 'text-[#1E4E8C]',
    header: 'bg-gradient-to-r from-[#F2F7FD] to-[#D7E6F8]',
    icon: 'text-[#2E5F9E]',
  },
  urgente: {
    badge: 'bg-[#FDE7EE] text-[#9D174D]',
    badgeText: 'text-[#9D174D]',
    header: 'bg-gradient-to-r from-[#FEF1F4] to-[#F8D5DE]',
    icon: 'text-[#E11D48]',
  },
  treinamentos: {
    badge: 'bg-[#E5F6EC] text-[#166534]',
    badgeText: 'text-[#166534]',
    header: 'bg-gradient-to-r from-[#F1FAF4] to-[#D5F0E0]',
    icon: 'text-[#15803D]',
  },
};

const categoryIcon: Record<JournalCategory, LucideIcon> = {
  social: Users,
  processos: FileText,
  urgente: TriangleAlert,
  treinamentos: GraduationCap,
};

export const JournalBadge: FC<{ category: JournalCategory; onHeader?: boolean; className?: string }> = ({ category, onHeader, className }) => (
  <span className={cn(
    'inline-flex items-center rounded-full font-semibold leading-none',
    onHeader
      ? cn('bg-white px-3 py-1.5 text-[13px] shadow-[0_1px_2px_rgba(70,30,110,0.08)]', categoryTone[category].badgeText)
      : cn('px-2.5 py-1 text-[12px]', categoryTone[category].badge),
    className,
  )}>
    {categoryLabel(category)}
  </span>
);

export const JournalCover: FC<{ article: Pick<JournalArticle, 'title' | 'content' | 'category' | 'cover' | 'media'>; compact?: boolean }> = ({ article, compact }) => {
  const image = articleCover(article);
  const tone = categoryTone[article.category];
  const Icon = categoryIcon[article.category];
  const height = compact ? 'h-16' : 'h-[112px]';
  if (image) {
    return (
      <div className={cn('relative overflow-hidden rounded-xl', height)}>
        <img src={image} alt="" className="h-full w-full object-cover" />
        <JournalBadge category={article.category} onHeader className={cn('absolute top-2.5 left-2.5', compact && 'top-2 left-2 px-2 py-1 text-[11px]')} />
      </div>
    );
  }
  return (
    <div className={cn('flex items-center justify-between rounded-xl px-3.5', height, tone.header)}>
      <JournalBadge category={article.category} onHeader className={compact ? 'px-2 py-1 text-[11px]' : undefined} />
      <Icon className={cn(compact ? 'h-5 w-5' : 'h-8 w-8', tone.icon)} strokeWidth={1.75} />
    </div>
  );
};
