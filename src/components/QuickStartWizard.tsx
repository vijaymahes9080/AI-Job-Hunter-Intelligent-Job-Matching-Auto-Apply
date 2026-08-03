import React, { useState } from 'react';
import { 
  Sparkles, 
  Upload, 
  Search, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  Zap, 
  ShieldCheck, 
  Briefcase, 
  FileText,
  DollarSign,
  MapPin
} from 'lucide-react';
import type { CandidateProfile, Job } from '../types';
import { parseResumeFile } from '../services/resumeParser';

interface QuickStartWizardProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CandidateProfile;
  jobs: Job[];
  onSaveProfile: (updated: CandidateProfile) => void;
  onLaunchAutoApply: () => void;
}

export const QuickStartWizard: React.FC<QuickStartWizardProps> = ({
  isOpen,
  onClose,
  profile,
  jobs,
  onSaveProfile,
  onLaunchAutoApply
}) => {
  const [step, setStep] = useState<number>(1);
  const [targetRole, setTargetRole] = useState<string>('Senior React & AI Engineer');
  const [targetLocation, setTargetLocation] = useState<string>('Bengaluru / Remote');
  const [targetSalary, setTargetSalary] = useState<number>(3000000);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleStep1Complete = () => {
    setStep(2);
  };

  const handleStep2Complete = () => {
    setStep(3);
  };

  const handleLaunch = () => {
    setIsProcessing(true);
    // Update candidate profile preferences
    const updated = {
      ...profile,
      preferredRoles: [targetRole],
      preferredLocations: [targetLocation],
      preferredSalaryMin: targetSalary
    };
    onSaveProfile(updated);

    setTimeout(() => {
      setIsProcessing(false);
      onClose();
      onLaunchAutoApply();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-2xl p-6 lg:p-8 relative border-indigo-500/40 gradient-border">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Wizard Header Progress Bar */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="glass-pill text-indigo-400 border-indigo-500/40 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              Zero-Knowledge 1-Click Guided Setup
            </span>
            <span className="text-xs text-slate-400">Step {step} of 3</span>
          </div>

          <h2 className="text-2xl font-extrabold text-white">
            {step === 1 && 'Step 1: Connect Profile or Upload Resume'}
            {step === 2 && 'Step 2: What job are you looking for?'}
            {step === 3 && 'Step 3: Ready to Launch AI Job Hunter!'}
          </h2>

          {/* Stepper Dots */}
          <div className="flex items-center gap-2 pt-1">
            {[1, 2, 3].map(s => (
              <div 
                key={s} 
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step ? 'w-12 bg-indigo-500' : s < step ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Upload / Sync */}
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-xs text-slate-300 leading-relaxed">
              AI Job Hunter needs your basic background to find perfect matching jobs across 9 portals. Choose 1-click import or upload a PDF/DOCX resume file.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  onSaveProfile({ ...profile, linkedinSynced: true });
                  handleStep1Complete();
                }}
                className="p-5 rounded-2xl bg-[#0a66c2]/20 hover:bg-[#0a66c2]/30 border border-[#0a66c2]/50 text-left space-y-2 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#0a66c2] flex items-center justify-center text-white">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-indigo-300">1-Click LinkedIn Sync</h4>
                <p className="text-[11px] text-slate-300">Imports skills, work experience, and profile details instantly.</p>
              </button>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 relative text-left">
                <Upload className="w-8 h-8 text-indigo-400" />
                <h4 className="font-bold text-sm text-white">Upload PDF / DOCX Resume</h4>
                <p className="text-[11px] text-slate-400">Extracts skills automatically using client-side AI parser.</p>

                <input 
                  type="file" 
                  accept=".pdf,.docx,.txt"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const parsed = await parseResumeFile(file);
                      onSaveProfile({
                        ...profile,
                        skills: parsed.skillsExtracted,
                        resumeFileName: file.name
                      });
                      handleStep1Complete();
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleStep1Complete}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
              >
                <span>Continue to Step 2</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Preferences */}
        {step === 2 && (
          <div className="space-y-6">
            <p className="text-xs text-slate-300">
              Tell us your desired job title and target salary. Our AI will automatically filter the best matches across LinkedIn, Naukri, Indeed, and 6 other portals.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Role / Job Title</label>
                <input 
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g. Senior React Developer, AI Software Engineer..."
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Preferred Location</label>
                <input 
                  type="text"
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g. Bengaluru, Remote, Hyderabad..."
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Minimum CTC (Salary PA)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number"
                    value={targetSalary}
                    onChange={(e) => setTargetSalary(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium"
                  />
                  <span className="text-emerald-400 font-extrabold whitespace-nowrap text-sm">
                    = ₹{(targetSalary/100000).toFixed(0)} LPA
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300"
              >
                Back
              </button>

              <button
                onClick={handleStep2Complete}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
              >
                <span>Continue to Step 3</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Launch */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            {isProcessing ? (
              <div className="py-8 space-y-4">
                <Zap className="w-12 h-12 text-cyan-400 mx-auto animate-bounce" />
                <h3 className="text-lg font-bold text-white">AI Engine Match in Progress...</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Aggregating 9 portals, calculating BERT vector scores, tailoring ATS resumes, and generating cover letters...
                </p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-white">1-Click Automated Job Match Ready!</h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Click below to launch. The AI will find top matching jobs, customize your resume for ATS parsers, generate custom cover letters, and queue them for your 1-click approval.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-left space-y-2 max-w-md mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Role:</span>
                    <span className="font-bold text-white">{targetRole}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Location:</span>
                    <span className="font-bold text-white">{targetLocation}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Min CTC:</span>
                    <span className="font-bold text-emerald-400">₹{(targetSalary/100000).toFixed(0)} LPA</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleLaunch}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-indigo-600 to-purple-600 hover:from-emerald-400 text-white font-extrabold text-sm shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5 fill-current" />
                    <span>Launch 1-Click AI Auto-Hunter</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
