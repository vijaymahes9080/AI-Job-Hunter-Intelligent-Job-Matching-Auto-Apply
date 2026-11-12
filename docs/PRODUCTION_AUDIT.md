# Production Audit

Date: 2026-11-12
Repository: AI Job Hunter (`D:\current project\job hunter`)

## 1. Audit scope

The original repository was a frontend-heavy prototype. Several components claimed autonomous multi-portal submission, fabricated demo outcomes and used proprietary/partner API placeholders. This audit covers the replacement implementation:

- React 19 + TypeScript + Vite frontend, light-only design.
- Express 5 API with PostgreSQL persistence and a `pg-mem` fallback.
- Ten career-intelligence modules and 19 functional navigation pages.
- Authentication, validation, error handling and deployment configuration.
- Automated tests, typecheck and production build.

## 2. Architecture

```text
src/                       React application (19 pages)
  lib/api.ts               Typed API client with CSRF handling
  lib/session.tsx          HttpOnly-cookie session state, light theme
  components/              Shell, auth, job cards, modal, UI primitives
  pages/                   Dashboard, discovery, research, apply, account
server/src/
  app.ts                   Route composition and validation
  auth.ts                  JWT cookies, bcrypt, CSRF
  middleware.ts            Origin guard, errors, request IDs, Zod
  db/                      PostgreSQL / pg-mem adapter, schema, demo seed
  services/                Evidence engines and persistence services
shared/types.ts            API contracts shared by web and server
api/index.ts               Vercel serverless adapter
```

The same Express application runs locally, in Docker, on Render and (via adapter) on Vercel. The production container serves both the built frontend and `/api/v1`.

## 3. Security findings and controls

| Area | Implementation |
| --- | --- |
| Passwords | bcrypt hashing; no plaintext storage |
| Sessions | HttpOnly, SameSite=Lax cookie; JWT with 7-day TTL |
| CSRF | Double-submit token; Bearer requests are exempt |
| Origin checks | State-changing requests validated against `APP_URL` / `APP_ORIGINS` |
| SQL injection | Parameterised queries throughout; no string interpolation of user input |
| Input validation | Zod schemas on every mutating endpoint and query parsing |
| Rate limiting | Global, login and expensive-research limiters |
| Headers | Helmet; CSP, frame denial, nosniff, referrer policy |
| Uploads | MIME + size limits, PDF/DOCX/TXT parsing only, no execution |
| Authorisation | Every candidate record query is scoped by `user_id` |
| Error leakage | Stable API error codes; stack traces only in non-production logs |

## 4. Data integrity

- Application uniqueness is enforced for `(candidate_id, job_id)`, `(candidate_id, normalised_apply_url)` and idempotency keys.
- Status transitions are validated. Unknown outcomes are not converted into rejections.
- Salary evidence is stored only when the posting explicitly contains a range. Inverted ranges are rejected, not repaired.
- Deadlines are stored with a verification state. `Needs Verification`, `Not Specified` and `Deadline Passed` are distinct.
- Company research only reports fetched pages, ATS posting counts and stored evidence. Employee counts or revenue are not invented.
- Authentication, CSRF, job ownership, application ownership and notification ownership are covered by integration tests.

## 5. Accessibility and frontend quality

- Single light theme (`color-scheme: light`) with consistent contrast tokens.
- Semantic navigation, buttons, labels, roles and `aria-*` state on controls.
- Visible focus rings; keyboard-operable modals and menus; reduced-motion support.
- Responsive layout from mobile through wide desktop.
- All 19 routes are reachable from the sidebar and protected by the auth gate.
- Loading, empty and error states exist on every data-driven page.
- Legacy prototype components/services were removed to keep one frontend architecture.

## 6. Performance

- Route-level code is bundled into vendor/icons/charts chunks; Recharts is isolated.
- No external font requests or third-party scripts; the UI uses the system font stack.
- API pagination is applied to job discovery; lists are bounded.
- External fetches use timeouts and failure isolation.
- GitHub and company research calls are on-demand, not on page load.

## 7. Deployment readiness

Prepared:

- Multi-stage `Dockerfile` with non-root runtime and healthcheck.
- `docker-compose.yml` with PostgreSQL 16 and persistent volume.
- `render.yaml` with managed PostgreSQL.
- `vercel.json` + `api/index.ts` serverless adapter.
- `.env.example` covering every runtime option.
- `.github/workflows/ci.yml`: typecheck, tests, build, container build.
- `.github/workflows/scheduled-discovery.yml`: optional cron trigger.

Verified in this environment:

- `npm run typecheck` passes.
- `npm test` passes: 34/34.
- `npm run build` passes (web + server assets).
- Production server smoke tests pass for auth, pages and core API flows.

Not verified in this environment (honest limitation):

- No local Docker engine or PostgreSQL server was available, so the container image and live PostgreSQL migration were not executed here. The schema and queries are exercised through `pg-mem`, but production DB behaviour should be rechecked on the target host.
- No hosting credentials were available; no public URL was deployed by this audit.
- Vercel serverless execution and cross-invocation caching were not run. PostgreSQL is required for durable serverless data.
- External GitHub/company website calls depend on network access and rate limits; CI tests use persisted evidence to avoid flaky network dependencies.

## 8. Residual risks

1. **Serverless durability** — `pg-mem` must never be used for production. `ALLOW_DEMO_DB=false` and `DATABASE_URL` are required.
2. **Scheduler in serverless** — in-process scheduling does not survive serverless cold starts; use the authenticated cron endpoint.
3. **External data drift** — public postings can close or change after retrieval. The UI exposes retrieval timestamps and deadline verification states.
4. **ATS scoring is advisory** — no ATS vendor publishes an open scoring standard. The app states this rather than claiming a guaranteed score.
5. **AI optionality** — no AI provider is bundled. Generated content is labelled and never presented as verified fact.

## 9. Verdict

The implementation is deploy-ready as a single Docker/Render service with PostgreSQL. It is not a zero-configuration production system: `DATABASE_URL`, `JWT_SECRET` and `APP_URL` must be provided, and the target environment must be smoke-tested. Claims of automatic employer submission, guaranteed interviews or proprietary data enrichment were removed.
