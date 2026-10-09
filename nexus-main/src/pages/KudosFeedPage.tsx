import { PageFrame } from '@/components/shell/PageFrame';
import { TeamMood } from '@/components/shell/TeamMood';
import { SocialFeed } from '@/components/social/SocialFeed';
import { CalendarPage } from '@/pages/CalendarPage';
import { type FC } from 'react';

export const KudosFeedPage: FC = () => {
  return (
    <PageFrame rail={<><CalendarPage compact /><TeamMood /></>}>
      <SocialFeed mode="recognition" />
    </PageFrame>
  );
};
