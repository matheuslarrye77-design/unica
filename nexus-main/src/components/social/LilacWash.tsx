import { cn } from '@/lib/utils';
import { type FC, type ReactNode } from 'react';

export const PageHero: FC<{
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  className?: string;
}> = ({ icon, title, subtitle, aside, className }) => (
  <section className={cn('unica-surface relative overflow-visible px-5 py-4 sm:px-6', className)}>
    <div className="relative flex min-h-[44px] flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="unica-icon bg-[var(--ds-lavender)] text-[var(--ds-purple)]">{icon}</span>
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-[1.28] tracking-[-0.022em] text-[var(--ds-ink)]">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-[42rem] text-[13px] font-normal leading-[1.5] text-[var(--ds-slate)]">{subtitle}</p> : null}
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
