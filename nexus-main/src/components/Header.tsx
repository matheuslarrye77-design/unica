import { Button } from '@/components/ui/button';
import { useFocusMode } from '@/contexts/FocusModeContext';
import { currentUser } from '@/data/mockData';
import { getTimeBasedGreeting } from '@/lib/utils';
import { Eye, Focus, Menu } from 'lucide-react';
import { type FC } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { Profile } from './Profile';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { useOpenMenu } from './Sidebar';

export const Header: FC = () => {
  const onMenu = useOpenMenu();
  const { isFocusMode, toggleFocusMode } = useFocusMode();
  const location = useLocation();
  const greeting = getTimeBasedGreeting();

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button variant="outline" size="icon" className="h-10 w-10 lg:hidden" aria-label="Abrir menu" onClick={onMenu}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-medium text-muted-foreground">
            {greeting}, {currentUser.name}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:block">
            <GlobalSearch />
          </div>
          {location.pathname === '/' && (
            <Button
              variant={isFocusMode ? 'default' : 'outline'}
              size="sm"
              onClick={toggleFocusMode}
              className="h-10 gap-2"
            >
              {isFocusMode ? <Eye className="h-4 w-4" /> : <Focus className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {isFocusMode ? 'Sair do foco' : 'Modo foco'}
              </span>
            </Button>
          )}
          <NotificationDropdown />
          <ThemeToggle />
          <Profile />
        </div>
      </div>
    </header>
  );
};
