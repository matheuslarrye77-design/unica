import { systemLabel, type DocumentSystem } from '@/data/documents';
import { cn } from '@/lib/utils';
import { useState, type FC } from 'react';

const sources: Partial<Record<DocumentSystem, string>> = {
  pincel: '/marcas/pincel.svg',
  prominas: '/marcas/prominas.svg',
};

export const SystemMark: FC<{ system: DocumentSystem; size?: 'sm' | 'md' }> = ({ system, size = 'sm' }) => {
  const src = sources[system];
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-card', size === 'md' ? 'h-12 w-12' : 'h-10 w-10')} title={systemLabel(system)}>
      {src && !failed ? (
        <img src={src} alt="" className="h-[70%] w-[70%] object-contain" onError={() => setFailed(true)} />
      ) : (
        <span className="px-1 text-center text-[10px] font-medium leading-3 text-muted-foreground">{systemLabel(system)}</span>
      )}
    </span>
  );
};
