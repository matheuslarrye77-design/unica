import { TooltipProvider } from '@/components/ui/tooltip';
import { useEffect, useState, type FC, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/ThemeProvider';
import { FocusModeProvider } from './contexts/FocusModeContext';
import { ScrollToTop } from './components/ScrollToTop';
import { FeedbackButton } from './components/FeedbackButton';
import { InstitutionProvider } from './components/InstitutionProvider';
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
import { FeedbacksPage } from './pages/FeedbacksPage';
import { LoginPage } from './pages/LoginPage';
import { PostPage } from './pages/PostPage';
import { ProfilePage } from './pages/ProfilePage';
import { restoreSession } from './lib/session';

const RequireSession: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<'loading' | 'in' | 'out'>('loading');
  useEffect(() => {
    void restoreSession().then((user) => setState(user ? 'in' : 'out'));
  }, []);
  if (state === 'loading') return null;
  if (state === 'out') return <Navigate to="/login" replace />;
  return children;
};

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
      <Route path="/gestao/feedbacks" element={<FeedbacksPage />} />
      <Route path="/gestao/configuracoes" element={<Navigate to="/configuracoes" replace />} />
      <Route path="/perfil" element={<ProfilePage />} />
      <Route path="/publicacao/:id" element={<PostPage />} />
    </Routes>
  );
};

const App: FC = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="unica-ui-theme">
      <FocusModeProvider>
        <TooltipProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*" element={
              <RequireSession>
              <InstitutionProvider>
              <AppFrame>
                <ScrollToTop />
                <AppRoutes />
                <FeedbackButton />
                <Toaster />
              </AppFrame>
              </InstitutionProvider>
              </RequireSession>
                } />
              </Routes>
            </BrowserRouter>
        </TooltipProvider>
      </FocusModeProvider>
    </ThemeProvider>
  );
};

export default App;
