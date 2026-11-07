import { AccountCluster, Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { useShell } from '@/components/Sidebar';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { type FC, type ReactNode } from 'react';

const AccountFollow: FC<{ className?: string }> = ({ className }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={cn('unica-account-follow', className)}>
      <AccountCluster />
    </div>,
    document.body,
  );
};

export const PageFrame: FC<{ children: ReactNode; rail?: ReactNode; fitViewport?: boolean; fillRail?: boolean }> = ({ children, rail, fillRail = false }) => {
  const { rightCollapsed } = useShell();
  const dockAccount = Boolean(rail) && !rightCollapsed;

  return (
    <div className="flex h-svh max-h-svh min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Header trailing={<div className="xl:hidden"><AccountCluster /></div>} />
          <main className="relative min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
            {children}
          </main>
        </div>
        {rail ? (
          <RightSidebar locked fill={fillRail} chrome={dockAccount ? <div className="hidden xl:flex"><AccountCluster /></div> : null}>
            {rail}
          </RightSidebar>
        ) : null}
      </div>
      {dockAccount ? null : <AccountFollow />}
    </div>
  );
};
