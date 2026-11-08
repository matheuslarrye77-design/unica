import { cn } from '@/lib/utils';
import { type FC, type ReactNode } from 'react';

export const LilacWash: FC<{
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  className?: string;
}> = ({ icon, title, children, aside, className }) => (
  <div className={cn('relative overflow-hidden rounded-[22px] px-4 py-4', className)}>
    <img src="/cards/fundo-pequeno.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center" />
    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/75 via-white/40 to-white/12" />
    <div className="relative flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#4600F3] shadow-sm">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-snug text-[#1C0066]">{title}</div>
        {children}
      </div>
      {aside ? <div className="relative shrink-0">{aside}</div> : null}
    </div>
  </div>
);
