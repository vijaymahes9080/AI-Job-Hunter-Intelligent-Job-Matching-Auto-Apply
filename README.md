# 🚀 AI Job Hunter – Intelligent Job Matching & Auto Apply SaaS Platform

![Version](https://img.shields.io/badge/version-1.0.0-indigo.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-cyan.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Mode](https://img.shields.io/badge/Mode-Zero--Fee%20Online%20Mode-emerald.svg)

> **AI Job Hunter** is an intelligent, multi-portal job aggregation, AI semantic matching, ATS resume tailoring, cover letter generation, and approval-first auto-apply web platform. Designed for both technical experts and non-technical users seeking an effortless, zero-learning-curve job search.

---

## 🎨 Visual Platform Showcase

![AI Job Hunter Dashboard](public/images/dashboard_mockup.png)
*SaaS Candidate Dashboard with BERT Vector Similarity Metrics, Job Matching Pipeline, and Portal Aggregator.*

<br/>

![AI Technical Mock Interviewer](public/images/interview_simulator_mockup.png)
*AI Technical Mock Interviewer Studio with STAR Framework Evaluation & Live Audio Voice Feedback.*

<br/>

![Autonomous Multi-Agent Job Scout](public/images/agent_scout_mockup.png)
*Autonomous Multi-Agent Job Scout Control Hub with Live Webhook Alerts (Discord, Slack, Telegram).*

---

## 🌟 Key Features

### 1. ⚡ 1-Click Guided Quick Start Wizard (Zero-Knowledge Mode)
- A 3-step automated wizard (**Connect/Upload -> Target Role -> 1-Click Launch**) designed for users without domain knowledge.
- Automatically aggregates jobs across 9 portals, extracts resume skills, tailors ATS resumes, and queues applications for 1-click approval.

### 2. 🌐 Multi-Portal Job Aggregator
Aggregates job listings in real-time from 9 top job portals & ATS platforms:
- **LinkedIn Jobs**
- **Naukri**
- **Indeed**
- **Foundit (Monster)**
- **Wellfound (AngelList)**
- **Glassdoor**
- **Greenhouse**
- **Lever**
- **Ashby**
- **Company Career Pages**

### 3. 🎯 AI Semantic Match Engine (0 - 100%)
- Uses **Sentence Transformers (BERT)** and **FAISS Vector Cosine Similarity** to compare candidate profiles against job descriptions.
- Transparent, explainable breakdown matrix showing:
  - **Matching Candidate Skills** (Green chips)
  - **Missing Skills to Highlight** (Amber chips)
  - **Experience Level Gap Analysis**
  - **Salary Overlap & Location Match Score**

### 4. 📄 AI ATS Resume Tailoring Studio
- Generates 3 ATS-Optimized tailored resume variants per job:
  - **Version 1**: ATS Keyword-Optimized (High parser score)
  - **Version 2**: Technical Deep-Dive Focus
  - **Version 3**: Business Impact & Leadership
- Real-time diff view highlighting exact reworded bullet points and AI rationales.

### 5. ✍️ Multi-Tone Cover Letter Generator
- Auto-generates customized cover letters in 5 distinct tones:
  - **Professional**, **Friendly**, **Formal**, **Startup**, **Enterprise**.
- Live interactive editor with 1-click clipboard copy.

### 6. 🛡️ Approval-First Auto-Apply Queue
- Human-in-the-loop application queue adhering strictly to portal OAuth boundaries and terms of service.
- Review customized resumes and auto-filled screening answers before 1-click submission.
- Animated application transmission simulator with celebration confetti!

### 7. 🎙️ AI Technical Mock Interviewer Studio
- Interactive AI Interview Simulator with browser speech synthesis and voice input support.
- Role-specific question generator with STAR framework scoring, confidence gauge, WPM pace tracking, and filler word detection.

### 8. 🤖 Autonomous Multi-Agent Job Scout & Webhooks
- 24/7 background agent scouting simulated job feeds, auto-tailoring resumes for >85% matches, and dispatching real-time Webhook notifications (Discord, Slack, Telegram).

### 9. 🛡️ Visual ATS Resume Heatmap & Audit Studio
- Parses uploaded resumes for Applicant Tracking System (ATS) readability score, keyword density heatmap, formatting risks, and 1-click ATS auto-repair.

### 10. 📈 10x Daily Contribution Activity & GitHub Sync Engine
- In-app 365-day contribution heatmap tracking application submissions and interview practice, backed by automated Node.js benchmark sync scripts (`scripts/generate_contributions.js`) and GitHub Action workflows.

### 11. 🌐 Ready-to-Load Manifest V3 Chrome Extension Exporter
- 1-Click downloader for Manifest V3 Chrome Extension source code to scrape job details directly from LinkedIn, Indeed, and Glassdoor into the workspace.

### 12. 💰 AI Salary & Offer Negotiation Copilot
- Regional salary percentiles breakdown (25th, 50th, 75th, 90th), equity calculator, and tailored counter-offer email generator.

### 13. 🏢 Multi-Role SaaS Architecture
- **Job Seeker Workspace**: Candidate dashboard, job search, resume studio, interview simulator, agent scout, auto-apply queue, tracker, AI career coach.
- **Recruiter & Hiring Hub**: Post job openings, search candidate pool, and view AI match rankings.
- **SaaS Admin Center**: AI model configuration, similarity metrics, multi-tenant workspace controls, and audit logs.

### 8. 💳 Subscription Tiers & AI Credit Meter
- Multi-tier membership (**Free**, **Pro $29/mo**, **Premium $79/mo**).
- Real-time AI Credit tracking and usage meters.

---

## 🏗️ Platform Architecture

```text
                           AI JOB HUNTER PLATFORM
                                     │
      ┌──────────────────────────────┼──────────────────────────────┐
      │                              │                              │
  Job Seeker                    Recruiter                         Admin
      │                              │                              │
      └──────────────────────────────┼──────────────────────────────┘
                                     │
                           React + TypeScript SPA
                                     │
                   Authentication (OAuth 2.0 + JWT)
                                     │
────────────────────────────── API Gateway ──────────────────────────────
                                     │
      ┌───────────────┬──────────────┼───────────────┬──────────────┐
      │               │              │               │              │
 User Service    Job Service     AI Engine     Auto-Apply Queue  Analytics
      │               │              │               │              │
      └───────────────┴──────────────┼───────────────┴──────────────┘
                                     │
─────────────────────────────────────────────────────────────────────────
                           Microservices Layer
─────────────────────────────────────────────────────────────────────────
  Resume Parser (PDF/DOCX) ──► Skill Extractor ──► Embedding Generator (BERT)
                                                            │
  Job Description Embeddings ─────────────────────► FAISS Vector Similarity
                                                            │
  Match Score & Recommendations ◄───────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Animations & Charts** | Framer Motion, Recharts, Canvas-Confetti |
| **AI / Semantic Engine** | OpenAI API, Sentence Transformers (Local BERT), FAISS Vector Index |
| **Parser & Storage** | Client-side PDF/DOCX Parser, LocalStorage Persistence API |
| **Auth & Compliance** | OAuth 2.0 Direct Auth Sync, Zero Password Storage Policy |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/vijaymahes9080/AI-Job-Hunter.git
   cd AI-Job-Hunter
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Launch Live Development Server**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173/`

4. **Build Production Bundle**
   ```bash
   npm run build
   ```

---

## 📁 Directory Structure

```text
AI-Job-Hunter/
├── src/
│   ├── components/            # React UI Components
│   │   ├── Navbar.tsx         # Header, Role Switcher, AI Credits, Simple Mode
│   │   ├── Dashboard.tsx      # Metrics KPIs, Urgent High-Match Jobs, Pipeline
│   │   ├── JobSearch.tsx      # Multi-Portal Job Aggregator & Filters
│   │   ├── JobDetailModal.tsx # Granular Match Score Explanation Modal
│   │   ├── CandidateProfile.tsx # Resume Uploader & LinkedIn OAuth Sync
│   │   ├── AutoApplyWorkflow.tsx # Approval-First Auto-Apply Queue
│   │   ├── AICoverLetterStudio.tsx # Multi-Tone Cover Letter Editor
│   │   ├── ApplicationTracker.tsx # Kanban & Table Application Tracker
│   │   ├── AIChatAssistant.tsx # Interactive AI Chatbot & Mock Interview Coach
│   │   ├── AnalyticsView.tsx  # Dynamic Recharts Analytics Visuals
│   │   ├── AdminPanel.tsx     # AI Models, Vector Indexes & Logs
│   │   ├── QuickStartWizard.tsx # 1-Click Guided Wizard for Zero-Knowledge Users
│   │   ├── RecruiterPortal.tsx # Hiring Manager Candidate Sourcing Hub
│   │   └── SubscriptionModal.tsx # SaaS Pricing Tiers & Credit Top-Up
│   ├── services/              # Core Services & AI Engines
│   │   ├── aiMatchEngine.ts   # BERT & FAISS Similarity Calculation
│   │   ├── resumeOptimizer.ts # ATS Resume Tailoring Engine (v1, v2, v3)
│   │   ├── coverLetterGenerator.ts # Multi-Tone Cover Letter Generator
│   │   ├── resumeParser.ts    # PDF/DOCX Text Extractor
│   │   └── storage.ts         # LocalStorage Persistence Helper
│   ├── types/                 # TypeScript Interfaces & Models
│   ├── data/                  # Initial Multi-Portal Jobs & Mock Data
│   ├── App.tsx                # Main Application Orchestrator
│   └── main.tsx               # Entry Point
├── package.json
├── composer.json
├── tailwind.config.js
└── README.md
```

---

## 👤 Developer Info & Author

**Vijay Mahes**
- **GitHub**: [@vijaymahes9080](https://github.com/vijaymahes9080)
- **Repository**: [https://github.com/vijaymahes9080/AI-Job-Hunter.git](https://github.com/vijaymahes9080/AI-Job-Hunter.git)
- **Email**: [Vijaypradhap2004@gmail.com](mailto:Vijaypradhap2004@gmail.com)

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).
