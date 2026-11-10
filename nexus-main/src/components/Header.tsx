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

export const Header: FC<{ trailing?: ReactNode; blend?: boolean }> = ({ trailing, blend = false }) => {
  const onMenu = useOpenMenu();

  return (
    <header className={blend ? 'sticky top-0 z-30 w-full border-b border-[rgba(45,40,70,0.06)] bg-[#F2F0FF]' : 'sticky top-0 z-30 w-full border-b border-[var(--ds-divider)] bg-white'}>
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 bg-white lg:hidden" aria-label="Abrir menu" onClick={onMenu}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <GlobalSearch paper={blend} />
        </div>
        {trailing}
      </div>
    </header>
  );
};
