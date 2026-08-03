import React from 'react';
import { 
  X, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  MapPin, 
  DollarSign, 
  Briefcase, 
  Award, 
  Sparkles, 
  ExternalLink,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { Job, CandidateProfile } from '../types';

interface JobDetailModalProps {
  job: Job | null;
  profile: CandidateProfile;
  onClose: () => void;
  onQueueApply: (job: Job) => void;
  onGenerateCoverLetter: (job: Job) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  profile,
  onClose,
  onQueueApply,
  onGenerateCoverLetter
}) => {
  if (!job) return null;

  const match = job.matchScore || {
    overallPercentage: 92,
    matchingSkills: job.skillsRequired.slice(0, 4),
    missingSkills: job.skillsRequired.slice(4),
    experienceGap: 'Perfect match for seniority level.',
    salaryMatchScore: 95,
    locationMatchScore: 100,
    educationMatchScore: 100,
    certificationsMatchScore: 90,
    summary: 'High semantic relevance candidate profile.'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 lg:p-8 relative border-indigo-500/30">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 mb-6 pr-12">
          <img 
            src={job.companyLogo} 
            alt={job.company}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/30" 
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="glass-pill text-[11px] font-bold text-indigo-400 border-indigo-500/30">
                Source: {job.sourcePortal}
              </span>
              <span className="text-xs text-slate-400 font-medium">Posted {job.postedTime}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-1">{job.title}</h2>
            <p className="text-sm font-semibold text-slate-300">
              {job.company} • <span className="text-slate-400">{job.location} ({job.workplaceType})</span>
            </p>
          </div>
        </div>

        {/* AI Semantic Match Score Explanation Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/40 space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center font-extrabold text-2xl text-emerald-400 shadow-lg shadow-indigo-500/20">
                {match.overallPercentage}%
              </div>
              <div>
                <h4 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 fill-current" />
                  AI Semantic Match Explanation
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed mt-0.5 max-w-xl">
                  {match.summary}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onQueueApply(job);
                onClose();
              }}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-xl shadow-indigo-500/25 whitespace-nowrap"
            >
              Tailor Resume & Queue Apply
            </button>
          </div>

          {/* Granular Breakdown Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Skill Overlap</span>
              <div className="text-sm font-bold text-emerald-400">
                {match.matchingSkills.length}/{job.skillsRequired.length} Matched
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Experience Gap</span>
              <div className="text-xs font-bold text-slate-200 truncate">
                {match.experienceGap}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Salary Match</span>
              <div className="text-sm font-bold text-purple-400">
                {match.salaryMatchScore}% Compatible
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Location Score</span>
              <div className="text-sm font-bold text-cyan-400">
                {match.locationMatchScore}% Match
              </div>
            </div>
          </div>

          {/* Matching vs Missing Skills Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                ✔ Matching Candidate Skills ({match.matchingSkills.length})
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {match.matchingSkills.map(skill => (
                  <span key={skill} className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/40">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                ⚠ Skills to Highlight in Tailored Resume ({match.missingSkills.length})
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {match.missingSkills.map(skill => (
                  <span key={skill} className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/40">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Full Job Description & Requirements */}
        <div className="space-y-6 text-slate-300 text-sm">
          <div>
            <h4 className="font-bold text-base text-white mb-2">Job Description</h4>
            <p className="leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs sm:text-sm">
              {job.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-base text-white mb-2">Compensation & Experience</h4>
              <ul className="space-y-2 text-xs bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <li className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Salary Range: <strong>₹{(job.salaryMin/100000).toFixed(0)}L - ₹{(job.salaryMax/100000).toFixed(0)}L PA</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  <span>Experience Required: <strong>{job.experienceMin} to {job.experienceMax} Years</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  <span>Company Type: <strong>{job.companyType}</strong></span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-base text-white mb-2">Perks & Benefits</h4>
              <div className="flex flex-wrap gap-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                {job.benefits.map((b, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700">
                    ✨ {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-800">
          <a 
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4" />
            Open Portal Page ({job.sourcePortal})
          </a>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                onGenerateCoverLetter(job);
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-xs font-bold text-white transition-colors"
            >
              Generate AI Cover Letter
            </button>

            <button
              onClick={() => {
                onQueueApply(job);
                onClose();
              }}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20"
            >
              Review Tailored Resume & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
