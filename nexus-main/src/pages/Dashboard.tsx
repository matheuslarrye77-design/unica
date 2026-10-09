import { PageFrame } from '@/components/shell/PageFrame';
import { TeamMood } from '@/components/shell/TeamMood';
import { SocialFeed } from '@/components/social/SocialFeed';
import { useInstitution } from '@/lib/institution';
import { CalendarPage } from '@/pages/CalendarPage';
import { type FC } from 'react';
import { Navigate } from 'react-router-dom';

export const Dashboard: FC = () => {
  const { ready, muralAvailable } = useInstitution();
  if (ready && !muralAvailable) return <Navigate to="/announcements" replace />;

  return (
    <PageFrame rail={<><CalendarPage compact /><TeamMood /></>}>
      <SocialFeed />
    </PageFrame>
  );
};
