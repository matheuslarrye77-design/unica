import { AccountCluster, Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { useShell } from '@/components/Sidebar';
import { type FC, type ReactNode } from 'react';

export const PageFrame: FC<{ children: ReactNode; rail?: ReactNode; fitViewport?: boolean; fillRail?: boolean; canvas?: 'lilac' | 'board' }> = ({ children, rail, fillRail = false, canvas }) => {
  const { rightCollapsed } = useShell();
  const dockAccount = Boolean(rail) && !rightCollapsed;
  const canvasClass = canvas === 'lilac' ? 'bg-[#F2F0FF]' : canvas === 'board' ? 'bg-slate-100' : 'bg-transparent';

  return (
    <div className={`flex min-h-svh flex-col overflow-x-clip ${canvasClass}`}>
      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <Header tone={canvas ?? 'plain'} trailing={dockAccount ? <div className="xl:hidden"><AccountCluster /></div> : <AccountCluster />} />
          <main className={canvas ? 'relative min-w-0 flex-1 overflow-x-clip px-4 py-5 sm:px-6 sm:py-6 lg:px-8' : 'relative min-w-0 flex-1 overflow-x-clip px-4 py-4 sm:px-6'}>
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
