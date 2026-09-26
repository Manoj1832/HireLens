# HireLens Business Logic & State Transitions

## 1. Actor Roles & Permissions

HireLens enforces three distinct user roles:

1. **`STUDENT`**:
   - Must hold an institutional email address belonging to an authorized college domain (e.g., `@psgtech.ac.in`) registered in the pre-loaded **Student Directory**.
   - Can manage their own profile, upload resumes, view active recruitment drives, verify eligibility, apply, and complete assigned assessments.
   - Can never see another student's resume, applications, scores, or proctoring signals.
2. **`RECRUITER`**:
   - Accounts provisioned or invited by authorized College Placement Administrators.
   - Can create, edit, and publish recruitment drives.
   - Can view only candidates who applied to their authorized drives.
   - Can review candidate skill evidence, view deterministic match scores, inspect assessment integrity timelines, and change candidate application status (`SHORTLIST`, `MOVE TO REVIEW`, `REJECT`, `SELECT`).
3. **`COLLEGE_ADMIN`**:
   - Manages the institutional student directory (import batch lists).
   - Provisions recruiter access and approves published drives.
   - Views college-wide placement statistics, assessment integrity audits, and comprehensive audit logs.

---

## 2. Explicit State Machines

Every core entity transitions through strictly enforced state machines. Arbitrary or reverse transitions are prohibited.

### 2.1 Recruitment Drive State Machine

```
   ┌─────────┐
   │  DRAFT  │
   └────┬────┘
        │ Recruiter submits & college approves
        ▼
   ┌───────────┐
   │ PUBLISHED │
   └────┬──────┘
        │ Application window opens
        ▼
   ┌─────────┐
   │  OPEN   │ ◄── Students can apply & take assessments
   └────┬────┘
        │ Application deadline reached
        ▼
   ┌──────────┐
   │  CLOSED  │ ◄── Recruiter reviews and shortlists
   └────┬─────┘
        │ Hiring decisions finalized
        ▼
   ┌───────────┐
   │ COMPLETED │
   └────┬──────┘
        │ Drive cycle archived
        ▼
   ┌──────────┐
   │ ARCHIVED │
   └──────────┘
```

### 2.2 Student Application State Machine

```
   ┌─────────┐
   │ APPLIED │
   └────┬────┘
        │ Eligibility engine checks criteria
        ▼
   ┌──────────┐
   │ ELIGIBLE │ (Or REJECTED_INELIGIBLE)
   └────┬─────┘
        │ Drive assessment generated
        ▼
   ┌────────────────────┐
   │ ASSESSMENT_PENDING │
   └────┬───────────────┘
        │ Student starts test
        ▼
   ┌────────────────────┐
   │ ASSESSMENT_STARTED │
   └────┬───────────────┘
        │ Student submits / timer expires
        ▼
   ┌──────────────────────┐
   │ ASSESSMENT_COMPLETED │
   └────┬─────────────────┘
        │ Deterministic candidate score calculated
        ▼
   ┌──────────────┐
   │ UNDER_REVIEW │
   └────┬─────────┘
        ├──────────────────────┬──────────────────────┐
        ▼                      ▼                      ▼
   ┌─────────────┐        ┌──────────┐           ┌──────────┐
   │ SHORTLISTED │        │ REJECTED │           │ SELECTED │
   └─────────────┘        └──────────┘           └──────────┘
```

### 2.3 Resume Processing State Machine

```
   ┌──────────┐
   │ UPLOADED │
   └────┬─────┘
        │ Queued for extraction
        ▼
   ┌────────────┐
   │ PROCESSING │
   └────┬───────┘
        ├──────────────────────────────────────┐
        │ Success                              │ Text unreadable / malformed
        ▼                                      ▼
   ┌───────────┐                          ┌────────┐
   │ PROCESSED │                          │ FAILED │ (Allows user retry)
   └───────────┘                          └────────┘
```

### 2.4 Assessment Attempt State Machine

```
   ┌─────────┐
   │ STARTED │
   └────┬────┘
        ├──────────────────────────────────────┐
        │ Normal submission                    │ Timer expired
        ▼                                      ▼
   ┌───────────┐                          ┌─────────┐
   │ SUBMITTED │                          │ EXPIRED │
   └─────┬─────┘                          └────┬────┘
         └──────────────────┬──────────────────┘
                            ▼
                     ┌───────────┐
                     │ EVALUATED │
                     └───────────┘
```

---

## 3. Student Eligibility Engine

When a student attempts to apply to a drive, the backend evaluates the student profile against the drive requirements:

1. **Department Whitelist**: Student's department matches allowed drive departments.
2. **Graduation Batch**: Student's graduation year matches drive target batch.
3. **Resume Status**: Student has at least one resume with status `PROCESSED`.
4. **Mandatory Skills Check**: If the drive marks skills as `REQUIRED`, checks if the student has verified evidence for those skills.
5. **No Duplicate Applications**: Student has not already submitted an application for this drive.

If any check fails, the application is blocked with a clear, user-friendly explanation (e.g., "This drive is open to Computer Science and Information Technology students graduating in 2026.").
