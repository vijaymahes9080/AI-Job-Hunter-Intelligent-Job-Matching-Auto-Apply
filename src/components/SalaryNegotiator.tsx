import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  MessageSquare,
  Zap 
} from 'lucide-react';
import type { CandidateProfile, SalaryBenchmark } from '../types';

interface SalaryNegotiatorProps {
  profile: CandidateProfile;
  onDeductCredit: () => void;
}

export const SalaryNegotiator: React.FC<SalaryNegotiatorProps> = ({ profile, onDeductCredit }) => {
  const role = profile.preferredRoles[0] || 'Frontend Developer';
  const location = profile.location || 'San Francisco, CA';

  const [copied, setCopied] = useState(false);
  const [offerBase, setOfferBase] = useState(140000);
  const [targetBase, setTargetBase] = useState(165000);

  const benchmark: SalaryBenchmark = {
    role,
    location,
    p25: 130000,
    p50: 155000,
    p75: 180000,
    p90: 210000,
    currency: '$',
    suggestedEquity: '0.15% - 0.25% RSUs / Options',
    suggestedBonus: '10% - 15% Annual Target'
  };

  const counterOfferEmail = `Subject: Re: Job Offer - ${role} | ${profile.name}

Dear Hiring Manager,

Thank you so much for extending the offer for the ${role} position. I am extremely excited about the vision of the team and the high impact of the projects we discussed.

Based on current market benchmarks for ${role} positions in ${location} and my extensive experience with ${profile.skills.slice(0, 3).join(', ')}, I would like to propose a base salary of $${targetBase.toLocaleString()}, along with ${benchmark.suggestedEquity}.

I am confident that my technical leadership will deliver immediate value. If we can reach agreement on these terms, I am ready to sign the agreement and begin onboarding right away.

Warm regards,
${profile.name}
${profile.email}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(counterOfferEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <DollarSign className="w-3.5 h-3.5" /> AI Compensation & Equity Copilot
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Salary & Offer Negotiation Studio
            </h1>
            <p className="text-slate-400 mt-1 max-w-xl">
              Compare market salary percentiles, calculate your equity value, and generate persuasive counter-offer emails with strategic HR objection handling.
            </p>
          </div>
        </div>
      </div>

      {/* Percentiles & Counter Offer Generator */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Salary Benchmark Percentiles */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Market Salary Percentiles
          </h3>

          <div className="text-xs text-slate-400">
            Target Role: <span className="text-indigo-400 font-semibold">{benchmark.role}</span> ({benchmark.location})
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400">25th Percentile</span>
              <span className="text-white font-bold">${benchmark.p25.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl text-xs">
              <span className="text-indigo-300 font-semibold">50th Percentile (Median)</span>
              <span className="text-indigo-300 font-bold">${benchmark.p50.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs">
              <span className="text-emerald-300 font-semibold">75th Percentile (Target)</span>
              <span className="text-emerald-300 font-bold">${benchmark.p75.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl text-xs">
              <span className="text-purple-300 font-semibold">90th Percentile (Top Tier)</span>
              <span className="text-purple-300 font-bold">${benchmark.p90.toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Suggested Equity:</span>
              <span className="text-white font-semibold">{benchmark.suggestedEquity}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Annual Bonus:</span>
              <span className="text-white font-semibold">{benchmark.suggestedBonus}</span>
            </div>
          </div>
        </div>

        {/* Counter Offer Generator */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Tailored Counter-Offer Email Script
            </h3>
            <button
              onClick={handleCopy}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Script'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 mb-1 block">Current Offer Base ($)</label>
              <input
                type="number"
                value={offerBase}
                onChange={e => setOfferBase(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-400 mb-1 block">Target Counter Base ($)</label>
              <input
                type="number"
                value={targetBase}
                onChange={e => setTargetBase(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <textarea
            rows={9}
            readOnly
            value={counterOfferEmail}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-300 font-mono text-xs focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};
