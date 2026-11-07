import { AccountCluster, Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { PageScrollHandle } from '@/components/shell/PageScrollHandle';
import { useShell } from '@/components/Sidebar';
import { cn } from '@/lib/utils';
import { useState, type FC, type ReactNode } from 'react';

export const PageFrame: FC<{ children: ReactNode; rail?: ReactNode; fitViewport?: boolean; fillRail?: boolean }> = ({ children, rail, fitViewport = false, fillRail = false }) => {
  const { rightCollapsed } = useShell();
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const dockAccount = Boolean(rail) && !rightCollapsed;

  return (
    <div className={cn('flex min-h-svh flex-col overflow-x-clip bg-transparent', fitViewport && 'xl:h-dvh xl:max-h-dvh xl:min-h-0 xl:overflow-hidden')}>
      <div className={cn('flex min-w-0 flex-1', fitViewport && 'xl:min-h-0 xl:overflow-hidden')}>
        <div className={cn('flex min-w-0 flex-1 flex-col', fitViewport && 'xl:min-h-0 xl:overflow-hidden')}>
          <Header trailing={dockAccount ? <div className="xl:hidden"><AccountCluster /></div> : <AccountCluster />} />
          <main
            ref={setScroller}
            className={cn(
              'relative min-w-0 flex-1 overflow-x-clip px-4 py-3 sm:px-5',
              fitViewport && 'xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:py-2 xl:pr-2',
            )}
          >
            {children}
          </main>
        </div>
        {rail ? (
          <RightSidebar locked={fitViewport} fill={fillRail} chrome={dockAccount ? <div className="hidden xl:flex"><AccountCluster /></div> : null}>
            {rail}
          </RightSidebar>
        ) : null}
      </div>
      <PageScrollHandle scroller={scroller} />
    </div>
  );
};
