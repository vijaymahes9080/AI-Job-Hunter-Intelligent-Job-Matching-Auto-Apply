import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';
import { JobSearch } from './components/JobSearch';
import { JobDetailModal } from './components/JobDetailModal';
import { CandidateProfileView } from './components/CandidateProfile';
import { AutoApplyWorkflow } from './components/AutoApplyWorkflow';
import { AICoverLetterStudio } from './components/AICoverLetterStudio';
import { ApplicationTracker } from './components/ApplicationTracker';
import { AIChatAssistant } from './components/AIChatAssistant';
import { AnalyticsView } from './components/AnalyticsView';
import { AdminPanel } from './components/AdminPanel';
import { QuickStartWizard } from './components/QuickStartWizard';
import { RecruiterPortal } from './components/RecruiterPortal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AIInterviewSimulator } from './components/AIInterviewSimulator';
import { AgentScoutControl } from './components/AgentScoutControl';
import { ATSScoreAuditor } from './components/ATSScoreAuditor';
import { ContributionTracker } from './components/ContributionTracker';
import { ChromeExtensionModal } from './components/ChromeExtensionModal';
import { SalaryNegotiator } from './components/SalaryNegotiator';
import { PortalConnectModal } from './components/PortalConnectModal';
import { PassiveReviewDrawer } from './components/PassiveReviewDrawer';
import { OfflineBanner } from './components/OfflineBanner';

import type { Job, CandidateProfile, ApplicationItem, NotificationItem, AIModelConfig, ApplicationStatus, UserRole, SubscriptionTier, PortalAccount } from './types';
import { DEFAULT_PORTAL_ACCOUNTS } from './data/mockData';
import { runAutonomousPipelineForJob } from './services/autonomousEngine';
import { 
  loadProfile, 
  saveProfile, 
  loadJobs, 
  saveJobs, 
  loadApplications, 
  saveApplications, 
  loadNotifications, 
  saveNotifications, 
  loadAIConfig, 
  saveAIConfig 
} from './services/storage';
import { calculateJobMatch } from './services/aiMatchEngine';
import { searchRealtimeJobs, deduplicateAndMerge } from './services/realtimeJobSearch';
import { flushOfflineQueue, getQueueCount } from './services/offlineQueue';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [role, setRole] = useState<UserRole>('JobSeeker');
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('Pro');
  const [aiCredits, setAiCredits] = useState<number>(85);
  const [simpleMode, setSimpleMode] = useState<boolean>(true);

  const [profile, setProfile] = useState<CandidateProfile>(loadProfile());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>(loadApplications());
  const [notifications, setNotifications] = useState<NotificationItem[]>(loadNotifications());
  const [aiConfig, setAiConfig] = useState<AIModelConfig>(loadAIConfig());
  const [portalAccounts, setPortalAccounts] = useState<PortalAccount[]>(profile.linkedPortals || DEFAULT_PORTAL_ACCOUNTS);

  // Modals state
  const [selectedJobModal, setSelectedJobModal] = useState<Job | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [quickWizardOpen, setQuickWizardOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [chromeModalOpen, setChromeModalOpen] = useState(false);
  const [portalConnectOpen, setPortalConnectOpen] = useState(false);
  const [passiveReviewOpen, setPassiveReviewOpen] = useState(false);

  const [autoPilotActive, setAutoPilotActive] = useState<boolean>(true);

  const [queueCount, setQueueCount] = useState<number>(getQueueCount());

  // Initialize jobs and fetch live API feeds on mount / profile change
  useEffect(() => {
    const rawJobs = loadJobs();
    const scoredJobs = rawJobs.map(job => ({
      ...job,
      matchScore: calculateJobMatch(profile, job)
    })).sort((a, b) => (b.matchScore?.overallPercentage || 0) - (a.matchScore?.overallPercentage || 0));

    setJobs(scoredJobs);

    // Fetch real-time jobs from API proxy
    if (navigator.onLine) {
      searchRealtimeJobs(profile, { keywords: profile.headline || 'Software Engineer', location: profile.location || 'Remote', portals: [] })
        .then(liveJobs => {
          if (liveJobs.length > 0) {
            const scoredLive = liveJobs.map(j => ({ ...j, matchScore: calculateJobMatch(profile, j) }));
            setJobs(prev => {
              const merged = deduplicateAndMerge(prev, scoredLive);
              saveJobs(merged);
              return merged;
            });
          }
        })
        .catch(console.error);
    }
  }, [profile]);

  // Real-time 5-minute background polling engine
  useEffect(() => {
    const POLL_INTERVAL = 5 * 60 * 1000;
    const interval = setInterval(async () => {
      if (navigator.onLine && autoPilotActive) {
        try {
          const fresh = await searchRealtimeJobs(profile, { keywords: profile.headline || 'Software Engineer', location: profile.location || 'Remote', portals: [] });
          if (fresh.length > 0) {
            const scored = fresh.map(j => ({ ...j, matchScore: calculateJobMatch(profile, j) }));
            setJobs(prev => {
              const merged = deduplicateAndMerge(prev, scored);
              saveJobs(merged);
              return merged;
            });
          }
        } catch (e) {
          console.warn('[Background Poll] Failed:', e);
        }
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [autoPilotActive, profile]);

  // SSE (Server-Sent Events) live job match stream listener
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/jobs/stream');
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'new_jobs' && Array.isArray(payload.jobs)) {
            const scored = payload.jobs.map((j: Job) => ({ ...j, matchScore: calculateJobMatch(profile, j) }));
            setJobs(prev => deduplicateAndMerge(prev, scored));
          }
        } catch {}
      };
    } catch {}
    return () => {
      es?.close();
    };
  }, [profile]);

  // Flush offline queue when connection is restored
  const handleRetryOfflineQueue = async () => {
    const count = await flushOfflineQueue((item, success) => {
      if (success) {
        const notif: NotificationItem = {
          id: `notif-offline-${Date.now()}`,
          title: '⚡ Offline Application Synced',
          message: `Queued application for ${item.jobTitle} at ${item.company} was transmitted to ${item.portal}.`,
          type: 'status_change',
          timestamp: 'Just now',
          read: false
        };
        setNotifications(prev => [notif, ...prev]);
      }
    });
    setQueueCount(getQueueCount());
    if (count > 0) {
      alert(`Successfully synced ${count} queued application(s) to live portals!`);
    }
  };

  // Autonomous Zero-Intervention Background Auto-Apply Engine
  useEffect(() => {
    if (!autoPilotActive || jobs.length === 0) return;

    const timer = setTimeout(() => {
      // Find suitable unsubmitted jobs (>80% match score)
      const suitableJobs = jobs.filter(j => 
        (j.matchScore?.overallPercentage || 0) >= 80 && 
        !applications.some(a => a.jobId === j.id)
      );

      if (suitableJobs.length > 0) {
        const topJob = suitableJobs[0];
        const pipelineResult = runAutonomousPipelineForJob(profile, topJob, portalAccounts);
        const newApp = pipelineResult.application;

        const updatedApps = [newApp, ...applications];
        setApplications(updatedApps);
        saveApplications(updatedApps);

        const newNotif: NotificationItem = {
          id: `notif-auto-${Date.now()}`,
          title: `🤖 Auto-Submitted via ${topJob.sourcePortal}`,
          message: `Zero-human intervention: Tailored ATS resume (${pipelineResult.atsScore}% target score), cover letter & screening answers for ${topJob.title} at ${topJob.company}. Review in Passive Review Log anytime!`,
          type: 'high_match',
          timestamp: 'Just now',
          read: false,
          jobId: topJob.id
        };

        const updatedNotifs = [newNotif, ...notifications];
        setNotifications(updatedNotifs);
        saveNotifications(updatedNotifs);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [autoPilotActive, jobs, applications, profile, notifications, portalAccounts]);

  // Handlers
  const handleSaveProfile = (updated: CandidateProfile) => {
    setProfile(updated);
    saveProfile(updated);
  };

  const handleImportLinkedIn = (data: Partial<CandidateProfile>) => {
    const updated = { ...profile, ...data };
    setProfile(updated);
    saveProfile(updated);
  };

  const handlePostJobFromRecruiter = (newJob: Job) => {
    const updatedJobs = [newJob, ...jobs];
    setJobs(updatedJobs);
    saveJobs(updatedJobs);
  };

  const handleApplicationSubmitted = (newApp: ApplicationItem) => {
    const updatedApps = [newApp, ...applications];
    setApplications(updatedApps);
    saveApplications(updatedApps);

    // Deduct 1 AI Credit
    setAiCredits(prev => Math.max(0, prev - 1));

    // Add notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: '🚀 Application Submitted Successfully',
      message: `Your tailored application for ${newApp.jobTitle} at ${newApp.company} has been sent. Tracking enabled!`,
      type: 'status_change',
      timestamp: 'Just now',
      read: false,
      jobId: newApp.jobId
    };
    const updatedNotifs = [newNotif, ...notifications];
    setNotifications(updatedNotifs);
    saveNotifications(updatedNotifs);
  };

  const handleUpdateAppStatus = (appId: string, newStatus: ApplicationStatus) => {
    const updatedApps = applications.map(a => a.id === appId ? { ...a, status: newStatus } : a);
    setApplications(updatedApps);
    saveApplications(updatedApps);
  };

  const handleMarkNotificationsRead = () => {
    const readNotifs = notifications.map(n => ({ ...n, read: true }));
    setNotifications(readNotifs);
    saveNotifications(readNotifs);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Offline Status & Sync Banner */}
      <OfflineBanner queueCount={queueCount} onRetryQueue={handleRetryOfflineQueue} />

      {/* Top Header Navbar */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        notifications={notifications}
        unreadCount={unreadCount}
        role={role}
        setRole={setRole}
        subscriptionTier={subscriptionTier}
        aiCredits={aiCredits}
        simpleMode={simpleMode}
        setSimpleMode={setSimpleMode}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenSubscription={() => setSubscriptionModalOpen(true)}
        onOpenWizard={() => setQuickWizardOpen(true)}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onOpenChromeExtension={() => setChromeModalOpen(true)}
        onOpenPortalConnect={() => setPortalConnectOpen(true)}
        onOpenPassiveReview={() => setPassiveReviewOpen(true)}
        autoPilotActive={autoPilotActive}
        setAutoPilotActive={setAutoPilotActive}
        submittedCount={applications.length}
      />

      {/* Main Page Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {role === 'Recruiter' ? (
          <RecruiterPortal onPostJob={handlePostJobFromRecruiter} />
        ) : role === 'Admin' ? (
          <AdminPanel 
            config={aiConfig}
            onSaveConfig={(cfg) => {
              setAiConfig(cfg);
              saveAIConfig(cfg);
            }}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard 
                jobs={jobs}
                applications={applications}
                profile={profile}
                simpleMode={simpleMode}
                onSelectJob={(job) => setSelectedJobModal(job)}
                onNavigateTab={setActiveTab}
                onOpenWizard={() => setQuickWizardOpen(true)}
              />
            )}

            {activeTab === 'jobs' && (
              <JobSearch 
                jobs={jobs}
                onSelectJob={(job) => setSelectedJobModal(job)}
                onAddToAutoApply={(job) => {
                  setSelectedJobModal(null);
                  setActiveTab('auto-apply');
                }}
              />
            )}

            {activeTab === 'profile' && (
              <CandidateProfileView 
                profile={profile}
                onSaveProfile={handleSaveProfile}
                onOpenAuth={() => setAuthModalOpen(true)}
                onOpenPortalConnect={() => setPortalConnectOpen(true)}
              />
            )}

            {activeTab === 'auto-apply' && (
              <AutoApplyWorkflow 
                jobs={jobs}
                profile={profile}
                applications={applications}
                onApplicationSubmitted={handleApplicationSubmitted}
                onNavigateTracker={() => setActiveTab('applications')}
              />
            )}

            {activeTab === 'applications' && (
              <ApplicationTracker 
                applications={applications}
                onUpdateStatus={handleUpdateAppStatus}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">AI Job Hunter SaaS Platform</span>
            <span className="text-slate-400">• Intelligent Job Matching & Auto Apply</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>OAuth 2.0 Direct Auth</span>
            <span>•</span>
            <span>BERT & FAISS Vector Match</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Zero-Fee Online Mode</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <JobDetailModal 
        job={selectedJobModal}
        profile={profile}
        onClose={() => setSelectedJobModal(null)}
        onQueueApply={() => {
          setSelectedJobModal(null);
          setActiveTab('auto-apply');
        }}
        onGenerateCoverLetter={() => {
          setActiveTab('cover-letter');
        }}
      />

      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onImportLinkedIn={handleImportLinkedIn}
        currentProfile={profile}
      />

      <QuickStartWizard 
        isOpen={quickWizardOpen}
        onClose={() => setQuickWizardOpen(false)}
        profile={profile}
        jobs={jobs}
        onSaveProfile={handleSaveProfile}
        onLaunchAutoApply={() => setActiveTab('auto-apply')}
      />

      <SubscriptionModal 
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        currentTier={subscriptionTier}
        onSelectTier={(tier) => setSubscriptionTier(tier)}
      />

      <ChromeExtensionModal 
        isOpen={chromeModalOpen}
        onClose={() => setChromeModalOpen(false)}
      />

      <PortalConnectModal 
        isOpen={portalConnectOpen}
        onClose={() => setPortalConnectOpen(false)}
        portalAccounts={portalAccounts}
        onUpdatePortals={(updated) => {
          setPortalAccounts(updated);
          handleSaveProfile({ ...profile, linkedPortals: updated });
        }}
        onImportProfile={handleImportLinkedIn}
      />

      <PassiveReviewDrawer 
        isOpen={passiveReviewOpen}
        onClose={() => setPassiveReviewOpen(false)}
        applications={applications}
        onUpdateStatus={handleUpdateAppStatus}
      />
    </div>
  );
}

