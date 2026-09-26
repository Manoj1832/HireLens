# HireLens

**Production-Ready College Recruitment & Assessment Platform**

HireLens connects students, campus recruitment teams, and college placement administrators. It features verified institutional identity, structured resume intelligence with canonical skill mapping, adaptive technical assessments, transparent assessment integrity monitoring, and deterministic candidate scoring.

---

## Architecture

- **Frontend**: Next.js (TypeScript, Tailwind CSS, App Router)
- **Backend**: FastAPI (Python 3.12, Pydantic v2, asyncpg/SQLAlchemy)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Storage**: Amazon S3 (Private bucket with presigned URLs)
- **Queue/Cache**: Upstash Redis
- **AI & NLP**: Groq API + Sentence-Transformers (`all-MiniLM-L6-v2`) + PyMuPDF / Tesseract OCR
- **Computer Vision**: MediaPipe & YOLO for edge proctoring telemetry

---

## Directory Structure

```
HireLens/
├── docs/                   # Complete architecture and subsystem specifications
├── backend/                # FastAPI application, database models, and API routers
├── frontend/               # Next.js App Router UI with HireLens Design System
├── workers/                # Asynchronous background workers (resumes, AI jobs, email)
├── ai/                     # Groq LLM, Sentence Transformers, and CV modules
├── tests/                  # Cross-platform integration and validation suites
├── docker-compose.yml      # Local dev services (PostgreSQL & Redis)
├── .env.example            # Environment variables template
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- Python 3.12+
- Node.js 18+ (Node 20+ recommended)
- Docker (optional, for local PostgreSQL & Redis)

### 2. Environment Configuration
```bash
cp .env.example .env
```

### 3. Running Local Infrastructure
```bash
docker-compose up -d
```

### 4. Running Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend health check: [http://localhost:8000/health](http://localhost:8000/health)

### 5. Running Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend application: [http://localhost:3000](http://localhost:3000)

---

## Specifications & Documentation
Detailed architectural and business logic specifications are located in the [`docs/`](file:///home/manoj/Documents/HireLens/docs) directory:
- [Architecture](file:///home/manoj/Documents/HireLens/docs/architecture.md)
- [Business Logic & State Transitions](file:///home/manoj/Documents/HireLens/docs/business-logic.md)
- [Database & RLS Schema](file:///home/manoj/Documents/HireLens/docs/database.md)
- [REST API Contract](file:///home/manoj/Documents/HireLens/docs/api.md)
- [Resume Pipeline](file:///home/manoj/Documents/HireLens/docs/resume-pipeline.md)
- [Assessment Engine](file:///home/manoj/Documents/HireLens/docs/assessment.md)
- [Proctoring & Integrity](file:///home/manoj/Documents/HireLens/docs/proctoring.md)
- [Scoring & Matching](file:///home/manoj/Documents/HireLens/docs/scoring.md)
- [Security](file:///home/manoj/Documents/HireLens/docs/security.md)
- [Privacy](file:///home/manoj/Documents/HireLens/docs/privacy.md)
- [Testing & Validation Gates](file:///home/manoj/Documents/HireLens/docs/testing.md)
- [Deployment](file:///home/manoj/Documents/HireLens/docs/deployment.md)


uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

npm run dev