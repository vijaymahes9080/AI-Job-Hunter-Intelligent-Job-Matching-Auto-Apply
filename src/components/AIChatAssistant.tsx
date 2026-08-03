import React, { useState } from 'react';
import { Bot, Send, Sparkles, User, HelpCircle, Code, Award, Zap, BookOpen } from 'lucide-react';
import { Job, CandidateProfile } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  quickActions?: { label: string; action: () => void }[];
}

interface AIChatAssistantProps {
  jobs: Job[];
  profile: CandidateProfile;
  onNavigateTab: (tab: string) => void;
}

export const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
  jobs,
  profile,
  onNavigateTab
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Hello ${profile.name}! I am your AI Job Hunter Career Coach. I have analyzed your resume skills (${profile.skills.slice(0, 4).join(', ')}) and 9 active job portals. How can I assist your job search today?`,
      timestamp: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');

  const quickPrompts = [
    'Find React & AI jobs',
    'Find Remote jobs',
    'Why is my match score 72% for some roles?',
    'How can I improve my resume ATS score?',
    'Practice Mock Interview'
  ];

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');

    // AI Agent Response Logic
    setTimeout(() => {
      let replyText = '';
      const qLower = query.toLowerCase();

      if (qLower.includes('react') || qLower.includes('ai') || qLower.includes('jobs') || qLower.includes('find')) {
        replyText = `I searched our 9 aggregated portals (LinkedIn, Naukri, Indeed, Foundit, Wellfound, etc.) and found 4 active roles matching React & AI Engineer with 90%+ match scores. Top recommendation: "Lead AI & Full Stack React Engineer" at Anthropic Systems (96% Match).`;
      } else if (qLower.includes('score') || qLower.includes('72%') || qLower.includes('why')) {
        replyText = `Your match score depends on exact ATS keyword overlap in your resume, experience level alignment, and preferred salary. For roles scoring around 72%, the gap is usually missing specific frameworks like PyTorch or GraphQL. Tailoring your resume using Version 1 in the Auto-Apply Queue boosts this score to 95%+!`;
      } else if (qLower.includes('improve') || qLower.includes('ats')) {
        replyText = `To boost your ATS score: 1) Use exact skill phrases from the job description in your experience bullets; 2) Include quantitative metrics (e.g., 'reduced API latency by 45%'); 3) Complete the suggested 'LangChain & LLM Architecture' course in the Dashboard.`;
      } else if (qLower.includes('interview') || qLower.includes('mock')) {
        replyText = `Great idea! Here is a sample question for Senior Full Stack AI roles: "How do you optimize React render loops when streaming real-time tokens from an LLM API?" Focus your answer on memoization, virtualization, and chunking.`;
      } else {
        replyText = `I have updated your AI match matrix against all active jobs. Your top matching skills are ${profile.skills.slice(0, 5).join(', ')}. Would you like me to tailor a resume or draft a cover letter for Anthropic Systems or Zomato AI?`;
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
      {/* Banner */}
      <div className="glass-panel p-6 flex items-center justify-between gap-4 gradient-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center">
            <Bot className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">AI Job Hunter Chat Assistant</h2>
            <p className="text-xs text-slate-300">Powered by OpenAI GPT-4o & Local Vector Match Engine</p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('jobs')}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
        >
          View Job Aggregator
        </button>
      </div>

      {/* Chat Workspace */}
      <div className="glass-panel p-6 flex flex-col h-[520px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map(m => (
            <div key={m.id} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'ai' && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-cyan-400" />
                </div>
              )}
              <div className={`max-w-xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none'
              }`}>
                <p>{m.text}</p>
                <span className="block text-[10px] text-slate-400 mt-2 text-right">{m.timestamp}</span>
              </div>
              {m.sender === 'user' && (
                <img 
                  src={profile.profilePhoto} 
                  alt="user"
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-indigo-500/40 shrink-0 mt-1" 
                />
              )}
            </div>
          ))}
        </div>

        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-1.5 py-3 border-t border-slate-800">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp)}
              className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-800 transition-colors"
            >
              ⚡ {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 pt-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI assistant about jobs, resume tuning, or interview tips..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={() => handleSend()}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
