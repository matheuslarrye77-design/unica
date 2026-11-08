import { teamRoster } from '@/data/team';
import { type FC } from 'react';

export function personAvatar(name: string) {
  const person = teamRoster.find((item) => item.name === name);
  return person?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

const TrophyMark: FC = () => (
  <svg viewBox="0 0 140 148" className="h-[118px] w-[112px] shrink-0" aria-hidden>
    <circle cx="22" cy="42" r="3.2" fill="#D4C8FC" />
    <circle cx="118" cy="28" r="2.4" fill="#DDD4FB" />
    <circle cx="16" cy="96" r="2" fill="#DDD4FB" />
    <path fill="#C4B0FC" d="M26 18l2.6 2.6-2.6 2.6-2.6-2.6z" />
    <path fill="#D4C8FC" d="M112 108l3.2 3.2-3.2 3.2-3.2-3.2z" />
    <path fill="#E8E0FD" d="M124 52l2.4 2.4-2.4 2.4-2.4-2.4z" />
    <path d="M38 44c-16 2-24 22-12 36 4 4 10 6 16 6" fill="none" stroke="#4600F3" strokeWidth="8" strokeLinecap="round" />
    <path d="M102 44c16 2 24 22 12 36-4 4-10 6-16 6" fill="none" stroke="#4600F3" strokeWidth="8" strokeLinecap="round" />
    <path d="M38 28h64c2 18 4 36-4 56H42c-8-20-6-38-4-56z" fill="#4600F3" />
    <path d="M46 32h48c1.5 16 3 32-3 48H49c-6-16-4.5-32-3-48z" fill="#6B33F6" />
    <ellipse cx="70" cy="40" rx="22" ry="8" fill="#8A5CF8" opacity="0.55" />
    <path fill="#FFFFFF" d="M70 48.5l3.6 7.3 8.1 1.2-5.8 5.7 1.4 8-7.3-3.8-7.3 3.8 1.4-8-5.8-5.7 8.1-1.2z" />
    <rect x="62" y="86" width="16" height="16" rx="3" fill="#4600F3" />
    <rect x="50" y="100" width="40" height="10" rx="3" fill="#4600F3" />
    <rect x="40" y="110" width="60" height="14" rx="5" fill="#2A0094" />
    <rect x="54" y="114" width="32" height="6" rx="2" fill="#E8E0FD" />
  </svg>
);

export const RecognitionArtCard: FC<{ name: string; avatar?: string }> = ({ name }) => {
  if (!name) return null;
  return (
    <div className="relative isolate flex min-h-[140px] w-full items-center overflow-hidden rounded-[20px] px-4 py-4 sm:min-h-[148px] sm:px-6">
      <img src="/cards/fundo-claro.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center" />
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.12)_55%,transparent_80%)]" />
      <div className="relative z-[1] flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative flex shrink-0 items-center justify-center">
          <TrophyMark />
        </div>
        <div className="hidden h-[88px] w-px shrink-0 bg-[#4600F3]/40 sm:block" />
        <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <p className="inline-flex rounded-full bg-[#4600F3] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_6px_16px_rgba(70,0,243,0.28)]">Reconhecimento</p>
          <p className="mt-2 max-w-full px-2 text-[clamp(26px,3.4vw,38px)] font-extrabold leading-tight tracking-[-0.03em] text-[#1C0066] [text-shadow:0_1px_0_rgba(255,255,255,0.85)]">{name}</p>
          <p className="mt-1 text-[17px] font-semibold leading-6 text-[#3600C2] sm:text-[18px]">pelo seu desempenho e dedicação</p>
        </div>
      </div>
    </div>
  );
};
