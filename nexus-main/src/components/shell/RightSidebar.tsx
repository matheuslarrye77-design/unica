import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type FC, type ReactNode } from 'react';
import { useShell } from '@/components/Sidebar';

export const RightSidebar: FC<{ children: ReactNode; dock?: boolean }> = ({ children }) => {
  const { rightCollapsed, toggleRight } = useShell();
  const width = rightCollapsed ? 'lg:w-12' : 'lg:w-80';

  return (
    <>
      <div className={cn('hidden shrink-0 lg:block', width)} aria-hidden />
      <aside
        className={cn(
          'flex w-full flex-col overflow-x-hidden border-t bg-sidebar text-sidebar-foreground lg:fixed lg:inset-y-0 lg:right-0 lg:z-20 lg:h-svh lg:max-h-svh lg:border-t-0 lg:border-l',
          width,
        )}
      >
        <div className="flex shrink-0 items-center justify-end px-2 py-2">
          <button
            type="button"
            onClick={toggleRight}
            aria-label={rightCollapsed ? 'Expandir painel' : 'Recolher painel'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border bg-card text-muted-foreground hover:text-foreground"
          >
            {rightCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
        {rightCollapsed ? null : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
            {children}
          </div>
        )}
      </aside>
    </>
  );
};
