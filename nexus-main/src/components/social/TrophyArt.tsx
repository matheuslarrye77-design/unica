import { type FC } from 'react';

export const TrophyArt: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 128 112" className={className} aria-hidden>
    <defs>
      <linearGradient id="unica-trophy-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFE38A" />
        <stop offset="45%" stopColor="#F0B429" />
        <stop offset="100%" stopColor="#D4891A" />
      </linearGradient>
      <linearGradient id="unica-trophy-shine" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFF6D2" />
        <stop offset="100%" stopColor="#E7A31A" />
      </linearGradient>
    </defs>
    <circle cx="22" cy="18" r="3" fill="#D7C6FF" />
    <circle cx="108" cy="16" r="2.4" fill="#F5B6D0" />
    <circle cx="18" cy="78" r="2.2" fill="#F6D56A" />
    <path d="M104 70l3.2 1.2-2.4 2.4.6-3.4z" fill="#C4B5FD" />
    <path d="M30 34l2.4 1-1.6 2 .2-2.6z" fill="#F9A8D4" />
    <path d="M96 36l2.2.8-1.8 1.6.4-2.4z" fill="#FDE68A" />
    <path d="M28 70c8-16 22-22 36-22s28 6 36 22" fill="none" stroke="#E7D9FF" strokeWidth="2" strokeLinecap="round" />
    <path d="M34 46c-10 2-16 10-16 18 8 1 14-2 18-8 2-4 1-8-2-10z" fill="url(#unica-trophy-gold)" />
    <path d="M94 46c10 2 16 10 16 18-8 1-14-2-18-8-2-4-1-8 2-10z" fill="url(#unica-trophy-gold)" />
    <path d="M40 28h48c2 14 2 26-4 36-6 10-12 14-20 14s-14-4-20-14c-6-10-6-22-4-36z" fill="url(#unica-trophy-gold)" />
    <path d="M52 32c2 10 2 22-1 32" fill="none" stroke="#FFF6D0" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <path d="M58 78h12l3 8H55l3-8z" fill="url(#unica-trophy-shine)" />
    <rect x="46" y="86" width="36" height="6" rx="2" fill="#E0A31C" />
    <rect x="40" y="92" width="48" height="8" rx="3" fill="#C98412" />
    <circle cx="64" cy="48" r="8" fill="#FFF3C4" opacity="0.55" />
  </svg>
);
