# HireLens Database Specification (PostgreSQL / Supabase)

## 1. Schema Overview

HireLens utilizes PostgreSQL hosted on Supabase Cloud. All sensitive tables have Row Level Security (RLS) enabled. Primary keys use UUIDv4, and all state mutations maintain strict timestamps.

---

## 2. Table Definitions

### 2.1 Identity & Authorization

#### `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Institutional or corporate email |
| `role` | VARCHAR(50) | NOT NULL, CHECK (role IN ('STUDENT', 'RECRUITER', 'COLLEGE_ADMIN')) | Role for RBAC |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'ACTIVE' | Account state |
| `last_login_at` | TIMESTAMPTZ | NULL | Last login timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

#### `students`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Student identifier |
| `user_id` | UUID | UNIQUE, NOT NULL, REFERENCES users(id) ON DELETE CASCADE | Associated user account |
| `register_number`| VARCHAR(50) | UNIQUE, NOT NULL | Institutional registration number |
| `name` | VARCHAR(255) | NOT NULL | Full name |
| `department` | VARCHAR(100) | NOT NULL | Academic department |
| `batch` | VARCHAR(50) | NOT NULL | Admission batch |
| `graduation_year`| INTEGER | NOT NULL | Year of graduation |
| `phone` | VARCHAR(20) | NULL | Contact phone number |
| `profile_photo_url` | TEXT | NULL | Profile photo storage link |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'ACTIVE' | Student directory state |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

#### `recruiters`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Recruiter identifier |
| `user_id` | UUID | UNIQUE, NOT NULL, REFERENCES users(id) ON DELETE CASCADE | Associated user account |
| `company_name` | VARCHAR(255) | NOT NULL | Hiring company name |
| `designation` | VARCHAR(100) | NOT NULL | Job designation |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

---

### 2.2 Drives & Applications

#### `drives`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Drive identifier |
| `created_by` | UUID | NOT NULL, REFERENCES users(id) | Recruiter user |
| `company_name` | VARCHAR(255) | NOT NULL | Company name |
| `job_title` | VARCHAR(255) | NOT NULL | Position title |
| `description` | TEXT | NOT NULL | Full job description |
| `location` | VARCHAR(255) | NOT NULL | Job location / Remote |
| `employment_type` | VARCHAR(50) | NOT NULL | Full-time, Internship, etc. |
| `application_deadline` | TIMESTAMPTZ | NOT NULL | End of application window |
| `assessment_start` | TIMESTAMPTZ | NULL | Assessment window start |
| `assessment_end` | TIMESTAMPTZ | NULL | Assessment window end |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'DRAFT' | Drive lifecycle status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

#### `drive_skills`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Mapping ID |
| `drive_id` | UUID | NOT NULL, REFERENCES drives(id) ON DELETE CASCADE | Target drive |
| `canonical_skill_id` | UUID | NOT NULL, REFERENCES canonical_skills(id) | Required skill |
| `requirement_type` | VARCHAR(20) | NOT NULL, CHECK (requirement_type IN ('REQUIRED', 'PREFERRED')) | Requirement weight category |
| `weight` | NUMERIC(3,2) | NOT NULL, DEFAULT 1.00 | Scoring multiplier (0.10 - 2.00) |
| `minimum_evidence_level` | VARCHAR(50) | NULL | Minimum expected proof |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

#### `applications`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Application ID |
| `drive_id` | UUID | NOT NULL, REFERENCES drives(id) ON DELETE CASCADE | Target drive |
| `student_id` | UUID | NOT NULL, REFERENCES students(id) ON DELETE CASCADE | Applying student |
| `resume_id` | UUID | NOT NULL, REFERENCES resumes(id) | Snapshot resume used |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'APPLIED' | Application lifecycle state |
| `applied_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Application timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |
| *Constraint* | UNIQUE (drive_id, student_id) | | Prevents duplicate applications |

---

### 2.3 Resumes & Skills

#### `resumes`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Resume ID |
| `student_id` | UUID | NOT NULL, REFERENCES students(id) ON DELETE CASCADE | Student owner |
| `s3_key` | VARCHAR(500) | NOT NULL | Private S3 object key |
| `file_name` | VARCHAR(255) | NOT NULL | Original filename |
| `mime_type` | VARCHAR(100) | NOT NULL | File MIME type (application/pdf) |
| `file_size` | INTEGER | NOT NULL | Size in bytes |
| `file_hash` | VARCHAR(64) | NOT NULL | SHA-256 hash for deduplication |
| `page_count` | INTEGER | NOT NULL, DEFAULT 1 | Total PDF pages |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'UPLOADED' | UPLOADED, PROCESSING, PROCESSED, FAILED |
| `extraction_method` | VARCHAR(50) | NULL | NATIVE, OCR, HYBRID |
| `extraction_quality`| VARCHAR(50) | NULL | HIGH, MEDIUM, LOW |
| `uploaded_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Upload timestamp |
| `processed_at` | TIMESTAMPTZ | NULL | Processing completion |
| `error_code` | VARCHAR(100) | NULL | Failure categorization |

#### `resume_documents`
Stores parsed raw & normalized per-page text:
`id`, `resume_id` (FK), `page_number`, `raw_text`, `normalized_text`, `ocr_used` (BOOL), `ocr_confidence` (FLOAT), `layout_data` (JSONB).

#### `resume_sections`
Stores segmented resume sections:
`id`, `resume_id` (FK), `section_type` (EDUCATION, SKILLS, EXPERIENCE, PROJECTS, CERTIFICATIONS), `page_number`, `content` (TEXT), `confidence` (FLOAT), `start_position`, `end_position`.

#### `canonical_skills`
Canonical skill taxonomy:
`id`, `name` (UNIQUE, e.g. "PostgreSQL"), `category` (BACKEND, DATABASE, CLOUD, ML, etc.), `created_at`.

#### `skill_aliases`
Aliases mapped to canonical skills:
`id`, `canonical_skill_id` (FK), `alias` (UNIQUE, e.g. "postgres", "psql").

#### `student_skills`
Extracted skills attributed to student:
`id`, `student_id` (FK), `canonical_skill_id` (FK), `source` (EXPLICIT, PROJECT, EXPERIENCE, CERTIFICATION, INFERRED), `confidence` (FLOAT), `proficiency_evidence` (TEXT), `created_at`, `updated_at`.

#### `skill_evidence`
Direct traceability link:
`id`, `student_skill_id` (FK), `resume_id` (FK), `section_id` (FK), `page_number`, `evidence_text` (TEXT), `source_type`, `confidence`, `created_at`.

---

### 2.4 Assessments & Proctoring

#### `assessments`
`id`, `drive_id` (FK), `title`, `question_count`, `duration_seconds`, `time_per_question`, `max_attempts`, `allow_back_navigation`, `adaptive_enabled`, `min_difficulty`, `max_difficulty`, `passing_score`, `status`, `created_at`.

#### `questions`
`id`, `assessment_id` (FK), `skill_id` (FK), `topic`, `question_text`, `options` (JSONB), `correct_answer`, `explanation`, `difficulty` (1 to 5), `source` (GENERATED, MANUAL), `validation_status` (PENDING, VALIDATED, REJECTED), `created_at`.

#### `assessment_attempts`
`id`, `assessment_id` (FK), `student_id` (FK), `attempt_number`, `started_at`, `deadline_at`, `submitted_at`, `score` (FLOAT), `integrity_score` (FLOAT), `integrity_status` (NORMAL, LOW_CONCERN, REVIEW_REQUIRED, HIGH_CONCERN, CRITICAL_REVIEW), `status`, `created_at`.

#### `assessment_answers`
`id`, `attempt_id` (FK), `question_id` (FK), `selected_answer`, `correct` (BOOL), `answered_at`, `response_time_ms`.

#### `proctoring_events`
`id`, `attempt_id` (FK), `event_type` (TAB_SWITCH, FACE_MISSING, MULTIPLE_FACE, OBJECT_DETECTED, FULLSCREEN_EXIT), `severity` (LOW, MEDIUM, HIGH, CRITICAL), `started_at`, `ended_at`, `duration_seconds`, `confidence` (FLOAT), `base_penalty` (FLOAT), `confidence_factor` (FLOAT), `duration_factor` (FLOAT), `repetition_factor` (FLOAT), `calculated_penalty` (FLOAT), `source` (BROWSER, CAMERA), `metadata` (JSONB), `created_at`.

---

### 2.5 Candidate Scores, Notifications & Audit

#### `candidate_scores`
`id`, `application_id` (FK), `resume_match_score` (FLOAT), `required_skill_score` (FLOAT), `preferred_skill_score` (FLOAT), `semantic_match_score` (FLOAT), `evidence_score` (FLOAT), `assessment_score` (FLOAT), `overall_score` (FLOAT), `score_version` (VARCHAR(20), e.g. "v1.0"), `calculated_at`.

#### `notifications`
`id`, `user_id` (FK), `type`, `title`, `message`, `read_at`, `delivery_status`, `sent_at`, `failure_reason`, `created_at`.

#### `audit_logs`
`id`, `actor_user_id` (FK), `action`, `resource_type`, `resource_id`, `timestamp`, `ip_hash`, `metadata` (JSONB).

#### `ai_jobs`
`id`, `job_type`, `status` (QUEUED, PROCESSING, COMPLETED, FAILED), `attempt_count`, `created_at`, `started_at`, `completed_at`, `error_category`, `metadata` (JSONB).

---

## 3. Essential Indexes

```sql
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_department_batch ON students(department, batch);
CREATE INDEX idx_drives_created_by ON drives(created_by);
CREATE INDEX idx_drives_status ON drives(status);
CREATE INDEX idx_applications_drive_id ON applications(drive_id);
CREATE INDEX idx_applications_student_id ON applications(student_id);
CREATE INDEX idx_resumes_student_id ON resumes(student_id);
CREATE INDEX idx_student_skills_student_id ON student_skills(student_id);
CREATE INDEX idx_assessment_attempts_student_id ON assessment_attempts(student_id);
CREATE INDEX idx_assessment_attempts_assessment_id ON assessment_attempts(assessment_id);
CREATE INDEX idx_proctoring_events_attempt_id ON proctoring_events(attempt_id);
CREATE INDEX idx_candidate_scores_application_id ON candidate_scores(application_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, timestamp);
```

---

## 4. Supabase Row Level Security (RLS) Policies

1. **`students`**:
   - `SELECT`: Student sees own record (`auth.uid() = user_id`). Recruiters and College Admins see authorized students.
   - `UPDATE`: Student can update non-academic fields (phone, photo). Academic fields are admin-only.
2. **`resumes`**:
   - `SELECT`: Student sees own resumes. Recruiters see resumes of candidates who applied to their active drives.
   - `INSERT`: Student can upload for own `student_id`.
3. **`applications`**:
   - `SELECT`: Student sees own applications. Recruiter sees applications for their own drives.
   - `INSERT`: Student creates application for open drive if eligible.
4. **`candidate_scores` & `proctoring_events`**:
   - Student cannot view detailed proctoring penalty factors or recruiter score breakdown formulas. Recruiter and Admin have read access.
