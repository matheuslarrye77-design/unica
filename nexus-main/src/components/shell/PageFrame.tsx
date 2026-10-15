import { Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { cn } from '@/lib/utils';
import { type FC, type ReactNode } from 'react';

export const PageFrame: FC<{ children: ReactNode; rail?: ReactNode; fitViewport?: boolean }> = ({ children, rail, fitViewport = false }) => (
  <div className={cn('flex min-h-svh flex-col overflow-x-clip bg-transparent', fitViewport && 'xl:h-dvh xl:max-h-dvh xl:min-h-0 xl:overflow-hidden')}>
    {fitViewport ? <div className="xl:hidden"><Header /></div> : <Header />}
    <div className={cn('flex min-w-0 flex-1 items-stretch', fitViewport && 'xl:min-h-0 xl:gap-4 xl:py-3 xl:pr-4 xl:pl-0')}>
      <main className={cn('min-w-0 flex-1 overflow-x-clip', fitViewport ? 'px-4 py-3 xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden xl:px-0 xl:py-0' : 'px-5 py-4 sm:px-6')}>
        {children}
      </main>
      {rail ? <RightSidebar locked={fitViewport}>{rail}</RightSidebar> : null}
    </div>
  </div>
);
