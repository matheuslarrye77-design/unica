import { HomeRail } from '@/components/shell/HomeRail';
import { PageFrame } from '@/components/shell/PageFrame';
import { SocialFeed } from '@/components/social/SocialFeed';
import { type FC } from 'react';

export const KudosFeedPage: FC = () => {
  return (
    <PageFrame rail={<HomeRail />}>
      <SocialFeed mode="recognition" />
    </PageFrame>
  );
};
