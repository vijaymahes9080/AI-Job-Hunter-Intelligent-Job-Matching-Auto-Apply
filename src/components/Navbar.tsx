import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  User,
  CheckCircle2,
  Bell,
  Bot,
  BarChart3,
  ShieldCheck,
  Zap,
  Sliders,
  UserCheck,
  Globe,
  ChevronDown
} from 'lucide-react';
import type { CandidateProfile, NotificationItem, UserRole, SubscriptionTier } from '../types';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
}

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: CandidateProfile;
  notifications: NotificationItem[];
  unreadCount: number;
  role: UserRole;
  setRole: (r: UserRole) => void;
  subscriptionTier: SubscriptionTier;
  aiCredits: number;
  simpleMode: boolean;
  setSimpleMode: (sm: boolean) => void;
  onOpenAuth: () => void;
  onOpenSubscription: () => void;
  onOpenWizard: () => void;
  onMarkNotificationsRead: () => void;
  onOpenChromeExtension: () => void;
  onOpenPortalConnect?: () => void;
  onOpenPassiveReview?: () => void;
  autoPilotActive: boolean;
  setAutoPilotActive: (ap: boolean) => void;
  submittedCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  notifications,
  unreadCount,
  role,
  setRole,
  subscriptionTier,
  aiCredits,
  simpleMode,
  setSimpleMode,
  onOpenAuth,
  onOpenSubscription,
  onMarkNotificationsRead,
  onOpenChromeExtension,
  onOpenPortalConnect,
  onOpenPassiveReview,
  autoPilotActive,
  setAutoPilotActive,
  submittedCount = 0
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const jobSeekerNav: NavItem[] = [
    { id: 'dashboard',    label: 'Dashboard',        icon: BarChart3    },
    { id: 'jobs',         label: 'Real-Time Jobs',   icon: Search,  badge: '9' },
    { id: 'profile',      label: 'Profile',          icon: User         },
    { id: 'auto-apply',   label: 'Auto-Apply',       icon: CheckCircle2 },
    { id: 'applications', label: 'Review Log',       icon: Briefcase    },
  ];

  const recruiterNav: NavItem[] = [
    { id: 'recruiter',  label: 'Candidate Sourcing', icon: UserCheck },
    { id: 'jobs',       label: 'Active Openings',    icon: Search    },
    { id: 'analytics',  label: 'Hiring Analytics',   icon: BarChart3 },
  ];

  const adminNav: NavItem[] = [
    { id: 'admin',     label: 'System Admin',        icon: ShieldCheck },
    { id: 'analytics', label: 'Platform Analytics',  icon: BarChart3   },
  ];

  const navItems =
    role === 'JobSeeker' ? jobSeekerNav :
    role === 'Recruiter' ? recruiterNav : adminNav;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 flex items-center justify-between h-16 gap-4">

        {/* ── Brand ── */}
        <div
          onClick={() => setActiveTab(role === 'Recruiter' ? 'recruiter' : role === 'Admin' ? 'admin' : 'dashboard')}
          className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="font-extrabold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors leading-none">
              AI Job Hunter
            </span>
            <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
              Multi-Portal Match & Auto Apply
            </p>
          </div>
        </div>

        {/* ── Navigation Tabs (centre) ── */}
        <nav className="hidden lg:flex items-center gap-0.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Right Controls ── */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Auto-Pilot toggle */}
          <button
            onClick={() => setAutoPilotActive(!autoPilotActive)}
            title="Auto-Pilot: AI scouts and applies to matching jobs automatically while you are away."
            className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              autoPilotActive
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20'
                : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Bot className={`w-3.5 h-3.5 ${autoPilotActive ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
            <span>{autoPilotActive ? 'Auto-Pilot ON' : 'Pilot OFF'}</span>
          </button>

          {/* Simple Mode toggle */}
          <button
            onClick={() => setSimpleMode(!simpleMode)}
            title="Toggle Simple Plain-English Mode vs Pro Expert Mode"
            className={`hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              simpleMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>{simpleMode ? 'Simple' : 'Pro'}</span>
          </button>

          {/* AI Credits */}
          <button
            onClick={onOpenSubscription}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 text-xs font-bold text-slate-200 transition-colors"
            title="AI Credits & Subscription"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span className="text-indigo-400">{aiCredits}</span>
            <span className="text-slate-500 hidden lg:inline">Credits</span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] uppercase font-extrabold leading-none">
              {subscriptionTier}
            </span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
                if (!showNotifications) onMarkNotificationsRead();
              }}
              className="relative p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-lg shadow-rose-500/40 animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-panel p-4 z-50 shadow-2xl border border-slate-700/80">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-bold text-sm text-white">Notifications</h4>
                  </div>
                  <button className="text-xs text-indigo-400 font-semibold hover:text-indigo-300" onClick={() => setShowNotifications(false)}>
                    Close
                  </button>
                </div>
                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => { if (n.jobId) setActiveTab('jobs'); setShowNotifications(false); }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                          n.read
                            ? 'bg-slate-900/50 border-slate-800/60 text-slate-400'
                            : 'bg-slate-800/80 border-indigo-500/30 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1 text-slate-200">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{n.timestamp}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-400">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar + Menu */}
          <div className="relative">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-colors"
            >
              <img
                src={profile.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                alt={profile.name}
                className="w-7 h-7 rounded-lg object-cover ring-2 ring-indigo-500/30"
              />
              <span className="hidden sm:block text-xs font-bold text-slate-200 max-w-[90px] truncate">
                {profile.name}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-56 glass-panel p-3 z-50 shadow-2xl border border-slate-700/80 space-y-1">
                <div className="px-2 pb-2 mb-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-white">{profile.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{profile.email || 'candidate@jobhunter.io'}</p>
                </div>

                {/* Role switcher inside user menu */}
                <div className="px-2 py-1">
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-1.5 tracking-wider">Switch Role</p>
                  {(['JobSeeker', 'Recruiter', 'Admin'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => {
                        setRole(r);
                        if (r === 'Recruiter') setActiveTab('recruiter');
                        else if (r === 'Admin') setActiveTab('admin');
                        else setActiveTab('dashboard');
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-left text-xs px-2.5 py-2 rounded-lg flex items-center gap-2 transition-colors mb-0.5 ${
                        role === r
                          ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <span>{r === 'JobSeeker' ? '👤' : r === 'Recruiter' ? '🏢' : '⚙️'}</span>
                      <span>{r === 'JobSeeker' ? 'Job Seeker' : r}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-800 pt-2 mt-1">
                  {onOpenPortalConnect && (
                    <button
                      onClick={() => { onOpenPortalConnect(); setShowUserMenu(false); }}
                      className="w-full text-left text-xs px-2.5 py-2 rounded-lg flex items-center gap-2 text-purple-300 hover:bg-purple-600/10 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Link Job Portals
                    </button>
                  )}
                  <button
                    onClick={() => { setShowUserMenu(false); setActiveTab('profile'); }}
                    className="w-full text-left text-xs px-2.5 py-2 rounded-lg flex items-center gap-2 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    Edit Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <div className="lg:hidden flex items-center justify-around bg-slate-950/95 border-t border-slate-800/80 px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span className="leading-none">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
