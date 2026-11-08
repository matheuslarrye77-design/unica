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
    <article className="relative h-[168px] w-full overflow-hidden rounded-[22px] bg-[#5B21B6] shadow-[0_10px_24px_rgba(76,29,149,0.16)]">
      <img
        src="/reconhecimento/card-banner.jpg?v=4"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-left"
      />
      <div className="absolute inset-y-0 left-[38%] flex items-center gap-4 pr-8" style={delicate}>
        <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-full bg-white object-cover ring-[3px] ring-white/90 shadow-[0_8px_16px_rgba(30,10,70,0.3)]" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-white/75">Reconhecimento</p>
          <p className="mt-1 truncate text-[28px] font-semibold leading-8 tracking-[-0.02em] text-white">{name}</p>
          <p className="text-[16px] font-normal leading-6 text-white/90">pelo seu desempenho e dedicação</p>
        </div>
      </div>
    </article>
  );
};
