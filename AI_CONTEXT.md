# AI_CONTEXT.md
# FairPlay Rotation Scheduler — Current Project State

This file is the short-term source of truth for AI coding agents.

The AI must read this file before making changes.

---

## Current Product

FairPlay Rotation Scheduler is a web application that creates fair playing rotations for groups sharing limited sports courts/fields.

Primary goal:

> Minimize differences in total playing time while respecting court capacity, player availability, completed-round history, and session time.

This is NOT primarily a random team generator.

---

## Source-of-Truth Documents

AI should read these before implementation:

1. `PRD.md`
   - Product requirements and product behavior.
2. `AI_CONTEXT.md`
   - Current implementation status and current architectural decisions.
3. `CHANGELOG.md`
   - Important completed changes and decisions.
4. Existing repository code.
5. Tests.

If code and documentation disagree:
- investigate first,
- do not blindly overwrite working behavior,
- update documentation when intentional changes are made.

---

## Current Phase

Phase: FOUNDATION / MVP

Implemented foundation:
- Python backend package and FastAPI application entry point,
- environment-based PostgreSQL configuration and SQLAlchemy connection setup,
- Alembic migration infrastructure,
- validated `Session` database model and API schemas,
- reusable session timing/capacity calculation,
- health endpoint and automated foundation tests,
- Docker Compose configuration for the API and PostgreSQL,
- mobile-first React/TypeScript frontend with local draft persistence,
- data-driven dashboard, guided session creation, player roster, schedule, and fairness views,
- typed frontend service boundary ready for future FastAPI integration.

Current target:
- persist player/session-player, round, and assignment records,
- add live round progression and dynamic rescheduling,
- then replace browser-local session storage with CRUD APIs.

---

## Current Implemented Stack

Frontend:
- React 18, TypeScript, Vite, and React Router.
- Mobile-first sporty interface with reusable design tokens, responsive layouts, accessible dialogs, keyboard focus states, and reduced-motion support.
- Organizer workflow communicates Setup → Players → Schedule → Play progress and always explains unavailable primary actions.
- Dashboard metrics are derived from user sessions and generated schedules; the seeded demo remains a separate read-only sample.
- Shared player-name presentation formats long names consistently and uses uppercase two-letter avatar initials.
- Schedule rounds use responsive Team A/Team B court panels and readable resting-player cards.
- Browser-local persistence for user-created draft sessions and player rosters.
- A seeded, read-only schedule demonstrates schedule and fairness views without affecting user workspace metrics.
- Vitest and Testing Library cover presentation, timing, persistence, metrics, dialogs, validation, and the complete generate/start lifecycle.

Backend:
- FastAPI on Python 3.9+.
- Pydantic v2 request/response validation.

Database:
- PostgreSQL 16 for application persistence.
- SQLAlchemy 2 ORM.
- Alembic migrations.
- In-memory SQLite is used only for isolated model tests.

Scheduler:
- Basic deterministic scheduler is implemented under `backend/app/domain`.
- Hard availability and capacity constraints are enforced before playing-time fairness and consecutive-rest preferences.
- `POST /api/schedules/generate` returns rounds, assignments, rests, and fairness metrics without persisting them.

Development:
- Docker Compose configuration for PostgreSQL and the API.
- Docker Compose serves the production frontend at port 3000.
- A root multi-stage Docker image serves the React build and FastAPI from one
  origin for public deployment.
- `render.yaml` defines a free Render web service in Singapore with `/health`
  checks and automatic deploys from `main`.
- Pytest test suite.
- Pyright configuration targets the repository-local `.venv`.

---

## Scheduling Priorities

Priority order:

1. Hard constraints.
2. Playing-time fairness.
3. Avoid consecutive rests.
4. Player availability.
5. Team skill balance.
6. Teammate diversity.
7. Opponent diversity.

Primary fairness metric:

`max(player_playing_minutes) - min(player_playing_minutes)`

The system must recognize that exact equality is sometimes mathematically impossible.

---

## Important Architecture Rules

- Scheduling logic must not live inside UI components.
- Completed rounds are immutable during future schedule recalculation.
- Dynamic rescheduling regenerates only upcoming rounds.
- Playing-time statistics from completed rounds always influence future scheduling.
- Use pure randomization only as a tie-breaker.
- Scheduler results should be deterministic when a seed is supplied.
- Business rules must have automated tests.
- Avoid duplicating scheduler rules in frontend and backend.

---

## Development Rule for AI

Before editing code:

1. Inspect repository structure.
2. Read relevant files.
3. Understand current flow.
4. Identify existing architecture and conventions.
5. Make the smallest coherent change that satisfies requirements.
6. Run tests/lint/typecheck when available.
7. Update this file if the current project state changes significantly.
8. Update `CHANGELOG.md` for meaningful implementation changes.

Do not invent files, APIs, or database structures without checking existing code first.

---

## Documentation Update Protocol

After a meaningful implementation change:

### Update `AI_CONTEXT.md`
Replace outdated "current state" information with the NEW current state.

Do not append endless historical notes here.

This file should describe the project AS IT EXISTS NOW.

### Update `CHANGELOG.md`
Append important historical changes.

Use:

## YYYY-MM-DD — Short title

### Changed
- ...

### Why
- ...

### Files
- ...

### Notes
- ...

Do not add trivial formatting changes unless useful.

### Architectural Decision
If a change is fundamental, record:
- decision,
- reason,
- alternatives considered,
- migration consequences.

---

## Current Application Workflow

1. Application configuration reads `DATABASE_URL` from the environment.
2. Alembic creates the `sessions` table and database constraints.
3. FastAPI exposes `GET /health` and `POST /api/schedules/generate`.
4. Session input can be validated through `SessionCreate`; timing and capacity are derived without duplicating the calculation in HTTP or persistence code.
5. Session CRUD is intentionally not exposed yet because the remaining persistence models are unfinished.
6. The frontend loads a seeded demonstration session plus locally saved drafts through a typed `FairPlayApi` adapter.
7. New sessions, roster changes, lifecycle status, and generated schedules remain in browser local storage until the corresponding backend APIs exist.
8. Draft sessions can generate a backend-calculated schedule, review fairness, and transition from `DRAFT` to `READY` to `ACTIVE`; settings or roster edits before activation invalidate the previous schedule.

## Environment and Configuration

Required application variable:
- `DATABASE_URL`: SQLAlchemy PostgreSQL URL. See `.env.example`.

Docker Compose variables (development defaults are provided):
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

The production Docker image has been built and smoke-tested locally. The public
MVP does not require PostgreSQL because sessions, players, and generated
schedules remain browser-local; PostgreSQL stays available for the future CRUD
and persistence phase.

## Known Limitations

- There are no persistent player, round, assignment, CRUD, live-round progression, statistics, or history features yet.
- The scheduler is an MVP greedy fairness implementation; dynamic rescheduling and manual overrides are not implemented.
- Frontend draft data is local to one browser and is not authenticated or synchronized.
- Newly created sessions use the backend scheduler, but their generated schedules remain local to the browser.
- Session times are same-day local wall-clock values with whole-minute precision; overnight sessions are rejected.

## Known Future Work

MVP:
- [x] Repository initialization / architecture assessment
- [x] Session data model
- [x] Session timing and capacity calculation
- [x] Foundation model/schema tests
- [ ] Player data model
- [ ] Round data model
- [x] Basic scheduler
- [x] Fairness metrics
- [x] Schedule preview
- [x] Start-session lifecycle transition
- [ ] Dynamic rescheduling
- [ ] Statistics
- [x] Interactive frontend prototype
- [ ] Persistence and session CRUD/history
- [x] Automated scheduler tests

Later:
- [ ] Skill balancing
- [ ] Teammate diversity
- [ ] Opponent diversity
- [ ] Authentication
- [ ] Groups
- [ ] Long-term fairness
- [ ] QR join
- [ ] Ranking
- [ ] Payment splitting

---

## AI Behavior

The AI should be critical.

If the user's requested implementation:
- breaks fairness,
- creates duplicate sources of truth,
- damages historical data,
- introduces unnecessary complexity,
- conflicts with existing architecture,

explain the issue and choose a safer implementation when possible.

Do not agree blindly.
