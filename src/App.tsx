import { Loader2, Sparkles } from 'lucide-react';
import type { RoutePath } from './lib/router';
import { useRoute } from './lib/router';
import { useSession } from './lib/session';
import { AuthScreen } from './components/AuthScreen';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/Dashboard';
import { DiscoveryPage } from './pages/Discovery';
import { SavedPage } from './pages/Saved';
import { SkillGapPage } from './pages/SkillGap';
import { CompaniesPage } from './pages/Companies';
import { AuthenticityPage } from './pages/Authenticity';
import { DuplicatesPage } from './pages/Duplicates';
import { InterviewsPage } from './pages/Interviews';
import { RoadmapPage } from './pages/Roadmap';
import { DeadlinesPage } from './pages/Deadlines';
import { SalariesPage } from './pages/Salaries';
import { GitHubPage } from './pages/GitHub';
import { ApplicationsPage } from './pages/Applications';
import { ApplicationStudioPage } from './pages/ApplicationStudio';
import { AnalyticsPage } from './pages/Analytics';
import { ProfilePage } from './pages/Profile';
import { ResumePage } from './pages/Resume';
import { NotificationsPage } from './pages/Notifications';
import { SettingsPage } from './pages/Settings';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
          <Sparkles size={19} />
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">AI Job Hunter</div>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[var(--muted-2)]">
            <Loader2 size={12} className="animate-spin" /> Loading your workspace…
          </div>
        </div>
      </div>
    </div>
  );
}

function renderPage(path: RoutePath, navigate: (next: RoutePath) => void) {
  switch (path) {
    case 'dashboard':
      return <DashboardPage navigate={navigate} />;
    case 'discovery':
      return <DiscoveryPage navigate={navigate} />;
    case 'saved':
      return <SavedPage navigate={navigate} />;
    case 'skill-gap':
      return <SkillGapPage />;
    case 'companies':
      return <CompaniesPage />;
    case 'authenticity':
      return <AuthenticityPage />;
    case 'duplicates':
      return <DuplicatesPage />;
    case 'interviews':
      return <InterviewsPage />;
    case 'roadmap':
      return <RoadmapPage />;
    case 'deadlines':
      return <DeadlinesPage />;
    case 'salaries':
      return <SalariesPage />;
    case 'github':
      return <GitHubPage />;
    case 'applications':
      return <ApplicationsPage navigate={navigate} />;
    case 'studio':
      return <ApplicationStudioPage navigate={navigate} />;
    case 'analytics':
      return <AnalyticsPage />;
    case 'profile':
      return <ProfilePage navigate={navigate} />;
    case 'resume':
      return <ResumePage />;
    case 'notifications':
      return <NotificationsPage />;
    case 'settings':
      return <SettingsPage navigate={navigate} />;
    default:
      return <DashboardPage navigate={navigate} />;
  }
}

export function App() {
  const { status } = useSession();
  const { path, route, navigate } = useRoute();

  if (status === 'loading') return <Splash />;
  if (status === 'anonymous') return <AuthScreen />;

  return (
    <Layout route={route} navigate={navigate}>
      {renderPage(path, navigate)}
    </Layout>
  );
}
