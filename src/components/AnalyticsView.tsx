import React from 'react';
import { BarChart3, TrendingUp, PieChart, Layers, DollarSign, Award } from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { ApplicationItem, Job } from '../types';

interface AnalyticsViewProps {
  applications: ApplicationItem[];
  jobs: Job[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ applications, jobs }) => {
  // Application trend mock data
  const trendData = [
    { date: 'Jul 28', applications: 2, views: 1 },
    { date: 'Jul 29', applications: 3, views: 2 },
    { date: 'Jul 30', applications: 4, views: 3 },
    { date: 'Jul 31', applications: 2, views: 2 },
    { date: 'Aug 01', applications: 5, views: 4 },
    { date: 'Aug 02', applications: 6, views: 5 },
    { date: 'Aug 03', applications: 4, views: 3 }
  ];

  // Status breakdown data
  const statusData = [
    { name: 'Submitted', value: 8, color: '#6366f1' },
    { name: 'Resume Viewed', value: 3, color: '#06b6d4' },
    { name: 'Interviewing', value: 1, color: '#10b981' },
    { name: 'Offer', value: 0, color: '#f59e0b' },
    { name: 'Saved', value: 4, color: '#64748b' }
  ];

  // Skill demand vs candidate match
  const skillDemandData = [
    { skill: 'React', demand: 95, candidate: 100 },
    { skill: 'TypeScript', demand: 90, candidate: 95 },
    { skill: 'Python', demand: 88, candidate: 90 },
    { skill: 'OpenAI API', demand: 85, candidate: 88 },
    { skill: 'FastAPI', demand: 78, candidate: 82 },
    { skill: 'PostgreSQL', demand: 75, candidate: 85 }
  ];

  // Portal success rates
  const portalSuccessData = [
    { portal: 'LinkedIn', responseRate: 34 },
    { portal: 'Wellfound', responseRate: 42 },
    { portal: 'Naukri', responseRate: 26 },
    { portal: 'Indeed', responseRate: 20 },
    { portal: 'Glassdoor', responseRate: 28 },
    { portal: 'Ashby', responseRate: 38 }
  ];

  return (
    <div className="space-y-8 animate-in fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 gradient-border">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            AI Job Search Analytics & Insights
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Visual metrics on application trends, recruiter response rates, and skill market demand.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="glass-pill text-emerald-400 border-emerald-500/30 font-bold">
            Response Rate: 28.5%
          </span>
          <span className="glass-pill text-purple-400 border-purple-500/30 font-bold">
            Avg Match: 91.4%
          </span>
        </div>
      </div>

      {/* Grid Row 1: Line Chart & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Application Trend Line Chart */}
        <div className="lg:col-span-2 glass-panel p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Application Volume & Recruiter Views (Last 7 Days)
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
                <Line type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Submitted Applications" />
                <Line type="monotone" dataKey="views" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} name="Recruiter Resume Views" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Application Status Pie Chart */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" />
            Status Distribution
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid Row 2: Skill Demand vs Candidate Competency & Portal Success */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Skill Demand Bar Chart */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-400" />
            Skill Market Demand vs Candidate Competency
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillDemandData}>
                <XAxis dataKey="skill" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
                <Bar dataKey="demand" fill="#818cf8" radius={[6, 6, 0, 0]} name="Market Demand %" />
                <Bar dataKey="candidate" fill="#10b981" radius={[6, 6, 0, 0]} name="Candidate Match %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portal Success Rate Bar Chart */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Portal Response Rate Comparison (%)
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portalSuccessData} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="portal" type="category" stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="responseRate" fill="#06b6d4" radius={[0, 6, 6, 0]} name="Response Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
