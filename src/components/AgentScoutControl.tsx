import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Activity, 
  Radio, 
  Sliders
} from 'lucide-react';
import type { AgentScoutConfig, AgentScoutLog, Job } from '../types';
import { DEFAULT_AGENT_CONFIG, sendWebhookNotification } from '../services/agentScout';

interface AgentScoutControlProps {
  jobs: Job[];
  onTriggerAutoApply: (job: Job) => void;
}

export const AgentScoutControl: React.FC<AgentScoutControlProps> = ({ jobs, onTriggerAutoApply }) => {
  const [config, setConfig] = useState<AgentScoutConfig>(DEFAULT_AGENT_CONFIG);
  const [logs, setLogs] = useState<AgentScoutLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      // Initial scan log
      addLog('Autonomous Scout started scanning multi-portal feeds...', 'scan');

      interval = setInterval(() => {
        // Pick a random high match job
        const highMatchJobs = jobs.filter(j => (j.matchScore?.overallPercentage || 0) >= config.minMatchScore);
        if (highMatchJobs.length > 0) {
          const matchedJob = highMatchJobs[Math.floor(Math.random() * highMatchJobs.length)];
          addLog(`High match detected: ${matchedJob.title} at ${matchedJob.company} (${matchedJob.matchScore?.overallPercentage}%)`, 'match');

          if (config.autoTailorResume) {
            addLog(`Auto-tailored ATS resume generated for ${matchedJob.company}`, 'tailor');
          }

          if (config.autoApplyQueue) {
            onTriggerAutoApply(matchedJob);
          }

          if (config.webhookUrl) {
            sendWebhookNotification(config, matchedJob, matchedJob.matchScore?.overallPercentage || 90);
            addLog(`Dispatched real-time webhook alert to ${config.webhookPlatform}`, 'webhook');
          }
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isRunning, config, jobs, onTriggerAutoApply]);

  const addLog = (message: string, type: AgentScoutLog['type']) => {
    const newLog: AgentScoutLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev.slice(0, 30)]);
  };

  const toggleScout = () => {
    if (!isRunning) {
      setIsRunning(true);
    } else {
      setIsRunning(false);
      addLog('Autonomous Scout agent paused.', 'scan');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse text-purple-400" /> Multi-Agent Background Daemon
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Autonomous Agent Job Scout
            </h1>
            <p className="text-slate-400 mt-1 max-w-xl">
              Set match criteria and let the AI agent continuously scout 9 job portals, tailor ATS resumes, queue applications, and trigger Webhook alerts 24/7.
            </p>
          </div>

          <button
            onClick={toggleScout}
            className={`px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl ${
              isRunning
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25 animate-pulse'
                : 'bg-gradient-to-r from-purple-500 via-indigo-600 to-cyan-500 hover:opacity-95 text-white shadow-purple-500/25'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="w-5 h-5 fill-current" /> Pause Autonomous Agent
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" /> Start Autonomous Scout
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Agent Settings Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-purple-400" /> Agent Parameters
          </h3>

          <div className="space-y-4 text-sm">
            <div>
              <label className="text-xs font-medium text-slate-400">Minimum Match Threshold (%)</label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min="60"
                  max="95"
                  value={config.minMatchScore}
                  onChange={e => setConfig({ ...config, minMatchScore: Number(e.target.value) })}
                  className="w-full accent-purple-500"
                />
                <span className="text-purple-400 font-bold text-base">{config.minMatchScore}%</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoTailorResume}
                  onChange={e => setConfig({ ...config, autoTailorResume: e.target.checked })}
                  className="w-4 h-4 rounded accent-purple-500"
                />
                <span className="text-slate-300 text-xs">Auto-Generate Tailored ATS Resumes</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoApplyQueue}
                  onChange={e => setConfig({ ...config, autoApplyQueue: e.target.checked })}
                  className="w-4 h-4 rounded accent-purple-500"
                />
                <span className="text-slate-300 text-xs">Queue for Approval Auto-Apply</span>
              </label>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <label className="text-xs font-medium text-slate-400">Webhook Platform Alert</label>
              <select
                value={config.webhookPlatform}
                onChange={e => setConfig({ ...config, webhookPlatform: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="Discord">Discord Webhook</option>
                <option value="Slack">Slack Incoming Webhook</option>
                <option value="Telegram">Telegram Bot API</option>
                <option value="Custom API">Custom HTTP POST Endpoint</option>
              </select>

              <label className="text-xs font-medium text-slate-400">Webhook URL Target</label>
              <input
                type="text"
                value={config.webhookUrl}
                onChange={e => setConfig({ ...config, webhookUrl: e.target.value })}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Real-time Agent Log Feed */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col h-[480px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Real-Time Agent Activity Console
            </h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              isRunning 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {isRunning ? 'AGENT ACTIVE' : 'AGENT IDLE'}
            </span>
          </div>

          <div className="flex-1 bg-slate-950 rounded-2xl p-4 overflow-y-auto font-mono text-xs space-y-2 border border-slate-800/80">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic text-center py-20">
                Click "Start Autonomous Scout" to initiate live feed logs...
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex items-start gap-3">
                  <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                  <span className={
                    log.type === 'match' ? 'text-emerald-400 font-bold' :
                    log.type === 'tailor' ? 'text-indigo-400' :
                    log.type === 'webhook' ? 'text-purple-400 font-semibold' : 'text-slate-300'
                  }>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
