import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { useEffect, useState, type FC, type ReactNode } from 'react';
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sentinel = document.querySelector('[data-unica-search-sentinel]');
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { threshold: 1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <header className={cn('sticky top-0 z-30 w-full transition-[background-color,box-shadow,backdrop-filter] duration-200', scrolled ? 'bg-[#efe6fb]/95 backdrop-blur-xl shadow-[0_1px_0_rgba(80,40,120,0.08)]' : 'bg-transparent')}>
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
