import { teamRoster } from '@/data/team';
import { type FC } from 'react';

export function personAvatar(name: string) {
  const person = teamRoster.find((item) => item.name === name);
  return person?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

const TrophyMark: FC = () => (
  <svg viewBox="0 0 140 148" className="h-[118px] w-[112px] shrink-0" aria-hidden>
    <circle cx="22" cy="42" r="3.2" fill="#D7C6F5" />
    <circle cx="118" cy="28" r="2.4" fill="#E4D6FA" />
    <circle cx="16" cy="96" r="2" fill="#E4D6FA" />
    <path fill="#C9B4F0" d="M26 18l2.6 2.6-2.6 2.6-2.6-2.6z" />
    <path fill="#D7C6F5" d="M112 108l3.2 3.2-3.2 3.2-3.2-3.2z" />
    <path fill="#E9DFFB" d="M124 52l2.4 2.4-2.4 2.4-2.4-2.4z" />
    <path d="M38 44c-16 2-24 22-12 36 4 4 10 6 16 6" fill="none" stroke="#7135C9" strokeWidth="8" strokeLinecap="round" />
    <path d="M102 44c16 2 24 22 12 36-4 4-10 6-16 6" fill="none" stroke="#7135C9" strokeWidth="8" strokeLinecap="round" />
    <path d="M38 28h64c2 18 4 36-4 56H42c-8-20-6-38-4-56z" fill="#7135C9" />
    <path d="M46 32h48c1.5 16 3 32-3 48H49c-6-16-4.5-32-3-48z" fill="#974FF0" />
    <ellipse cx="70" cy="40" rx="22" ry="8" fill="#B57AF5" opacity="0.55" />
    <path fill="#FFFFFF" d="M70 48.5l3.6 7.3 8.1 1.2-5.8 5.7 1.4 8-7.3-3.8-7.3 3.8 1.4-8-5.8-5.7 8.1-1.2z" />
    <rect x="62" y="86" width="16" height="16" rx="3" fill="#7135C9" />
    <rect x="50" y="100" width="40" height="10" rx="3" fill="#7135C9" />
    <rect x="40" y="110" width="60" height="14" rx="5" fill="#5020A8" />
    <rect x="54" y="114" width="32" height="6" rx="2" fill="#EEE4FF" />
  </svg>
);

export const RecognitionArtCard: FC<{ name: string; avatar?: string }> = ({ name }) => {
  if (!name) return null;
  return (
    <div className="relative isolate flex min-h-[140px] w-full items-center overflow-hidden rounded-[20px] bg-[#F4EDFF] px-4 py-4 sm:min-h-[148px] sm:px-6">
      <span className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[#E4D6FA]" />
      <span className="pointer-events-none absolute -bottom-16 right-16 h-36 w-36 rounded-full bg-[#EEE4FF]" />
      <span className="pointer-events-none absolute right-8 top-6 h-10 w-10 rounded-full border-[6px] border-[#E9DFFB]/80" />
      <svg className="pointer-events-none absolute right-10 top-5 h-6 w-6 text-[#C9B4F0]" viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d="M12 2.5l1.6 4.8h5.1l-4.1 3 1.6 4.9L12 12.3 7.8 15.2l1.6-4.9-4.1-3h5.1z" />
      </svg>
      <svg className="pointer-events-none absolute bottom-6 right-24 h-4 w-4 text-[#D7C6F5]" viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d="M12 2.5l1.6 4.8h5.1l-4.1 3 1.6 4.9L12 12.3 7.8 15.2l1.6-4.9-4.1-3h5.1z" />
      </svg>
      <div className="relative z-[1] flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative flex shrink-0 items-center justify-center">
          <TrophyMark />
        </div>
        <div className="hidden h-[88px] w-px shrink-0 bg-[#7135C9]/25 sm:block" />
        <div className="relative min-w-0 flex-1 text-center sm:text-left">
          <p className="inline-flex rounded-full bg-[#7135C9] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">Reconhecimento</p>
          <p className="mt-2 truncate text-[clamp(26px,3.4vw,38px)] font-bold leading-tight tracking-[-0.03em] text-[#29213A]">{name}</p>
          <p className="mt-1 text-[17px] leading-6 text-[#625578] sm:text-[18px]">pelo seu desempenho e dedicação</p>
        </div>
      </div>
    </div>
  );
};
