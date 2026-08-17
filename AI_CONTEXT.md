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
- Docker Compose configuration for the API and PostgreSQL.

Current target:
- implement the player/session-player data model,
- implement the round and assignment data models,
- then build the scheduler core before session CRUD or UI work.

---

## Current Implemented Stack

Frontend:
- Not implemented yet.

Backend:
- FastAPI on Python 3.9+.
- Pydantic v2 request/response validation.

Database:
- PostgreSQL 16 for application persistence.
- SQLAlchemy 2 ORM.
- Alembic migrations.
- In-memory SQLite is used only for isolated model tests.

Scheduler:
- Not implemented yet.
- Framework-independent business rules live under `backend/app/domain`; the initial session timing calculation is located there.

Development:
- Docker Compose configuration for PostgreSQL and the API.
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
3. FastAPI starts and currently exposes `GET /health` only.
4. Session input can be validated through `SessionCreate`; timing and capacity are derived without duplicating the calculation in HTTP or persistence code.
5. Session CRUD is intentionally not exposed yet because the remaining foundation models are still unfinished.

## Environment and Configuration

Required application variable:
- `DATABASE_URL`: SQLAlchemy PostgreSQL URL. See `.env.example`.

Docker Compose variables (development defaults are provided):
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

The current development machine used for this implementation does not have Docker installed, so PostgreSQL container startup was not validated locally. The migration was validated by generating PostgreSQL SQL in Alembic offline mode.

## Known Limitations

- There is no frontend.
- There are no player, round, assignment, scheduler, CRUD, live-session, statistics, or history features yet.
- The current API has only a health endpoint.
- Session times are same-day local wall-clock values with whole-minute precision; overnight sessions are rejected.

## Known Future Work

MVP:
- [x] Repository initialization / architecture assessment
- [x] Session data model
- [x] Session timing and capacity calculation
- [x] Foundation model/schema tests
- [ ] Player data model
- [ ] Round data model
- [ ] Basic scheduler
- [ ] Fairness metrics
- [ ] Schedule preview
- [ ] Live session flow
- [ ] Dynamic rescheduling
- [ ] Statistics
- [ ] Persistence and session CRUD/history
- [ ] Automated scheduler tests

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
