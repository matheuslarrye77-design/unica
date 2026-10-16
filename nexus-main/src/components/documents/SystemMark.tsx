import { systemLabel, type DocumentSystem } from '@/data/documents';
import { cn } from '@/lib/utils';
import { type FC } from 'react';

const sources: Record<DocumentSystem, string> = {
  pincel: '/marcas/pincel.svg',
  prominas: '/marcas/prominas.svg',
};

const caption: Record<DocumentSystem, string> = {
  pincel: 'PINCEL',
  prominas: 'PROMINAS',
};

export const SystemMark: FC<{ system: DocumentSystem; size?: 'sm' | 'md' }> = ({ system, size = 'sm' }) => {
  const compact = size === 'sm';
  return (
    <span className={cn('flex shrink-0 flex-col items-center', compact ? 'w-12' : 'w-16')} title={systemLabel(system)}>
      <img src={sources[system]} alt="" className={cn('rounded-full', compact ? 'h-10 w-10' : 'h-12 w-12')} />
      <span className={cn('mt-1 font-semibold tracking-[0.04em] text-[#6D28D9]', compact ? 'text-[8px]' : 'text-[10px]', system === 'pincel' && 'text-[#D97706]')}>
        {caption[system]}
      </span>
    </span>
  );
};
