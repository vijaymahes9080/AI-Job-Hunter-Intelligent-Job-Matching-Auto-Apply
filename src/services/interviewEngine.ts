import type { InterviewQuestion, InterviewSession } from '../types';

export const QUESTION_BANK: Record<string, InterviewQuestion[]> = {
  'Frontend Developer': [
    {
      id: 'q-fe-1',
      topic: 'React & Virtual DOM',
      question: 'How does React\'s Virtual DOM diffing algorithm work, and how can you optimize component re-renders?',
      modelAnswer: 'React maintains an in-memory Virtual DOM tree. When state changes, it creates a new Virtual DOM tree and compares it using the Reconciliation algorithm. Re-renders can be optimized using React.memo, useMemo, useCallback, and key props.',
      starTips: 'Explain the reconciliation process, O(n) heuristic assumption, and mention specific React hooks.',
      keyKeywords: ['Virtual DOM', 'Reconciliation', 'diffing', 'useMemo', 'React.memo', 're-render']
    },
    {
      id: 'q-fe-2',
      topic: 'Browser Performance',
      question: 'Describe your approach to optimizing Web Vitals (LCP, FID/INP, CLS) in a high-traffic Web application.',
      modelAnswer: 'For LCP, optimize image loading with webp formats, lazy loading, and priority hints. For INP/FID, break up long tasks, defer non-essential JS, and use web workers. For CLS, set explicit width/height dimensions on media elements.',
      starTips: 'Mention Core Web Vitals metrics by name and give concrete engineering remedies for each.',
      keyKeywords: ['LCP', 'CLS', 'INP', 'lazy loading', 'code splitting', 'critical rendering path']
    },
    {
      id: 'q-fe-3',
      topic: 'State Management',
      question: 'Compare Context API, Redux Toolkit, and Zustand. When would you choose one over another?',
      modelAnswer: 'Context API is built-in and great for global static data like themes or auth user info. Redux Toolkit provides strict immutability and devtools for large enterprise state. Zustand provides minimal boilerplate with selector subscriptions preventing unnecessary renders.',
      starTips: 'Discuss bundle size, state selector subscription efficiency, and architectural scale.',
      keyKeywords: ['Context', 'Redux', 'Zustand', 'state selectors', 'immutability', 'boilerplate']
    }
  ],
  'Full Stack Engineer': [
    {
      id: 'q-fs-1',
      topic: 'System Design & APIs',
      question: 'How would you design a scalable RESTful and GraphQL API layer for a multi-tenant SaaS application?',
      modelAnswer: 'Implement tenant isolation via JWT middleware, database tenant schemas or column IDs, rate limiting using Redis sliding window counters, and GraphQL dataloader to prevent N+1 query problems.',
      starTips: 'Cover security isolation, caching, rate limiting, and N+1 query prevention.',
      keyKeywords: ['Multi-tenant', 'JWT', 'Rate limiting', 'Redis', 'GraphQL', 'N+1 problem']
    },
    {
      id: 'q-fs-2',
      topic: 'Database Optimization',
      question: 'How do you diagnose and fix a slow SQL query in a PostgreSQL database under high throughput?',
      modelAnswer: 'Run EXPLAIN ANALYZE to identify sequential scans. Add appropriate B-tree or GIN indexes, optimize JOIN order, introduce database connection pooling (PgBouncer), and use read replicas for query distribution.',
      starTips: 'Use EXPLAIN ANALYZE terminology and mention indexing strategies and connection pooling.',
      keyKeywords: ['EXPLAIN ANALYZE', 'Index', 'B-tree', 'PgBouncer', 'Read replica', 'Sequential scan']
    }
  ],
  'AI / ML Engineer': [
    {
      id: 'q-ai-1',
      topic: 'LLM Fine-tuning & RAG',
      question: 'Explain the difference between Fine-Tuning a Large Language Model vs Retrieval-Augmented Generation (RAG).',
      modelAnswer: 'RAG dynamically injects retrieved knowledge into the prompt context from a vector database (e.g. FAISS/Pinecone) without altering model weights. Fine-tuning (e.g. LoRA/QLoRA) updates model weights to adapt tone, format, or specialized domain grammar.',
      starTips: 'Contrast real-time knowledge retrieval against weight modification and LoRA parameter efficiency.',
      keyKeywords: ['RAG', 'Vector database', 'FAISS', 'Fine-tuning', 'LoRA', 'Embeddings']
    },
    {
      id: 'q-ai-2',
      topic: 'Vector Search & Similarity',
      question: 'How does Cosine Similarity differ from Euclidean Distance in high-dimensional vector embeddings?',
      modelAnswer: 'Cosine Similarity measures the cosine of the angle between vectors, ignoring magnitude. Euclidean distance measures straight-line distance, affected by magnitude. Cosine is generally preferred for text semantics normalized in hyperspace.',
      starTips: 'Explain angle vs distance magnitude and why semantic text search normalizes vectors.',
      keyKeywords: ['Cosine similarity', 'Euclidean distance', 'Magnitude', 'Normalization', 'High-dimensional']
    }
  ]
};

export function getQuestionsForRole(role: string): InterviewQuestion[] {
  if (QUESTION_BANK[role]) {
    return QUESTION_BANK[role];
  }
  // Default fallback questions
  return [
    ...QUESTION_BANK['Frontend Developer'],
    ...QUESTION_BANK['Full Stack Engineer']
  ].slice(0, 3);
}

export function evaluateUserAnswer(
  question: InterviewQuestion,
  answerText: string
): { score: number; feedback: string; wpm: number; fillerCount: number } {
  const words = answerText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 5) {
    return {
      score: 30,
      feedback: 'Answer is too brief. Try using the STAR method (Situation, Task, Action, Result) to provide a complete response.',
      wpm: wordCount * 6,
      fillerCount: 0
    };
  }

  // Count keyword matches
  const lowerAnswer = answerText.toLowerCase();
  const matchedKeywords = question.keyKeywords.filter(k => lowerAnswer.includes(k.toLowerCase()));
  const keywordScore = Math.min(100, Math.round((matchedKeywords.length / question.keyKeywords.length) * 100));

  // Count filler words
  const fillers = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'sort of', 'kind of'];
  let fillerCount = 0;
  fillers.forEach(f => {
    const matches = lowerAnswer.match(new RegExp(`\\b${f}\\b`, 'gi'));
    if (matches) fillerCount += matches.length;
  });

  // Calculate overall score
  const lengthBonus = Math.min(25, wordCount);
  const totalScore = Math.min(100, Math.max(40, Math.round(keywordScore * 0.65 + lengthBonus - fillerCount * 3)));

  let feedback = `Good effort! You matched ${matchedKeywords.length}/${question.keyKeywords.length} key technical concepts. `;
  if (matchedKeywords.length > 0) {
    feedback += `Key concepts mentioned: ${matchedKeywords.join(', ')}. `;
  } else {
    feedback += `Consider including concepts like: ${question.keyKeywords.slice(0, 3).join(', ')}. `;
  }

  if (fillerCount > 2) {
    feedback += `Note: Detected ${fillerCount} filler words. Practicing silent pauses will boost your executive presence.`;
  }

  return {
    score: totalScore,
    feedback,
    wpm: Math.round(wordCount * 1.5 + 110),
    fillerCount
  };
}
