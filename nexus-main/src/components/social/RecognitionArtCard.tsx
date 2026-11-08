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
    <article className="relative h-[148px] w-full overflow-hidden rounded-[22px] shadow-[0_12px_32px_rgba(76,29,149,0.18)]">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 120% at 8% 50%, rgba(216, 180, 254, 0.45) 0%, transparent 55%),
            radial-gradient(ellipse 70% 100% at 92% 30%, rgba(251, 191, 36, 0.14) 0%, transparent 50%),
            radial-gradient(ellipse 60% 80% at 78% 85%, rgba(139, 92, 246, 0.55) 0%, transparent 48%),
            linear-gradient(118deg, #4c1d95 0%, #6d28d9 42%, #7c3aed 72%, #5b21b6 100%)
          `,
        }}
      />
      <svg className="pointer-events-none absolute -right-[6%] bottom-0 h-full w-[62%] text-white/[0.07]" viewBox="0 0 640 200" preserveAspectRatio="none" aria-hidden>
        <path fill="currentColor" d="M0 120 C120 60 200 140 320 80 C440 24 520 100 640 70 L640 200 L0 200 Z" />
        <path fill="currentColor" opacity="0.65" d="M0 150 C140 90 260 170 400 110 C500 65 580 130 640 100 L640 200 L0 200 Z" />
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_0%,transparent_38%,transparent_62%,rgba(255,255,255,0.04)_100%)]" />
      <div className="relative z-[1] flex h-full items-center gap-4 px-5 sm:gap-5 sm:px-7" style={delicate}>
        <div className="relative shrink-0">
          <div className="absolute -inset-1 rounded-full bg-white/25 blur-sm" />
          <img src={photo} alt="" className="relative h-16 w-16 rounded-full bg-white object-cover ring-[3px] ring-white/95 shadow-[0_8px_20px_rgba(30,10,70,0.35)] sm:h-[72px] sm:w-[72px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/70 sm:text-[12px]">Reconhecimento</p>
          <p className="mt-0.5 truncate text-[22px] font-semibold leading-7 tracking-[-0.02em] text-white sm:text-[26px]">{name}</p>
          <p className="truncate text-[13px] font-normal leading-5 text-white/88 sm:text-[15px]">pelo seu desempenho e dedicação</p>
        </div>
      </div>
    </article>
  );
};
