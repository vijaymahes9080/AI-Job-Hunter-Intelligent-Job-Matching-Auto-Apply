# AI Job Hunter

An open-source, evidence-first career workspace. It combines public job discovery, transparent matching, skill-gap analysis, company and job research, interview practice, resume/ATS checks, salary and deadline intelligence, GitHub portfolio analysis and a human-approved application pipeline.

The interface is **light-only** and intentionally low-noise. Every engine separates verified evidence from generated recommendations.

## What it does

- **Job discovery** from Remotive, Greenhouse and Lever public APIs.
- **Transparent match scoring** with weighted factors, matching skills, missing skills and a published formula.
- **Skill gap analysis** persisted from real posting requirements and your verified profile.
- **Company intelligence** from fetched websites, careers pages, ATS boards and stored postings — never invented employee counts.
- **Job authenticity screening** with explicit risk indicators and a non-definitive verdict.
- **Duplicate guard** over normalised URLs, company/title similarity and existing applications.
- **Interview practice** with evidence-labelled questions, answer scoring and confidence tracking.
- **Career roadmap** generated from your measured gaps, with persisted milestone progress.
- **Deadline intelligence** for only explicitly published dates, plus manual verification.
- **Salary intelligence** for only explicitly published ranges, retaining the source snippet.
- **GitHub portfolio matcher** using public repositories and the GitHub REST API.
- **Application success analytics** with explicit numerators, denominators and unknown outcomes.
- **Human-approved applications**: Prepared → Approved → manually submitted on the employer site → submission evidence recorded.
- **Resume & ATS checks**, profile management, notifications and automation.

Direct auto-submission is deliberately not implemented. The platform never claims an application was sent without your recorded confirmation evidence.

## Stack

- React 19 + TypeScript + Vite
- Express 5 API, Zod validation, JWT cookies, bcrypt, CSRF and rate limits
- PostgreSQL in production; `pg-mem` for tests and a non-durable demo mode
- Vitest + Supertest
- Tailwind CSS with a small light-first design system
- Docker, Render and Vercel configuration
- Only open/public data sources; optional OpenAI-compatible open-weight AI endpoint

## Local development

Requirements: Node.js 22+.

```bash
npm install
cp .env.example .env
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:8787

Without `DATABASE_URL`, the API uses an in-memory demo database seeded with a demo user and 57 real public postings. The demo resets on restart.

Demo account:

```text
demo@aijobhunter.local
Demo@12345
```

## Production

Set `DATABASE_URL`, `JWT_SECRET` and `APP_URL`. Then:

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

The Express server serves the built frontend and the API on one origin. The container listens on `PORT` (default `8787`).

### Docker

```bash
docker compose up --build
```

This starts PostgreSQL and the app at http://localhost:8787. Change `POSTGRES_PASSWORD` and `JWT_SECRET` before any shared deployment.

### Render

`render.yaml` provisions a PostgreSQL database and a Docker web service. `APP_URL` is derived from Render's `RENDER_EXTERNAL_URL` automatically.

### Vercel

`vercel.json` and `api/index.ts` provide a serverless adapter. A PostgreSQL `DATABASE_URL` is required for durable data. Serverless instances are not suitable for the in-process scheduler; use the `/api/v1/internal/cron` endpoint with `CRON_SECRET` from an external scheduler instead.

## Tests and checks

```bash
npm run typecheck
npm test
npm run build
```

Current verification: 34 tests (21 API integration, 13 engine unit), TypeScript typecheck and a production build. See [docs/FEATURE_VERIFICATION_MATRIX.md](docs/FEATURE_VERIFICATION_MATRIX.md) for per-feature evidence and known limitations.

## Automation

- GitHub Actions CI (`.github/workflows/ci.yml`) runs typecheck, tests, build and a container build.
- Optional scheduled discovery workflow calls `/api/v1/internal/cron` when `APP_URL` and `CRON_SECRET` are configured.
- The server scheduler is opt-in via `ENABLE_SCHEDULER=true`.

## Data and honesty rules

- Salaries and deadlines are shown only when explicitly present in the source posting.
- Company facts come from fetched public pages or stored posting evidence.
- Missing/unknown outcomes are counted as unknown, never as rejections.
- AI is optional. Without a configured endpoint, deterministic engines run and say so.
- No fabricated skills, companies, salaries, deadlines, application outcomes or submission records.

## Documentation

- [Production audit](docs/PRODUCTION_AUDIT.md)
- [Feature verification matrix](docs/FEATURE_VERIFICATION_MATRIX.md)
- [Implementation report](docs/IMPLEMENTATION_REPORT.md)
- [.env.example](.env.example)

## License

MIT — see [LICENSE](LICENSE).
