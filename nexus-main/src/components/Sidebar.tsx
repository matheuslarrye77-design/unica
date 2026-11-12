import { cn } from '@/lib/utils';
import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  Award,
  CalendarDays,
  FileText,
  ListChecks,
  Home,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { type FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageSearchProvider } from '@/lib/pageSearch';
import { SidebarBrand, SidebarNav, type NavGroupData, type NavItemData } from '@/components/ui/dashboard-sidebar';
import { useInstitution } from '@/lib/institution';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { logout } from '@/lib/session';

const GROUPS: NavGroupData[] = [
  {
    heading: 'Social',
    items: [
      { id: 'mural', title: 'Mural', icon: Home, href: '/' },
      { id: 'jornal', title: 'Jornal', icon: Megaphone, href: '/announcements' },
      { id: 'reconhecimento', title: 'Reconhecimento', icon: Award, href: '/kudos' },
    ],
  },
  {
    heading: 'Trabalho',
    items: [
      { id: 'atividades', title: 'Atividades', icon: ListChecks, href: '/projects' },
      { id: 'documentos', title: 'Documentos', icon: FileText, href: '/resources' },
      { id: 'calendarios', title: 'Calendários', icon: CalendarDays, href: '/calendar' },
      { id: 'sugestoes', title: 'Sugestões', icon: MessageSquare, href: '/sugestoes' },
    ],
  },
  {
    heading: 'Gestão',
    items: [
      { id: 'equipe', title: 'Equipe', icon: Users, href: '/employees' },
    ],
  },
];

const BOTTOM_ITEMS: NavItemData[] = [
  { id: 'configuracoes', title: 'Configurações', icon: Settings, href: '/configuracoes' },
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

function isActive(pathname: string, search: string, path?: string) {
  if (!path) return false;
  const [targetPath, targetQuery] = path.split('?');
  if (pathname !== targetPath) return false;
  const current = new URLSearchParams(search);
  const target = new URLSearchParams(targetQuery ?? '');
  if ([...target.keys()].length === 0) {
    if (targetPath === '/') return [...current.keys()].length === 0;
    return true;
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
        <PageSearchProvider>
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="min-h-0 lg:pl-[104px]">{children}</div>
        </PageSearchProvider>
      </MenuContext.Provider>
    </ShellContext.Provider>
  );
};

export const Sidebar: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const institution = useInstitution();
  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.href !== '/' || institution.muralAvailable),
  }));
  const activeOf = (item: NavItemData) => isActive(location.pathname, location.search, item.href);

  const nav = (collapsed: boolean, inverted = false) => (
    <SidebarNav
      className={cn('border-none bg-transparent', collapsed ? 'items-center p-2' : 'p-3')}
      groups={groups}
      inverted={inverted}
      bottomItems={[
        ...BOTTOM_ITEMS,
        {
          id: 'sair',
          title: 'Sair',
          icon: LogOut,
          onClick: () => {
            void logout().finally(() => navigate(LOGIN_REQUIRED ? '/login' : '/', { replace: true }));
          },
        },
      ]}
      collapsed={collapsed}
      isActive={activeOf}
      onNavigate={onClose}
      header={(
        <div className={cn('mb-1 flex items-start', collapsed ? 'flex-col items-center gap-1' : 'justify-between gap-1')}>
          <SidebarBrand name="Única" accent="Conecta" href="/" collapsed={collapsed} onNavigate={onClose} />
          <button type="button" className={cn('mt-1 rounded-md p-1.5 lg:hidden', inverted ? 'text-white/80' : 'text-[#3C3952]')} aria-label="Fechar menu" onClick={onClose}>
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      )}
    />
  );

  return (
    <>
      <aside className="fixed top-3 bottom-3 left-3 z-40 hidden w-[76px] flex-col overflow-visible rounded-[28px] bg-[#6B33F6] text-white shadow-[0_12px_30px_rgba(70,0,243,0.28)] lg:flex">
        {nav(true, true)}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-foreground/30" aria-label="Fechar menu" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 flex w-[232px] flex-col border-r border-[rgba(45,40,70,0.08)] bg-white text-sidebar-foreground shadow-[0_2px_7px_rgba(40,35,65,0.035)]">
            {nav(false)}
          </aside>
        </div>
      ) : null}
    </>
  );
};
