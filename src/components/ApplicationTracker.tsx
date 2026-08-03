import React, { useState } from 'react';
import { 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Search, 
  Eye, 
  XCircle, 
  FileText, 
  MessageSquare, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { ApplicationItem, ApplicationStatus } from '../types';

interface ApplicationTrackerProps {
  applications: ApplicationItem[];
  onUpdateStatus: (appId: string, newStatus: ApplicationStatus) => void;
}

const ALL_STATUSES: ApplicationStatus[] = [
  'Saved', 'Pending Review', 'Submitted', 'Resume Viewed', 'Assessment', 'Interview Scheduled', 'Offer Extended', 'Rejected'
];

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({
  applications,
  onUpdateStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredApps = applications.filter(app => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return app.jobTitle.toLowerCase().includes(q) || app.company.toLowerCase().includes(q) || app.sourcePortal.toLowerCase().includes(q);
  });

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'Submitted': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'Resume Viewed': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Interview Scheduled': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse';
      case 'Offer Extended': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Rejected': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 gradient-border">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-400" />
            End-to-End Application Tracker
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Track submission receipts, recruiter resume views, and interview dates across all job portals.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter applications..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Kanban / Table Applications List */}
      <div className="space-y-3">
        {filteredApps.length === 0 ? (
          <div className="glass-panel p-12 text-center text-slate-400 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-slate-600" />
            <h4 className="font-bold text-white text-base">No submitted applications found</h4>
            <p className="text-xs">Applications submitted via the Auto-Apply Queue will automatically appear here.</p>
          </div>
        ) : (
          filteredApps.map(app => (
            <div 
              key={app.id} 
              className="glass-panel p-5 border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">{app.jobTitle}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusBadge(app.status)}`}>
                    {app.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {app.company} • <span className="text-slate-400">Portal: {app.sourcePortal}</span>
                </p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span>Applied: {app.appliedAt}</span>
                  <span>•</span>
                  <span className="text-indigo-400 font-semibold">Match Score: {app.matchScore}%</span>
                </div>
              </div>

              {/* Status Updater Dropdown & Interview Notice */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {app.interviewDate && (
                  <div className="p-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Interview: {app.interviewDate}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Update Status:</span>
                  <select
                    value={app.status}
                    onChange={(e) => onUpdateStatus(app.id, e.target.value as ApplicationStatus)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
