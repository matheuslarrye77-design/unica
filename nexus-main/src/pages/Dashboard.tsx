import { HomeRail } from '@/components/shell/HomeRail';
import { PageFrame } from '@/components/shell/PageFrame';
import { SocialFeed } from '@/components/social/SocialFeed';
import { useInstitution } from '@/lib/institution';
import { type FC } from 'react';
import { Navigate } from 'react-router-dom';

export const Dashboard: FC = () => {
  const { ready, muralAvailable } = useInstitution();
  if (ready && !muralAvailable) return <Navigate to="/announcements" replace />;

  return (
    <PageFrame rail={<HomeRail />}>
      <SocialFeed />
    </PageFrame>
  );
};
