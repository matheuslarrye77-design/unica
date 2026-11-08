import { useId, type FC } from 'react';
import './SocialArtCard.css';

export const SocialArtCard: FC<{ className?: string }> = ({ className }) => {
  const uid = useId().replace(/:/g, '');

  return (
    <div className={className ? `social-art-card ${className}` : 'social-art-card'} aria-hidden>
      <svg className="social-art-card__canvas" viewBox="0 0 680 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`${uid}-wash`} x1="0" y1="0" x2="680" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F4E7FF" />
            <stop offset="58%" stopColor="#E0D6FC" />
            <stop offset="100%" stopColor="#E0D6FC" />
          </linearGradient>
          <linearGradient id={`${uid}-ribbon`} x1="40" y1="8" x2="620" y2="188" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F6E8FF" stopOpacity="0.35" />
            <stop offset="28%" stopColor="#D4C8FC" stopOpacity="0.72" />
            <stop offset="62%" stopColor="#8A5CF8" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#8A5CF8" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id={`${uid}-depth`} x1="180" y1="20" x2="460" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0D6FC" stopOpacity="0.1" />
            <stop offset="45%" stopColor="#B09AF5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D4C8FC" stopOpacity="0.14" />
          </linearGradient>
          <linearGradient id={`${uid}-head-f`} x1="12" y1="6" x2="32" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6B33F6" />
            <stop offset="48%" stopColor="#5A1AFF" />
            <stop offset="100%" stopColor="#2A0094" />
          </linearGradient>
          <linearGradient id={`${uid}-body-f`} x1="4" y1="28" x2="38" y2="68" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6B33F6" />
            <stop offset="42%" stopColor="#5A1AFF" />
            <stop offset="100%" stopColor="#2A0094" />
          </linearGradient>
          <linearGradient id={`${uid}-head-b`} x1="30" y1="10" x2="50" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3600C2" />
            <stop offset="100%" stopColor="#2A0094" />
          </linearGradient>
          <linearGradient id={`${uid}-body-b`} x1="26" y1="32" x2="56" y2="62" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3600C2" />
            <stop offset="100%" stopColor="#1C0066" />
          </linearGradient>
        </defs>

        <rect width="680" height="200" fill={`url(#${uid}-wash)`} />
        <ellipse cx="150" cy="28" rx="220" ry="86" fill="#F8EEFF" opacity="0.7" />
        <ellipse cx="500" cy="176" rx="190" ry="64" fill="#E0D6FC" opacity="0.26" />

        <path
          d="M-36 52
             C 70 18, 148 102, 268 96
             Q 360 92, 438 54
             C 508 20, 568 62, 650 108
             C 692 132, 720 168, 736 208
             L 736 230 L -36 230 Z"
          fill="#D4C8FC"
          opacity="0.18"
        />

        <path
          d="M-20 22
             C 88 -6, 156 78, 250 92
             C 348 107, 408 36, 508 58
             Q 582 76, 678 148
             C 708 172, 726 198, 734 222
             C 668 176, 604 112, 524 96
             C 430 76, 372 148, 268 138
             C 168 128, 92 52, -20 58 Z"
          fill={`url(#${uid}-ribbon)`}
        />

        <path
          d="M-16 64
             C 96 34, 170 122, 286 116
             Q 372 112, 452 70
             C 520 36, 582 88, 662 128
             C 700 148, 724 186, 738 220
             C 656 168, 590 104, 500 118
             C 408 132, 330 186, 214 142
             C 126 108, 48 98, -16 92 Z"
          fill={`url(#${uid}-depth)`}
        />

        <path
          d="M 22 20
             C 128 6, 178 90, 276 100
             C 376 110, 432 42, 530 66
             Q 604 84, 698 166"
          fill="none"
          stroke="#E0D6FC"
          strokeWidth="9"
          strokeLinecap="round"
          opacity="0.42"
        />

        <path
          d="M 48 34
             C 146 22, 198 98, 292 106
             C 384 114, 440 56, 534 78
             Q 600 94, 682 168"
          fill="none"
          stroke="#8A5CF8"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.16"
        />

        <path
          d="M 92 172
             C 188 128, 262 82, 358 94
             Q 440 104, 522 150"
          fill="none"
          stroke="#B09AF5"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.2"
        />

        <g transform="translate(546 44)">
          <circle cx="39.4" cy="17.2" r="8.4" fill={`url(#${uid}-head-b)`} />
          <path
            d="M25.6 52.4
               C25.6 38.6 31.2 32.2 39.4 32.2
               C47.6 32.2 53.2 38.6 53.2 52.4
               C53.2 57.6 49.2 61.2 39.4 61.2
               C29.6 61.2 25.6 57.6 25.6 52.4Z"
            fill={`url(#${uid}-body-b)`}
          />
          <ellipse cx="41.8" cy="14.8" rx="3.2" ry="2.5" fill="#6B33F6" opacity="0.34" />

          <circle cx="20.8" cy="15" r="10.1" fill={`url(#${uid}-head-f)`} />
          <path
            d="M3.2 56.2
               C3.2 38.8 10.8 30.6 20.8 30.6
               C30.8 30.6 38.4 38.8 38.4 56.2
               C38.4 62.4 33.4 66.4 20.8 66.4
               C8.2 66.4 3.2 62.4 3.2 56.2Z"
            fill={`url(#${uid}-body-f)`}
          />
          <ellipse cx="17.2" cy="11.8" rx="4.1" ry="3" fill="#B09AF5" opacity="0.46" />
          <path
            d="M8.8 41 C13 35.8 17.4 33.4 21.2 33.4"
            fill="none"
            stroke="#8A5CF8"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M31.6 48 C33.4 42 35.2 39 37.2 38"
            fill="none"
            stroke="#2A0094"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.18"
          />
        </g>
      </svg>
    </div>
  );
};
