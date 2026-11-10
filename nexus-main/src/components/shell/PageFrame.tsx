import { AccountCluster, Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { useShell } from '@/components/Sidebar';
import { type FC, type ReactNode } from 'react';

export const PageFrame: FC<{ children: ReactNode; rail?: ReactNode; fitViewport?: boolean; fillRail?: boolean; canvas?: 'lilac' }> = ({ children, rail, fillRail = false, canvas }) => {
  const { rightCollapsed } = useShell();
  const dockAccount = Boolean(rail) && !rightCollapsed;
  const lilac = canvas === 'lilac';

  return (
    <div className={lilac ? 'flex min-h-svh flex-col overflow-x-clip bg-[#F2F0FF]' : 'flex min-h-svh flex-col overflow-x-clip bg-transparent'}>
      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <Header blend={lilac} trailing={dockAccount ? <div className="xl:hidden"><AccountCluster /></div> : <AccountCluster />} />
          <main className={lilac ? 'relative min-w-0 flex-1 overflow-x-clip px-4 py-3 sm:px-6 sm:py-4' : 'relative min-w-0 flex-1 overflow-x-clip px-4 py-4 sm:px-6'}>
            {children}
          </main>
        </div>
        {rail ? (
          <RightSidebar fill={fillRail} chrome={dockAccount ? <div className="hidden xl:flex"><AccountCluster /></div> : null}>
            {rail}
          </RightSidebar>
        ) : null}
      </div>
    </div>
  );
};
