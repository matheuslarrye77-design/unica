import { type FC } from 'react';

export const TrophyArt: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 140 128" className={className} aria-hidden>
    <defs>
      <linearGradient id="cup-gold" x1="28" y1="18" x2="112" y2="108" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF4C4" />
        <stop offset="28%" stopColor="#F6C453" />
        <stop offset="62%" stopColor="#E39B16" />
        <stop offset="100%" stopColor="#B86A09" />
      </linearGradient>
      <linearGradient id="cup-shade" x1="96" y1="24" x2="48" y2="96" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE38A" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#8A4E06" stopOpacity="0.35" />
      </linearGradient>
      <linearGradient id="cup-base" x1="40" y1="96" x2="100" y2="122" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F8D56A" />
        <stop offset="100%" stopColor="#C47E10" />
      </linearGradient>
      <radialGradient id="cup-glow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stopColor="#FFF9E4" stopOpacity="0.95" />
        <stop offset="70%" stopColor="#F6C453" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="18" cy="22" r="3.2" fill="#CDB6FF" />
    <circle cx="122" cy="18" r="2.4" fill="#F5B4D0" />
    <circle cx="14" cy="78" r="2.2" fill="#F6D56A" />
    <path d="M108 34l4 1.4-3 3 .4-4.2z" fill="#E6DAFF" />
    <path d="M26 40l3.2 1-2.2 2.4.2-3.2z" fill="#F9A8D4" />
    <path d="M118 72l2.6.8-2 1.8.3-2.6z" fill="#FDE68A" />
    <path d="M22 58c10-18 28-24 48-24s38 6 48 24" fill="none" stroke="#E6DAFF" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="70" cy="112" rx="28" ry="5" fill="#E6DAFF" opacity="0.7" />
    <path d="M34 48c-12 3-18 12-16 20 10 1 16-4 20-11 2-5 0-8-4-9z" fill="url(#cup-gold)" />
    <path d="M106 48c12 3 18 12 16 20-10 1-16-4-20-11-2-5 0-8 4-9z" fill="url(#cup-gold)" />
    <path d="M40 26h60c3 16 2 32-6 44-7 12-14 16-24 16s-17-4-24-16c-8-12-9-28-6-44z" fill="url(#cup-gold)" />
    <path d="M40 26h60c3 16 2 32-6 44-7 12-14 16-24 16s-17-4-24-16c-8-12-9-28-6-44z" fill="url(#cup-shade)" />
    <ellipse cx="70" cy="40" rx="18" ry="10" fill="url(#cup-glow)" />
    <path d="M54 30c3 14 2 28-2 40" fill="none" stroke="#FFF6D2" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
    <path d="M62 86h16l4 8H58l4-8z" fill="url(#cup-base)" />
    <rect x="52" y="94" width="36" height="6" rx="2" fill="#E0A31C" />
    <rect x="44" y="100" width="52" height="8" rx="3" fill="url(#cup-base)" />
    <rect x="40" y="108" width="60" height="7" rx="3" fill="#C98412" />
    <ellipse cx="70" cy="102" rx="16" ry="2" fill="#FFF1C2" opacity="0.55" />
  </svg>
);
