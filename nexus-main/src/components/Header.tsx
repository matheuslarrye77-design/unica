import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { type FC } from 'react';
import { useLocation } from 'react-router-dom';
import { Profile } from './Profile';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { useOpenMenu } from './Sidebar';

export const Header: FC = () => {
  const onMenu = useOpenMenu();
  const mural = useLocation().pathname === '/';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-white/55 backdrop-blur">
      <div className="flex h-12 items-center gap-3 px-4 sm:px-5">
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-[10px] lg:hidden" aria-label="Abrir menu" onClick={onMenu}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          {mural ? null : <GlobalSearch />}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <NotificationDropdown />
          <Profile />
        </div>
      </div>
    </header>
  );
};
