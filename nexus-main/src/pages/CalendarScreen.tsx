import { PageFrame } from '@/components/shell/PageFrame';
import { AgendaRail } from '@/components/shell/AgendaRail';
import { CalendarPage } from '@/pages/CalendarPage';
import { type FC } from 'react';

export const CalendarScreen: FC = () => (
  <PageFrame rail={<AgendaRail />}>
    <CalendarPage page />
  </PageFrame>
);
