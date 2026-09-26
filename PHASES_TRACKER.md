# HireLens — Master Phased Build Tracker

> **Project Reference**: `HireLens_Master_Build_Specification.md` (Sections 115 & 154)  
> **Repository**: [HireLens](file:///home/manoj/Documents/HireLens)  
> **Last Updated**: 2026-09-26  
> **Overall Progress**: 11 / 14 Phases Completed (78.6%)

---

## 📊 Phase Progress Summary

| Phase | Title | Specification Sections | Status | Test Coverage | Key Deliverables |
|---|---|---|---|---|---|
| **Phase 0** | **Project Foundation** | Sec 1–10, 115 | ✅ **COMPLETED** | 2/2 Health Tests | FastAPI + Next.js 16 + Directory Layout + Docker Base |
| **Phase 1** | **Auth + Users + RBAC** | Sec 6–10, 52–57 | ✅ **COMPLETED** | 8/8 Auth Tests | Multi-role Smart Auth (Student OTP, Recruiter Passkey, Admin) + Directory Validation |
| **Phase 2** | **Student Profile Engine** | Sec 8–10, 48–51 | ✅ **COMPLETED** | 4/4 Profile Tests | Profile, Education, Skills, Projects, Certifications + Auto-Completion Calculation |
| **Phase 3** | **Resume Intelligence Pipeline** | Sec 11–24, 61–68 | ✅ **COMPLETED** | 13/13 Resume/ML Tests | Spatial PyMuPDF Parsing, dslim/bert-base-NER, all-MiniLM-L6-v2 Embeddings, Skill Evidence |
| **Phase 4** | **Placement Drives & Applications** | Sec 27–29, 58–60 | ✅ **COMPLETED** | 4/4 Drive Tests | Zero-LLM Deterministic Eligibility Engine, Recruiter DriveManager, Student DriveBrowser |
| **Phase 5** | **Hybrid Match Engine** | Sec 23–26, 30–35, 100 | ✅ **COMPLETED** | 5/5 Matching Tests | Deterministic Skill Scoring + 384-d Semantic Cosine Similarity + Evidence Strength + Explainability |
| **Phase 6** | **Assessment Engine** | Sec 30–33, 35–37, 66–69, 90 | ✅ **COMPLETED** | 7/7 Assessment Tests | Server-Authoritative Test Runner, MCQ Validation, Semantic Duplicate Detection, Deadline Enforcement, Navigation Lock, Scoring |
| **Phase 7** | **Adaptive Assessment** | Sec 43–47, 85–92 | ✅ **COMPLETED** | 8/8 Adaptive Tests | Computerized Adaptive Testing (CAT / 1-PL Rasch IRT), Dynamic Difficulty Adjustment, Anti-Repetition, Skill Balancing |
| **Phase 8** | **Integrity & Telemetry Proctoring** | Sec 93–102 | ✅ **COMPLETED** | 37/37 Proctoring Tests | Client Telemetry (Tab Switch, Fullscreen) + Face/Gaze Presence + Escalating Penalty Aggregator |
| **Phase 9** | **Placement ML Analytics & Intelligence** | Sec 103–108 | ✅ **COMPLETED** | 4/4 Analytics Tests | Regularized GBR ($R^2=0.9655$), Skill Elasticity Matrix, Cohort CTC Forecasting, Placement Opt-In/Opt-Out, Faceted Filter Bar |
| **Phase 10**| **Notifications System** | Sec 109–114 | ✅ **COMPLETED** | 7/7 Notification Tests | In-App Realtime Updates, Email Dispatch Strategy, Application/Drive/Assessment Alerts, NotificationBell, Preferences Modal |
| **Phase 11**| **Security Hardening** | Sec 116–125 | ⏳ **PENDING** | Planned | Role Authorization Fuzzing, S3 Presigned URL Integrity, Rate Limiting, Audit Logs |
| **Phase 12**| **Validation & Benchmarking** | Sec 126–135 | ⏳ **PENDING** | Planned | Ground-Truth Resume Evaluation, Scoring Reproducibility, Benchmark Reports |
| **Phase 13**| **Production Readiness** | Sec 136–155 | ⏳ **PENDING** | Planned | Production Build, HTTPS, Health Monitoring, Backup Strategy, Deployment Playbook |

---

## 🔍 Detailed Phase Status & Audit Reports

```
CRITICAL SPECIFICATION RULE (Sec 115 & 154):
"At the end of EVERY phase, the system must run. Do not build the entire backend first 
and leave the application unusable until the final phase."
```

---

### [Phase 0] Project Foundation
- **Specification**: Section 115 (Lines 3639–3680)
- **Status**: ✅ **COMPLETED**
- **Implemented**:
  - Full modern monorepo layout: `backend/`, `frontend/`, `workers/`, `ai/`, `docs/`, `tests/`.
  - Python FastAPI async application with modular API versioning (`/api/v1`).
  - Next.js 16 (App Router) + Tailwind CSS + Lucide Icons.
  - Development Docker configurations and cross-platform setup.
- **Database**: Repository data abstraction layer with JSON persistence (`/tmp/hirelens_*.json`).
- **APIs**: `GET /health`, `GET /api/v1/health`.
- **Frontend**: Root splash page with backend live health verification pill.
- **Tests**: 2 passed (`tests/test_health.py`).
- **Known Issues**: None.

---

### [Phase 1] Auth + Users + RBAC
- **Specification**: Sections 6–10, 52–57, 115 (Lines 3681–3707)
- **Status**: ✅ **COMPLETED**
- **Implemented**:
  - Multi-role role-based access control (`STUDENT`, `RECRUITER`, `COLLEGE_ADMIN`).
  - Institutional student authentication using 6-digit OTP verified against college directory.
  - Institutional domain restriction (`@psgtech.ac.in`).
  - Corporate passkey authentication for recruiters (`recruiter@hirelens.ai`).
  - College administrator pre-seeded access.
  - JWT session token generation and middleware verification with cookie & bearer fallback.
- **Database**: Student Directory seed (`23Z342`), User store, OTP cache.
- **APIs**:
  - `POST /api/v1/auth/identify`
  - `POST /api/v1/auth/request-otp`
  - `POST /api/v1/auth/verify-otp`
  - `POST /api/v1/auth/passkey-login`
  - `GET /api/v1/admin/student-directory`
- **Frontend**: Smart multi-role login interface (`/login`), Admin Directory Manager (`/admin`).
- **Tests**: 8 passed (`tests/test_auth.py`).
- **Known Issues**: None.

---

### [Phase 2] Student Profile Engine
- **Specification**: Sections 8–10, 48–51, 115 (Lines 3708–3726)
- **Status**: ✅ **COMPLETED**
- **Implemented**:
  - Comprehensive student career profile model (Personal, Education, Skills, Projects, Certifications, Experience).
  - Deterministic profile completion percentage calculator (0–100%).
  - Enforced RBAC (recruiters and students cannot access each other's private edit flows).
- **Database**: `_profiles` collection with persistence.
- **APIs**:
  - `GET /api/v1/student/profile`
  - `PUT /api/v1/student/profile`
  - `POST /api/v1/student/profile/skills`, `DELETE /api/v1/student/profile/skills/{id}`
  - `POST /api/v1/student/profile/projects`, `DELETE /api/v1/student/profile/projects/{id}`
  - `POST /api/v1/student/profile/certifications`, `DELETE /api/v1/student/profile/certifications/{id}`
- **Frontend**: Full interactive profile editor (`ProfileEditor.tsx`) in `/student?tab=profile`.
- **Tests**: 4 passed (`tests/test_profile.py`).
- **Known Issues**: None.

---

### [Phase 3] Resume Intelligence Pipeline
- **Specification**: Sections 11–24, 61–68, 115 (Lines 3727–3756)
- **Status**: ✅ **COMPLETED**
- **Implemented**:
  - Native spatial PyMuPDF block extraction with two-column layout detection.
  - File integrity validation (PDF magic bytes `%PDF-`, 10MB limit, SHA-256 deduplication).
  - Hugging Face Token-Classification NER model (`dslim/bert-base-NER`) running locally for candidate identity & entity recognition.
  - Sentence Transformers (`all-MiniLM-L6-v2`) generating 384-dimensional L2-normalized semantic embeddings for matching.
  - Canonical skill resolution across 200+ technology aliases with category and section attribution.
  - Evidence linking: exact textual snippets, page numbers, and confidence scores per detected skill.
  - Profile synchronizer (`/sync-to-profile`) updating student skills from resume analysis.
- **Database**: `_resumes` collection with disk persistence.
- **APIs**:
  - `POST /api/v1/resumes/upload`
  - `GET /api/v1/resumes/current`
  - `POST /api/v1/resumes/sync-to-profile`
- **Frontend**: `ResumeEvidenceManager.tsx` in `/student?tab=resume` with skill-evidence inspector.
- **Tests**: 13 passed (`tests/test_resume_pipeline.py`, `tests/test_ner.py`, `tests/test_embeddings.py`).
- **Known Issues**: None.

---

### [Phase 4] Placement Drives & Applications
- **Specification**: Sections 27–29, 58–60, 115 (Lines 3757–3788)
- **Status**: ✅ **COMPLETED**
- **Implemented**:
  - Recruitment Drive lifecycle: `DRAFT` $\rightarrow$ `PUBLISHED` $\rightarrow$ `CLOSED` $\rightarrow$ `ARCHIVED`.
  - Weighted canonical skills configuration (`REQUIRED` vs `PREFERRED`, weights 1–10).
  - **Zero-LLM Deterministic Eligibility Engine (Section 28)**: Validates student department (with abbreviation aliases), verified CGPA threshold, graduation batch, and max active backlogs.
  - Itemized pass/fail criteria breakdown with transparent reasons.
  - Student discovery and 1-click application submission with active verified resume check.
  - Strict duplicate application prevention (`400 Bad Request`).
  - Recruiter candidate pipeline review with inline status advancement (`APPLIED`, `UNDER_REVIEW`, `SHORTLISTED`, `REJECTED`).
- **Database**: `_drives` and `_applications` collections with disk persistence (`/tmp/hirelens_drives.json`, `/tmp/hirelens_applications.json`).
- **APIs**:
  - `GET /api/v1/drives`, `POST /api/v1/drives`
  - `POST /api/v1/drives/{id}/publish`, `POST /api/v1/drives/{id}/close`
  - `GET /api/v1/drives/{id}/eligibility`
  - `POST /api/v1/drives/{id}/apply`
  - `GET /api/v1/drives/{id}/applications`, `PUT /api/v1/drives/{id}/applications/{app_id}/status`
  - `GET /api/v1/applications/my`
- **Frontend**:
  - Recruiter: `DriveManager.tsx` in `/recruiter` (Drive creator modal + applicant review drawer).
  - Student: `DriveBrowser.tsx` in `/student?tab=drives` (Live eligibility badges + application flow + "My Applications" tracking).
- **Tests**: 4 passed (`tests/test_drives.py`). Full suite: **31 / 31 passed**.
- **Known Issues**: None.

---

### [Phase 5] Hybrid Match Engine
- **Specification**: Sections 23–26, 30–35, 100–101, 115 (Lines 3789–3812)
- **Status**: ✅ **COMPLETED**
- **Implemented**:
  - Isolated, multi-factor deterministic scoring engine (`backend/app/services/matching_service.py`).
  - Weighted Required Skill Coverage ($0$–$100$%, default weight 40%).
  - Weighted Preferred Skill Coverage ($0$–$100$%, default weight 15%).
  - Semantic Similarity Scoring via 384-dimensional Sentence Transformers (`all-MiniLM-L6-v2`) with cosine similarity ($0$–$100$%, default weight 25%).
  - Evidence Strength & Credibility Scoring: differential weighting based on verification context (projects/experience: $1.0$, certs/education: $0.85$, plain keyword lists: $0.65$) (default weight 20%).
  - Recommendation categorization: `STRONG_FIT` ($\ge 80\%$), `GOOD_FIT` ($\ge 65\%$), `PARTIAL_FIT` ($\ge 50\%$), `LOW_FIT` ($< 50\%$).
  - Section 25 Explainability Breakdown: matched skills with exact evidence snippets, missing skills, semantic alignment narrative, evidence quality narrative.
  - Section 101 Score Versioning (`score_version: "v1.0"`).
- **Database**: `_matches` cache collection in `Repository` with application and drive-student indexing.
- **APIs**:
  - `GET /api/v1/drives/{drive_id}/ranked-applicants`
  - `GET /api/v1/drives/{drive_id}/applications/{app_id}/match`
  - `GET /api/v1/drives/{drive_id}/my-match`
- **Frontend**:
  - Recruiter: `DriveManager.tsx` in `/recruiter` with Ranked Pipeline drawer, match badges, and Match Breakdown audit modal.
  - Student: `DriveBrowser.tsx` in `/student` with Skill Match & Readiness modal, matched/missing required skills badges, and preparation tips.
- **Tests**: 5 passed (`tests/test_matching.py`). Full suite: **36 / 36 passed**.
- **Known Issues**: None.

---

### [Phase 6] Assessment Engine
- **Specification**: Sections 30–33, 35–37, 66–69, 90
- **Status**: ✅ **COMPLETED**
- **Implemented**:
  - Recruiter assessment authoring per placement drive (duration, question count, pass score, attempts, navigation rules).
  - High-caliber question bank with curated MCQs across Python, FastAPI, Docker, PostgreSQL, Distributed Systems, React, TypeScript, JavaScript.
  - **Strict MCQ Validation (Section 32)**: Exactly 4 options, no duplicates, correct answer must match option, explanation ≥ 10 chars, difficulty 1–10.
  - **Semantic Duplicate Detection (Section 33)**: Sentence Transformer similarity threshold > 0.85 rejects near-identical questions.
  - **Server-Authoritative Timing (Section 35)**: Backend `deadline_at = started_at + timedelta(seconds=duration)` with 10-second network grace period. Auto-transitions to `EXPIRED` on deadline breach.
  - **Navigation Lock (Section 36)**: Server enforces `allow_back_navigation=False`; rejects re-submission of already-answered questions.
  - **Client Question Masking (Section 90)**: `correct_answer` and `explanation` stripped from `QuestionClientView` during active tests.
  - Objective auto-scoring with percentage calculation and pass/fail determination.
  - Recruiter assessment results analytics (total attempts, average score, pass rate, candidate table).
- **Database**: `_assessments`, `_questions`, `_attempts`, `_answers` collections with disk persistence (`/tmp/hirelens_assessments.json`, `/tmp/hirelens_questions.json`, `/tmp/hirelens_attempts.json`, `/tmp/hirelens_answers.json`). Pre-seeded assessments for Google Cloud and Zoho drives.
- **APIs**:
  - `POST /api/v1/assessments` — Create assessment for drive.
  - `GET /api/v1/assessments/drive/{drive_id}` — Lookup assessment by drive.
  - `GET /api/v1/assessments/{id}` — Get assessment metadata.
  - `POST /api/v1/assessments/{id}/questions` — Add validated question (MCQ + semantic duplicate check).
  - `GET /api/v1/assessments/{id}/questions` — Recruiter question audit view.
  - `GET /api/v1/assessments/{id}/results` — Recruiter analytics and candidate scores.
  - `POST /api/v1/assessments/{id}/start` — Student: start or resume attempt.
  - `POST /api/v1/assessments/{id}/answer` — Student: submit answer with deadline & navigation enforcement.
  - `POST /api/v1/assessments/{id}/submit` — Student: finalize and score attempt.
  - `GET /api/v1/assessments/{id}/my-attempt` — Student: view latest attempt status.
- **Frontend**:
  - Student: `AssessmentRunner.tsx` — Distraction-free exam modal with live server-synchronized countdown, 4-option radio MCQ selection, progress bar, auto-submission on deadline, and post-test results card.
  - Student: `DriveBrowser.tsx` — "Take Assessment" button on applied drives with score badge for completed attempts.
  - Recruiter: `DriveManager.tsx` — "Assessment Scores" button per drive with analytics modal (attempts, avg score, pass rate, candidate results table).
- **Tests**: 7 passed (`tests/test_assessments.py`). Full suite: **43 / 43 passed**.
- **Known Issues**: None.

---

### [Phase 7] Adaptive Assessment
- **Specification**: Sections 43–47, 85–92, 115 (Lines 3836–3855)
- **Status**: ✅ **COMPLETED**
- **Implemented**:
  - **Adaptive Engine (`backend/app/services/adaptive_engine.py`)**: Deterministic dynamic difficulty adjustment based on Computerized Adaptive Testing (CAT) principles.
  - **IRT-Inspired Stepping (Section 43)**: Correct answers increment target difficulty by $+1$ (clamped at 10); incorrect answers decrement difficulty by $-1$ (floored at 1).
  - **Running 1-PL Rasch Ability Estimation (Section 44)**: Computes continuous latent ability parameter $\theta = \ln(\text{correct} / \text{incorrect})$, bounded between $[-3.0, +3.0]$.
  - **Strict Session Anti-Repetition (Section 45)**: Dynamically expands `question_order` during the test, ensuring questions previously served in the attempt are never repeated.
  - **Balanced Skill Coverage (Section 46)**: Intelligent tie-breaking prioritizes questions from tested skills with the lowest frequency to prevent over-testing single topics.
  - **Full Seed Data Expansion**: Microsoft Core Systems Adaptive Assessment (`asm-microsoft-adaptive-2025`) seeded with graded questions spanning levels 2 through 10.
  - **Recruiter Configuration & Analytics**: Recruiters can author adaptive assessments (`adaptive_mode=True`, configurable `starting_difficulty`). Results reporting surfaces candidate final difficulty and $\theta$ ability score.
  - **Frontend UI Enhancements**:
    - `AssessmentRunner.tsx`: Live Adaptive IRT badge, dynamic difficulty pill with level meter (Level 1-10), and post-test Adaptive Testing Profile card (Final Difficulty & $\theta$ score).
    - `DriveManager.tsx`: Recruiter candidate results table with "Adaptive Level" column displaying final level and $\theta$ ability rating.
    - `DriveBrowser.tsx`: Adaptive test launch trigger and student status pill with level indicators.
- **Database**: `Assessment` (`adaptive_mode`, `starting_difficulty`), `AssessmentAttempt` (`adaptive_mode`, `current_difficulty`, `difficulty_history`, `theta_estimate`).
- **APIs**:
  - `POST /api/v1/assessments` — Supports `adaptive_mode` & `starting_difficulty`.
  - `POST /api/v1/assessments/{id}/start` — Adaptive mode initializes 1st question at `starting_difficulty`.
  - `POST /api/v1/assessments/{id}/answer` — Adapts difficulty and dynamically selects next question.
  - `POST /api/v1/assessments/{id}/submit` & `GET /api/v1/assessments/{id}/my-attempt` — Returns `final_difficulty` and `theta_estimate`.
  - `GET /api/v1/assessments/{id}/results` — Surfaces candidate adaptive metrics to recruiters.
- **Tests**: 8 passed (`tests/test_adaptive_assessment.py`). Full suite: **51 / 51 passed**.
- **Known Issues**: None.

---

### [Phase 8] Assessment Integrity & Telemetry
- **Specification**: Sections 93–102, 115 (Lines 3856–3879)
- **Status**: ✅ **COMPLETED**
- **Scope & Deliverables**:
  - Browser telemetry monitoring (tab switches, window blur, clipboard/paste attempts, fullscreen exits).
  - Computer Vision ML Subsystem (`ai/cv_proctoring.py`): Face presence verification, multi-face counting (`MULTIPLE_FACES`), and prohibited device/phone detection (`OBJECT_DETECTED`).
  - Edge & Server-assisted ML frame analysis (`POST /api/v1/proctoring/analyze-frame`) with real-time feedback.
  - Temporal penalty escalation engine with final integrity trust score (0–100) and incident audit log.
  - Recruiter audit inspection interface with chronological incident log and category breakdown.
- **Frontend**:
  - `useProctoringTelemetry.ts`: React hook monitoring `visibilitychange`, `blur`, `paste`, `fullscreenchange`, periodic canvas frame capture to `/api/v1/proctoring/analyze-frame`, live face counting, and real-time trust score synchronization.
  - `AssessmentRunner.tsx`: Live trust score pill, active camera PIP monitor with live face count and ML badge, warning alert banner with candidate acknowledgement, and final "Assessment Integrity & Proctoring Verification" card with incident category tallies.
  - `DriveManager.tsx`: Added "Integrity" trust column to candidate assessment results table and click-to-inspect "Candidate Integrity Report" modal with breakdown stats and chronological audit trail.
- **Backend, AI & Models**:
  - `ai/cv_proctoring.py`: `VisionProctorML` using OpenCV, Haar cascades (`ai/models/haarcascade_frontalface_default.xml`), and aspect-ratio/luminance contour analysis for phone detection.
  - `app/models/proctoring.py`: `IncidentType` (including `OBJECT_DETECTED`), `IncidentSeverity`, `ProctoringIncident`, `IntegrityReport`, configurable `PENALTY_CONFIG`.
  - `app/schemas/proctoring.py`: Ingestion requests/responses, batch ingestion, full report, compact summary, and `AnalyzeFrameRequest`/`AnalyzeFrameResponse`.
  - `app/services/proctoring_engine.py`: Penalty escalation per repeated violation, rapid answer detection (< 2.5s), risk classification (`CLEAN`, `LOW_RISK`, `MEDIUM_RISK`, `HIGH_RISK`, `FLAGGED`), warning message generation.
  - `app/services/assessment_service.py` & `app/schemas/assessment.py`: Integrated `integrity_trust_score` and `integrity_risk_level` into submission and recruiter candidate result schemas.
- **APIs**:
  - `POST /api/v1/proctoring/event` — Ingest single browser/vision telemetry event.
  - `POST /api/v1/proctoring/batch` — Ingest batch of queued telemetry events.
  - `POST /api/v1/proctoring/analyze-frame` — Computer Vision ML frame analysis endpoint for live camera frames.
  - `GET /api/v1/proctoring/report/{attempt_id}` — Full integrity audit report (candidate authorized or recruiter/admin).
  - `GET /api/v1/proctoring/summary/{attempt_id}` — Compact integrity breakdown for recruiter views.
- **Tests**: 37 passed (`tests/test_proctoring.py`). Full suite: **88 / 88 passed**.
- **Known Issues**: None.

---

### [Phase 9] Placement ML Analytics & Intelligence
- **Specification**: Sections 103–108, 115 (Lines 3880–3908)
- **Status**: ✅ **COMPLETED**
- **Scope & Deliverables**:
  - Regularized Gradient Boosting Regressor ($R^2 = 0.9655$, generalization gap $< 0.05$) trained and saved to `ai/models/placement_analytics_model.pkl`.
  - Skill Elasticity Matrix with marginal CTC multipliers (AWS, Kubernetes, PyTorch, React, System Design).
  - Department-wise placement and skill readiness statistics with cohort CTC forecasting.
  - Placement Opt-In / Opt-Out enforcement across student drives, application submissions, and eligibility filters.
  - Multi-faceted candidate search & filtering with real-time query parsing.
  - **Hybrid ML + LLM MCQ Model**: Groq Llama 3.3 70B combined with calibrated IRT item-bank across Bloom's taxonomy levels (EASY, MEDIUM, HARD, BALANCED) with semantic deduplication.
  - **Recruiter Drive Publishing**: Interactive choice between Auto-Generated Hybrid AI questions (Easy, Medium, Hard, Balanced with live preview), Custom authored MCQ questions, and Direct placement drives.
  - **Strong OOP Synchronization**: Observer Pattern (`IEntityObserver`, `UserProfileSyncObserver`, `AssessmentAttemptSyncObserver`) ensuring all cross-entity changes propagate cleanly without stale state.
  - **Admin Clean Database**: `POST /api/v1/admin/clean-database` with atomic cache purges and deterministic re-seeding.
  - **Claude-style Login Redesign**: 1-click instant institutional access for Candidate, Recruiter, and Admin; 30-day encrypted session persistence; robust network error shielding.
- **Tests**: 105 passed across full backend test suite (`tests/test_hybrid_mcq.py`, `tests/test_analytics_and_opt_in.py`, `tests/test_assessments.py`). Full suite: **105 / 105 passed**.

---

### [Phase 10] Notifications System
- **Specification**: Sections 72, 93–94, 105, 109–114, 115 (Lines 3909–3924)
- **Status**: ✅ **COMPLETED**
- **Implemented**:
  - Full-stack notification system with Section 105 State Independence guarantee (DB commit first, notification delivery best-effort async).
  - Strong OOP Strategy Pattern for notification delivery channels:
    - `INotificationChannel` abstract strategy
    - `InAppNotificationChannel`: real-time JSON repository feed
    - `EmailNotificationChannel`: isolated template engine (`EmailTemplateEngine`) for Section 94 user-safe messages without leaking AI/system internals
  - Lifecycle event triggers hooked into drives, applications, and assessments:
    - Drive published (`DRIVE_PUBLISHED`) -> eligible students
    - Application submitted (`APPLICATION_SUBMITTED`, `NEW_APPLICATION`) -> student and recruiter
    - Application status changed (`CANDIDATE_SHORTLISTED`, `CANDIDATE_REJECTED`, `APPLICATION_STATUS_CHANGED`) -> student
    - Assessment scheduled (`ASSESSMENT_SCHEDULED`) -> applicants
    - Assessment completed (`ASSESSMENT_COMPLETED`, `ASSESSMENT_RESULTS_READY`) -> student and recruiter
    - Integrity violation / cheating penalty (`INTEGRITY_REVIEW_REQUIRED`) -> recruiter
  - Per-user notification preferences with category muting and channel toggle (`NotificationPreferences`).
  - Admin failed delivery retry mechanism (caps at 3 attempts, tracks `DeliveryStatus`).
- **Database**: `_notifications` and `_notification_preferences` in `repository.py` with `/tmp/hirelens_notifications.json` disk persistence.
- **APIs**:
  - `GET /api/v1/notifications` (paginated feed with unread_only filter)
  - `GET /api/v1/notifications/unread-count` (fast badge polling endpoint)
  - `POST /api/v1/notifications/{id}/read` (mark single read)
  - `POST /api/v1/notifications/read-all` (mark all read)
  - `GET /api/v1/notifications/preferences`
  - `PUT /api/v1/notifications/preferences`
  - `POST /api/v1/notifications/retry-failed` (Admin-only retry queue trigger)
- **Frontend**:
  - `NotificationBell.tsx`: interactive bell with badge count, 30-second polling, scrollable dropdown feed, relative timestamps, type icons, click-to-navigate, and quick mark-read.
  - `NotificationPreferencesModal.tsx`: channel toggles (In-App, Email) and fine-grained topic muting.
  - Global `Navbar.tsx` integration right next to user profile controls.
- **Tests**: 7 passed (`tests/test_notifications.py`), 114 total backend tests passing.
- **Known Issues**: None.

---

### [Phase 11] Security Hardening
- **Specification**: Sections 116–125, 115 (Lines 3925–3941)
- **Status**: ⏳ **PENDING**
- **Scope & Deliverables**:
  - Cross-role authorization tests.
  - Rate limiting on auth and ML endpoints.
  - Storage path sanitization and strict MIME type enforcement.

---

### [Phase 12] Validation & Benchmarking
- **Specification**: Sections 126–135, 115 (Lines 3942–3963)
- **Status**: ⏳ **PENDING**
- **Scope & Deliverables**:
  - Real metric measurement against ground truth dataset.
  - Reproducibility benchmarks for scoring algorithms.

---

### [Phase 13] Production Readiness
- **Specification**: Sections 136–155, 115 (Lines 3964–3980)
- **Status**: ⏳ **PENDING**
- **Scope & Deliverables**:
  - Production build optimizations, environment secrets, monitoring, and runbooks.

---

## 🛠 Verification Commands

To verify the current state of the implementation at any time:

```bash
# 1. Run all backend tests (Auth, Profile, Resume, NER, Embeddings, Drives)
cd backend && uv run pytest tests/ -v

# 2. Validate frontend production build
cd frontend && npm run build

# 3. Health check running local dev services
curl http://localhost:8000/health
curl http://localhost:3000
```
