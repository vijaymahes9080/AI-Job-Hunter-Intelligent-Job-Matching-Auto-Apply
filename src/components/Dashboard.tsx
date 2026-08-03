import React from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  Calendar, 
  Zap, 
  Award, 
  Search, 
  ArrowUpRight, 
  Sparkles,
  BookOpen,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import type { Job, ApplicationItem, CandidateProfile } from '../types';
import { RECOMMENDED_COURSES } from '../data/mockData';

interface DashboardProps {
  jobs: Job[];
  applications: ApplicationItem[];
  profile: CandidateProfile;
  simpleMode: boolean;
  onSelectJob: (job: Job) => void;
  onNavigateTab: (tab: string) => void;
  onOpenWizard: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  jobs,
  applications,
  profile,
  simpleMode,
  onSelectJob,
  onNavigateTab,
  onOpenWizard
}) => {
  // KPI Metrics
  const appsToday = applications.filter(a => a.appliedAt.includes('2026-08-03') || a.appliedAt.includes('2026-08-02')).length + 2;
  const appsWeek = applications.length + 5;
  const interviewsCount = applications.filter(a => a.status === 'Interview Scheduled').length;
  const avgMatchScore = Math.round(
    jobs.slice(0, 5).reduce((acc, j) => acc + (j.matchScore?.overallPercentage || 90), 0) / 5
  );

  const topMatchJob = jobs[0];

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Hero Welcome Banner with 1-Click Quick Wizard Launcher */}
      <div className="glass-panel p-6 lg:p-8 relative overflow-hidden gradient-border">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="glass-pill text-indigo-400 border-indigo-500/30 flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                AI Match Engine Active
              </span>
              <span className="text-xs text-slate-400 font-medium">Synced with LinkedIn OAuth</span>
              {simpleMode && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  ✨ Simple Mode Active
                </span>
              )}
            </div>

            <h1 className="text-2xl lg:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="gradient-text">{profile.name}</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {simpleMode 
                ? 'AI Job Hunter automatically monitored 9 job sites for you. We found 4 great matching jobs ready for your 1-click approval!'
                : 'AI Job Hunter actively monitored 9 portals today. Found 4 high-match jobs (>90%) ready for your approval.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 1-Click Wizard Button for Non-Technical Users */}
            <button
              onClick={onOpenWizard}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-indigo-600 to-purple-600 hover:from-emerald-400 text-white font-extrabold text-sm shadow-xl shadow-indigo-500/30 transition-all hover:scale-105"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>1-Click Quick Setup Wizard</span>
            </button>

            <button
              onClick={() => onNavigateTab('jobs')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-white font-bold text-sm transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Browse Job Feed</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-panel p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Applied Today</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{appsToday}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center">+2</span>
          </div>
          <p className="text-[10px] text-slate-500">Goal: 5 / day</p>
        </div>

        <div className="glass-panel p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">This Week</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{appsWeek}</span>
            <span className="text-xs font-bold text-indigo-400 flex items-center">↑ 18%</span>
          </div>
          <p className="text-[10px] text-slate-500">Across 6 portals</p>
        </div>

        <div className="glass-panel p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Interviews</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-cyan-400">{interviewsCount + 1}</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Cognitive Flow AI</p>
        </div>

        <div className="glass-panel p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Response Rate</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">28.5%</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-[10px] text-slate-500">3x industry avg</p>
        </div>

        <div className="glass-panel p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Avg Match Score</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-400">{avgMatchScore}%</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-[10px] text-slate-500">BERT & FAISS Score</p>
        </div>

        <div className="glass-panel p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Top Match</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">96%</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-[10px] text-slate-400 truncate">Anthropic Systems</p>
        </div>
      </div>

      {/* Main Grid: Urgent AI Recommendation & Recent Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Top Match Banner & Job Feed Highlights */}
        <div className="lg:col-span-2 space-y-6">
          {topMatchJob && (
            <div className="glass-panel p-6 border-indigo-500/40 relative overflow-hidden bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950">
              <div className="flex items-center justify-between gap-4 mb-4">
                <span className="glass-pill bg-indigo-500/20 text-indigo-300 font-bold border-indigo-500/40 text-xs">
                  🔥 URGENT HIGH-MATCH JOB (96%)
                </span>
                <span className="text-xs text-slate-400 font-medium">Source: {topMatchJob.sourcePortal}</span>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <img 
                  src={topMatchJob.companyLogo} 
                  alt={topMatchJob.company}
                  className="w-14 h-14 rounded-xl object-cover ring-2 ring-indigo-500/30" 
                />
                <div>
                  <h3 className="text-xl font-bold text-white hover:text-indigo-300 transition-colors">
                    {topMatchJob.title}
                  </h3>
                  <p className="text-sm font-semibold text-slate-300">
                    {topMatchJob.company} • <span className="text-slate-400">{topMatchJob.location}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-medium">
                    <span className="text-emerald-400 font-bold">₹32L - ₹45L PA</span>
                    <span>•</span>
                    <span>{topMatchJob.workplaceType}</span>
                    <span>•</span>
                    <span>{topMatchJob.experienceMin}-{topMatchJob.experienceMax} yrs exp</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-4">
                {topMatchJob.description}
              </p>

              {/* Skills matched list */}
              <div className="flex flex-wrap items-center gap-1.5 mb-5">
                <span className="text-xs font-bold text-slate-400 mr-1">Matched Skills:</span>
                {topMatchJob.skillsRequired.slice(0, 5).map(skill => (
                  <span key={skill} className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold border border-indigo-500/30">
                    ✓ {skill}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => onSelectJob(topMatchJob)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  Inspect Match Breakdown <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigateTab('auto-apply')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20"
                >
                  Review Tailored Resume & Apply
                </button>
              </div>
            </div>
          )}

          {/* Aggregated Jobs Quick Feed */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Aggregated High-Match Jobs</h3>
                <p className="text-xs text-slate-400">Filtered by your LinkedIn preferences & resume skills</p>
              </div>
              <button
                onClick={() => onNavigateTab('jobs')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View All {jobs.length} Jobs <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {jobs.slice(1, 4).map(job => (
                <div 
                  key={job.id} 
                  onClick={() => onSelectJob(job)}
                  className="glass-panel-interactive p-4 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={job.companyLogo} 
                      alt={job.company}
                      className="w-10 h-10 rounded-lg object-cover" 
                    />
                    <div>
                      <h4 className="font-bold text-sm text-white hover:text-indigo-300">{job.title}</h4>
                      <p className="text-xs text-slate-400">{job.company} • {job.location} ({job.workplaceType})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        {job.matchScore?.overallPercentage || 92}% Match
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">{job.sourcePortal}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Application Pipeline & AI Upskill Recommendations */}
        <div className="space-y-6">
          {/* Application Pipeline Status */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Active Application Pipeline
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-300 font-medium">Pending Approval</span>
                <span className="font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10">2 Jobs</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-300 font-medium">Submitted Applications</span>
                <span className="font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10">8 Apps</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-300 font-medium">Interviews Scheduled</span>
                <span className="font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">1 Active</span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('applications')}
              className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-colors"
            >
              Open Application Kanban Tracker
            </button>
          </div>

          {/* AI Career & Skill Gap Recommendations */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white">AI Skill Recommendations</h3>
            </div>
            <p className="text-xs text-slate-400">
              Boost your match score for Lead AI roles from 92% to 98% by mastering these topics:
            </p>

            <div className="space-y-2.5">
              {RECOMMENDED_COURSES.map((course, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span>{course.title}</span>
                    <span className="text-[10px] text-cyan-400 font-bold">{course.matchRelevance}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Provider: {course.provider}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigateTab('ai-assistant')}
              className="w-full py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-bold text-indigo-300 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ask AI Career Coach</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
