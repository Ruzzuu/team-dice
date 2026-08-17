# FairPlay Rotation Scheduler

FairPlay Rotation Scheduler creates court rotations that prioritize equal playing time. The repository currently contains the backend foundation and validated session model; scheduler and UI features will be added incrementally according to `PRD.md`.

## Current stack

- Python 3.9+
- FastAPI
- SQLAlchemy 2
- PostgreSQL 16
- Alembic
- Pytest

## Run with Docker Compose

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Run `docker compose up --build`.
3. Open `http://localhost:8000/health`.

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

## Configuration

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | SQLAlchemy connection URL | `postgresql+psycopg://fairplay:fairplay@localhost:5432/fairplay` |
| `POSTGRES_DB` | Docker PostgreSQL database | `fairplay` |
| `POSTGRES_USER` | Docker PostgreSQL user | `fairplay` |
| `POSTGRES_PASSWORD` | Docker PostgreSQL password | Local development value only |

Never commit a real `.env` or production credentials.
