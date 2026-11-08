import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { type FC, type ReactNode } from 'react';
import { Profile } from './Profile';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { useOpenMenu } from './Sidebar';

export const AccountCluster: FC = () => (
  <div className="flex shrink-0 items-center gap-1.5">
    <NotificationDropdown />
    <Profile />
  </div>
);

export const Header: FC<{ trailing?: ReactNode }> = ({ trailing }) => {
  const onMenu = useOpenMenu();

  return (
    <header className="sticky top-0 z-30 w-full bg-[#EFEAFC] bg-[url('/fundo-plataforma.png')] bg-cover bg-center bg-fixed">
      <div className="flex h-12 items-center gap-3 px-4 sm:px-5">
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-[10px] lg:hidden" aria-label="Abrir menu" onClick={onMenu}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <GlobalSearch />
        </div>
        {trailing}
      </div>
    </header>
  );
};
