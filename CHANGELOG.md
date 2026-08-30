# CHANGELOG.md
# FairPlay Rotation Scheduler

This file records meaningful project changes so future AI agents and developers can understand how the project evolved.

Do not use this file as the current-state source of truth.
Use `AI_CONTEXT.md` for the current state.

---

## 2026-08-30 — Live round results and remaining-roster replanning

### Added

- Added per-court score, draw, and completed-without-score recording for active rounds.
- Added post-round player departures that preserve the original lineup and result history while excluding departed players from future matches.
- Added explicit next-round starts and confirmed manual replanning between rounds.
- Added continuation scheduling inputs for completed play/rest counts, prior rests, next start time, and round-number offsets.
- Added reduced-roster scheduling that avoids one-player and over-capacity courts.

### Changed

- Active and completed sessions now lock setup and roster changes, while completed results remain visible and immutable.
- Live controls now recover safely when replanning fails: saved results and departure states remain local and the organizer can retry.
- Schedule views focus on the current area of the timeline and visibly distinguish live, completed, and scored matches.

### Verification

- Frontend suite passes 50 tests and the TypeScript/Vite production build succeeds.
- Backend suite passes 40 tests, including continuation timing/history and reduced-roster scenarios.

### Architectural Decision

- Keep live state browser-local for the MVP while all initial and continuation scheduling rules remain in FastAPI.

## 2026-08-29 — Mobile-first UI and organizer workflow overhaul

### Added

- Added reusable accessible dialog and session-progress components.
- Made Setup, Players, Schedule, and Play an interactive guided workflow with prerequisite guidance and contextual primary actions.
- Added runtime migration and recovery notices for legacy browser-local sessions, including a backup for irrecoverable storage.
- Added client-side schedule contract validation, readable FastAPI 422 messages, response-shape checks, and a favicon.
- Added pre-play schedule revision controls for changing setup, editing players, and confirmed automatic team reshuffling.
- Added persisted generation seeds and bounded alternative-search logic that preserves the current schedule when no different fair arrangement exists.
- Added data selectors and tests for real dashboard session, player, round, and fairness metrics.
- Added mobile bottom navigation, responsive bottom-sheet dialogs, schedule summaries, progressive round disclosure, and fairness overview metrics.

### Changed

- Rebuilt the interface around a mobile-first sporty design system split into tokens, base, shell, feature, and responsive styles.
- Simplified the organizer journey to Session → Players → Schedule → Play with a single contextual primary action and explicit disabled-state guidance.
- Generated schedules now remain editable until play starts; actual input changes invalidate the schedule while unchanged saves preserve it.
- Separated the read-only demo from the user workspace and removed hard-coded dashboard dates, metrics, and inactive navigation.
- Removed the unsaved Location field and outdated prototype messaging from session creation.
- Increased control sizes, improved focus visibility and keyboard dialog behavior, and added reduced-motion support.

### Architectural Decision

- Keep `frontend/` and `backend/` as separate applications in one monorepo. The frontend retains browser-local CRUD behind `FairPlayApi`; FastAPI remains the sole source of scheduling rules.

### Verification

- Frontend component and workflow tests pass, including dashboard metrics, guided steps, legacy-data repair, API errors, validation, disabled actions, and keyboard dialog dismissal.
- TypeScript and Vite production build pass.

## 2026-08-22 — Render deployment preparation

### Added

- Added a multi-stage production Docker image that builds React and serves it
  with FastAPI from a single public origin.
- Added Render Blueprint configuration for a free Singapore web service with
  health checks and automatic deployments from `main`.
- Added tests for production static assets, React deep-link fallback, and API
  404 behavior.

### Changed

- FastAPI now exposes an application factory and optionally serves the built
  frontend when `FRONTEND_DIST_DIR` is configured.
- Updated deployment and smoke-test documentation.

### Architectural Decision

- Deploy the browser-local MVP as one public service without PostgreSQL. This
  keeps the existing `/api` contract on the same origin and avoids adding data
  persistence before the CRUD models and endpoints are ready.

### Verification

- Production Docker build succeeded.
- Frontend root, React deep links, health check, API 404, and schedule
  generation were smoke-tested against the built image.

## 2026-08-21 — Scheduler and session controls

### Added

- Added a deterministic FastAPI scheduler endpoint with availability, capacity, fairness, consecutive-rest, and seeded tie-breaking behavior.
- Added schedule persistence in browser local storage and the `DRAFT → READY → ACTIVE` frontend lifecycle.
- Added working Generate Schedule, Start Session confirmation, and editable Settings controls.
- Added scheduler, endpoint, adapter, lifecycle, and settings tests.

### Changed

- Roster or settings changes before activation now invalidate an existing schedule.
- Active sessions lock configuration and roster editing.
- Vite and Nginx now proxy `/api` requests to FastAPI.
- Long player names now retain the first two words and abbreviate later words, while avatars consistently use uppercase initials.
- Redesigned court match and resting-player cards for clearer team separation, readable names, and responsive layouts.

### Why

- User-created sessions previously had no generated schedule, which permanently disabled Start Session, while Settings had no behavior.

### Architectural Decision

- Keep scheduler rules in the backend while retaining browser-local session persistence for the MVP. This makes the workflow functional without prematurely introducing the full player/round persistence model.

---

## 2026-08-20 — Interactive frontend prototype

### Added

- Added a responsive React and TypeScript frontend with a modern sports-dashboard design.
- Added dashboard, guided session creation, player roster management, schedule preview, and fairness summary views.
- Added browser-local persistence behind a typed service adapter and a seeded read-only demonstration schedule.
- Added frontend tests, production container configuration, and a Docker Compose web service.

### Changed

- Updated project documentation and current-state notes with frontend development and verification commands.

### Why

- The project had no user interface. This prototype makes the intended organizer experience tangible while keeping the not-yet-implemented scheduling rules out of UI components.

### Architectural Decision

- Keep all browser data access behind `FairPlayApi` so future FastAPI endpoints can replace the local adapter without rewriting views.
- Do not generate schedules for new drafts in the browser; only seeded demo results are visualized until the backend scheduler is implemented.

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
