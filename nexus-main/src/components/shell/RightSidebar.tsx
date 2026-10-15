import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, PanelRight } from 'lucide-react';
import { useState, type FC, type ReactNode } from 'react';
import { useShell } from '@/components/Sidebar';

export const RightSidebar: FC<{ children: ReactNode; dock?: boolean }> = ({ children }) => {
  const { rightCollapsed, toggleRight } = useShell();
  const [mobileOpen, setMobileOpen] = useState(false);

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
      {children}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-[4.25rem] right-4 z-30 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12px] font-medium text-foreground shadow-[var(--unica-shadow)] xl:hidden"
      >
        <PanelRight className="h-3.5 w-3.5" />
        Painel
      </button>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button type="button" className="absolute inset-0 bg-foreground/30" aria-label="Fechar painel" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-[min(100%,400px)] flex-col border-l border-sidebar-border bg-background text-sidebar-foreground shadow-lg">
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="text-[13px] font-semibold">Painel</p>
              <button type="button" className="rounded-[10px] px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted" onClick={() => setMobileOpen(false)}>
                Fechar
              </button>
            </div>
            {body}
          </aside>
        </div>
      ) : null}
      <aside
        className={cn(
          'sticky top-14 hidden h-[calc(100svh-3.5rem)] shrink-0 flex-col border-l border-sidebar-border bg-background text-sidebar-foreground xl:flex',
          rightCollapsed ? 'w-11' : 'w-[400px] min-[1536px]:w-[412px]',
        )}
      >
        <div className={cn('flex shrink-0 items-center px-2 pt-3', rightCollapsed ? 'justify-center' : 'justify-end')}>
          <button
            type="button"
            onClick={toggleRight}
            aria-label={rightCollapsed ? 'Expandir painel' : 'Recolher painel'}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {rightCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
        {rightCollapsed ? null : body}
      </aside>
    </>
  );
};
