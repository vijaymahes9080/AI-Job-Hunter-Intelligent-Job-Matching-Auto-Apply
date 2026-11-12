import {
  BarChart3,
  Bell,
  Bookmark,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Compass,
  Copy,
  FileText,
  Github,
  Layers,
  LayoutDashboard,
  Map,
  MessageSquareText,
  Send,
  Settings2,
  ShieldCheck,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export type RoutePath =
  | 'dashboard'
  | 'discovery'
  | 'saved'
  | 'skill-gap'
  | 'companies'
  | 'authenticity'
  | 'duplicates'
  | 'interviews'
  | 'roadmap'
  | 'deadlines'
  | 'salaries'
  | 'github'
  | 'applications'
  | 'studio'
  | 'analytics'
  | 'profile'
  | 'resume'
  | 'notifications'
  | 'settings';

export interface RouteDefinition {
  path: RoutePath;
  label: string;
  group: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
}

export const ROUTES: RouteDefinition[] = [
  {
    path: 'dashboard',
    label: 'Dashboard',
    group: 'Overview',
    icon: LayoutDashboard,
    description: 'Your verified pipeline, top evidence matches and next actions.',
  },
  {
    path: 'discovery',
    label: 'Job Discovery',
    group: 'Find opportunities',
    icon: Compass,
    description: 'Search open-source public job feeds and evaluate evidence-based matches.',
  },
  {
    path: 'saved',
    label: 'Saved Jobs',
    group: 'Find opportunities',
    icon: Bookmark,
    description: 'Shortlisted roles you intend to review and apply to.',
  },
  {
    path: 'deadlines',
    label: 'Deadline Intelligence',
    group: 'Find opportunities',
    icon: CalendarClock,
    description: 'Published closing dates, verification states and closing-soon alerts.',
  },
  {
    path: 'salaries',
    label: 'Salary Intelligence',
    group: 'Find opportunities',
    icon: CircleDollarSign,
    description: 'Only explicitly published pay ranges, with original source evidence.',
  },
  {
    path: 'skill-gap',
    label: 'Skill Gap',
    group: 'Prepare',
    icon: TrendingUp,
    description: 'Weighted requirement gaps derived from real postings and your verified skills.',
  },
  {
    path: 'interviews',
    label: 'Interview Prep',
    group: 'Prepare',
    icon: MessageSquareText,
    description: 'Evidence-labelled practice questions and structured answer feedback.',
  },
  {
    path: 'roadmap',
    label: 'Career Roadmap',
    group: 'Prepare',
    icon: Map,
    description: 'A staged learning plan based on your measured gaps, not generic advice.',
  },
  {
    path: 'resume',
    label: 'Resume & ATS',
    group: 'Prepare',
    icon: FileText,
    description: 'Transparent ATS readiness checks and target-role keyword evidence.',
  },
  {
    path: 'github',
    label: 'GitHub Portfolio',
    group: 'Prepare',
    icon: Github,
    description: 'Public repository evidence matched against published job requirements.',
  },
  {
    path: 'studio',
    label: 'Application Studio',
    group: 'Apply',
    icon: Layers,
    description: 'Prepare accurate application content, then approve it for manual submission.',
  },
  {
    path: 'applications',
    label: 'Applications',
    group: 'Apply',
    icon: Send,
    description: 'Prepared → Approved → Submitted, with confirmation evidence and event history.',
  },
  {
    path: 'analytics',
    label: 'Success Analytics',
    group: 'Apply',
    icon: BarChart3,
    description: 'Data-derived funnel rates with explicit definitions and unknown outcomes.',
  },
  {
    path: 'companies',
    label: 'Company Intelligence',
    group: 'Research',
    icon: Building2,
    description: 'Verified website, careers-page and posting evidence. No invented company facts.',
  },
  {
    path: 'authenticity',
    label: 'Job Authenticity',
    group: 'Research',
    icon: ShieldCheck,
    description: 'Transparent risk indicators for a posting; never a definitive fraud verdict.',
  },
  {
    path: 'duplicates',
    label: 'Duplicate Guard',
    group: 'Research',
    icon: Copy,
    description: 'URL, company and title similarity checks before preparing an application.',
  },
  {
    path: 'profile',
    label: 'Profile',
    group: 'Account',
    icon: UserRound,
    description: 'Your verified skills, experience and preferences power every engine.',
  },
  {
    path: 'notifications',
    label: 'Notifications',
    group: 'Account',
    icon: Bell,
    description: 'Deadline, match and application alerts generated from real events.',
  },
  {
    path: 'settings',
    label: 'Settings & Integrations',
    group: 'Account',
    icon: Settings2,
    description: 'Preferences, data durability and open-source integration status.',
  },
];

const VALID = new Set(ROUTES.map((route) => route.path));

function parseHash(): RoutePath {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return (VALID.has(raw as RoutePath) ? raw : 'dashboard') as RoutePath;
}

export function useRoute() {
  const [path, setPath] = useState<RoutePath>(parseHash);

  useEffect(() => {
    const onChange = () => {
      setPath(parseHash());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) window.history.replaceState(null, '', '#/dashboard');
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: RoutePath) => {
    if (window.location.hash === `#/${next}`) {
      setPath(next);
      return;
    }
    window.location.hash = `#/${next}`;
  }, []);

  const route = ROUTES.find((item) => item.path === path) || ROUTES[0];
  return { path, route, navigate };
}
