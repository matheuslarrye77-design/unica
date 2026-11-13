import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { type FC, type ReactNode } from 'react';
import { useOpenMenu } from './Sidebar';

export const AccountCluster: FC = () => null;

export const Header: FC<{ trailing?: ReactNode; tone?: 'plain' | 'lilac' | 'board' }> = ({ tone = 'plain' }) => {
  const onMenu = useOpenMenu();
  const washed = tone === 'lilac' ? 'border-b border-[rgba(45,40,70,0.06)] bg-[#F2F0FF]' : tone === 'board' ? 'border-b border-slate-200 bg-slate-100' : 'border-b border-[var(--ds-divider)] bg-white';

  return (
    <header className={`sticky top-0 z-30 w-full lg:hidden ${washed}`}>
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 bg-white" aria-label="Abrir menu" onClick={onMenu}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
