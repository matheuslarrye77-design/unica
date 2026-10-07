import { cn } from '@/lib/utils';
import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  Award,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Home,
  Megaphone,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { type FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const GROUPS = [
  {
    id: 'social',
    label: 'Social',
    items: [
      { path: '/', label: 'Mural', icon: Home },
      { path: '/announcements', label: 'Jornal', icon: Megaphone },
      { path: '/kudos', label: 'Reconhecimento', icon: Award },
    ],
  },
  {
    id: 'trabalho',
    label: 'Trabalho',
    items: [
      { path: '/projects', label: 'Atividades', icon: FolderOpen },
      { path: '/resources', label: 'Documentos', icon: FileText },
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão',
    items: [
      { path: '/employees', label: 'Equipe', icon: Users },
      { path: '/calendar', label: 'Calendários', icon: CalendarDays },
    ],
  },
];

const LEFT_KEY = 'unica-nav-collapsed';
const RIGHT_KEY = 'unica-rail-collapsed';

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

type Shell = {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
};

const ShellContext = createContext<Shell>({
  leftCollapsed: false,
  rightCollapsed: false,
  toggleLeft: () => {},
  toggleRight: () => {},
});

export function useShell() {
  return useContext(ShellContext);
}

function isActive(pathname: string, search: string, path: string) {
  const [targetPath, targetQuery] = path.split('?');
  if (pathname !== targetPath) return false;
  const current = new URLSearchParams(search);
  const target = new URLSearchParams(targetQuery ?? '');
  if ([...target.keys()].length === 0) {
    return [...current.keys()].length === 0 || targetPath === '/';
  }
  for (const [key, value] of target.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

const MenuContext = createContext<() => void>(() => {});

export function useOpenMenu() {
  return useContext(MenuContext);
}

export const AppFrame: FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(() => readFlag(LEFT_KEY));
  const [rightCollapsed, setRightCollapsed] = useState(() => readFlag(RIGHT_KEY));

  function toggleLeft() {
    setLeftCollapsed((value) => {
      const next = !value;
      localStorage.setItem(LEFT_KEY, next ? '1' : '0');
      return next;
    });
  }

  function toggleRight() {
    setRightCollapsed((value) => {
      const next = !value;
      localStorage.setItem(RIGHT_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <ShellContext.Provider value={{ leftCollapsed, rightCollapsed, toggleLeft, toggleRight }}>
      <MenuContext.Provider value={() => setOpen(true)}>
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className={cn('transition-[padding-left] duration-300 ease-out', leftCollapsed ? 'lg:pl-16' : 'lg:pl-60')}>{children}</div>
      </MenuContext.Provider>
    </ShellContext.Provider>
  );
};

export const Sidebar: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const location = useLocation();
  const { leftCollapsed, toggleLeft } = useShell();

  const nav = (collapsed: boolean) => (
    <>
      <div className={cn('flex items-center px-4 pb-2 pt-5', collapsed ? 'flex-col gap-2 px-2' : 'justify-between')}>
        <Link to="/" onClick={onClose} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            Ú
          </div>
          {collapsed ? null : <span className="text-lg font-semibold text-primary">Única</span>}
        </Link>
        <button type="button" className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground lg:inline-flex" aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} onClick={toggleLeft}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button type="button" className="rounded-lg p-2 text-muted-foreground lg:hidden" aria-label="Fechar menu" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex flex-col gap-1 px-3 py-3" aria-label="Principal">
        {GROUPS.map((group) => (
          <div key={group.id} className="flex flex-col gap-1">
            {group.label && !collapsed ? (
              <p className="flex items-center justify-between px-3 py-1 text-xs font-medium text-muted-foreground">
                {group.label}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(location.pathname, location.search, item.path);
                const link = (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      collapsed && 'justify-center px-2',
                      active
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
                  </Link>
                );
                if (!collapsed) return link;
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t px-3 py-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/configuracoes"
                onClick={onClose}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                  location.pathname === '/configuracoes'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Configurações</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Configurações</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/configuracoes"
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === '/configuracoes'
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside className={cn('fixed inset-y-0 left-0 z-40 hidden flex-col overflow-y-auto border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out lg:flex', leftCollapsed ? 'w-16' : 'w-60')}>
        {nav(leftCollapsed)}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-foreground/40" aria-label="Fechar menu" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 flex w-60 flex-col overflow-y-auto border-r bg-sidebar text-sidebar-foreground shadow-lg">
            {nav(false)}
          </aside>
        </div>
      ) : null}
    </>
  );
};
