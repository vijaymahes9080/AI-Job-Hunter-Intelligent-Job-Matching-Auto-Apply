import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Wand2, 
  Sparkles, 
  Layers, 
  BarChart3, 
  ShieldCheck,
  Check
} from 'lucide-react';
import type { CandidateProfile, ATSScoreCard } from '../types';

interface ATSScoreAuditorProps {
  profile: CandidateProfile;
  onUpdateProfile: (updated: CandidateProfile) => void;
}

export const ATSScoreAuditor: React.FC<ATSScoreAuditorProps> = ({ profile, onUpdateProfile }) => {
  const [isRepaired, setIsRepaired] = useState(false);

  // Compute mock ATS audit score card based on profile state
  const hasSummary = profile.summary.length > 50;
  const hasSkills = profile.skills.length >= 6;
  const hasExp = profile.experience.length >= 1;

  const overallScore = Math.min(100, Math.round(
    (hasSummary ? 30 : 10) + (hasSkills ? 40 : 15) + (hasExp ? 30 : 10) + (isRepaired ? 15 : 0)
  ));

  const scoreCard: ATSScoreCard = {
    overallScore: Math.min(100, overallScore),
    formattingScore: isRepaired ? 100 : 82,
    keywordScore: hasSkills ? 92 : 65,
    sectionScore: hasSummary && hasExp ? 95 : 70,
    readabilityScore: 90,
    detectedIssues: isRepaired ? [] : [
      'Multi-column layout table detected in header section (Low parsing confidence)',
      '3 non-standard skill abbreviations found (e.g. "JS", "TS")',
      'Missing standardized bullet headers ("Professional Experience")'
    ],
    missingKeywords: ['TypeScript 5.0', 'CI/CD Pipelines', 'REST APIs', 'Cloud Architecture'],
    overusedKeywords: ['Passionate', 'Motivated', 'Team Player'],
    recommendations: [
      'Replace custom column tables with simple left-aligned clean text blocks',
      'Spell out technical acronyms (e.g. "TypeScript", "JavaScript")',
      'Include quantitative metrics in your work experience bullet points'
    ]
  };

  const handleAutoRepair = () => {
    setIsRepaired(true);
    // Auto update profile skills to standardized ones
    const updatedSkills = Array.from(new Set([...profile.skills, 'TypeScript', 'CI/CD', 'REST APIs']));
    onUpdateProfile({
      ...profile,
      skills: updatedSkills
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" /> Real-time Parser Diagnostics
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Visual ATS Heatmap & Audit Studio
            </h1>
            <p className="text-slate-400 mt-1 max-w-xl">
              Audit your resume against modern Applicant Tracking System (ATS) algorithms like Taleo, Greenhouse, Lever, and Workday.
            </p>
          </div>

          <button
            onClick={handleAutoRepair}
            disabled={isRepaired}
            className={`px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
              isRepaired
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                : 'bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-emerald-500/25'
            }`}
          >
            {isRepaired ? (
              <>
                <Check className="w-5 h-5" /> 100% ATS Repair Complete!
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" /> 1-Click Fix All ATS Formatting
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audit Score Dashboard */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl text-center space-y-1">
          <span className="text-xs text-slate-400 font-medium">Overall ATS Readability</span>
          <div className="text-4xl font-extrabold text-emerald-400">{scoreCard.overallScore}%</div>
          <span className="text-[10px] text-slate-500">Target score &gt; 85%</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl text-center space-y-1">
          <span className="text-xs text-slate-400 font-medium">Formatting Cleanliness</span>
          <div className="text-4xl font-extrabold text-indigo-400">{scoreCard.formattingScore}%</div>
          <span className="text-[10px] text-slate-500">No complex tables</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl text-center space-y-1">
          <span className="text-xs text-slate-400 font-medium">Keyword Match Index</span>
          <div className="text-4xl font-extrabold text-cyan-400">{scoreCard.keywordScore}%</div>
          <span className="text-[10px] text-slate-500">High skill density</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl text-center space-y-1">
          <span className="text-xs text-slate-400 font-medium">Section Structure</span>
          <div className="text-4xl font-extrabold text-purple-400">{scoreCard.sectionScore}%</div>
          <span className="text-[10px] text-slate-500">Standard headings</span>
        </div>
      </div>

      {/* Heatmap & Diagnostics Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Identified Issues & Recommendations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Detected Formatting Risks
          </h3>

          {scoreCard.detectedIssues.length === 0 ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-2xl text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Zero formatting issues detected! Your candidate profile is 100% ATS parser compliant.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {scoreCard.detectedIssues.map((issue, idx) => (
                <div key={idx} className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-3.5 rounded-2xl text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          )}

          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">
            AI Optimization Recommendations
          </h4>
          <ul className="space-y-2 text-xs text-slate-300">
            {scoreCard.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Missing vs Overused Keywords */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Layers className="w-4 h-4 text-cyan-400" /> ATS Keyword Density Matrix
          </h3>

          <div>
            <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 block">
              Recommended High-Value Missing Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {scoreCard.missingKeywords.map(kw => (
                <span key={kw} className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                  + {kw}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <label className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 block">
              Overused / Cliché Buzzwords to Reduce
            </label>
            <div className="flex flex-wrap gap-2">
              {scoreCard.overusedKeywords.map(kw => (
                <span key={kw} className="text-xs px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
                  ⚠️ {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
