import React, { useState } from 'react';
import { 
  Mic, 
  Volume2, 
  Sparkles, 
  Award, 
  Activity, 
  BrainCircuit, 
  Target,
  ArrowRight
} from 'lucide-react';
import type { CandidateProfile, InterviewSession, InterviewQuestion } from '../types';
import { getQuestionsForRole, evaluateUserAnswer } from '../services/interviewEngine';

interface AIInterviewSimulatorProps {
  profile: CandidateProfile;
  onDeductCredit: () => void;
}

export const AIInterviewSimulator: React.FC<AIInterviewSimulatorProps> = ({ profile, onDeductCredit }) => {
  const selectedRole = profile.preferredRoles[0] || 'Frontend Developer';
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const startNewSession = () => {
    onDeductCredit();
    const questions = getQuestionsForRole(selectedRole);
    const newSession: InterviewSession = {
      id: `interview-${Date.now()}`,
      targetRole: selectedRole,
      questions,
      currentQuestionIndex: 0,
      userAnswers: {},
      totalScore: 0,
      status: 'In Progress',
      createdAt: new Date().toLocaleDateString()
    };
    setSession(newSession);
    setCurrentIdx(0);
    setAnswerInput('');
  };

  const handleSpeakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Speech synthesis is not supported in this browser.');
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simulate live recording input typing preview
      if (answerInput === '') {
        setAnswerInput('In my previous role, I designed a Virtual DOM reconciliation strategy that reduced component re-renders by using React.memo and useMemo hooks...');
      }
    } else {
      setIsRecording(false);
    }
  };

  const submitCurrentAnswer = () => {
    if (!session) return;
    const q = session.questions[currentIdx];
    const evalResult = evaluateUserAnswer(q, answerInput);

    const updatedAnswers = {
      ...session.userAnswers,
      [q.id]: {
        answer: answerInput,
        ...evalResult
      }
    };

    const nextIdx = currentIdx + 1;
    const isFinished = nextIdx >= session.questions.length;

    let avgScore = 0;
    if (isFinished) {
      const scores = Object.values(updatedAnswers).map(a => a.score);
      avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    setSession({
      ...session,
      currentQuestionIndex: nextIdx,
      userAnswers: updatedAnswers,
      totalScore: isFinished ? avgScore : session.totalScore,
      status: isFinished ? 'Completed' : 'In Progress'
    });

    if (!isFinished) {
      setCurrentIdx(nextIdx);
      setAnswerInput('');
    }
  };

  const currentQ: InterviewQuestion | undefined = session?.questions[currentIdx];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> AI Speech & STAR Simulator
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Technical Mock Interviewer
            </h1>
            <p className="text-slate-400 mt-1 max-w-xl">
              Practice real-time technical questions tailored for <span className="text-indigo-400 font-semibold">{selectedRole}</span>. Receive STAR scoring, filler word counts, and WPM pace analysis.
            </p>
          </div>

          <button
            onClick={startNewSession}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2"
          >
            <BrainCircuit className="w-5 h-5" />
            {session ? 'Restart New Session' : 'Start AI Interview'}
          </button>
        </div>
      </div>

      {!session ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Ace Your Next Technical Interview?</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            Click "Start AI Interview" to generate interactive questions with real audio playback, STAR evaluation metrics, and AI recommendations.
          </p>
        </div>
      ) : session.status === 'Completed' ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Interview Session Completed!</h2>
            <p className="text-slate-400">Overall Technical Readiness Score</p>
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              {session.totalScore}%
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-4">
            {session.questions.map((q, idx) => {
              const res = session.userAnswers[q.id];
              return (
                <div key={q.id} className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      Q{idx + 1}: {q.topic}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {res?.score || 0}% Score
                    </span>
                  </div>
                  <h4 className="font-semibold text-white text-sm">{q.question}</h4>
                  <p className="text-xs text-slate-300 italic bg-slate-900 p-3 rounded-xl border border-slate-800">
                    "{res?.answer || 'No answer provided'}"
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>⚡ Pace: {res?.wpm || 0} WPM</span>
                    <span>⚠️ Fillers: {res?.fillerCount || 0}</span>
                  </div>
                  <p className="text-xs text-emerald-400/90">{res?.feedback}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Question & Answer Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Question {currentIdx + 1} of {session.questions.length} • {currentQ?.topic}
                </span>
                <button
                  onClick={() => currentQ && handleSpeakQuestion(currentQ.question)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSpeaking 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  {isSpeaking ? 'Speaking...' : 'Audio Listen'}
                </button>
              </div>

              <h2 className="text-xl font-bold text-white leading-relaxed">
                {currentQ?.question}
              </h2>

              {/* Speech / Text Answer Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" /> Your Response (Speak or Type)
                  </label>
                  <button
                    onClick={toggleRecording}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      isRecording 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' 
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {isRecording ? 'Listening (Click to Stop)' : 'Start Voice Input'}
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Explain your approach using the STAR method (Situation, Task, Action, Result)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                />
              </div>

              <div className="flex justify-end">
                <button
                  disabled={!answerInput.trim()}
                  onClick={submitCurrentAnswer}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition-all"
                >
                  Submit & Next Question <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tips & STAR Guidance Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" /> STAR Framework Guidance
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {currentQ?.starTips}
              </p>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-400">Target Technical Keywords:</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentQ?.keyKeywords.map(k => (
                    <span key={k} className="text-xs px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-purple-400" /> AI Evaluator Metrics
              </h4>
              <div className="text-xs space-y-2 text-slate-400">
                <div className="flex justify-between">
                  <span>Speech Rate Target:</span>
                  <span className="text-slate-200 font-semibold">120 - 150 WPM</span>
                </div>
                <div className="flex justify-between">
                  <span>Filler Word Limit:</span>
                  <span className="text-slate-200 font-semibold">&lt; 2 per answer</span>
                </div>
                <div className="flex justify-between">
                  <span>Keyword Weight:</span>
                  <span className="text-emerald-400 font-semibold">65% of Score</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
