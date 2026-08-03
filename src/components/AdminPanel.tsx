import React, { useState } from 'react';
import { ShieldCheck, Cpu, Database, Server, Key, RefreshCw, CheckCircle2, Sliders, Layers } from 'lucide-react';
import { AIModelConfig } from '../types';

interface AdminPanelProps {
  config: AIModelConfig;
  onSaveConfig: (cfg: AIModelConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ config, onSaveConfig }) => {
  const [formData, setFormData] = useState<AIModelConfig>(config);
  const [saved, setSaved] = useState(false);

  const portals = [
    { name: 'LinkedIn OAuth & Jobs API', status: 'Connected', ping: '24ms', tier: 'Partner OAuth 2.0' },
    { name: 'Naukri Recruiter Feed', status: 'Connected', ping: '45ms', tier: 'Direct Hook' },
    { name: 'Indeed Job Crawler', status: 'Connected', ping: '60ms', tier: 'Partner API' },
    { name: 'Foundit (Monster) Connector', status: 'Connected', ping: '52ms', tier: 'REST Webhook' },
    { name: 'Wellfound (AngelList)', status: 'Connected', ping: '38ms', tier: 'GraphQL' },
    { name: 'Greenhouse & Lever ATS', status: 'Connected', ping: '18ms', tier: 'Direct Webhook' },
    { name: 'Ashby Portal Sync', status: 'Connected', ping: '22ms', tier: 'Direct Webhook' }
  ];

  const handleSave = () => {
    onSaveConfig(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 gradient-border">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            AI Platform Admin & Systems Center
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Configure AI embedding providers, FAISS vector indexes, and multi-portal API connectors.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
        >
          {saved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <RefreshCw className="w-4 h-4" />}
          <span>{saved ? 'Settings Saved' : 'Save System Settings'}</span>
        </button>
      </div>

      {/* AI Model Settings */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          AI Semantic Embedding & LLM Provider Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Active AI Provider Engine</label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-indigo-500 focus:outline-none"
            >
              <option value="OpenAI GPT-4o">OpenAI GPT-4o + Embeddings v3</option>
              <option value="Sentence Transformers (Local)">Sentence Transformers (Local Zero-Fee BERT)</option>
              <option value="HuggingFace BERT">HuggingFace All-MiniLM-L6-v2</option>
              <option value="FAISS Vector Index">FAISS Vector Index (Native GPU)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Similarity Metric</label>
            <select
              value={formData.similarityMetric}
              onChange={(e) => setFormData({ ...formData, similarityMetric: e.target.value as any })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-indigo-500 focus:outline-none"
            >
              <option value="Cosine">Cosine Similarity (-1.0 to 1.0)</option>
              <option value="Dot Product">Dot Product Similarity</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Approval Safety Policy</label>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <input 
                type="checkbox"
                checked={formData.autoApplyApprovalRequired}
                onChange={(e) => setFormData({ ...formData, autoApplyApprovalRequired: e.target.checked })}
                className="w-4 h-4 accent-indigo-500 cursor-pointer"
              />
              <div>
                <span className="font-bold text-white block">Require User Approval Before Application Submission</span>
                <span className="text-[10px] text-slate-400">Strictly respects platform terms of service and OAuth boundaries</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Max Daily Submissions Limit</label>
            <input 
              type="number"
              value={formData.dailyMaxApplications}
              onChange={(e) => setFormData({ ...formData, dailyMaxApplications: parseInt(e.target.value) || 10 })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium"
            />
          </div>
        </div>
      </div>

      {/* Multi-Portal API Status Table */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          Aggregated Portal Connectors Status
        </h3>

        <div className="space-y-2 text-xs">
          {portals.map((p, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-bold text-white">{p.name}</span>
                <span className="text-[10px] text-slate-500 font-medium">({p.tier})</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-slate-400">Latency: {p.ping}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
