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
    <article className="relative h-[128px] w-full max-w-[560px] overflow-hidden rounded-[18px] bg-[#5B21B6] shadow-[0_10px_24px_rgba(76,29,149,0.18)]">
      <img
        src="/reconhecimento/card-banner.jpg?v=2"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[16%_48%]"
      />
      <div className="absolute inset-y-0 left-[36%] right-0 bg-gradient-to-r from-transparent to-[#3B0764]/40" />
      <div className="absolute inset-y-0 left-[38%] right-3 flex items-center">
        <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/12 px-3 py-2.5 ring-1 ring-white/20 backdrop-blur-[6px]">
          <img src={photo} alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-cover ring-2 ring-white shadow-[0_6px_14px_rgba(30,10,70,0.3)]" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">Reconhecimento</p>
            <p className="mt-px truncate text-[16px] font-bold leading-5 text-white">{name}</p>
            <p className="text-[12px] leading-4 text-white/90">pelo seu desempenho e dedicação</p>
          </div>
        </div>
      </div>
    </article>
  );
};
