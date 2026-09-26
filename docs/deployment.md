# HireLens Deployment & Operations Guide

## 1. Environment Architecture

HireLens runs as three primary processes:
1. **Frontend**: Next.js App Router (Node.js runtime or Vercel).
2. **Backend**: FastAPI modular monolith running via Uvicorn.
3. **Worker**: Python background worker processing Redis queue jobs.

Supporting Managed Services:
- **Database**: Supabase PostgreSQL.
- **Cache / Queue**: Upstash Redis (or local Redis instance).
- **Storage**: Amazon S3 (private bucket).

---

## 2. Local Development Setup

### 2.1 Starting Local Infrastructure
A `docker-compose.yml` file is provided for offline development to run PostgreSQL and Redis locally:
```bash
docker-compose up -d
```

### 2.2 Backend Execution
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2.3 Frontend Execution
```bash
cd frontend
npm install
npm run dev
```

### 2.4 Worker Execution
```bash
cd workers
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m workers.job_runner
```

---

## 3. Health & Readiness Verification

- `GET http://localhost:8000/health`: Verifies application process is running.
- `GET http://localhost:8000/readiness`: Verifies active connectivity to PostgreSQL and Redis.
