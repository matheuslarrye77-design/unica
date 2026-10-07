import { TooltipProvider } from '@/components/ui/tooltip';
import { type FC } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/ThemeProvider';
import { FocusModeProvider } from './contexts/FocusModeContext';
import { ScrollToTop } from './components/ScrollToTop';
import { FloatingHelpButton } from './components/FloatingHelpButton';
import { AppFrame } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { CalendarScreen } from './pages/CalendarScreen';
import { SettingsPage } from './pages/SettingsPage';
import { CompanyAnnouncementsPage } from './pages/CompanyAnnouncementsPage';
import { JournalArticlePage } from './pages/JournalArticlePage';
import { KudosFeedPage } from './pages/KudosFeedPage';
import { EmployeeDirectoryPage } from './pages/EmployeeDirectoryPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { HelpDeskPage } from './pages/HelpDeskPage';
import { TimeOffPage } from './pages/TimeOffPage';

const AppRoutes: FC = () => {

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Dashboard />
        }
      />
      <Route path="/for-you" element={<Navigate to="/" replace />} />
      <Route path="/announcements/:id" element={<JournalArticlePage />} />
      <Route
        path="/announcements"
        element={
          <CompanyAnnouncementsPage />
        }
      />
      <Route
        path="/kudos"
        element={
          <KudosFeedPage />
        }
      />
      <Route
        path="/employees"
        element={
          <EmployeeDirectoryPage />
        }
      />
      <Route path="/calendar" element={<CalendarScreen />} />
      <Route
        path="/projects"
        element={
          <ProjectsPage />
        }
      />
      <Route
        path="/analytics"
        element={
          <AnalyticsPage />
        }
      />
      <Route
        path="/resources"
        element={
          <ResourcesPage />
        }
      />
      <Route
        path="/help-desk"
        element={
          <HelpDeskPage />
        }
      />
      <Route
        path="/time-off"
        element={
          <TimeOffPage />
        }
      />
      <Route
        path="/configuracoes"
        element={
          <SettingsPage />
        }
      />
    </Routes>
  );
};

const App: FC = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="unica-ui-theme">
      <FocusModeProvider>
        <TooltipProvider>
            <BrowserRouter>
              <AppFrame>
                <ScrollToTop />
                <AppRoutes />
                <FloatingHelpButton />
                <Toaster />
              </AppFrame>
            </BrowserRouter>
        </TooltipProvider>
      </FocusModeProvider>
    </ThemeProvider>
  );
};

export default App;
