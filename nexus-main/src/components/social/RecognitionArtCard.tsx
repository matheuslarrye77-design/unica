import { teamRoster } from '@/data/team';
import { type FC } from 'react';

export function personAvatar(name: string) {
  const person = teamRoster.find((item) => item.name === name);
  return person?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

const delicate = { fontFamily: '"Manrope", "Segoe UI", sans-serif' } as const;

export const RecognitionArtCard: FC<{ name: string; avatar?: string }> = ({ name, avatar }) => {
  const photo = avatar || personAvatar(name);
  if (!name) return null;
  return (
    <article className="relative w-full overflow-hidden rounded-[22px] bg-[#5B21B6] shadow-[0_10px_24px_rgba(76,29,149,0.16)]">
      <img
        src="/reconhecimento/card-banner-direita.png"
        alt=""
        className="block h-auto w-full"
      />
      <div className="absolute inset-y-0 left-0 flex w-[66%] items-center gap-3 pl-5 pr-3 sm:pl-6" style={delicate}>
        <img src={photo} alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/90 shadow-[0_6px_14px_rgba(30,10,70,0.28)] sm:h-14 sm:w-14" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/75">Reconhecimento</p>
          <p className="truncate text-[20px] font-semibold leading-6 tracking-[-0.02em] text-white sm:text-[24px] sm:leading-7">{name}</p>
          <p className="truncate text-[13px] font-normal leading-5 text-white/90 sm:text-[15px]">pelo seu desempenho e dedicação</p>
        </div>
      </div>
    </article>
  );
};
