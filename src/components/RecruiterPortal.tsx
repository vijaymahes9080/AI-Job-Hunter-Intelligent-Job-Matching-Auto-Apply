import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  UserCheck, 
  FileText, 
  Calendar, 
  Plus, 
  Zap, 
  CheckCircle2, 
  Award,
  DollarSign,
  MapPin
} from 'lucide-react';
import type { RecruiterCandidate, Job } from '../types';
import { RECRUITER_CANDIDATES } from '../data/mockData';

interface RecruiterPortalProps {
  onPostJob: (job: Job) => void;
}

export const RecruiterPortal: React.FC<RecruiterPortalProps> = ({ onPostJob }) => {
  const [candidates, setCandidates] = useState<RecruiterCandidate[]>(RECRUITER_CANDIDATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPostModal, setShowPostModal] = useState(false);

  // New Job state
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('Apex Technologies');
  const [newLocation, setNewLocation] = useState('Bengaluru / Remote');
  const [newSalaryMax, setNewSalaryMax] = useState(4000000);
  const [newSkills, setNewSkills] = useState('React, TypeScript, Python, OpenAI API');

  const filteredCandidates = candidates.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.skills.some(s => s.toLowerCase().includes(q));
  });

  const handleCreateJob = () => {
    if (!newTitle.trim()) return;
    const created: Job = {
      id: `job-rec-${Date.now()}`,
      title: newTitle,
      company: newCompany,
      companyRating: 4.8,
      companyLogo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=120&q=80',
      location: newLocation,
      workplaceType: 'Remote',
      jobType: 'Full-Time',
      companyType: 'Startup',
      salaryMin: 2800000,
      salaryMax: newSalaryMax,
      salaryCurrency: 'INR',
      experienceMin: 3,
      experienceMax: 6,
      skillsRequired: newSkills.split(',').map(s => s.trim()),
      educationRequired: 'Bachelor in CS / Engineering',
      description: `Direct posting from Recruiter Dashboard for ${newTitle}.`,
      benefits: ['Remote Work', 'Health Insurance', 'Equity ESOPs'],
      applyUrl: 'https://linkedin.com',
      sourcePortal: 'LinkedIn',
      postedTime: 'Just now',
      deadline: '2026-09-15'
    };

    onPostJob(created);
    setShowPostModal(false);
    setNewTitle('');
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 gradient-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="glass-pill text-cyan-400 border-cyan-500/40 text-xs font-bold">
              Recruiter & Hiring Portal
            </span>
            <span className="text-xs text-slate-400">Enterprise Tenant Hub</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-1">AI Candidate Match & Sourcing Center</h2>
          <p className="text-xs text-slate-300">
            Source top talent, review AI similarity rankings, and post new openings to candidate feeds.
          </p>
        </div>

        <button
          onClick={() => setShowPostModal(true)}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Post New Job Opening</span>
        </button>
      </div>

      {/* Candidate Pool Search & List */}
      <div className="glass-panel p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Top AI-Matched Candidate Profiles ({filteredCandidates.length})
          </h3>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate skills or title..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Candidates Cards */}
        <div className="space-y-4">
          {filteredCandidates.map(cand => (
            <div key={cand.id} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-500/40 transition-all">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-base text-white">{cand.name}</h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    {cand.matchScore}% Candidate Match
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-300">{cand.title} • {cand.location}</p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cand.skills.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded bg-slate-900 text-indigo-300 text-[11px] font-medium border border-slate-800">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right text-xs text-slate-400 hidden sm:block">
                  <div>Expectation: <span className="text-emerald-400 font-bold">{cand.salaryExpectation}</span></div>
                  <div>Notice: <span className="text-slate-200">{cand.noticePeriod}</span></div>
                </div>

                <button
                  onClick={() => alert(`Interview invite dispatched to ${cand.name}!`)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule Interview</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Post Job Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-lg p-6 relative border-indigo-500/40">
            <h3 className="text-lg font-bold text-white mb-4">Post Job Opening to Multi-Portal Network</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Job Title</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  placeholder="e.g. Lead AI Engineer"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white" 
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Max Salary (INR PA)</label>
                <input 
                  type="number" 
                  value={newSalaryMax} 
                  onChange={(e) => setNewSalaryMax(parseInt(e.target.value) || 0)} 
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white" 
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Required Skills (Comma separated)</label>
                <input 
                  type="text" 
                  value={newSkills} 
                  onChange={(e) => setNewSkills(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white" 
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button 
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateJob}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Publish Opening
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
