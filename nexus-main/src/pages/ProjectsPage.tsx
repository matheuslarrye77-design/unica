import { Header } from '@/components/Header';
import { ActivityBoard } from '@/components/missions/ActivityBoard';
import { type FC } from 'react';

export const ProjectsPage: FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <ActivityBoard />
      </main>
    </div>
  );
};
