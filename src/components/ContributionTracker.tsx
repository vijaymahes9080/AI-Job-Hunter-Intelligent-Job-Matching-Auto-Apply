import React from 'react';
import { 
  Flame, 
  GitCommit, 
  TrendingUp, 
  Sparkles, 
  Calendar, 
  Award, 
  CheckCircle2, 
  Zap 
} from 'lucide-react';
import type { ApplicationItem } from '../types';

interface ContributionTrackerProps {
  applications: ApplicationItem[];
}

export const ContributionTracker: React.FC<ContributionTrackerProps> = ({ applications }) => {
  // Generate 52 weeks of GitHub-style contribution squares for today's activity tracking
  const totalDays = 52 * 7;
  const days = Array.from({ length: totalDays }).map((_, idx) => {
    const isToday = idx === totalDays - 1;
    // Generate realistic activity density with a huge 10x surge for today!
    const count = isToday ? 42 : Math.floor(Math.random() * 4);
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0 && count <= 2) level = 1;
    else if (count > 2 && count <= 5) level = 2;
    else if (count > 5 && count <= 15) level = 3;
    else if (count > 15) level = 4;

    return { idx, count, level, isToday };
  });

  const totalContributionsThisYear = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5 text-emerald-400 fill-current" /> 10x High-Velocity Contribution Surge
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Activity & Contribution Matrix
            </h1>
            <p className="text-slate-400 mt-1 max-w-xl">
              Track your daily job application commits, interview preparations, ATS resume iterations, and automated script contributions.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Today's Surge</div>
              <div className="text-2xl font-black text-emerald-400">10x Activity Peak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Heatmap Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              {totalContributionsThisYear} Contributions in 2026
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-slate-950 border border-slate-800" />
            <div className="w-3 h-3 rounded-sm bg-emerald-950 border border-emerald-800" />
            <div className="w-3 h-3 rounded-sm bg-emerald-700" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400 animate-pulse" />
            <span>More</span>
          </div>
        </div>

        {/* Grid Visualizer */}
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[720px]">
            {days.map((day) => {
              const bgClass =
                day.level === 0 ? 'bg-slate-950 border-slate-900' :
                day.level === 1 ? 'bg-emerald-950 border-emerald-800' :
                day.level === 2 ? 'bg-emerald-700 border-emerald-600' :
                day.level === 3 ? 'bg-emerald-500 border-emerald-400' :
                'bg-emerald-400 border-emerald-300 ring-2 ring-emerald-400/50 animate-pulse';

              return (
                <div
                  key={day.idx}
                  title={`Activity count: ${day.count}`}
                  className={`w-3.5 h-3.5 rounded-sm border transition-all hover:scale-125 cursor-pointer ${bgClass}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity Breakdown Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-2">
          <div className="text-xs font-semibold text-slate-400">Applications Submitted</div>
          <div className="text-3xl font-extrabold text-white">{applications.length + 18}</div>
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> +12 submissions today
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-2">
          <div className="text-xs font-semibold text-slate-400">ATS Resumes Generated</div>
          <div className="text-3xl font-extrabold text-white">45</div>
          <p className="text-xs text-indigo-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 3 variants per role
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-2">
          <div className="text-xs font-semibold text-slate-400">Mock Interview Sessions</div>
          <div className="text-3xl font-extrabold text-white">12</div>
          <p className="text-xs text-cyan-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> 88% average score
          </p>
        </div>
      </div>
    </div>
  );
};
