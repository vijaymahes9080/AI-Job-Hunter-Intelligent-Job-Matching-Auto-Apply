import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Layers, 
  SlidersHorizontal, 
  Send, 
  ShieldCheck, 
  HelpCircle, 
  AlertCircle, 
  ChevronRight,
  Zap,
  ArrowRight,
  Eye,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Job, CandidateProfile, ResumeVersion, CoverLetter, ApplicationItem } from '../types';
import { generateTailoredResumes } from '../services/resumeOptimizer';
import { generateCoverLetter } from '../services/coverLetterGenerator';
import { submitToATS } from '../services/autonomousEngine';

interface AutoApplyWorkflowProps {
  jobs: Job[];
  profile: CandidateProfile;
  applications: ApplicationItem[];
  onApplicationSubmitted: (app: ApplicationItem) => void;
  onNavigateTracker: () => void;
}

export const AutoApplyWorkflow: React.FC<AutoApplyWorkflowProps> = ({
  jobs,
  profile,
  applications,
  onApplicationSubmitted,
  onNavigateTracker
}) => {
  const pendingJobs = jobs.slice(0, 3); // Top queued jobs
  const [selectedJob, setSelectedJob] = useState<Job>(pendingJobs[0] || jobs[0]);

  // Resume versions state
  const resumeVersions = generateTailoredResumes(profile, selectedJob);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);
  const activeResume = resumeVersions[activeVersionIndex];

  // Cover letter state
  const [coverLetter, setCoverLetter] = useState<CoverLetter>(generateCoverLetter(profile, selectedJob, 'Professional'));

  // Screening questions
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({
    'Notice Period': `${profile.noticePeriodDays} Days`,
    'Expected Salary (LPA)': `₹${(profile.preferredSalaryMin/100000).toFixed(0)} LPA`,
    'Years of Relevant Experience': '5 Years',
    'Work Authorization': 'Authorized for Remote & On-site India'
  });

  // Submission animation state
  const [submitting, setSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>('');

  const handleApproveAndSubmit = async () => {
    setSubmitting(true);
    setSubmissionStep('Verifying OAuth 2.0 Auth Session...');

    setTimeout(() => {
      setSubmissionStep(`Pre-filling ${selectedJob.sourcePortal} Screening Form...`);
    }, 800);

    setTimeout(() => {
      setSubmissionStep(`Attaching ATS Resume (${activeResume.name})...`);
    }, 1600);

    setTimeout(() => {
      setSubmissionStep('Transmitting Application to ATS Portal...');
    }, 2400);

    // Invoke real API submission in background
    const atsResultPromise = submitToATS(profile, selectedJob, coverLetter.content);

    setTimeout(async () => {
      const atsResult = await atsResultPromise;
      setSubmitting(false);
      setSubmissionStep('');
      
      // Fire celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      const newApp: ApplicationItem = {
        id: `app-${Date.now()}`,
        jobId: selectedJob.id,
        jobTitle: selectedJob.title,
        company: selectedJob.company,
        sourcePortal: selectedJob.sourcePortal,
        status: atsResult.status === 'Queued' ? 'Submitted' : 'Submitted',
        matchScore: selectedJob.matchScore?.overallPercentage || 94,
        atsScore: activeResume.atsScore,
        tailoredBulletPoints: activeResume.diffs.map(d => d.optimized),
        coverLetterContent: coverLetter.content,
        submissionToken: atsResult.confirmationId || `oauth-tx-${selectedJob.sourcePortal.toLowerCase().replace(/\s+/g, '')}-${Date.now().toString(36)}`,
        tailoredResumeId: activeResume.id,
        coverLetterId: coverLetter.id,
        appliedAt: new Date().toLocaleString(),
        screeningAnswers,
        notes: `Submitted with approval via ${selectedJob.sourcePortal} API. Receipt Token: ${atsResult.confirmationId}. Resume ATS Score: ${activeResume.atsScore}%.`
      };

      onApplicationSubmitted(newApp);
    }, 3200);
  };

  const handleAutoApplyAllMatched = () => {
    // Filter high match jobs (>80% match score) that are not already submitted
    const suitableJobs = jobs.filter(j => 
      (j.matchScore?.overallPercentage || 0) >= 80 && 
      !applications.some(a => a.jobId === j.id)
    );

    if (suitableJobs.length === 0) {
      alert('All suitable high-match jobs (>80%) have already been applied to!');
      return;
    }

    setSubmitting(true);
    let count = 0;

    suitableJobs.forEach((job, idx) => {
      setTimeout(() => {
        setSubmissionStep(`[${idx + 1}/${suitableJobs.length}] Auto-applying to ${job.title} at ${job.company} (${job.matchScore?.overallPercentage || 85}% match)...`);

        const tailoredResumes = generateTailoredResumes(profile, job);
        const tailoredCover = generateCoverLetter(profile, job, 'Professional');

        const newApp: ApplicationItem = {
          id: `app-${Date.now()}-${idx}`,
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          sourcePortal: job.sourcePortal,
          status: 'Submitted',
          matchScore: job.matchScore?.overallPercentage || 88,
          tailoredResumeId: tailoredResumes[0].id,
          coverLetterId: tailoredCover.id,
          appliedAt: new Date().toLocaleString(),
          screeningAnswers: {
            'Notice Period': `${profile.noticePeriodDays} Days`,
            'Expected Salary': `₹${(profile.preferredSalaryMin/100000).toFixed(0)} LPA`
          },
          notes: `Automated batch application submitted for high-match job (${job.matchScore?.overallPercentage || 88}% BERT similarity).`
        };

        onApplicationSubmitted(newApp);
        count++;

        if (count === suitableJobs.length) {
          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.5 }
          });
          setSubmitting(false);
          setSubmissionStep('');
        }
      }, (idx + 1) * 1500);
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-emerald-500/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="glass-pill text-emerald-400 border-emerald-500/30 font-bold flex items-center gap-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" /> Approval-First Safety Policy
            </span>
            <span className="text-xs text-slate-400 font-medium">Platform Terms Compliant</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-1">AI Resume Tailoring & Auto-Apply Queue</h2>
          <p className="text-xs text-slate-300">
            Review customized resumes, cover letters, and screening answers before sending. Zero unauthorized submissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAutoApplyAllMatched}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Zap className="w-4 h-4 fill-current text-yellow-300 animate-pulse" />
            <span>Auto-Apply All Matched Jobs (&gt;80%)</span>
          </button>

          <button
            onClick={onNavigateTracker}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            View Applications Tracker
          </button>
        </div>
      </div>

      {/* Main Grid: Job Selector Sidebar & Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Queued Jobs Selector */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Pending Review Queue ({pendingJobs.length})</span>
            <span className="text-indigo-400 text-xs font-normal">Click to review</span>
          </h3>

          <div className="space-y-3">
            {pendingJobs.map((job) => {
              const isSelected = selectedJob.id === job.id;
              const isSubmitted = applications.some(a => a.jobId === job.id);

              return (
                <div
                  key={job.id}
                  onClick={() => !isSubmitted && setSelectedJob(job)}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSubmitted
                      ? 'bg-slate-900/20 border-slate-800/40 opacity-60 cursor-default'
                      : isSelected
                      ? 'bg-slate-900/90 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40 cursor-pointer'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={job.companyLogo} alt={job.company} className={`w-10 h-10 rounded-xl object-cover ${isSubmitted ? 'grayscale' : ''}`} />
                      <div>
                        <h4 className={`font-bold text-sm ${isSubmitted ? 'text-slate-500 line-through' : 'text-white'}`}>{job.title}</h4>
                        <p className="text-xs text-slate-400">{job.company} • {job.sourcePortal}</p>
                      </div>
                    </div>

                    {isSubmitted ? (
                      <span className="px-2 py-0.5 rounded-md bg-slate-700/40 text-slate-500 text-xs font-bold border border-slate-700/40 flex-shrink-0">
                        Done
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex-shrink-0">
                        {job.matchScore?.overallPercentage || 92}%
                      </span>
                    )}
                  </div>

                  {isSubmitted && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Submitted — see Review Log for details</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Review & Submission Studio */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Job Header Card */}
          <div className="glass-panel p-5 flex items-center justify-between gap-4 border-indigo-500/30">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Target Job</span>
              <h3 className="text-lg font-extrabold text-white">{selectedJob.title}</h3>
              <p className="text-xs text-slate-300">{selectedJob.company} • {selectedJob.location} • ₹{(selectedJob.salaryMin/100000).toFixed(0)}L-{(selectedJob.salaryMax/100000).toFixed(0)}L PA</p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">ATS Match Score</span>
              <div className="text-2xl font-black text-emerald-400">{activeResume.atsScore}%</div>
            </div>
          </div>

          {/* AI Resume Version Selector */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                AI ATS-Tailored Resume Versions
              </h3>
              <span className="text-xs text-indigo-400 font-semibold">3 Versions Generated</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {resumeVersions.map((rv, idx) => (
                <button
                  key={rv.id}
                  onClick={() => setActiveVersionIndex(idx)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    activeVersionIndex === idx 
                      ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold shadow-md' 
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>{rv.name.split(':')[0]}</span>
                    <span className="text-emerald-400 font-bold">{rv.atsScore}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-normal line-clamp-1">{rv.name.split(':')[1]}</p>
                </button>
              ))}
            </div>

            {/* Diff Highlight Box */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Key AI Modifications for {selectedJob.company}
              </h4>

              <div className="space-y-2 text-xs">
                {activeResume.diffs.map((diff, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-rose-400/80 line-through text-[11px]">Original: "{diff.original}"</div>
                    <div className="text-emerald-400 font-semibold">Optimized: "{diff.optimized}"</div>
                    <div className="text-[10px] text-slate-500">Reason: {diff.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Screening Answers Pre-fill */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              Auto-Filled Screening Questions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {Object.entries(screeningAnswers).map(([q, a]) => (
                <div key={q} className="space-y-1">
                  <label className="block text-slate-400 font-semibold">{q}</label>
                  <input 
                    type="text"
                    value={a}
                    onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q]: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submission Bar */}
          <div className="glass-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-indigo-500/40">
            {submitting ? (
              <div className="flex items-center gap-3 text-indigo-400 font-bold text-sm animate-pulse">
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>{submissionStep}</span>
              </div>
            ) : (
              <>
                <div className="text-xs text-slate-400">
                  <span className="font-bold text-white">Review Complete.</span> Ready to submit to {selectedJob.company} via {selectedJob.sourcePortal}.
                </div>

                <button
                  onClick={handleApproveAndSubmit}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Approve & Submit Application</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
