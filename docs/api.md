# HireLens REST API Specification

## 1. Conventions & Standards

- **Base URL**: `/api/v1`
- **Authentication**: Bearer token (JWT) via `Authorization: Bearer <token>`.
- **Request & Response Body**: JSON (`application/json`) with Pydantic serialization.
- **Error Standard**: RFC 7807 problem details or structured error envelope.

### 1.1 Standard Error Envelope
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested assessment could not be found or has expired.",
    "details": {}
  }
}
```

---

## 2. Core Endpoints

### 2.1 Health & Diagnostics
- `GET /health` -> `{ "status": "healthy", "service": "hirelens-backend" }`
- `GET /readiness` -> Checks PostgreSQL, Redis, and S3 connectivity.

### 2.2 Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/request-otp`
  - Body: `{ "email": "student@psgtech.ac.in" }`
  - Logic: Validates institutional domain against directory; triggers email OTP.
- `POST /api/v1/auth/verify-otp`
  - Body: `{ "email": "student@psgtech.ac.in", "otp": "123456" }`
  - Response: `{ "token": "<JWT>", "user": { "id": "...", "role": "STUDENT" } }`
- `GET /api/v1/auth/me`
  - Returns authenticated user details and profile summary.

### 2.3 Student Profile (`/api/v1/students`)
- `GET /api/v1/students/profile` -> Returns current student's full profile and directory details.
- `PUT /api/v1/students/profile` -> Updates non-academic profile fields (phone, profile photo, bio).
- `GET /api/v1/students/skills` -> Returns extracted student skills with canonical references and evidence.

### 2.4 Resumes (`/api/v1/resumes`)
- `POST /api/v1/resumes/upload-url`
  - Body: `{ "file_name": "resume.pdf", "file_size": 154200, "mime_type": "application/pdf" }`
  - Response: `{ "resume_id": "...", "upload_url": "<presigned_s3_url>" }`
- `POST /api/v1/resumes/{resume_id}/process`
  - Triggers asynchronous parsing job; returns `{ "job_id": "...", "status": "QUEUED" }`.
- `GET /api/v1/resumes/{resume_id}/status`
  - Returns current processing status, extracted summary, and quality assessment.

### 2.5 Recruitment Drives (`/api/v1/drives`)
- `GET /api/v1/drives`
  - Query parameters: `?status=OPEN&page=1&limit=20`
  - Accessible to Students (open drives) and Recruiters (own drives).
- `POST /api/v1/drives` (Recruiter only)
  - Creates new drive with required/preferred skills and target criteria.
- `GET /api/v1/drives/{drive_id}` -> Returns complete drive specifications.
- `PUT /api/v1/drives/{drive_id}/status` (Recruiter/Admin) -> Updates drive status (e.g., `PUBLISHED`).

### 2.6 Applications (`/api/v1/applications`)
- `POST /api/v1/applications` (Student only)
  - Body: `{ "drive_id": "...", "resume_id": "..." }`
  - Executes deterministic eligibility engine check.
- `GET /api/v1/applications` -> Lists user's applications or recruiter's drive candidates.
- `GET /api/v1/applications/{application_id}` -> Returns application status, score breakdown, and assessment status.
- `POST /api/v1/applications/{application_id}/action` (Recruiter only)
  - Body: `{ "action": "SHORTLIST", "notes": "Strong candidate on backend systems." }`

### 2.7 Assessments & Adaptive Testing (`/api/v1/assessments`)
- `GET /api/v1/assessments/{assessment_id}/start` (Student)
  - Verifies eligibility window; initializes an `assessment_attempt` with server-authoritative timer.
- `GET /api/v1/assessments/attempts/{attempt_id}/next-question` (Student)
  - Returns the next question adapted to candidate's current difficulty track.
- `POST /api/v1/assessments/attempts/{attempt_id}/submit-answer` (Student)
  - Body: `{ "question_id": "...", "selected_answer": "B", "response_time_ms": 14200 }`
- `POST /api/v1/assessments/attempts/{attempt_id}/finish` (Student)
  - Finalizes attempt and triggers deterministic scoring.

### 2.8 Proctoring Telemetry (`/api/v1/proctoring`)
- `POST /api/v1/proctoring/events`
  - Body:
    ```json
    {
      "attempt_id": "...",
      "events": [
        {
          "event_type": "TAB_SWITCH",
          "timestamp": "2026-09-18T10:15:30Z",
          "duration_seconds": 3.2,
          "confidence": 1.0,
          "source": "BROWSER"
        }
      ]
    }
    ```
  - Backend aggregates signals temporally, checks repetition, and applies penalty formulas.

### 2.9 Recruiter & Admin Analytics (`/api/v1/analytics`)
- `GET /api/v1/analytics/recruiter/drive/{drive_id}` -> Funnel analytics, candidate skill distribution.
- `GET /api/v1/analytics/admin/overview` -> College placement participation, department distributions.
- *Rule*: Returns `"Not enough data yet."` if samples are insufficient.
