import { cn } from '@/lib/utils';
import { type FC, type ReactNode } from 'react';

export const PageHero: FC<{
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  className?: string;
}> = ({ icon, title, subtitle, aside, className }) => (
  <section className={cn('unica-surface relative overflow-visible rounded-[var(--ds-radius-lg)] px-6 py-5 sm:px-7 sm:py-6', className)}>
    <div className="relative flex min-h-[52px] flex-wrap items-center justify-between gap-5">
      <div className="flex min-w-0 items-center gap-4">
        <span className="unica-icon h-10 w-10 rounded-[12px]">{icon}</span>
        <div className="min-w-0">
          <h1 className="text-[22px] font-medium leading-[1.3] tracking-[-0.016em] text-[var(--ds-ink)]">{title}</h1>
          {subtitle ? <p className="mt-1.5 max-w-[42rem] text-[14px] font-normal leading-[1.7] tracking-[0.01em] text-[var(--ds-slate)]">{subtitle}</p> : null}
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
