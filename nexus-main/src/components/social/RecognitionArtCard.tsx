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
      <div className="absolute inset-y-0 left-0 flex w-[58%] items-center gap-4 pl-7 pr-4 sm:pl-8" style={delicate}>
        <img src={photo} alt="" className="h-[72px] w-[72px] shrink-0 rounded-full bg-white object-cover ring-[3px] ring-white/90 shadow-[0_8px_16px_rgba(30,10,70,0.3)]" />
        <div className="min-w-0">
          <p className="text-[14px] font-medium uppercase tracking-[0.18em] text-white/75">Reconhecimento</p>
          <p className="mt-1 truncate text-[30px] font-semibold leading-9 tracking-[-0.02em] text-white">{name}</p>
          <p className="text-[17px] font-normal leading-6 text-white/90">pelo seu desempenho e dedicação</p>
        </div>
      </div>
    </article>
  );
};
