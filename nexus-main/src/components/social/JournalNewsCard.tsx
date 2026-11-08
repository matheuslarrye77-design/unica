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
    <img src="/cards/fundo-claro.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center" />
    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/40 via-white/16 to-transparent" />
    <Newspaper className="absolute right-4 top-4 h-5 w-5 text-[#5C5168]" strokeWidth={1.75} />
    <div className="relative pr-8">
      <p className="inline-flex rounded-full bg-[#4600F3] px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-white">NOTÍCIA DO JORNAL</p>
      <p className="unica-display mt-3 text-[18px] leading-6 text-[#2C2438]">{title}</p>
      {category ? (
        <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-[#5C5168]">{category}</span>
      ) : null}
      {excerpt ? <p className="mt-3 line-clamp-3 text-[13.5px] leading-6 text-[#5C5168]">{excerpt}</p> : null}
      <div className="mt-4 border-t border-[#D8CEF6] pt-3">
        <Link to={href} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2C2438] hover:text-[#4600F3]">
          Ler notícia
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </div>
);
