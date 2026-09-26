# HireLens Testing Strategy & Validation Specification

## 1. Testing Pyramid

HireLens mandates thorough test coverage across:
- **Unit Tests**: Business calculations, penalty formulas, adaptive state logic, Pydantic schemas.
- **Integration Tests**: FastAPI endpoints, database repositories, Redis queue dispatch, S3 presigned URL generation.
- **Security & RLS Tests**: Cross-tenant isolation (Student A attempting to access Student B's resume or score).
- **Scoring Reproducibility Tests**: Deterministic scoring validation.

---

## 2. Mandatory Validation Release Gates (Section 152)

Before any release:

### 2.1 Scoring Reproducibility Test
- The test suite executes the exact same event timeline and resume input **100 times**.
- **Expected**: Identical penalty calculations, identical integrity scores, and identical overall scores on every execution (zero random drift).

### 2.2 Proctoring Temporal Aggregation Test
- Emits rapid consecutive blur events (e.g. 5 blur events within 2 seconds).
- **Expected**: Accidental noise is debounced; only one aggregated event is penalized.

### 2.3 Horizontal Authorization Test (IDOR)
- Authenticate as Student A (`user_a`).
- Attempt to `GET /api/v1/resumes/{student_b_resume_id}`.
- **Expected**: `403 Forbidden` or `404 Not Found`.

### 2.4 State Machine Transition Tests
- Attempt to transition an application directly from `APPLIED` to `SHORTLISTED` without passing eligibility or assessment.
- **Expected**: `400 Bad Request` (Invalid State Transition).
