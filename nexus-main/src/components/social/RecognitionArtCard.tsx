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
    <article className="relative flex h-[128px] w-full items-center overflow-hidden rounded-[22px] bg-[linear-gradient(105deg,#6D28D9_0%,#7C3AED_42%,#5B21B6_100%)] shadow-[0_10px_24px_rgba(76,29,149,0.16)]">
      <div className="pointer-events-none absolute -left-8 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-white/10 blur-2xl" />
      <img
        src="/reconhecimento/trofeu.png"
        alt=""
        className="relative z-[1] ml-2 h-[118px] w-[118px] shrink-0 object-contain drop-shadow-[0_10px_16px_rgba(49,10,90,0.28)]"
      />
      <div className="relative z-[1] mx-3 h-14 w-px shrink-0 bg-white/25" />
      <div className="relative z-[1] flex min-w-0 items-center gap-3 pr-5">
        <img src={photo} alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/90 shadow-[0_6px_14px_rgba(30,10,70,0.28)]" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75">Reconhecimento</p>
          <p className="mt-px truncate text-[16px] font-bold leading-5 text-white">{name}</p>
          <p className="text-[12.5px] leading-4 text-white/90">pelo seu desempenho e dedicação</p>
        </div>
      </div>
    </article>
  );
};
