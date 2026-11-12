# Implementation Report

Date: 2026-11-12

## Objective

Replace the prototype's simulated and overstated behaviour with a production-oriented, evidence-driven career workspace. The result uses a real Express/PostgreSQL backend, ten functional intelligence modules, 19 navigable pages, automated tests and deployable configuration.

## What was built

### Backend

- Express 5 application with `/api/v1` routing, request IDs, structured logging and stable error envelopes.
- PostgreSQL schema and migration with indexes; `pg-mem` adapter for tests and non-durable demo mode.
- HttpOnly-cookie JWT authentication, bcrypt password hashing, CSRF double-submit protection and origin checks.
- Zod validation on mutating endpoints and query parameters.
- Per-user ownership enforcement for jobs, profiles, applications, interviews, roadmaps, notifications and analyses.
- Public job discovery with Remotive, Greenhouse and Lever.
- Public GitHub REST analysis, optional server-side token.
- Optional OpenAI-compatible open-weight LLM integration. Without configuration the deterministic engines run.
- Opt-in scheduler and authenticated `/api/v1/internal/cron` endpoint for external automation.

### Evidence engines

- Deterministic weighted match engine with published formula.
- Skill-gap aggregation from persisted postings.
- Salary parser that accepts only explicit source ranges and currency evidence.
- Deadline parser with `Open`, `Closing Soon`, `Deadline Passed`, `Not Specified`, `Needs Verification`.
- Job authenticity indicators with a non-definitive verdict.
- Duplicate detection by normalised URL, company/title similarity and application history.
- Company research from fetched pages, ATS evidence and stored postings.
- Interview question generation and structured answer evaluation.
- Career roadmap generated from measured gaps with persisted milestones.
- Resume PDF/DOCX/TXT parsing and transparent ATS rule checks.
- GitHub portfolio analysis from public repositories.
- Analytics with explicit numerators, denominators and unknown-outcome handling.

### Application workflow

The pipeline is deliberately human-controlled:

```text
Prepared → Approved → manually submitted on employer site → submission evidence recorded
                                                ↓
                         Assessment / Interview / Offer / Rejected / Withdrawn
```

- A submission cannot be recorded without a confirmation URL or reference.
- Status transitions are validated.
- Unknown outcomes remain unknown rather than defaulting to rejection.
- Duplicate overrides require a recorded reason.
- Application content, screening answers, notes and the full event history are persisted.

### Frontend

- Replaced the legacy prototype `App.tsx` with an auth-gated hash-router shell.
- 19 pages, all protected and reachable from the sidebar.
- Removed all legacy prototype components, services, mock data and obsolete assets.
- Single **light-only** theme, system font stack, no external font requests.
- Simplified visual system: flat white surfaces, subtle borders, solid indigo accent, reduced shadows and motion.
- Responsive sidebar, mobile navigation, accessible controls, keyboard-dismissable modals.
- Shared typed API client with CSRF handling.
- Every data page has loading, empty and error states, plus mutation feedback.

### Deployment and automation

- Multi-stage `Dockerfile` with non-root user and healthcheck.
- `docker-compose.yml` with PostgreSQL 16.
- `render.yaml` with managed PostgreSQL and generated JWT secret.
- Vercel serverless adapter and CSP headers.
- `.env.example` documenting all runtime configuration.
- GitHub Actions CI: install, typecheck, tests, build, container build.
- Optional scheduled discovery workflow using the cron secret.

## Verification performed

| Command | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm test` | 34/34 pass |
| `npm run build` | Pass |
| Production server start | Pass |
| Auth/login/demo smoke test | Pass |
| Jobs, match, skill gap, company, authenticity, duplicate checks | Pass |
| Prepare/approve/evidence-backed submit | Pass |
| Interview session, roadmap, deadlines, analytics, notifications | Pass |
| Integrations/settings status | Pass |

Test files:

- `server/test/api.test.ts` — 21 integration tests.
- `server/test/engine.test.ts` — 13 unit tests.

## Design decisions

1. **Single-origin deployment** — Express serves the built SPA and API. This avoids CORS complexity and keeps cookies simple.
2. **PostgreSQL or explicit demo mode** — Production refuses to start without `DATABASE_URL` unless the operator explicitly opts into a non-durable demo.
3. **No auto-submission** — Employer application flows require the candidate's action and evidence. Simulating submission would violate the evidence rules.
4. **No proprietary data** — Only open/public sources are used. Operator credentials are optional for GitHub rate limits and AI.
5. **Light-only UI** — Requested simplification; one contrast profile is easier to verify and avoids an unmaintained dark variant.
6. **Deterministic first** — AI is an optional enhancement, not a dependency or source of unverifiable facts.

## Known limitations

- Docker, live PostgreSQL and public deployment could not be executed in this environment. Configuration is provided; target-environment smoke testing remains required.
- Vercel serverless data persistence requires PostgreSQL; `pg-mem` is intentional demo-only.
- In-process scheduling is unsuitable for serverless; use the cron endpoint.
- External GitHub/company fetch results depend on network availability and rate limits.
- ATS checks are advisory and do not replicate any specific employer's ATS.
- The application does not submit to employer portals automatically.

## How to run

```bash
npm install
cp .env.example .env
npm run dev
```

Demo: `demo@aijobhunter.local` / `Demo@12345`

Production:

```bash
npm ci
npm run build
NODE_ENV=production DATABASE_URL=... JWT_SECRET=... APP_URL=... npm start
```

Deployment options: Docker Compose, Render blueprint or Vercel adapter. See `README.md` and `docs/PRODUCTION_AUDIT.md`.
