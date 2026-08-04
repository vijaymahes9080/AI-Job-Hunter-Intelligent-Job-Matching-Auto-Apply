import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, RefreshCw, Zap, ExternalLink, Sliders, AlertCircle } from 'lucide-react';
import type { PortalAccount, JobSource, CandidateProfile } from '../types';

interface PortalConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  portalAccounts: PortalAccount[];
  onUpdatePortals: (updated: PortalAccount[]) => void;
  onImportProfile: (importedData: Partial<CandidateProfile>) => void;
}

const PORTAL_METADATA: Record<JobSource, { color: string; bg: string; border: string; logoText: string; desc: string }> = {
  LinkedIn: {
    color: 'text-[#0a66c2]',
    bg: 'bg-[#0a66c2]/10',
    border: 'border-[#0a66c2]/40',
    logoText: 'in',
    desc: 'World\'s #1 professional network with 1-Click Easy Apply support.'
  },
  Naukri: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    logoText: 'NK',
    desc: 'India\'s leading job portal with direct recruiter applicant matching.'
  },
  Indeed: {
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/40',
    logoText: 'ID',
    desc: 'Global job aggregator with Instant Apply API authorization.'
  },
  Glassdoor: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    logoText: 'GD',
    desc: 'Company reviews & Salary data integrated with live application portals.'
  },
  Greenhouse: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    logoText: 'GH',
    desc: 'Enterprise ATS platform used by top tech unicorns & scaleups.'
  },
  Lever: {
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
    logoText: 'LV',
    desc: 'Modern recruitment CRM supporting 1-click candidate submission.'
  },
  Ashby: {
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/40',
    logoText: 'AB',
    desc: 'High-growth startup ATS with instant API application routing.'
  },
  Foundit: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    logoText: 'FD',
    desc: 'Monster APAC & India job search portal API sync.'
  },
  Wellfound: {
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/40',
    logoText: 'WF',
    desc: 'AngelList Talent for high-growth tech startups & venture-backed teams.'
  },
  'Internshala': {
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/40',
    logoText: 'IS',
    desc: 'Early career & internship job board.'
  },
  'Company Careers': {
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/40',
    logoText: 'CC',
    desc: 'Direct corporate career pages.'
  }
};

export const PortalConnectModal: React.FC<PortalConnectModalProps> = ({
  isOpen,
  onClose,
  portalAccounts,
  onUpdatePortals,
  onImportProfile
}) => {
  const [connectingPortal, setConnectingPortal] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'portals' | 'settings'>('portals');

  if (!isOpen) return null;

  const handleConnectToggle = (account: PortalAccount) => {
    if (account.status === 'Connected') {
      // Disconnect
      const updated = portalAccounts.map(p => 
        p.id === account.id 
          ? { ...p, status: 'Disconnected' as const, lastSyncAt: 'Disconnected', autoApplyEnabled: false } 
          : p
      );
      onUpdatePortals(updated);
    } else {
      // Start connecting simulation
      setConnectingPortal(account.id);
      setTimeout(() => {
        const userEmail = emailInput[account.id] || `${account.portal.toLowerCase().replace(/\s+/g, '')}.user@example.com`;
        const updated = portalAccounts.map(p => 
          p.id === account.id 
            ? { 
                ...p, 
                status: 'Connected' as const, 
                accountEmail: userEmail, 
                connectedAt: new Date().toISOString().split('T')[0],
                lastSyncAt: 'Just now',
                autoApplyEnabled: true 
              } 
            : p
        );
        onUpdatePortals(updated);

        // If LinkedIn or Naukri, auto-import profile data
        if (account.portal === 'LinkedIn') {
          onImportProfile({
            name: 'Vijay Kumar',
            email: userEmail,
            headline: 'Senior Full Stack AI Developer | React, TypeScript & LLMs',
            summary: 'Auto-imported via connected LinkedIn OAuth. 5+ years crafting AI applications and high-throughput vector systems.',
            linkedinSynced: true,
            skills: ['React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'OpenAI API', 'Tailwind CSS', 'PostgreSQL', 'Docker', 'Next.js'],
            noticePeriodDays: 30,
            preferredSalaryMin: 3000000
          });
        }

        setConnectingPortal(null);
      }, 1200);
    }
  };

  const handleAutoApplyToggle = (accountId: string) => {
    const updated = portalAccounts.map(p => 
      p.id === accountId ? { ...p, autoApplyEnabled: !p.autoApplyEnabled } : p
    );
    onUpdatePortals(updated);
  };

  const connectedCount = portalAccounts.filter(p => p.status === 'Connected').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col p-6 relative border-indigo-500/30 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <Zap className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">Job Portal Account Linker</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  {connectedCount} / 9 Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect your accounts to allow zero-human autonomous job scouting, resume tailoring, and direct portal submission.
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

        {/* Tab Selector */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveTab('portals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'portals'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            🌐 Linked Job Portals (9 Supported)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            ⚙️ Auto-Apply Permissions & OAuth Security
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {activeTab === 'portals' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portalAccounts.map(account => {
                const meta = PORTAL_METADATA[account.portal] || {
                  color: 'text-slate-300',
                  bg: 'bg-slate-800',
                  border: 'border-slate-700',
                  logoText: account.portal.substring(0, 2).toUpperCase(),
                  desc: 'Job portal integration.'
                };

                const isConnected = account.status === 'Connected';
                const isConnecting = connectingPortal === account.id;

                return (
                  <div 
                    key={account.id}
                    className={`glass-panel p-4 flex flex-col justify-between border transition-all ${
                      isConnected ? `${meta.border} bg-slate-900/90` : 'border-slate-800/80 bg-slate-950/60'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.color} font-extrabold flex items-center justify-center text-sm border ${meta.border}`}>
                            {meta.logoText}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white leading-tight">{account.portal}</h4>
                            <span className="text-[10px] text-slate-400">{account.authMethod}</span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isConnected 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}>
                          {isConnected ? 'Connected' : 'Offline'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mb-3 min-h-[32px] leading-relaxed">
                        {meta.desc}
                      </p>

                      {/* Account Email details */}
                      {isConnected ? (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] space-y-1 mb-3">
                          <div className="flex items-center justify-between text-slate-300 font-semibold">
                            <span className="truncate max-w-[170px]">{account.accountEmail || 'OAuth Linked'}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Last sync: {account.lastSyncAt}</span>
                            <span className="text-indigo-400 font-medium">OAuth 2.0 Token Active</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3">
                          <input 
                            type="email"
                            placeholder={`Enter ${account.portal} email/token...`}
                            value={emailInput[account.id] || ''}
                            onChange={(e) => setEmailInput({ ...emailInput, [account.id]: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions footer */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {isConnected ? (
                        <>
                          <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                            <input 
                              type="checkbox"
                              checked={account.autoApplyEnabled}
                              onChange={() => handleAutoApplyToggle(account.id)}
                              className="w-3.5 h-3.5 accent-indigo-500 rounded"
                            />
                            <span>Auto-Apply</span>
                          </label>

                          <button
                            onClick={() => handleConnectToggle(account)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-colors"
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnectToggle(account)}
                          disabled={isConnecting}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20"
                        >
                          {isConnecting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Authorizing OAuth...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Link {account.portal} Account</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel p-6 space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30">
                <ShieldCheck className="w-8 h-8 text-indigo-400 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-white text-sm">OAuth 2.0 Zero-Intervention Security Protocol</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    AI Job Hunter connects directly to official portal OAuth endpoints or candidate submission APIs. No passwords are stored locally or remotely. You maintain full control to pause or disconnect any portal at any time.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" /> Global Portal Application Rules
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Auto-Submit Only High Match Listings (≥ 80%)</span>
                      <span className="text-slate-400 text-[11px]">Prevents spam by only triggering pipeline for tailored role fits.</span>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-500" />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Generate Culture-Tailored Cover Letter per Company</span>
                      <span className="text-slate-400 text-[11px]">Customizes tone for Startups vs Enterprise MNCs.</span>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-500" />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Pre-Fill Notice Period & Compensation Grid</span>
                      <span className="text-slate-400 text-[11px]">Automatically populates standard screening question fields.</span>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-500" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Ready for background scouting.</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
          >
            Save & Continue to Autonomous Scout
          </button>
        </div>
      </div>
    </div>
  );
};
