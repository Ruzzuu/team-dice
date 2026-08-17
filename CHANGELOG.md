# CHANGELOG.md
# FairPlay Rotation Scheduler

This file records meaningful project changes so future AI agents and developers can understand how the project evolved.

Do not use this file as the current-state source of truth.
Use `AI_CONTEXT.md` for the current state.

---

## 2026-08-17 — Initial product definition

### Added

- Defined FairPlay Rotation Scheduler product concept.
- Defined the primary objective as maximum achievable playing-time fairness.
- Defined session, round, player-slot, and availability concepts.
- Defined dynamic rescheduling requirement.
- Defined immutable completed-round behavior.
- Defined future support for skill balancing, teammate diversity, opponent diversity, and long-term statistics.
- Added initial MVP scope.
- Added recommended architecture.

### Why

The project needed a stable source of truth before code implementation so an AI coding agent can make consistent changes across multiple development sessions.

### Files

- `PRD.md`
- `AI_CONTEXT.md`
- `CHANGELOG.md`
- `MASTER_PROMPT_ZED.md`

### Notes

No application implementation is assumed to exist yet.
The coding agent must inspect the repository before choosing the final architecture.

---

## 2026-08-17 — Backend foundation and validated session model

### Added

- Added a Python/FastAPI backend package with a health endpoint.
- Added environment-based PostgreSQL and SQLAlchemy configuration.
- Added Alembic infrastructure and the initial `sessions` table migration.
- Added validated session schemas and lifecycle statuses.
- Added a framework-independent session timing calculation for usable minutes, complete round count, unused minutes, and capacity.
- Added Docker Compose, local environment documentation, and project configuration.
- Added 19 automated tests covering timing, validation, ORM persistence, and the health endpoint.

### Changed

- Updated `AI_CONTEXT.md` from a documentation-only state to the implemented backend foundation state.

### Why

- The repository had no application code. The session model is the highest-priority unfinished product model and establishes validated inputs needed by players, rounds, and the scheduler without prematurely implementing UI or advanced optimization.

### Files

- `.env.example`
- `.gitignore`
- `README.md`
- `compose.yaml`
- `pyrightconfig.json`
- `backend/`
- `AI_CONTEXT.md`
- `CHANGELOG.md`

### Architectural Decision

- Adopted the PRD-recommended backend-first FastAPI, SQLAlchemy, Alembic, and PostgreSQL architecture because no existing implementation constrained the choice.
- Kept timing rules in `backend/app/domain` so API schemas and ORM models share one business-rule implementation and future scheduler code remains independent of HTTP transport.

### Notes

- PostgreSQL migration SQL and the full foundation test suite were validated. Docker runtime validation remains pending because Docker is not installed on the current machine.

---

# Template for future entries

## YYYY-MM-DD — Change title

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Removed
- ...

### Why
- ...

### Files
- ...

### Architectural Decision
- Optional. Use when the change affects fundamental architecture or product behavior.

### Notes
- ...
