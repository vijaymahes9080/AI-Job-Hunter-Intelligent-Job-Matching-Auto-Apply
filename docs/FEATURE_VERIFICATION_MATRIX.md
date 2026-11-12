# Feature Verification Matrix

Date: 2026-11-12
Status key: **Verified** = implemented, exercised by automated test(s) and/or production build. **Verified (network-dependent)** = implementation is real but live third-party availability is outside CI. **Declared limitation** = intentionally not implemented.

## Automated verification baseline

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm test` | 34/34 pass (21 API integration, 13 engine unit) |
| `npm run build` | Pass (web + server) |
| Production API smoke test | Pass |
| PostgreSQL live migration | Not run locally (no PostgreSQL/Docker available) |
| Public deployment | Not performed (no hosting credentials) |

## Ten core features

| # | Feature | Backend | Persistence | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Skill Gap Intelligence | `POST /api/v1/skills/gap`, `GET /api/v1/skills/gap/latest` | Gap reports stored per user | Integration test asserts explicit weights and persisted latest report; unit tests cover missing/partial skills | Verified |
| 2 | Company Intelligence | `GET /api/v1/companies`, `POST /api/v1/companies/research` | Research reports + posting evidence | API test confirms company evidence does not invent employee counts; research fetches public site/ATS data | Verified (network-dependent for fresh fetch) |
| 3 | Job Authenticity | `POST/GET /api/v1/jobs/:id/authenticity` | Authenticity results stored | API + unit tests cover payment requests, short descriptions and low-risk ATS records | Verified |
| 4 | Duplicate Guard | `POST /api/v1/jobs/:id/duplicates`; prepare-time enforcement | Applications + normalised URL uniqueness | API test prepares/approves/submits; engine tests cover URL normalisation and conservative title similarity | Verified |
| 5 | Interview Prep | `POST /api/v1/interviews`, `POST /:id/answers`, `POST /:id/complete` | Sessions, answers, scores | API test creates, answers and completes a session; unit test checks evidence-labelled questions | Verified |
| 6 | Career Roadmap | `POST/GET /api/v1/roadmaps`, `PATCH /:id/milestones/:key` | Roadmaps + milestone progress | API test asserts eight stages and persisted milestone update | Verified |
| 7 | Deadline Intelligence | `GET /api/v1/deadlines`, `POST /api/v1/deadlines/scan`, `PATCH /api/v1/jobs/:id/deadline` | Jobs + notifications | API tests cover manual deadline, closing-soon detection, verified deadline update and alert scan | Verified |
| 8 | Salary Intelligence | `GET /api/v1/salaries` | Parsed from stored posting text only | API test asserts missing/inverted evidence is not invented; unit test covers salary parsing | Verified |
| 9 | GitHub Portfolio Matcher | `GET /api/v1/github/latest`, `POST /api/v1/github/analyze` | Latest analysis stored | Implemented with public GitHub REST API; no automated live-network test | Verified (network-dependent) |
| 10 | Application Success Analytics | `GET /api/v1/analytics` | Derived from persisted applications | API test asserts explicit rate definitions and data-derived recommendations; UI shows numerators/denominators | Verified |

## Supporting functionality

| Module | Verification | Status |
| --- | --- | --- |
| Authentication (register/login/demo/logout/me) | 5 API tests incl. CSRF and hashed credentials | Verified |
| Job discovery (Remotive/Greenhouse/Lever) | Persisted 57-job snapshot; discovery endpoint smoke-tested | Verified (network-dependent for fresh sync) |
| Job search/filter/pagination | API tests | Verified |
| Save/unsave jobs | API test | Verified |
| Manual job entry | API test | Verified |
| Profile CRUD + completeness | API test registration/profile update; UI form | Verified |
| Resume upload/parse + ATS analysis | Unit test for resume structure; upload endpoint smoke-tested | Verified (PDF/DOCX extraction depends on file) |
| Application workflow | Prepare → approve → evidence-backed submit, status transitions | Verified |
| Notifications | Scan/read/read-all/delete | Verified |
| Settings/integrations | API integration test; settings persistence | Verified |
| Scheduler/cron | Scheduler code + authenticated cron endpoint; opt-in | Verified by code/API status; not run on serverless |
| Direct employer auto-submission | Not implemented | Declared limitation |

## 19 navigation pages

| Page | Route | State |
| --- | --- | --- |
| Dashboard | `#/dashboard` | Implemented, auth-gated |
| Job Discovery | `#/discovery` | Implemented |
| Saved Jobs | `#/saved` | Implemented |
| Skill Gap | `#/skill-gap` | Implemented |
| Company Intelligence | `#/companies` | Implemented |
| Job Authenticity | `#/authenticity` | Implemented |
| Duplicate Guard | `#/duplicates` | Implemented |
| Interview Prep | `#/interviews` | Implemented |
| Career Roadmap | `#/roadmap` | Implemented |
| Deadline Intelligence | `#/deadlines` | Implemented |
| Salary Intelligence | `#/salaries` | Implemented |
| GitHub Portfolio | `#/github` | Implemented |
| Application Studio | `#/studio` | Implemented |
| Applications | `#/applications` | Implemented |
| Success Analytics | `#/analytics` | Implemented |
| Profile | `#/profile` | Implemented |
| Resume & ATS | `#/resume` | Implemented |
| Notifications | `#/notifications` | Implemented |
| Settings & Integrations | `#/settings` | Implemented |

## Evidence policy checks

| Rule | Evidence |
| --- | --- |
| No invented salaries | Salary parser only accepts explicit source ranges; missing/inverted test |
| No invented deadlines | Deadline parser + verification states; manual verification test |
| No invented company facts | Company service stores fetched evidence; API test checks no invented employee counts |
| No invented outcomes | Status transitions require explicit recorded events; unknown outcome counter |
| No fake submissions | Submission requires confirmation URL/reference; API test rejects missing evidence |
| No fabricated skills | Match/gap engines compare only profile and posting text; unit tests |
| AI labelling | Optional endpoint; deterministic engines used when unconfigured |
| Open-source/public sources | Remotive, Greenhouse, Lever, GitHub REST; no proprietary job APIs |
