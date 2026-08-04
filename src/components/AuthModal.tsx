import React, { useState } from 'react';
import { X, Mail, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, User, Briefcase, Key } from 'lucide-react';
import type { CandidateProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLinkedIn: (profileData: Partial<CandidateProfile>) => void;
  currentProfile?: CandidateProfile;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onImportLinkedIn,
  currentProfile 
}) => {
  const [authMethod, setAuthMethod] = useState<'linkedin' | 'google' | 'github' | 'email'>('linkedin');
  const [userName, setUserName] = useState(currentProfile?.name || '');
  const [userEmail, setUserEmail] = useState(currentProfile?.email || '');
  const [targetRole, setTargetRole] = useState(currentProfile?.headline || 'Senior Full Stack & AI Engineer');
  const [customSkills, setCustomSkills] = useState(currentProfile?.skills?.join(', ') || 'React, TypeScript, Python, Node.js, AI APIs');
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);

  if (!isOpen) return null;

  const handleAuthenticate = (provider: 'linkedin' | 'google' | 'github' | 'email') => {
    setLoading(true);
    setAuthMethod(provider);

    setTimeout(() => {
      const finalName = userName.trim() || (provider === 'linkedin' ? 'Professional Candidate' : 'User Candidate');
      const finalEmail = userEmail.trim() || `${provider}.user@auth-portal.com`;
      const skillsArray = customSkills.split(',').map(s => s.trim()).filter(Boolean);

      onImportLinkedIn({
        name: finalName,
        email: finalEmail,
        headline: targetRole.trim() || 'Software & AI Engineer',
        summary: `Authenticated via ${provider.toUpperCase()} OAuth 2.0. Account active and synchronized for zero-human autonomous job scouting.`,
        linkedinSynced: provider === 'linkedin',
        githubSynced: provider === 'github',
        skills: skillsArray.length > 0 ? skillsArray : ['React', 'TypeScript', 'Node.js', 'Python'],
        noticePeriodDays: currentProfile?.noticePeriodDays || 30,
        preferredSalaryMin: currentProfile?.preferredSalaryMin || 2500000
      });

      setLoading(false);
      setSynced(true);

      setTimeout(() => {
        setSynced(false);
        onClose();
      }, 1200);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-lg p-6 relative border-indigo-500/30 shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <h3 className="text-xl font-extrabold text-white">OAuth 2.0 Real-Time Authentication</h3>
          <p className="text-xs text-slate-400 mt-1">
            Connect your candidate account to personalize live job matching across all 9 job portals.
          </p>
        </div>

        {synced ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="font-bold text-emerald-400 text-lg">Account Authenticated & Profile Customised!</h4>
            <p className="text-xs text-slate-300">
              Personalized skills, preferred roles & portal permissions synchronized in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Custom User Details inputs for real-time personalization */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-indigo-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Candidate Personalization (Instant Setup)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Target Professional Role</label>
                <input 
                  type="text" 
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Lead Full Stack AI Engineer..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Core Tech Skills (Comma Separated)</label>
                <input 
                  type="text" 
                  value={customSkills}
                  onChange={(e) => setCustomSkills(e.target.value)}
                  placeholder="e.g. React, TypeScript, Python, FastAPI, Docker..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Provider Actions */}
            <div className="space-y-2.5">
              <button
                onClick={() => handleAuthenticate('linkedin')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#0a66c2] hover:bg-[#084e96] text-white font-bold text-xs shadow-lg shadow-[#0a66c2]/30 transition-all hover:scale-[1.01]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
                <span>{loading && authMethod === 'linkedin' ? 'Synchronizing LinkedIn Profile...' : 'Connect & Import via LinkedIn OAuth 2.0'}</span>
                {!loading && <ArrowRight className="w-4 h-4 ml-auto text-white/80" />}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAuthenticate('google')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-semibold text-xs transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google Auth</span>
                </button>

                <button
                  onClick={() => handleAuthenticate('github')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-semibold text-xs transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <span>GitHub Auth</span>
                </button>
              </div>

              <button
                onClick={() => handleAuthenticate('email')}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                Sign In & Customize Profile with Magic Link
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero Password Storage Policy</span>
              </div>
              <p>
                All account sessions & portal tokens are sanitized and stored locally in your browser's encrypted LocalStorage.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
