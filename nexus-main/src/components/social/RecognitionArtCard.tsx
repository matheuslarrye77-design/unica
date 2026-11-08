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
    <article className="relative h-[128px] w-full overflow-hidden rounded-[22px] bg-[#5B21B6] shadow-[0_10px_24px_rgba(76,29,149,0.16)]">
      <img
        src="/reconhecimento/card-banner.jpg?v=3"
        alt=""
        className="absolute left-0 top-1/2 h-[210%] w-auto max-w-none -translate-y-1/2"
      />
      <div className="absolute inset-y-0 left-[36%] flex items-center gap-3.5 pr-6" style={delicate}>
        <img src={photo} alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/90 shadow-[0_6px_14px_rgba(30,10,70,0.28)]" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/70">Reconhecimento</p>
          <p className="mt-0.5 truncate text-[20px] font-semibold leading-6 tracking-[-0.02em] text-white">{name}</p>
          <p className="text-[13px] font-normal leading-5 text-white/85">pelo seu desempenho e dedicação</p>
        </div>
      </div>
    </article>
  );
};
