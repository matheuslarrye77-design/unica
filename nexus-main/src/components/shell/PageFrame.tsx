import { AccountCluster, Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { useShell } from '@/components/Sidebar';
import { type FC, type ReactNode } from 'react';

export const PageFrame: FC<{ children: ReactNode; rail?: ReactNode; fitViewport?: boolean; fillRail?: boolean }> = ({ children, rail, fillRail = false }) => {
  const { rightCollapsed } = useShell();
  const dockAccount = Boolean(rail) && !rightCollapsed;

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip bg-transparent">
      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <Header trailing={dockAccount ? <div className="xl:hidden"><AccountCluster /></div> : <AccountCluster />} />
          <main className="relative min-w-0 flex-1 overflow-x-clip px-4 py-3 sm:px-5">
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
