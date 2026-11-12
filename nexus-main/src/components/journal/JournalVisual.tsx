import { ZoomImage } from '@/components/social/PhotoGallery';
import { articleCover, categoryLabel, parseJournalPieces, resolveJournalAsset, type JournalArticle, type JournalCategory } from '@/data/journal';
import { cn } from '@/lib/utils';
import { FileText, GraduationCap, TriangleAlert, Users, type LucideIcon } from 'lucide-react';
import type { FC } from 'react';

export const categoryTone: Record<JournalCategory, { badge: string; badgeText: string; header: string; icon: string }> = {
  social: {
    badge: 'bg-[#EDE7FE] text-[#3600C2]',
    badgeText: 'text-[#3600C2]',
    header: 'bg-[linear-gradient(105deg,#F7EDFC_0%,#E9D2F7_100%)]',
    icon: 'text-[#4600F3]',
  },
  processos: {
    badge: 'bg-[#E4EEF9] text-[#1E4E8C]',
    badgeText: 'text-[#1E4E8C]',
    header: 'bg-[linear-gradient(105deg,#EEF4FD_0%,#D5E5F8_100%)]',
    icon: 'text-[#3A6AAD]',
  },
  urgente: {
    badge: 'bg-[#FDE7EE] text-[#9D174D]',
    badgeText: 'text-[#BE123C]',
    header: 'bg-[linear-gradient(105deg,#FDECEF_0%,#F6D0D9_100%)]',
    icon: 'text-[#E11D48]',
  },
  treinamentos: {
    badge: 'bg-[#E5F6EC] text-[#166534]',
    badgeText: 'text-[#166534]',
    header: 'bg-[linear-gradient(105deg,#F1FAF4_0%,#D4F0E0_100%)]',
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
      ? cn('bg-white px-4 py-2 text-base', categoryTone[category].badgeText)
      : cn('px-3 py-1.5 text-sm', categoryTone[category].badge),
    className,
  )}>
    {categoryLabel(category)}
  </span>
);

const cardArt: Partial<Record<JournalCategory, { src: string; label: string }>> = {
  social: { src: '/jornal/cards/social.png?v=2', label: 'left-[4%] top-[27%] h-[46%] w-[40%]' },
  processos: { src: '/jornal/cards/processos.png?v=2', label: 'left-[4%] top-[26%] h-[46%] w-[38%]' },
  urgente: { src: '/jornal/cards/urgente.png?v=2', label: 'left-[7%] top-[26%] h-[48%] w-[37%]' },
  treinamentos: { src: '/jornal/cards/treinamentos.png?v=3', label: 'left-[4%] top-[24%] h-[52%] w-[56%]' },
};

export const JournalRichText: FC<{ content: string; className?: string }> = ({ content, className }) => {
  const pieces = parseJournalPieces(content);
  return (
    <div className={className}>
      {pieces.map((piece) => {
        if (piece.kind === 'image') {
          return <ZoomImage key={piece.id} src={resolveJournalAsset(piece.ref)} className="my-3 w-full rounded-2xl object-cover" />;
        }
        if (!piece.text) return null;
        return <p key={piece.id} className="whitespace-pre-wrap">{piece.text}</p>;
      })}
    </div>
  );
};

export const JournalCover: FC<{ article: Pick<JournalArticle, 'title' | 'content' | 'category' | 'cover' | 'media'>; compact?: boolean }> = ({ article, compact }) => {
  const photo = articleCover(article);
  const tone = categoryTone[article.category];
  const art = cardArt[article.category];
  if (photo && art) {
    return (
      <div className="relative overflow-hidden rounded-[18px]">
        <img src={photo} alt="" className="block aspect-[1400/320] h-auto w-full object-cover" />
        <span className={cn('absolute flex items-center justify-center rounded-full bg-white text-center font-semibold leading-none', art.label, tone.badgeText, compact ? 'text-lg' : 'text-xl')}>
          {categoryLabel(article.category)}
        </span>
      </div>
    );
  }
  if (art) {
    return (
      <div className="relative">
        <img src={art.src} alt="" className="block h-auto w-full" />
        <span className={cn('absolute flex items-center justify-center text-center font-semibold leading-none', art.label, tone.badgeText, compact ? 'text-lg' : 'text-xl')}>
          {categoryLabel(article.category)}
        </span>
      </div>
    );
  }
  const image = articleCover(article);
  const Icon = categoryIcon[article.category];
  const height = compact ? 'h-[58px]' : 'h-[74px]';
  if (image) {
    return (
      <div className={cn('relative overflow-hidden rounded-[18px]', height)}>
        <img src={image} alt="" className="h-full w-full object-cover" />
        <JournalBadge category={article.category} onHeader className="absolute top-3 left-3" />
      </div>
    );
  }
  return (
    <div className={cn('flex aspect-[4.76/1] items-center justify-between rounded-[18px] px-4', tone.header)}>
      <JournalBadge category={article.category} onHeader />
      <Icon className={cn(compact ? 'h-5 w-5' : 'h-7 w-7', tone.icon)} strokeWidth={1.75} />
    </div>
  );
};
