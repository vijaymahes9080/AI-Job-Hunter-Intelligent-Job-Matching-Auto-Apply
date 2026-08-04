import React, { useState } from 'react';
import { 
  User, 
  Upload, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  FileText, 
  Briefcase, 
  Code,
  Save,
  Globe,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import type { CandidateProfile as ICandidateProfile } from '../types';
import { parseResumeFile } from '../services/resumeParser';
import { purgeAllData } from '../services/storage';

interface CandidateProfileProps {
  profile: ICandidateProfile;
  onSaveProfile: (updated: ICandidateProfile) => void;
  onOpenAuth: () => void;
  onOpenPortalConnect?: () => void;
}

export const CandidateProfileView: React.FC<CandidateProfileProps> = ({
  profile,
  onSaveProfile,
  onOpenAuth,
  onOpenPortalConnect
}) => {
  const [formData, setFormData] = useState<ICandidateProfile>(profile);
  const [newSkill, setNewSkill] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const parsed = await parseResumeFile(file);
      setFormData(prev => ({
        ...prev,
        skills: Array.from(new Set([...prev.skills, ...parsed.skillsExtracted])),
        headline: parsed.suggestedHeadline || prev.headline,
        summary: parsed.suggestedSummary || prev.summary,
        resumeFileName: file.name,
        resumeFileText: parsed.text
      }));
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
    } catch {
      console.error('File parsing error');
    } finally {
      setUploading(false);
    }
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    if (!formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
    }
    setNewSkill('');
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skillToRemove) });
  };

  const handleSave = () => {
    onSaveProfile(formData);
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 gradient-border">
        <div className="flex items-start gap-4">
          <img 
            src={formData.profilePhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"} 
            alt={formData.name}
            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/30" 
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-white">{formData.name}</h2>
              {formData.linkedinSynced && (
                <span className="px-2 py-0.5 rounded-full bg-[#0a66c2]/20 text-[#0a66c2] border border-[#0a66c2]/40 text-[10px] font-bold flex items-center gap-1">
                  <svg className="w-3 h-3 fill-[#0a66c2]" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                  OAuth Synced
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 font-medium mt-1">{formData.headline}</p>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
              <span>{formData.email}</span>
              <span>•</span>
              <span>{formData.location}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{formData.noticePeriodDays} Days Notice</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenPortalConnect && (
            <button
              onClick={onOpenPortalConnect}
              className="px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-2 shadow-md"
            >
              <Globe className="w-4 h-4 text-purple-400" />
              <span>Link 9 Job Portals</span>
            </button>
          )}

          <button
            onClick={onOpenAuth}
            className="px-4 py-2.5 rounded-xl bg-[#0a66c2] hover:bg-[#084e96] text-white text-xs font-bold flex items-center gap-2 shadow-md"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
            </svg>
            <span>Sync LinkedIn</span>
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile</span>
          </button>
        </div>
      </div>

      {/* Resume File Parser Dropzone */}
      <div className="glass-panel p-6 border-dashed border-2 border-indigo-500/40 relative text-center space-y-3 bg-gradient-to-br from-indigo-950/20 via-slate-900 to-slate-950">
        <Upload className="w-10 h-10 text-indigo-400 mx-auto animate-bounce" />
        <div>
          <h3 className="font-bold text-white text-base">AI Resume Parser (PDF / DOCX)</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload your existing resume file to automatically extract skills, work history, and contact details.
          </p>
        </div>

        <div className="inline-block relative">
          <input 
            type="file" 
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <button className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-xs font-bold text-white transition-colors">
            {uploading ? 'Parsing File with AI...' : 'Choose PDF / DOCX Resume File'}
          </button>
        </div>

        {formData.resumeFileName && (
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-semibold pt-1">
            <FileText className="w-4 h-4" />
            <span>Active File: {formData.resumeFileName}</span>
            {uploadSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />}
          </div>
        )}
      </div>

      {/* Skills Matrix Tag Editor */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-400" />
              Candidate Skill Matrix ({formData.skills.length})
            </h3>
            <p className="text-xs text-slate-400">Used by FAISS vector similarity engine for 0-100% job matching</p>
          </div>
        </div>

        {/* Skill tags */}
        <div className="flex flex-wrap gap-2">
          {formData.skills.map(skill => (
            <span 
              key={skill} 
              className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/40 flex items-center gap-2 group"
            >
              <span>{skill}</span>
              <button 
                onClick={() => removeSkill(skill)}
                className="text-slate-400 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>

        {/* Add skill input */}
        <div className="flex items-center gap-2 pt-2 max-w-md">
          <input 
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSkill()}
            placeholder="Add new skill (e.g. PyTorch, Docker, GraphQL)..."
            className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={addSkill}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Skill
          </button>
        </div>
      </div>

      {/* Basic Info & Job Preferences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info Form */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" /> Basic Candidate Info
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Email</label>
              <input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Professional Headline</label>
              <input 
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Profile Summary</label>
              <textarea 
                rows={3}
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>
        </div>

        {/* Job Preferences Form */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-cyan-400" /> Job Preferences
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Target Min CTC (Salary PA)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={formData.preferredSalaryMin}
                  onChange={(e) => setFormData({ ...formData, preferredSalaryMin: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
                <span className="text-emerald-400 font-bold whitespace-nowrap">
                  = ₹{(formData.preferredSalaryMin/100000).toFixed(1)} LPA
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Notice Period (Days)</label>
              <input 
                type="number"
                value={formData.noticePeriodDays}
                onChange={(e) => setFormData({ ...formData, noticePeriodDays: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Preferred Locations</label>
              <input 
                type="text"
                value={formData.preferredLocations.join(', ')}
                onChange={(e) => setFormData({ ...formData, preferredLocations: e.target.value.split(',').map(s => s.trim()) })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (confirm('🧹 Clean Slate & Personalization Purge:\nAre you sure you want to purge all pre-existing sample profiles and cached candidate records for a clean slate?')) {
                    const clean = purgeAllData();
                    setFormData(clean);
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold hover:bg-rose-500/20 text-xs transition-colors flex items-center gap-1.5"
              >
                <span>🧹 Clean Slate & Personalization Purge</span>
              </button>

              <button
                type="button"
                onClick={() => onSaveProfile(formData)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25"
              >
                <Save className="w-4 h-4" /> Save Profile Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
