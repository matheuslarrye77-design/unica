import { Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { type FC, type ReactNode } from 'react';

export const PageFrame: FC<{ children: ReactNode; rail?: ReactNode }> = ({ children, rail }) => (
  <div className="flex min-h-svh flex-col overflow-x-clip bg-background lg:flex-row">
    <div className="flex min-w-0 flex-1 flex-col">
      <Header />
      <main className="min-w-0 flex-1 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
    {rail ? <RightSidebar>{rail}</RightSidebar> : null}
  </div>
);
