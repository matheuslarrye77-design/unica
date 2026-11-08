import { ArrowUpRight, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type FC } from 'react';

export const JournalNewsCard: FC<{
  title: string;
  category?: string | null;
  excerpt?: string;
  href: string;
}> = ({ title, category, excerpt, href }) => (
  <div className="relative overflow-hidden rounded-[22px] px-4 py-4 sm:px-5">
    <img src="/cards/fundo-grande.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center" />
    <Newspaper className="absolute right-4 top-4 h-5 w-5 text-[#4600F3]" strokeWidth={1.75} />
    <div className="relative pr-8">
      <p className="inline-flex rounded-full bg-[#E0D6FC] px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-[#3600C2]">NOTÍCIA DO JORNAL</p>
      <p className="mt-3 text-[18px] font-bold leading-6 text-[#2D1248]">{title}</p>
      {category ? (
        <span className="mt-2 inline-flex rounded-full bg-white/80 px-2.5 py-1 text-[12px] font-semibold text-[#4600F3]">{category}</span>
      ) : null}
      {excerpt ? <p className="mt-3 line-clamp-3 text-[13.5px] leading-6 text-[#5C4B70]">{excerpt}</p> : null}
      <div className="mt-4 border-t border-[#D4C8FC]/80 pt-3">
        <Link to={href} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#3600C2] hover:text-[#4600F3]">
          Ler notícia
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </div>
);
