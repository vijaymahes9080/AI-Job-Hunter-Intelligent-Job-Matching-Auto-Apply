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
  Layers,
  Sparkles,
  UserCheck,
  Sliders,
  Mic,
  Radio,
  ShieldAlert,
  Flame,
  DollarSign,
  Globe
} from 'lucide-react';
import type { CandidateProfile, NotificationItem, UserRole, SubscriptionTier } from '../types';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
  highlight?: boolean;
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
  onOpenWizard,
  onMarkNotificationsRead,
  onOpenChromeExtension,
  onOpenPortalConnect,
  onOpenPassiveReview,
  autoPilotActive,
  setAutoPilotActive,
  submittedCount = 0
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const jobSeekerNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'jobs', label: 'Real-Time Jobs', icon: Search, badge: '9 Portals' },
    { id: 'profile', label: 'Security & Profile', icon: User },
    { id: 'auto-apply', label: 'Auto-Apply Engine', icon: CheckCircle2, badge: 'Autonomous' },
    { id: 'applications', label: 'Review Log', icon: Briefcase },
  ];

  const recruiterNav: NavItem[] = [
    { id: 'recruiter', label: 'Candidate Sourcing', icon: UserCheck },
    { id: 'jobs', label: 'Active Openings', icon: Search },
    { id: 'analytics', label: 'Hiring Analytics', icon: BarChart3 },
  ];

  const adminNav: NavItem[] = [
    { id: 'admin', label: 'System Admin Center', icon: ShieldCheck },
    { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
  ];

  const navItems = role === 'JobSeeker' ? jobSeekerNav : role === 'Recruiter' ? recruiterNav : adminNav;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Quick Wizard */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setActiveTab(role === 'Recruiter' ? 'recruiter' : role === 'Admin' ? 'admin' : 'dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  AI Job Hunter
                </span>
                <span className="glass-pill text-[10px] uppercase font-bold tracking-wider text-indigo-400 border-indigo-500/30">
                  SaaS {role}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Multi-Portal Match & Auto Apply Platform
              </p>
            </div>
          </div>

          {/* 9-Portal Linker Modal Launcher */}
          {onOpenPortalConnect && (
            <button
              onClick={onOpenPortalConnect}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold text-xs border border-purple-500/40"
            >
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>Link 9 Portals</span>
            </button>
          )}

          {/* Passive Review Drawer Launcher */}
          {onOpenPassiveReview && (
            <button
              onClick={onOpenPassiveReview}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900/80 text-cyan-300 font-bold text-xs border border-indigo-500/40 relative"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>Passive Review</span>
              {submittedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[9px] font-extrabold">
                  {submittedCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20' 
                    : item.highlight
                    ? 'text-indigo-400 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Role Switcher & AI Credits & Controls */}
        <div className="flex items-center gap-3">
          {/* Autonomous Auto-Pilot Toggle */}
          <button
            onClick={() => setAutoPilotActive(!autoPilotActive)}
            title="When active, AI automatically scouts, tailors resumes, and applies to high-match jobs in the background while you are away."
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
              autoPilotActive
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20 animate-pulse'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>{autoPilotActive ? 'Auto-Pilot ON' : 'Auto-Pilot OFF'}</span>
          </button>

          {/* Simple Mode Toggle */}
          <button
            onClick={() => setSimpleMode(!simpleMode)}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              simpleMode 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Toggle Simple Plain-English Mode vs Pro Expert Mode"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>{simpleMode ? 'Simple Mode ON' : 'Pro Mode'}</span>
          </button>

          {/* AI Credit Counter */}
          <div 
            onClick={onOpenSubscription}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 cursor-pointer text-xs font-bold text-slate-200 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span className="text-indigo-400">{aiCredits}</span>
            <span className="text-slate-500 text-[10px]">Credits</span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] uppercase">
              {subscriptionTier}
            </span>
          </div>

          {/* SaaS Role Switcher */}
          <select
            value={role}
            onChange={(e) => {
              const newRole = e.target.value as UserRole;
              setRole(newRole);
              if (newRole === 'Recruiter') setActiveTab('recruiter');
              else if (newRole === 'Admin') setActiveTab('admin');
              else setActiveTab('dashboard');
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-xs font-bold text-indigo-300 focus:outline-none cursor-pointer"
          >
            <option value="JobSeeker">👤 Job Seeker</option>
            <option value="Recruiter">🏢 Recruiter</option>
            <option value="Admin">⚙️ Admin</option>
          </select>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) onMarkNotificationsRead();
              }}
              className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/50 animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-panel p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-bold text-sm text-white">Notifications</h4>
                  </div>
                  <span className="text-xs text-indigo-400 font-semibold cursor-pointer" onClick={() => setShowNotifications(false)}>
                    Close
                  </span>
                </div>
                <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        if (n.jobId) setActiveTab('jobs');
                        setShowNotifications(false);
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        n.read ? 'bg-slate-900/50 border-slate-800/60 text-slate-400' : 'bg-slate-800/80 border-indigo-500/40 text-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1 text-slate-200">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{n.timestamp}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div 
            onClick={onOpenAuth}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
          >
            <img 
              src={profile.profilePhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"} 
              alt={profile.name}
              className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-500/40"
            />
            <div className="hidden sm:block text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-200 leading-none">{profile.name}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                LinkedIn OAuth
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
