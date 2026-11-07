import { Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { cn } from '@/lib/utils';
import { type FC, type ReactNode } from 'react';

export const PageFrame: FC<{ children: ReactNode; rail?: ReactNode; fitViewport?: boolean; fillRail?: boolean }> = ({ children, rail, fitViewport = false, fillRail = false }) => (
  <div className={cn('flex min-h-svh flex-col overflow-x-clip bg-transparent', fitViewport && 'xl:h-dvh xl:max-h-dvh xl:min-h-0 xl:overflow-hidden')}>
    <Header />
    <div className={cn('flex min-w-0 flex-1 items-start', fitViewport && 'xl:min-h-0 xl:overflow-hidden xl:pr-4')}>
      <main className={cn('min-w-0 flex-1 overflow-x-clip px-4 py-3 sm:px-5', fitViewport && 'xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden xl:py-2')}>
        {children}
      </main>
      {rail ? <RightSidebar locked={fitViewport} fill={fillRail}>{rail}</RightSidebar> : null}
    </div>
  </div>
);
