import { cn } from '@/lib/utils';
import { type FC, type ReactNode } from 'react';

export const PageHero: FC<{
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  className?: string;
}> = ({ icon, title, subtitle, aside, className }) => (
  <section className={cn('relative overflow-visible rounded-[var(--ds-radius-lg)] border border-[var(--ds-divider)] bg-white px-6 py-6 shadow-[var(--ds-shadow)]', className)}>
    <div className="relative flex min-h-[52px] flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--ds-lavender)] text-[var(--ds-purple)]">{icon}</span>
        <div className="min-w-0">
          <h1 className="text-[22px] font-medium leading-tight tracking-tight text-[var(--ds-ink)]">{title}</h1>
          {subtitle ? <p className="mt-1 text-[14px] font-normal leading-relaxed text-[var(--ds-muted)]">{subtitle}</p> : null}
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
