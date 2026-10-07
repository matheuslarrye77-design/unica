import { Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { TeamMood } from '@/components/shell/TeamMood';
import { SocialFeed } from '@/components/social/SocialFeed';
import { CalendarPage } from '@/pages/CalendarPage';
import { type FC } from 'react';

export const Dashboard: FC = () => {
  return (
    <div className="flex min-h-svh flex-col overflow-x-hidden bg-background lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <SocialFeed />
        </main>
      </div>
      <RightSidebar dock>
        <CalendarPage compact />
        <TeamMood />
      </RightSidebar>
    </div>
  );
};
