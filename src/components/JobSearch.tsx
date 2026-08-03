import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Filter, 
  CheckCircle2, 
  Zap, 
  Building2, 
  DollarSign, 
  Calendar, 
  Layers,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  ExternalLink,
  Award
} from 'lucide-react';
import { Job, JobSource, WorkplaceType, CompanyType } from '../types';

interface JobSearchProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onAddToAutoApply: (job: Job) => void;
}

const ALL_PORTALS: JobSource[] = [
  'LinkedIn', 'Naukri', 'Indeed', 'Foundit', 'Wellfound', 'Glassdoor', 'Greenhouse', 'Lever', 'Ashby'
];

export const JobSearch: React.FC<JobSearchProps> = ({ jobs, onSelectJob, onAddToAutoApply }) => {
  const [query, setQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedPortals, setSelectedPortals] = useState<JobSource[]>(ALL_PORTALS);
  const [selectedWorkplace, setSelectedWorkplace] = useState<WorkplaceType[]>(['Remote', 'Hybrid', 'On-site']);
  const [selectedCompanyType, setSelectedCompanyType] = useState<CompanyType[]>(['Startup', 'MNC', 'Enterprise', 'Government']);
  const [minMatch, setMinMatch] = useState<number>(70);

  // Portal Badge Colors
  const getPortalStyle = (source: JobSource) => {
    switch (source) {
      case 'LinkedIn': return 'bg-[#0a66c2]/20 text-[#0a66c2] border-[#0a66c2]/40';
      case 'Naukri': return 'bg-[#275df5]/20 text-[#275df5] border-[#275df5]/40';
      case 'Indeed': return 'bg-[#003a9b]/20 text-[#387bff] border-[#003a9b]/40';
      case 'Foundit': return 'bg-[#ff5a00]/20 text-[#ff5a00] border-[#ff5a00]/40';
      case 'Wellfound': return 'bg-[#e24234]/20 text-[#e24234] border-[#e24234]/40';
      case 'Glassdoor': return 'bg-[#00a264]/20 text-[#00a264] border-[#00a264]/40';
      case 'Greenhouse': return 'bg-[#00b074]/20 text-[#00b074] border-[#00b074]/40';
      case 'Lever': return 'bg-[#30475e]/20 text-[#7198be] border-[#30475e]/40';
      case 'Ashby': return 'bg-[#5e43f3]/20 text-[#a08eff] border-[#5e43f3]/40';
      default: return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchScore = job.matchScore?.overallPercentage || 85;
      if (matchScore < minMatch) return false;

      if (selectedPortals.length > 0 && !selectedPortals.includes(job.sourcePortal)) return false;
      if (selectedWorkplace.length > 0 && !selectedWorkplace.includes(job.workplaceType)) return false;
      if (selectedCompanyType.length > 0 && !selectedCompanyType.includes(job.companyType)) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCompany = job.company.toLowerCase().includes(q);
        const matchesSkill = job.skillsRequired.some(s => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCompany && !matchesSkill) return false;
      }

      if (locationQuery.trim()) {
        const loc = locationQuery.toLowerCase();
        if (!job.location.toLowerCase().includes(loc)) return false;
      }

      return true;
    });
  }, [jobs, query, locationQuery, selectedPortals, selectedWorkplace, selectedCompanyType, minMatch]);

  const togglePortal = (portal: JobSource) => {
    if (selectedPortals.includes(portal)) {
      if (selectedPortals.length === 1) return; // keep at least one
      setSelectedPortals(selectedPortals.filter(p => p !== portal));
    } else {
      setSelectedPortals([...selectedPortals, portal]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Search Header Bar */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          {/* Query input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by job title, company, or skills (e.g. React, Python, OpenAI, Lead Developer)..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Location input */}
          <div className="relative w-full lg:w-72">
            <MapPin className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
            <input 
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Location or Remote..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Multi-Portal Source Filters */}
        <div className="pt-3 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Aggregated Portal Sources ({selectedPortals.length}/{ALL_PORTALS.length})
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedPortals(ALL_PORTALS)}
                className="text-[11px] text-indigo-400 hover:underline font-semibold"
              >
                Select All
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL_PORTALS.map(portal => {
              const isSelected = selectedPortals.includes(portal);
              return (
                <button
                  key={portal}
                  onClick={() => togglePortal(portal)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    isSelected 
                      ? getPortalStyle(portal)
                      : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  {portal}
                </button>
              );
            })}
          </div>

          {/* Match Score Slider & Workplace Pills */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            {/* Match score filter */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
                Min AI Match Score: <span className="text-indigo-400 font-bold">{minMatch}%</span>
              </span>
              <input 
                type="range"
                min="50"
                max="95"
                step="5"
                value={minMatch}
                onChange={(e) => setMinMatch(parseInt(e.target.value))}
                className="w-40 accent-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Workplace:</span>
              {(['Remote', 'Hybrid', 'On-site'] as WorkplaceType[]).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    if (selectedWorkplace.includes(type)) {
                      if (selectedWorkplace.length === 1) return;
                      setSelectedWorkplace(selectedWorkplace.filter(t => t !== type));
                    } else {
                      setSelectedWorkplace([...selectedWorkplace, type]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    selectedWorkplace.includes(type) ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-400">
        <span>Showing <strong className="text-white">{filteredJobs.length}</strong> AI matched jobs</span>
        <span className="flex items-center gap-1.5 text-cyan-400">
          <Sparkles className="w-3.5 h-3.5" />
          Semantic BERT & Vector Match Engines Active
        </span>
      </div>

      {/* Job Cards Feed */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="glass-panel p-12 text-center space-y-3">
            <Search className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="font-bold text-white text-lg">No jobs match your filter criteria</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try lowering the minimum match score threshold or selecting more job portal sources.
            </p>
            <button
              onClick={() => {
                setQuery('');
                setLocationQuery('');
                setMinMatch(50);
                setSelectedPortals(ALL_PORTALS);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredJobs.map(job => {
            const score = job.matchScore?.overallPercentage || 88;
            return (
              <div 
                key={job.id} 
                className="glass-panel p-6 border-slate-800/90 hover:border-indigo-500/50 transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img 
                      src={job.companyLogo} 
                      alt={job.company}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-700" 
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 
                          onClick={() => onSelectJob(job)}
                          className="text-lg font-bold text-white hover:text-indigo-300 cursor-pointer transition-colors"
                        >
                          {job.title}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getPortalStyle(job.sourcePortal)}`}>
                          {job.sourcePortal}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-300 mt-0.5">
                        {job.company} • <span className="text-slate-400">{job.location} ({job.workplaceType})</span>
                      </p>
                    </div>
                  </div>

                  {/* Match Score Badge */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-xl text-sm font-extrabold flex items-center gap-1.5 shadow-md ${
                        score >= 90 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10' 
                          : score >= 80 
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' 
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      }`}>
                        <Zap className="w-4 h-4 text-amber-400 fill-current" />
                        <span>{score}% Match</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">FAISS Vector Rank #1</p>
                    </div>
                  </div>
                </div>

                {/* Job Specs Row */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-300">
                  <div className="flex items-center gap-1 font-bold text-emerald-400">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>₹{(job.salaryMin/100000).toFixed(0)}L - ₹{(job.salaryMax/100000).toFixed(0)}L PA</span>
                  </div>
                  <span className="text-slate-700">•</span>
                  <span>Exp: {job.experienceMin}-{job.experienceMax} Yrs</span>
                  <span className="text-slate-700">•</span>
                  <span>Type: {job.jobType}</span>
                  <span className="text-slate-700">•</span>
                  <span className="text-slate-400">Posted {job.postedTime}</span>
                </div>

                {/* Skills comparison tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs font-semibold text-slate-400 mr-1">Skills:</span>
                  {job.skillsRequired.map(skill => (
                    <span key={skill} className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 text-[11px] font-medium border border-slate-800">
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Actions Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => onSelectJob(job)}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    View Match Breakdown & Skill Gaps <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Direct Portal Link</span>
                    </a>

                    <button
                      onClick={() => onAddToAutoApply(job)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Tailor Resume & Queue Apply</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
