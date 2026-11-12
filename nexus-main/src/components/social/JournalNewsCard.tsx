import type { JournalCategory } from '@/data/journal';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { FC } from 'react';

export const journalBorder: Record<JournalCategory, string> = {
  social: 'border-[#6B33F6]',
  processos: 'border-[#4600F3]',
  urgente: 'border-[#DB2777]',
  treinamentos: 'border-[#16A34A]',
};

export const JournalNewsCard: FC<{ title: string; category?: JournalCategory | string; excerpt: string; href?: string }> = ({ title, category, excerpt, href }) => {
  const border = category && category in journalBorder ? journalBorder[category as JournalCategory] : 'border-gray-100';
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border-2 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]', border)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B33F6]">Notícia do jornal</span>
      <h3 className="relative mt-2 text-[22px] font-semibold leading-7 tracking-[-0.03em] text-gray-800">{title}</h3>
      {excerpt ? <p className="relative mt-2 line-clamp-3 text-[14px] leading-6 text-gray-500">{excerpt}</p> : null}
      {href ? <Link to={href} className="relative mt-4 inline-flex text-[14px] font-semibold text-blue-600">Ler notícia</Link> : null}
    </div>
  );
};
