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

import type { Job, CandidateProfile, ApplicationItem, NotificationItem, AIModelConfig, ApplicationStatus, UserRole, SubscriptionTier } from './types';
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

  // Modals state
  const [selectedJobModal, setSelectedJobModal] = useState<Job | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [quickWizardOpen, setQuickWizardOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);

  // Initialize and compute AI match scores for jobs on profile change
  useEffect(() => {
    const rawJobs = loadJobs();
    const scoredJobs = rawJobs.map(job => ({
      ...job,
      matchScore: calculateJobMatch(profile, job)
    })).sort((a, b) => (b.matchScore?.overallPercentage || 0) - (a.matchScore?.overallPercentage || 0));

    setJobs(scoredJobs);
  }, [profile]);

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

            {activeTab === 'cover-letter' && (
              <AICoverLetterStudio 
                jobs={jobs}
                profile={profile}
                initialJob={selectedJobModal}
              />
            )}

            {activeTab === 'applications' && (
              <ApplicationTracker 
                applications={applications}
                onUpdateStatus={handleUpdateAppStatus}
              />
            )}

            {activeTab === 'ai-assistant' && (
              <AIChatAssistant 
                jobs={jobs}
                profile={profile}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsView 
                applications={applications}
                jobs={jobs}
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
    </div>
  );
}
