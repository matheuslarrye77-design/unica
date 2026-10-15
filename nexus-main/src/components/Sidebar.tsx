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
  MessageSquare,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { type FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isLeader, useInstitution } from '@/lib/institution';
import { currentUser } from '@/data/mockData';

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
      { path: '/calendar', label: 'Calendários', icon: CalendarDays },
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão',
    items: [
      { path: '/employees', label: 'Equipe', icon: Users },
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
        <div className={cn('transition-[padding-left] duration-300 ease-out', leftCollapsed ? 'lg:pl-16' : 'lg:pl-[256px]')}>{children}</div>
      </MenuContext.Provider>
    </ShellContext.Provider>
  );
};

export const Sidebar: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const location = useLocation();
  const { leftCollapsed, toggleLeft } = useShell();
  const institution = useInstitution();
  const leader = isLeader(currentUser);
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  const groups = GROUPS.map((group) => {
    const items = group.items.filter((item) => item.path !== '/' || institution.muralAvailable);
    if (group.id !== 'gestao' || !leader) return { ...group, items };
    return {
      ...group,
      items: [
        ...items,
        { path: '/gestao/feedbacks', label: 'Feedbacks', icon: MessageSquare },
      ],
    };
  });

  const itemClass = (active: boolean, collapsed: boolean) => cn(
    'flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
    collapsed && 'justify-center px-0',
    active
      ? 'bg-accent text-accent-foreground'
      : 'text-[#25233A] hover:bg-[var(--unica-hover)] [&_svg]:text-primary dark:text-foreground',
  );

  const nav = (collapsed: boolean) => (
    <>
      <div className={cn('flex items-center px-4 pb-1 pt-4', collapsed ? 'flex-col gap-2 px-2' : 'justify-between')}>
        <Link to="/" onClick={onClose} className="flex items-center gap-2.5 rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-[15px] font-semibold text-primary-foreground">
            U
          </div>
          {collapsed ? null : <span className="text-[16px] font-semibold tracking-tight text-foreground">Única</span>}
        </Link>
        <button type="button" className="hidden h-8 w-8 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 lg:inline-flex" aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} onClick={toggleLeft}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button type="button" className="rounded-[10px] p-2 text-muted-foreground lg:hidden" aria-label="Fechar menu" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex min-h-0 flex-col gap-0.5 overflow-y-auto px-3 pb-2 pt-1" aria-label="Principal">
        {groups.flatMap((group) => {
          const rows = [];
          const groupClosed = closedGroups.includes(group.id);
          if (group.label && !collapsed) {
            rows.push(
              <button
                key={`${group.id}-label`}
                type="button"
                className="mt-3 flex h-8 w-full items-center justify-between rounded-[8px] px-3 text-[12px] font-medium text-muted-foreground first:mt-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                aria-expanded={!groupClosed}
                onClick={() => setClosedGroups((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}
              >
                {group.label}
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', groupClosed && '-rotate-90')} />
              </button>,
            );
          }
          if (groupClosed && !collapsed) return rows;
          for (const item of group.items) {
            const Icon = item.icon;
            const active = isActive(location.pathname, location.search, item.path);
            const link = (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={itemClass(active, collapsed)}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
              </Link>
            );
            rows.push(collapsed ? (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : link);
          }
          return rows;
        })}
      </nav>
      <div className="px-3 pb-4 pt-2">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/configuracoes"
                onClick={onClose}
                className={itemClass(location.pathname === '/configuracoes', true)}
              >
                <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
                <span className="sr-only">Configurações</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Configurações</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/configuracoes"
            onClick={onClose}
            className={itemClass(location.pathname === '/configuracoes', false)}
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Configurações
          </Link>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside className={cn('fixed inset-y-0 left-0 z-40 hidden flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[var(--unica-shadow)] transition-[width] duration-300 ease-out lg:flex', leftCollapsed ? 'w-16' : 'w-[240px]')}>
        {nav(leftCollapsed)}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-foreground/30" aria-label="Fechar menu" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 flex w-[240px] flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg">
            {nav(false)}
          </aside>
        </div>
      ) : null}
    </>
  );
};
