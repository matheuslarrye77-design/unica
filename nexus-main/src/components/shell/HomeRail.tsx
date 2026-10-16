import { BirthdayRail } from '@/components/shell/BirthdayRail';
import { MissionsRail } from '@/components/shell/MissionsRail';
import { TeamMood } from '@/components/shell/TeamMood';
import { CalendarPage } from '@/pages/CalendarPage';
import { type FC } from 'react';

export const HomeRail: FC = () => (
  <>
    <CalendarPage rail />
    <MissionsRail />
    <TeamMood />
    <BirthdayRail />
  </>
);
