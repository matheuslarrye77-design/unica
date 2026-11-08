import { teamRoster } from '@/data/team';
import { type FC } from 'react';

export function personAvatar(name: string) {
  const person = teamRoster.find((item) => item.name === name);
  return person?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

export const RecognitionArtCard: FC<{ name: string; avatar?: string }> = ({ name, avatar }) => {
  const photo = avatar || personAvatar(name);
  if (!name) return null;
  return (
    <article className="relative overflow-hidden rounded-[24px] shadow-[0_14px_36px_rgba(76,29,149,0.22)]">
      <img src="/reconhecimento/card-banner.jpg?v=2" alt="" className="aspect-[2/1] w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent from-40% via-[#4C1D95]/10 to-[#3B0764]/40" />
      <div className="absolute inset-y-0 left-[40%] right-4 flex items-center sm:left-[41%] sm:right-5">
        <div className="flex min-w-0 items-center gap-3.5 rounded-[22px] bg-white/12 px-3.5 py-3 ring-1 ring-white/25 backdrop-blur-[6px] sm:gap-4 sm:px-4 sm:py-3.5">
          <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-full bg-white object-cover ring-[3px] ring-white shadow-[0_8px_18px_rgba(30,10,70,0.35)] sm:h-[72px] sm:w-[72px]" />
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/80">Reconhecimento</p>
            <p className="mt-0.5 truncate text-[18px] font-bold leading-6 text-white sm:text-[22px]">{name}</p>
            <p className="mt-0.5 text-[12.5px] leading-5 text-white/92">pelo seu desempenho e dedicação</p>
          </div>
        </div>
      </div>
    </article>
  );
};
