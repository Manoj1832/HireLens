# HireLens Security Specification

## 1. Principles & Threat Model

HireLens handles sensitive candidate resumes, educational credentials, and assessment integrity signals. Security is enforced through:
- **Zero Frontend Trust**: Frontend route guards are for UX only; backend endpoints strictly enforce authorization on every request.
- **Strict Role-Based Access Control (RBAC)**: Distinct permissions for `STUDENT`, `RECRUITER`, and `COLLEGE_ADMIN`.
- **Row Level Security (RLS)**: PostgreSQL-level data isolation preventing Horizontal Privilege Escalation (IDOR).
- **Private S3 Storage**: All resume files are private; presigned URLs with short TTLs (15 mins) are required for all access.
- **Audit Logging**: Every state modification and sensitive data view is recorded in `audit_logs`.

---

## 2. Row Level Security (RLS) Policies

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

## 3. Storage Security (S3)

1. **Bucket Policies**: Public read/write is completely disabled (`BlockPublicAcls`, `BlockPublicPolicy`, `IgnorePublicAcls`, `RestrictPublicBuckets` set to `true`).
2. **Object Keys**: Hashed non-guessable paths: `resumes/{student_id}/{uuid4()}.pdf`.
3. **Presigned Uploads**: Enforces `Content-Type: application/pdf` and maximum byte length in the presigned policy.
4. **Presigned Downloads**: Authorized recruiters and students obtain URLs with 15-minute expiration.

---

## 4. Rate Limiting & Input Validation

- **Authentication Rate Limits**: Maximum 5 OTP requests per email per hour; 5 failed OTP attempts triggers a 15-minute lockout.
- **Resume Upload Limits**: Maximum 5 resume uploads per 24 hours per student.
- **Pydantic Validation**: All string inputs are stripped of control characters; IDs must conform to valid UUIDv4 strings.
