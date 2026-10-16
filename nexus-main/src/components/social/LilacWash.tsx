import { cn } from '@/lib/utils';
import { type FC, type ReactNode } from 'react';

export const LilacWash: FC<{
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  className?: string;
}> = ({ icon, title, children, aside, className }) => (
  <div className={cn('relative overflow-hidden rounded-[22px] bg-gradient-to-r from-[#F8EAFB] via-[#F3DDF8] to-[#E7C4F2] px-4 py-4', className)}>
    <div className="pointer-events-none absolute -top-8 right-10 h-24 w-24 rounded-full bg-[#D9A6EE]/80" />
    <div className="pointer-events-none absolute -right-8 -bottom-10 h-28 w-28 rounded-full bg-[#C084E0]/55" />
    <div className="pointer-events-none absolute top-3 right-20 h-8 w-8 rounded-full bg-white/45" />
    <div className="relative flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/80 text-[#8E35B8] shadow-sm">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-snug text-[#6A228C]">{title}</div>
        {children}
      </div>
      {aside ? <div className="relative shrink-0">{aside}</div> : null}
    </div>
  </div>
);
