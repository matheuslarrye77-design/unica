import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { Profile } from '@/components/Profile';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HomeRail } from '@/components/shell/HomeRail';
import { PageFrame } from '@/components/shell/PageFrame';
import { SocialFeed } from '@/components/social/SocialFeed';
import { type FC } from 'react';

export const KudosFeedPage: FC = () => {
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
          <SocialFeed mode="recognition" />
        </div>
      </div>
    </PageFrame>
  );
};
