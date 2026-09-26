HireLens — Architecture Decision Addendum
This addendum closes five architecture/business-logic gaps before implementation.

1. FastAPI + Supabase/PostgreSQL RLS
Decision: Normal user-scoped database operations must preserve the authenticated user's identity so PostgreSQL RLS actually enforces access.

Browser
  ↓ authenticated session/JWT
FastAPI
  ↓ authenticate + authorize
Authenticated database context
  ↓
Supabase/PostgreSQL
  ↓
RLS
FastAPI handles authentication, RBAC, business rules, state transitions, validation, and ownership checks.

Do not use the Supabase service-role key for normal user-scoped requests. It may be used only for explicitly privileged server-side jobs/maintenance where bypassing RLS is intentional and documented.

Never expose SUPABASE_SERVICE_ROLE_KEY to the frontend.

Document the exact JWT-to-database/RLS flow in docs/security.md.

Required tests:

Student A → Student B resume: DENIED

Student A → Student B assessment: DENIED

Recruiter A → Recruiter B candidate: DENIED

Student → recruiter/admin endpoint: DENIED

Authorized user → authorized resource: ALLOWED

2. Proctoring Client/Server Split
Decision: Face/object detection should primarily run on the student's device/browser. Do not continuously stream webcam frames to the backend.

Student Browser
  ├─ Assessment UI
  └─ Camera processing
       ├─ Face detection
       └─ Object detection
              ↓
       Temporal aggregation
              ↓
       Meaningful integrity events
              ↓
           FastAPI
              ↓
          PostgreSQL
The backend remains authoritative for:

attempt validation

event validation

timestamps

deduplication

temporal validation/aggregation where appropriate

penalty calculation

integrity score

assessment state

audit trail

The client must never submit an authoritative integrity score, penalty, or severity.

Supported device baseline
Initially target:

modern Chrome/Edge/Firefox

webcam

approximately 8 GB RAM

modern 64-bit CPU

sufficient browser memory

stable internet

hardware acceleration where available

This is a supported baseline, not a claim that lower-spec devices cannot run the product.

Before a monitored assessment, run a device check:

Browser → Camera → Permission → Basic performance → Network
                              ↓
                         Ready / Attention
Do not discover critical incompatibility halfway through an assessment.

Performance
Measure inference latency and processing load where practical. Use configurable throttling. Do not process every camera frame unnecessarily.

If monitoring becomes unavailable because of technical/device failure:

inform the student

record a technical/system event

follow the approved institutional assessment policy

Do not convert technical failure into a malpractice event automatically.

Document this in docs/proctoring.md.

3. Authentication — Single OTP
Decision: Use email OTP as the single primary authentication mechanism.

Do not implement both OTP and magic links in V1.

Student flow
Institutional email
  ↓
Domain validation
  ↓
Student-directory validation
  ↓
One-time OTP
  ↓
Verification
  ↓
Authenticated session
Implement:

OTP expiration

limited attempts

resend cooldown

rate limiting

brute-force protection

invalid-OTP handling

secure session expiration

protection against account enumeration

Recruiter/admin accounts use the same authentication mechanism and are provisioned/invited by an authorized college administrator.

4. India Data Protection and Privacy
HireLens processes personal information and uses camera-based assessment monitoring. The production design must explicitly address the Digital Personal Data Protection Act, 2023 (DPDP Act) and applicable rules/guidance, together with the college's policies.

Do not treat institutional consent as an informal checkbox.

Create docs/privacy.md covering:

data categories

processing purposes

data minimization

access control

retention

deletion/erasure where applicable

student-facing privacy notice

assessment-monitoring notice

consent or other applicable legal mechanism as determined by the institution

data sharing/access

third-party service involvement

vendor/data-processor considerations

incident handling

institutional responsibilities

Before a monitored assessment, clearly explain:

Assessment Integrity Monitoring

The system may monitor:
- whether the assessment window remains active
- whether a face is visible
- whether multiple people appear in the camera view
- whether configured prohibited objects appear

These signals identify events that may require review.

One detected event does not automatically establish misconduct.
Prefer:

Camera → Local detection → Event metadata → Backend
instead of continuous recording/storage.

Do not store continuous video by default.

Do not claim "DPDP compliant" until the actual implementation has undergone appropriate legal and institutional review.

5. Canonical Skill Taxonomy Governance
Decision: Use a college-admin-managed, versioned canonical skill taxonomy.

The taxonomy contains:

canonical skills

aliases

categories

relationships

Example:

JavaScript
  ├─ JS
  ├─ Javascript
  ├─ Java Script
  └─ ECMAScript
Authorized college admins can:

add skills

edit metadata

activate/deactivate skills

add/deactivate aliases

assign categories

define relationships

review normalization suggestions

Students and recruiters cannot directly modify the canonical taxonomy.

Every taxonomy change must record:

changed_by
change_type
old_value
new_value
timestamp
reason
Use the existing audit-log system.

Maintain a taxonomy version such as:

Skill Taxonomy v1.0
Skill Taxonomy v1.1
Where reproducibility matters, store the taxonomy version used for resume processing/matching.

Unknown resume skill
Do not automatically add every unknown phrase.

Unknown phrase
  ↓
Normalization suggestion
  ↓
Admin review
  ├─ Reject
  └─ Approve
       ↓
  Canonical skill + alias
This prevents pollution from typos, OCR errors, irrelevant phrases, company-specific terminology, or hallucinated skills.

Unknown recruiter skill
Recruiter enters unknown skill
  ↓
Suggest closest canonical skills
  ↓
Recruiter selects existing skill
If no appropriate skill exists:

Request new skill
  ↓
Admin review
  ↓
Taxonomy update
6. Locked V1 Architecture Summary
AUTHENTICATION
Email OTP only

AUTHORIZATION
FastAPI authentication + authorization
+
authenticated database context
+
Supabase/PostgreSQL RLS
+
restricted service-role usage

RESUME
Native PDF extraction
→ quality check
→ OCR fallback
→ structured extraction
→ canonical skills
→ evidence

MATCHING
Deterministic scoring
+
semantic similarity
+
skill evidence
+
assessment performance

ASSESSMENT
Validated questions
+
deterministic adaptive difficulty
+
server-authoritative timing

PROCTORING
Client/device-side detection
→ temporal aggregation
→ backend validation
→ deterministic integrity scoring

VIDEO
No continuous video upload/storage by default

PRIVACY
Privacy by design
+
DPDP Act considerations
+
institutional/legal review before real deployment

SKILL TAXONOMY
Versioned canonical taxonomy
+
college-admin governance
+
audit trail

INFRASTRUCTURE
Next.js
+
FastAPI
+
Background Worker
+
Supabase
+
S3
+
Upstash Redis
+
Groq

No Kafka
No Kubernetes
No unnecessary microservices
No unnecessary databases
7. Required Documentation Updates
docs/architecture.md
Document:

frontend/backend/worker architecture

cloud-service boundaries

proctoring client/server split

authentication flow

background-worker responsibilities

docs/security.md
Document:

session/JWT validation

FastAPI authorization

authenticated database context

RLS enforcement

service-role restrictions

IDOR testing

S3 access control

docs/privacy.md
Document:

personal-data inventory

assessment monitoring

data minimization

retention

deletion/erasure

institutional approval requirements

applicable DPDP considerations

docs/proctoring.md
Document:

browser/device processing

event generation

temporal aggregation

backend validation

device baseline

performance protection

technical-failure handling

no continuous video by default

docs/business-logic.md
Document:

authentication

monitoring rules

integrity-event handling

skill taxonomy governance

state transitions

recruiter/admin permissions

docs/database.md
Document:

RLS policies

ownership relationships

taxonomy versioning

audit records

integrity-event records

8. Updated Build Order
PHASE 0 — Foundation
        ↓
PHASE 1 — Authentication + Users + RBAC + RLS
        ↓
PHASE 2 — Student Profile
        ↓
PHASE 3 — Resume Processing
        ↓
PHASE 4 — Drives + Applications
        ↓
PHASE 5 — Matching
        ↓
PHASE 6 — Assessment
        ↓
PHASE 7 — Adaptive Assessment
        ↓
PHASE 8 — Assessment Integrity
        ↓
PHASE 9 — Recruiter + Admin
        ↓
PHASE 10 — Notifications
        ↓
PHASE 11 — Security Hardening
        ↓
PHASE 12 — Validation
        ↓
PHASE 13 — Production Readiness
At every phase:

Implement
  ↓
Test
  ↓
Run
  ↓
Verify business logic
  ↓
Fix
  ↓
Proceed
Do not proceed while a critical business/security rule from the current phase is broken.

9. Final Pre-Build Checklist

FastAPI + RLS architecture documented


Service-role usage restricted


IDOR/RLS tests planned


Proctoring client/server split decided


Browser performance baseline defined


Device-check flow defined


No continuous video by default


Email OTP selected as the single auth mechanism


OTP security rules defined


DPDP/privacy requirements explicitly documented


Institutional/legal review requirement documented


Canonical skill governance defined


Skill taxonomy versioning defined


Admin skill-management workflow defined


Unknown-skill workflow defined


Recruiter unknown-skill workflow defined


Audit logging for taxonomy changes defined


Architecture documentation updated


Business-logic documentation updated


Security documentation updated


Privacy documentation updated


Proctoring documentation updated


Database/RLS documentation updated

Only after these decisions are reflected in the architecture and
business-logic documents should implementation begin.