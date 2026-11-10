import { cn } from '@/lib/utils';
import { type FC, type ReactNode } from 'react';

export const PageHero: FC<{
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  className?: string;
}> = ({ icon, title, subtitle, aside, className }) => (
  <section className={cn('relative min-h-[88px] overflow-visible rounded-[14px] border border-[#E9E9EF] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(52,52,64,0.04)]', className)}>
    <div className="relative flex min-h-[56px] flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#EFEDFC] text-[#7065C5]">{icon}</span>
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-[#343440]">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-[14px] font-medium text-[#858593]">{subtitle}</p> : null}
        </div>
      </div>
      {aside ? <div className="relative shrink-0">{aside}</div> : null}
    </div>
  </section>
);

export const LilacWash: FC<{
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  className?: string;
}> = ({ icon, title, children, aside, className }) => (
  <PageHero icon={icon} title={title} subtitle={children} aside={aside} className={className} />
);
