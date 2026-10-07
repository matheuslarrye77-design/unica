import { Header } from '@/components/Header';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { TeamMood } from '@/components/shell/TeamMood';
import { UpcomingEvents } from '@/components/shell/UpcomingEvents';
import { CalendarPage } from '@/pages/CalendarPage';
import { type FC } from 'react';

export const CalendarScreen: FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <CalendarPage page />
          </div>
          <RightSidebar>
            <TeamMood />
            <UpcomingEvents />
          </RightSidebar>
        </div>
      </main>
    </div>
  );
};
