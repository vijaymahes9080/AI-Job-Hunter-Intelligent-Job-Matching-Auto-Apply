import React, { useState } from 'react';
import { X, CheckCircle2, Zap, Sparkles, ShieldCheck } from 'lucide-react';
import type { SubscriptionTier } from '../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  onSelectTier: (tier: SubscriptionTier) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onSelectTier
}) => {
  if (!isOpen) return null;

  const plans = [
    {
      name: 'Free Plan',
      tier: 'Free' as SubscriptionTier,
      price: '$0 / mo',
      credits: '25 AI Credits / mo',
      features: [
        'Multi-portal job aggregation (9 portals)',
        'Basic BERT semantic match score',
        '3 Auto-apply approvals per day',
        'Standard cover letter generator'
      ]
    },
    {
      name: 'Pro Candidate Plan',
      tier: 'Pro' as SubscriptionTier,
      price: '$29 / mo',
      credits: '250 AI Credits / mo',
      popular: true,
      features: [
        'Unlimited AI match calculations',
        'ATS Resume Optimizer (v1, v2, v3)',
        'Multi-tone Cover Letter Studio',
        '15 Auto-apply approvals per day',
        'Priority Recruiter resume indexing'
      ]
    },
    {
      name: 'Enterprise / Unlimited',
      tier: 'Premium' as SubscriptionTier,
      price: '$79 / mo',
      credits: 'Unlimited AI Credits',
      features: [
        'Everything in Pro Plan',
        'Unlimited daily auto-apply submissions',
        'Direct LinkedIn OAuth automatic agent',
        'Recruiter candidate talent pool access',
        'AI Mock Interview Voice Coach'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-4xl p-6 lg:p-8 relative border-indigo-500/40 gradient-border">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-8 space-y-2">
          <span className="glass-pill text-indigo-400 border-indigo-500/40 text-xs font-bold uppercase tracking-wider">
            SaaS Subscription Tiers
          </span>
          <h2 className="text-2xl font-extrabold text-white">Upgrade Your AI Job Search</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Choose the right plan to supercharge your job hunting with AI credit boosts and automated portal submissions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = currentTier === p.tier;
            return (
              <div 
                key={p.tier} 
                className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 relative ${
                  p.popular 
                    ? 'bg-gradient-to-b from-indigo-950/60 to-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-500/40' 
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                    Most Popular
                  </span>
                )}

                <div className="space-y-3">
                  <div>
                    <h3 className="font-extrabold text-base text-white">{p.name}</h3>
                    <div className="text-2xl font-black text-indigo-400 mt-1">{p.price}</div>
                    <span className="text-[11px] font-bold text-emerald-400">{p.credits}</span>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    onSelectTier(p.tier);
                    onClose();
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                    isCurrent 
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                  }`}
                >
                  {isCurrent ? 'Current Active Plan' : 'Select Plan (Zero-Fee Simulation)'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
