import { ActivityBoard } from '@/components/missions/ActivityBoard';
import { PageFrame } from '@/components/shell/PageFrame';
import { type FC } from 'react';

export const ProjectsPage: FC = () => {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-[1]">
        <img src="/atividades/banner.png" alt="" className="h-full w-full object-cover object-center" />
      </div>
      <PageFrame>
        <ActivityBoard />
      </PageFrame>
    </>
  );
};
