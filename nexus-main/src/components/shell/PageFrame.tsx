import { Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { type FC, type ReactNode } from 'react';

export const PageFrame: FC<{ children: ReactNode; rail?: ReactNode }> = ({ children, rail }) => (
  <div className="flex min-h-svh flex-col overflow-x-clip bg-background">
    <Header />
    <div className="flex min-w-0 flex-1 items-stretch">
      <main className="min-w-0 flex-1 overflow-x-clip px-5 py-4 sm:px-6">
        {children}
      </main>
      {rail ? <RightSidebar>{rail}</RightSidebar> : null}
    </div>
  </div>
);
