# HireLens Security Specification

## 1. Principles & Threat Model

HireLens handles sensitive candidate resumes, educational credentials, and assessment integrity signals. Security is enforced through:
- **Zero Frontend Trust**: Frontend route guards are for UX only; backend endpoints strictly enforce authorization and token authenticity on every request.
- **Strict Role-Based Access Control (RBAC)**: Distinct permissions for `STUDENT`, `RECRUITER`, and `COLLEGE_ADMIN`, enforced via FastAPI dependencies (`get_current_user`, `require_role`).
- **Account Status Enforcement**: Active validation of `UserStatus.SUSPENDED`, terminating sessions and denying OTP/passkey access.
- **Cryptographic OTP Generation & Lifecycle**: 6-digit OTPs generated via Python `secrets`, enforced with 10-minute TTL expiration and a 5-failed-attempt lockout.
- **Environment Isolation**: Dev bypasses and instant access shortcuts are strictly disabled when `APP_ENV=production`.

---

## 2. Access Control & Data Isolation

### Current Implementation:
- **FastAPI RBAC & Dependency Verification**: Endpoints inspect JWT claims and verify user role, status, and ownership against repository entities before returning or modifying data.
- **Institutional Domain Restrictions**: Candidate email authentication is restricted to validated institutional domains (e.g., `psgtech.ac.in`, `student.psgtech.ac.in`).

### Target Production Architecture (Planned Phase):
- **Row Level Security (RLS)**: PostgreSQL-level data isolation preventing Horizontal Privilege Escalation (IDOR) when transitioning from the local repository to Supabase PostgreSQL:

| Table | Actor Role | Permitted Actions | Policy Expression |
| :--- | :--- | :--- | :--- |
| `students` | `STUDENT` | `SELECT`, `UPDATE` (non-academic) | `user_id = auth.uid()` |
| `students` | `RECRUITER` | `SELECT` | Candidate has applied to recruiter's drive |
| `resumes` | `STUDENT` | `SELECT`, `INSERT` | `student_id IN (SELECT id FROM students WHERE user_id = auth.uid())` |
| `resumes` | `RECRUITER` | `SELECT` | Resume linked to an application on recruiter's drive |
| `applications` | `STUDENT` | `SELECT`, `INSERT` | `student_id IN (SELECT id FROM students WHERE user_id = auth.uid())` |
| `applications` | `RECRUITER` | `SELECT`, `UPDATE` (status) | `drive_id IN (SELECT id FROM drives WHERE created_by = auth.uid())` |
| `proctoring_events`| `STUDENT` | `INSERT` (stream events) | Associated `attempt_id` belongs to student |
| `proctoring_events`| `RECRUITER` | `SELECT` | Attempt belongs to an applicant on recruiter's drive |

---

## 3. Storage Security

### Current Implementation:
- **Local Storage Isolation**: Resumes uploaded during development and local testing are saved to sandboxed paths under `uploads/resumes/{user_id}/` with sanitized filenames.

### Target Production Architecture (Planned Phase):
1. **Private S3 Bucket Policies**: Public read/write completely disabled (`BlockPublicAcls`, `BlockPublicPolicy`, `IgnorePublicAcls`, `RestrictPublicBuckets` set to `true`).
2. **Object Keys**: Hashed non-guessable paths: `resumes/{student_id}/{uuid4()}.pdf`.
3. **Presigned Uploads & Downloads**: Enforces `Content-Type: application/pdf` and maximum byte length with short-lived (15-minute) expiration.

---

## 4. Rate Limiting, OTP Security & Input Validation

- **OTP Cryptography**: Generated with `secrets.choice(string.digits)` preventing pseudorandom predictability.
- **OTP Expiry & Lockout**: OTP entries expire after 600 seconds (10 minutes). Exceeding 5 incorrect verification attempts locks out the OTP code immediately.
- **Production Guardrails**: Hardcoded developer OTP (`123456`) and developer bypasses are strictly disallowed when `APP_ENV=production`.
- **Pydantic Validation**: All string inputs are stripped of control characters; request payloads validate strict Pydantic schemas.

