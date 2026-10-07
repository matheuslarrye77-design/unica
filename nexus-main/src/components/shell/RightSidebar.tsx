import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type FC, type ReactNode } from 'react';
import { useShell } from '@/components/Sidebar';

export const RightSidebar: FC<{ children: ReactNode; dock?: boolean }> = ({ children, dock = false }) => {
  const { rightCollapsed, toggleRight } = useShell();

  return (
    <aside
      className={cn(
        'shrink-0 transition-[width] duration-300 ease-out',
        dock
          ? cn(
              'flex w-full flex-col overflow-x-hidden border-t bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-svh lg:max-h-svh lg:border-t-0 lg:border-l',
              rightCollapsed ? 'lg:w-12' : 'lg:w-80',
            )
          : cn('lg:sticky lg:top-20', rightCollapsed ? 'w-10' : 'w-full lg:w-80'),
      )}
    >
      <div className={cn('flex shrink-0 items-center', dock ? 'justify-end px-2 py-2' : 'mb-2')}>
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
        <div className={cn('flex flex-col gap-4 overflow-y-auto', dock ? 'min-h-0 flex-1 px-3 pb-4' : 'max-h-[calc(100vh-8rem)]')}>
          {children}
        </div>
      )}
    </aside>
  );
};
