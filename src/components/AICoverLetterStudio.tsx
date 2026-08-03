import React, { useState } from 'react';
import { Layers, Sparkles, Copy, Download, Check, RefreshCw } from 'lucide-react';
import { Job, CandidateProfile, CoverLetter, CoverLetterTone } from '../types';
import { generateCoverLetter } from '../services/coverLetterGenerator';

interface AICoverLetterStudioProps {
  jobs: Job[];
  profile: CandidateProfile;
  initialJob?: Job | null;
}

export const AICoverLetterStudio: React.FC<AICoverLetterStudioProps> = ({
  jobs,
  profile,
  initialJob
}) => {
  const [selectedJob, setSelectedJob] = useState<Job>(initialJob || jobs[0]);
  const [selectedTone, setSelectedTone] = useState<CoverLetterTone>('Professional');
  const [coverLetter, setCoverLetter] = useState<CoverLetter>(
    generateCoverLetter(profile, selectedJob || jobs[0], 'Professional')
  );
  const [copied, setCopied] = useState(false);

  const tones: CoverLetterTone[] = ['Professional', 'Friendly', 'Formal', 'Startup', 'Enterprise'];

  const handleGenerate = (tone: CoverLetterTone) => {
    setSelectedTone(tone);
    setCoverLetter(generateCoverLetter(profile, selectedJob, tone));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 gradient-border">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            AI Multi-Tone Cover Letter Studio
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Customized cover letters injected with job requirements and candidate achievements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-xs font-bold text-white transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
          </button>
        </div>
      </div>

      {/* Target Job & Tone Selector */}
      <div className="glass-panel p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Target Job Position</label>
            <select
              value={selectedJob.id}
              onChange={(e) => {
                const found = jobs.find(j => j.id === e.target.value);
                if (found) {
                  setSelectedJob(found);
                  setCoverLetter(generateCoverLetter(profile, found, selectedTone));
                }
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-indigo-500 focus:outline-none"
            >
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.title} at {j.company} ({j.sourcePortal})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Cover Letter Tone</label>
            <div className="flex flex-wrap gap-1.5">
              {tones.map(t => (
                <button
                  key={t}
                  onClick={() => handleGenerate(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedTone === t 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cover Letter Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Generated Cover Letter ({selectedTone} Tone)</span>
            <span className="text-slate-500">Auto-Customized for {selectedJob.company}</span>
          </div>

          <textarea 
            rows={14}
            value={coverLetter.content}
            onChange={(e) => setCoverLetter({ ...coverLetter, content: e.target.value })}
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
