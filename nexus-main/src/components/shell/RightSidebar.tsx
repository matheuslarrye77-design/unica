import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, PanelRight } from 'lucide-react';
import { useState, type FC, type ReactNode } from 'react';
import { useShell } from '@/components/Sidebar';

export const RightSidebar: FC<{ children: ReactNode; dock?: boolean; locked?: boolean }> = ({ children, locked = false }) => {
  const { rightCollapsed, toggleRight } = useShell();
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = locked ? false : rightCollapsed;

  const body = (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-2 px-0 py-0', locked ? 'overflow-hidden' : 'overflow-y-auto px-3 py-3 [scrollbar-width:thin]')}>
      {children}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-14 right-3 z-30 inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12px] font-medium text-foreground shadow-[var(--unica-shadow)] xl:hidden"
      >
        <PanelRight className="h-3.5 w-3.5" />
        Painel
      </button>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button type="button" className="absolute inset-0 bg-foreground/30" aria-label="Fechar painel" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-[min(100%,340px)] flex-col bg-background text-sidebar-foreground shadow-lg">
            <div className="flex items-center justify-between px-3 pt-3">
              <p className="text-[13px] font-semibold">Painel</p>
              <button type="button" className="rounded-[8px] px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted" onClick={() => setMobileOpen(false)}>
                Fechar
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">{children}</div>
          </aside>
        </div>
      ) : null}
      <aside
        className={cn(
          'sticky top-12 hidden h-[calc(100dvh-3rem)] shrink-0 flex-col bg-transparent text-sidebar-foreground xl:flex',
          locked && 'static top-auto h-auto max-h-full min-h-0 self-stretch',
          collapsed ? 'w-11' : 'w-[320px]',
        )}
      >
        {locked ? null : (
          <div className={cn('flex shrink-0 items-center px-1', collapsed ? 'justify-center' : 'justify-end')}>
            <button
              type="button"
              onClick={toggleRight}
              aria-label={collapsed ? 'Expandir painel' : 'Recolher painel'}
              className="flex h-7 w-7 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-card hover:text-foreground"
            >
              {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        )}
        {collapsed ? null : body}
      </aside>
    </>
  );
};
