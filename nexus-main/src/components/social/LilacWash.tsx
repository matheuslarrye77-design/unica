import { cn } from '@/lib/utils';
import { type FC, type ReactNode } from 'react';

export const PageHero: FC<{
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  className?: string;
}> = ({ icon, title, subtitle, aside, className }) => (
  <section className={cn('relative min-h-[118px] overflow-visible rounded-[22px] px-5 py-4', className)}>
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
      <img src="/cards/fundo-claro.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      <span className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/16 to-transparent" />
    </div>
    <div className="relative flex min-h-[86px] flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#4600F3] shadow-sm">{icon}</span>
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#2C2438]">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-[15px] font-medium text-[#3C3952]">{subtitle}</p> : null}
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
