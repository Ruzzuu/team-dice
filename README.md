# FairPlay Rotation Scheduler

FairPlay Rotation Scheduler creates court rotations that prioritize equal playing time. The repository contains a backend foundation and a polished interactive frontend prototype. The scheduler and feature APIs will be added incrementally according to `PRD.md`.

## Current stack

- Python 3.9+
- FastAPI
- SQLAlchemy 2
- PostgreSQL 16
- Alembic
- Pytest
- React 18 and TypeScript
- Vite, Vitest, and Testing Library

## Run with Docker Compose

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Run `docker compose up --build`.
3. Open the frontend at `http://localhost:3000`.
4. Open the API health endpoint at `http://localhost:8000/health`.

The API container applies database migrations before starting.

## Run the backend locally

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip setuptools
python -m pip install -e './backend[dev]'
cp .env.example .env
docker compose up -d postgres
cd backend
alembic upgrade head
uvicorn app.main:app --reload
```

Run tests from `backend`:

```sh
pytest
```

## Run the frontend locally

The frontend keeps sessions and generated schedules in browser-local storage. Schedule generation is performed by the FastAPI backend so scheduling rules are not duplicated in UI code.

```sh
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

The Vite development server proxies `/api` to `http://localhost:8000`, so run the backend as well when generating schedules. Alternatively, `docker compose up --build` starts the complete stack at `http://localhost:3000`.

Run frontend checks:

```sh
npm test
npm run build
```

## Scheduler API

`POST /api/schedules/generate` accepts session configuration, players, availability, and an optional deterministic seed. It returns upcoming rounds, court/team assignments, resting players, and fairness metrics. Session CRUD and schedule persistence remain browser-local during this MVP phase.

## Deploy to Render

The root `Dockerfile` builds the React frontend and serves it together with the
FastAPI application. Both the UI and `/api` therefore use the same public
origin. `render.yaml` provisions this image as one free Render web service in
the Singapore region.

1. Push the repository to GitHub.
2. Sign in to Render and connect the GitHub account that can access this repo.
3. Select **New > Blueprint**, choose this repository and the `main` branch,
   then deploy the detected `render.yaml` Blueprint.
4. Open the assigned `onrender.com` URL. Check `/health` for
   `{"status":"ok"}`.

The free Render instance sleeps after a period without traffic, so its first
request after being idle can take longer. Sessions, players, and schedules stay
in each browser's local storage; no public database is required for this MVP.

To smoke-test the production image locally:

```sh
docker build -t fairplay-team-dice .
docker run --rm -p 10000:10000 fairplay-team-dice
```

Open `http://localhost:10000` and `http://localhost:10000/health`.

## Configuration

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | SQLAlchemy connection URL | `postgresql+psycopg://fairplay:fairplay@localhost:5432/fairplay` |
| `POSTGRES_DB` | Docker PostgreSQL database | `fairplay` |
| `POSTGRES_USER` | Docker PostgreSQL user | `fairplay` |
| `POSTGRES_PASSWORD` | Docker PostgreSQL password | Local development value only |

Never commit a real `.env` or production credentials.
