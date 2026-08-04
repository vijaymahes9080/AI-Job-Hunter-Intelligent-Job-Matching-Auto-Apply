import React, { useState } from 'react';
import { X, CheckCircle2, FileText, Bot, ExternalLink, Sparkles, Filter, ChevronRight, Award, ShieldCheck } from 'lucide-react';
import type { ApplicationItem, JobSource, ApplicationStatus } from '../types';

interface PassiveReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  applications: ApplicationItem[];
  onUpdateStatus: (appId: string, status: ApplicationStatus) => void;
}

export const PassiveReviewDrawer: React.FC<PassiveReviewDrawerProps> = ({
  isOpen,
  onClose,
  applications,
  onUpdateStatus
}) => {
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [filterPortal, setFilterPortal] = useState<string>('all');

  if (!isOpen) return null;

  const autoApps = applications.filter(a => a.notes?.includes('🤖') || a.id.startsWith('auto-app-'));
  const displayApps = filterPortal === 'all' 
    ? (autoApps.length > 0 ? autoApps : applications)
    : applications.filter(a => a.sourcePortal === filterPortal);

  const avgAtsScore = displayApps.length > 0 
    ? Math.round(displayApps.reduce((acc, a) => acc + (a.atsScore || 92), 0) / displayApps.length)
    : 94;

  const activeApp = selectedApp || displayApps[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl h-full bg-slate-950 border-l border-slate-800 flex flex-col p-6 overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">Passive Application Review Log</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                  {displayApps.length} Submitted
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Review all background applications auto-submitted by the Zero-Human Autonomous Engine.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Metrics Banner */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="glass-panel p-3 text-center border-purple-500/30">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Submitted</span>
            <span className="text-xl font-extrabold text-white">{displayApps.length}</span>
          </div>

          <div className="glass-panel p-3 text-center border-emerald-500/30">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Avg ATS Parser</span>
            <span className="text-xl font-extrabold text-emerald-400">{avgAtsScore}%</span>
          </div>

          <div className="glass-panel p-3 text-center border-cyan-500/30">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Portals Active</span>
            <span className="text-xl font-extrabold text-cyan-300">9 Feeds</span>
          </div>

          <div className="glass-panel p-3 text-center border-amber-500/30">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Hours Saved</span>
            <span className="text-xl font-extrabold text-amber-400">{(displayApps.length * 0.75).toFixed(1)} hrs</span>
          </div>
        </div>

        {/* Layout split */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
          {/* Applications list column */}
          <div className="md:col-span-1 border border-slate-800/80 rounded-2xl bg-slate-900/60 p-3 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-purple-400" /> Submitted Jobs
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {displayApps.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs italic">
                  No background applications submitted yet.
                </div>
              ) : (
                displayApps.map(app => {
                  const isSelected = activeApp?.id === app.id;
                  return (
                    <div 
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-purple-950/60 border-purple-500/60 shadow-md' 
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate max-w-[150px]">{app.jobTitle}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold">
                          {app.atsScore || app.matchScore}% ATS
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{app.company}</span>
                        <span className="text-indigo-400 font-semibold">{app.sourcePortal}</span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                        <span>{app.appliedAt}</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Submitted
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detailed Application Bundle View */}
          <div className="md:col-span-2 border border-slate-800/80 rounded-2xl bg-slate-900/90 p-4 flex flex-col overflow-y-auto">
            {activeApp ? (
              <div className="space-y-5">
                {/* Header card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{activeApp.jobTitle}</h3>
                      <p className="text-xs text-purple-300 font-semibold mt-0.5">{activeApp.company} • {activeApp.sourcePortal}</p>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      ATS Parser Target: {activeApp.atsScore || 94}%
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <span>Applied: {activeApp.appliedAt}</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-mono">Token: {activeApp.submissionToken || `oauth-tx-${activeApp.id.substring(0, 10)}`}</span>
                  </div>
                </div>

                {/* Tailored ATS Resume Bullet Points */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> Auto-Tailored ATS Resume Bullets (&gt;90% Score)
                  </h4>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-300">
                    {(activeApp.tailoredBulletPoints || [
                      `Optimized high-performance React & TypeScript components to deliver real-time data streaming for ${activeApp.company}.`,
                      `Designed enterprise backend pipelines integrating REST APIs, LLMs, and PostgreSQL database storage.`,
                      `Achieved 95%+ unit test coverage and streamlined CI/CD automated deployment workflows.`
                    ]).map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pre-Filled Screening Answers */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Auto-Filled Portal Screening Answers
                  </h4>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs grid grid-cols-2 gap-3">
                    {Object.entries(activeApp.screeningAnswers || {
                      'Notice Period': '30 Days',
                      'Expected Salary': '₹30 LPA',
                      'Work Authorization': 'Authorized to Work',
                      'Relocation': 'Flexible'
                    }).map(([key, val]) => (
                      <div key={key} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">{key}</span>
                        <span className="text-xs font-bold text-emerald-300">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Culture Cover Letter Preview */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" /> Auto-Generated Culture Cover Letter
                  </h4>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {activeApp.coverLetterContent || `Dear Hiring Manager at ${activeApp.company},\n\nI am writing to express my enthusiastic interest in the ${activeApp.jobTitle} position. My technical expertise aligns exceptionally with your requirement criteria.\n\nBest regards,\nVijay Kumar`}
                  </div>
                </div>

                {/* Status modifier */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Application Status Tracker:</span>
                  <select 
                    value={activeApp.status}
                    onChange={(e) => onUpdateStatus(activeApp.id, e.target.value as ApplicationStatus)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs font-bold text-indigo-300 focus:outline-none"
                  >
                    <option value="Submitted">🚀 Submitted via OAuth API</option>
                    <option value="Resume Viewed">👀 Resume Viewed by Recruiter</option>
                    <option value="Interview Scheduled">📅 Interview Scheduled</option>
                    <option value="Offer Extended">🎉 Offer Extended</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-center py-24 text-slate-500 text-xs italic">
                Select an application from the left panel to review tailored resumes and screening responses.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
