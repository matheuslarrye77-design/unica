import { ActivityBoard } from '@/components/missions/ActivityBoard';
import { PageFrame } from '@/components/shell/PageFrame';
import { type FC } from 'react';

export const ProjectsPage: FC = () => {
  return (
    <PageFrame>
      <ActivityBoard />
    </PageFrame>
  );
};
