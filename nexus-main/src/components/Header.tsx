import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { type FC } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Profile } from './Profile';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { useOpenMenu } from './Sidebar';

export const Header: FC = () => {
  const onMenu = useOpenMenu();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-5">
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-[10px] lg:hidden" aria-label="Abrir menu" onClick={onMenu}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <GlobalSearch />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 xl:w-[388px] xl:justify-end">
          <NotificationDropdown />
          <ThemeToggle />
          <Profile />
        </div>
      </div>
    </header>
  );
};
