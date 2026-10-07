import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type FC, type ReactNode } from 'react';
import { useShell } from '@/components/Sidebar';

export const RightSidebar: FC<{ children: ReactNode }> = ({ children }) => {
  const { rightCollapsed, toggleRight } = useShell();

  return (
    <aside
      className={cn(
        'shrink-0 transition-[width] duration-300 ease-out lg:sticky lg:top-20',
        rightCollapsed ? 'w-10' : 'w-full lg:w-80',
      )}
    >
      <button
        type="button"
        onClick={toggleRight}
        aria-label={rightCollapsed ? 'Expandir painel' : 'Recolher painel'}
        className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border bg-card text-muted-foreground hover:text-foreground"
      >
        {rightCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {rightCollapsed ? null : (
        <div className="flex max-h-[calc(100vh-8rem)] flex-col gap-4 overflow-y-auto">
          {children}
        </div>
      )}
    </aside>
  );
};
