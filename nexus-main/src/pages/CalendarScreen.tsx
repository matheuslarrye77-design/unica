import { PageFrame } from '@/components/shell/PageFrame';
import { CalendarPage } from '@/pages/CalendarPage';
import { type FC } from 'react';

export const CalendarScreen: FC = () => (
  <PageFrame>
    <CalendarPage page />
  </PageFrame>
);
