import { HomeRail } from '@/components/shell/HomeRail';
import { PageFrame } from '@/components/shell/PageFrame';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { Profile } from '@/components/Profile';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GlobalSearch } from '@/components/GlobalSearch';
import { SocialFeed } from '@/components/social/SocialFeed';
import { useInstitution } from '@/lib/institution';
import { type FC } from 'react';
import { Navigate } from 'react-router-dom';

export const Dashboard: FC = () => {
  const { ready, muralAvailable } = useInstitution();
  if (ready && !muralAvailable) return <Navigate to="/announcements" replace />;

  return (
    <PageFrame fitViewport rail={<HomeRail />}>
      <div className="flex flex-col gap-2 xl:min-h-0 xl:flex-1">
        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <NotificationDropdown />
          <ThemeToggle />
          <Profile />
        </div>
        <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          <SocialFeed />
        </div>
      </div>
    </PageFrame>
  );
};
