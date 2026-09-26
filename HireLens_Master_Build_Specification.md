====================================================================
HIRELENS — MASTER BUILD SPECIFICATION
Production-Ready College Recruitment & Assessment Platform
Target Deployment: Approximately 200 Students
====================================================================

ROLE
----

You are the lead software architect, senior full-stack engineer,
AI/ML engineer, security engineer, QA engineer, UI/UX engineer,
database designer, and DevOps engineer responsible for building
HireLens from this specification.

Do not treat this as a simple demo.

Build a complete, modular, production-oriented application intended
initially for approximately 200 college students.

The system must work end-to-end.

Do not create fake functionality.

Do not create buttons that do nothing.

Do not use placeholder/mock candidate data in the actual application.

Do not claim an AI capability unless the corresponding implementation
exists.

Do not hallucinate dependencies, APIs, database fields, workflows,
or external services.

Before implementing any feature, understand the business logic and
how it interacts with the rest of the system.

====================================================================
1. PRODUCT DEFINITION
====================================================================

Product name:

HireLens

Purpose:

HireLens is a college-focused recruitment and assessment platform
that connects students, recruitment teams, and college placement
administrators.

The system should:

1. Verify college students through their institutional email.
2. Maintain student profiles.
3. Process student resumes intelligently.
4. Extract and normalize skills.
5. Build evidence-backed student skill profiles.
6. Allow recruitment drives to define requirements.
7. Match student profiles against drive requirements.
8. Generate technical assessments.
9. Adapt assessment difficulty based on performance.
10. Monitor assessment integrity using browser and camera signals.
11. Maintain a transparent integrity score.
12. Provide recruiters with explainable candidate information.
13. Provide college administrators with placement analytics.
14. Send candidate notifications.
15. Maintain audit trails and secure access to sensitive information.

Initial target:

Approximately 200 students.

Architecture must be capable of growing beyond this without requiring
a complete rewrite, but do NOT over-engineer for millions of users.

====================================================================
2. CORE PRODUCT PRINCIPLE
====================================================================

HireLens is NOT:

- a generic chatbot
- a generic AI dashboard
- an autonomous hiring decision maker
- a cheat detector claiming certainty
- an LLM wrapper
- an enterprise distributed system requiring unnecessary infrastructure

HireLens IS:

A college recruitment platform with:

- verified student identity
- structured resume intelligence
- canonical skill mapping
- explainable candidate matching
- technical assessments
- adaptive assessment
- assessment-integrity monitoring
- deterministic scoring
- recruiter workflows
- college placement management
- auditability
- measurable AI components

The system must prioritize:

1. Correctness
2. Security
3. Explainability
4. Reliability
5. Usability
6. Maintainability
7. AI usefulness
8. Scalability

Do NOT prioritize adding technologies merely to make the architecture
look impressive.

====================================================================
3. FINAL TECHNOLOGY ARCHITECTURE
====================================================================

Frontend:

- Next.js
- TypeScript
- Tailwind CSS

Backend:

- FastAPI
- Python
- Pydantic

Database:

- Supabase Cloud
- PostgreSQL

Object/file storage:

- Amazon S3
- Private bucket

Caching/background infrastructure:

- Upstash Redis

LLM:

- Groq API

Resume/NLP:

- PyMuPDF or equivalent mature PDF extraction library
- OCR engine for fallback
- Hugging Face ecosystem where useful
- Sentence Transformers
- sentence-transformers/all-MiniLM-L6-v2 initially for semantic matching

Computer vision:

- MediaPipe for face detection/counting
- YOLO for prohibited-object detection where appropriate
- OpenCV where required for image processing

Background processing:

- Python background workers
- Redis-backed job processing
- Celery may be used if required for reliable asynchronous jobs

Email:

Use a backend-controlled transactional email/SMTP abstraction.

Do NOT make candidate notifications depend on browser-side email
execution.

The email provider must be isolated behind a notification service so
it can be changed later without changing business logic.

Deployment:

- Next.js hosted appropriately
- FastAPI hosted appropriately
- Background worker hosted appropriately
- Supabase Cloud
- Private S3
- Upstash Redis
- HTTPS

Development:

- Git
- Docker/Docker Compose where useful
- Environment variables
- automated tests

====================================================================
4. TECHNOLOGIES/COMPONENTS THAT MUST NOT BE ADDED
====================================================================

Do NOT add these unless a future explicit requirement demands them:

- Kafka
- Kubernetes
- blockchain
- smart contracts
- Aadhaar integration
- LinkedIn OAuth
- GitHub OAuth
- unnecessary OAuth providers
- multiple databases
- MongoDB
- Flask
- separate backend service for every tiny feature
- service mesh
- API gateway solely for architectural appearance
- multiple LLM providers
- TensorFlow without a real requirement
- multiple competing ML frameworks without justification
- Datadog + another complete observability platform unnecessarily
- complex enterprise governance products
- unnecessary microservices

The initial architecture should be:

Next.js
    |
    v
FastAPI modular backend
    |
    +---- Supabase PostgreSQL
    |
    +---- S3
    |
    +---- Upstash Redis
              |
              v
       Background workers
              |
              +---- Resume processing
              +---- Assessment generation
              +---- AI processing
              +---- Notifications
              +---- analytics jobs

This is a modular application with isolated background processing,
not a collection of dozens of independently deployed services.

====================================================================
5. AUTHENTICATION
====================================================================

Use ONE authentication mechanism:

Verified email-based authentication.

For students:

Only institutional email addresses belonging to the configured
college domain are allowed.

Example:

23z342@psgtech.ac.in

Student flow:

Enter institutional email
        |
        v
Validate domain
        |
        v
Send OTP / verification link
        |
        v
Verify email
        |
        v
Check student directory
        |
        v
Create/activate account
        |
        v
Student dashboard

IMPORTANT:

Do not allow a student to simply enter a college-domain-looking email
and automatically create unrestricted access.

Maintain a college-controlled student directory.

The directory should contain information such as:

- institutional email
- register number
- name
- department
- batch
- account status

The administrator should be able to import/manage student records.

For recruiters and administrators:

Use the SAME authentication mechanism, but their accounts must be
provisioned/invited by an authorized college administrator.

Do NOT add password authentication, social login, or multiple login
methods in V1.

Roles:

STUDENT
RECRUITER
COLLEGE_ADMIN

Implement proper role-based authorization on the backend.

Frontend route protection is not sufficient.

====================================================================
6. FRONTEND LANGUAGE RULE
====================================================================

CRITICAL:

Never expose internal technology names to end users.

Do NOT show:

- Next.js
- FastAPI
- Supabase
- S3
- Redis
- Groq
- MediaPipe
- YOLO
- OCR
- embeddings
- vector similarity
- API
- microservice
- model
- machine learning terminology

in the normal user-facing interface.

Use product/business terminology instead.

Examples:

Technical:
"Resume OCR processing failed."

Frontend:
"We couldn't read some information from your resume. Please try
uploading a clearer PDF."

Technical:
"MediaPipe detected multiple faces."

Frontend:
"We noticed more than one person in the camera view."

Technical:
"Groq API unavailable."

Frontend:
"We're temporarily unable to generate the assessment. Please try
again shortly."

Technical:
"Embedding similarity = 0.84."

Frontend:
"Resume Match: 84%"

The internal engineering dashboard/logs may contain technical details
for administrators/developers, but normal users must see clear,
professional product language.

====================================================================
7. UI/UX REQUIREMENTS
====================================================================

The interface must NOT look like a generic AI-generated dashboard.

It must look like a serious modern recruitment/placement product.

Visual identity:

- White primary background
- Professional blue as primary brand color
- Dark navy/blue text
- Light blue supporting surfaces
- Subtle borders
- Clean cards
- Strong typography hierarchy
- Generous whitespace
- Professional tables
- Clear status badges
- Subtle shadows
- restrained rounded corners
- no excessive gradients
- no neon AI aesthetic
- no excessive glassmorphism
- no unnecessary animated blobs
- no cartoon-style illustrations
- no random AI robot imagery
- no excessive glowing effects

Design language:

Professional
Academic
Recruitment-oriented
Trustworthy
Clean
Fast
Modern

The UI should look appropriate for:

- a college placement office
- recruiters
- students
- administrators

Do not make every section look like a "card".

Use:

- tables
- timelines
- progress indicators
- structured panels
- filters
- tabs
- drawers
- detail pages
- charts
- comparison views
- clean forms

where appropriate.

Responsive design is required.

Desktop should be the primary experience for recruiters/admins.

Student assessment interface must also work reliably on laptops.

====================================================================
8. DESIGN SYSTEM
====================================================================

Create a centralized design system.

Define:

- primary blue
- secondary blue
- dark navy
- neutral gray scale
- success
- warning
- error
- information

Do not scatter arbitrary colors throughout components.

Typography:

Use a professional sans-serif system.

Define:

- page heading
- section heading
- body
- secondary text
- labels
- table text
- button text

Buttons:

Primary:
solid blue

Secondary:
white/light surface with border

Danger:
reserved for destructive actions

Status:

Success:
clear but not overly bright

Warning:
clear

Error:
clear

Do not rely on color alone to communicate meaning.

====================================================================
9. STUDENT BUSINESS FLOW
====================================================================

Student journey:

LOGIN
  |
  v
PROFILE
  |
  v
RESUME
  |
  v
RESUME ANALYSIS
  |
  v
SKILL PROFILE
  |
  v
AVAILABLE DRIVES
  |
  v
DRIVE DETAILS
  |
  v
ELIGIBILITY
  |
  v
APPLICATION
  |
  v
ASSESSMENT
  |
  v
ASSESSMENT INTEGRITY MONITORING
  |
  v
SUBMISSION
  |
  v
APPLICATION STATUS
  |
  v
NOTIFICATION

Student dashboard should contain:

- Profile completion
- Resume status
- Skill summary
- Available drives
- Applied drives
- Upcoming assessments
- Assessment status
- Application status
- Notifications

Do not expose recruiter-only information.

====================================================================
10. STUDENT PROFILE
====================================================================

Student profile fields:

- Name
- Register number
- Institutional email
- Department
- Batch
- Graduation year
- Phone if required by college policy
- Profile photo if required
- Education
- Skills
- Projects
- Certifications
- Experience
- Resume

The institutional email should not be editable by the student.

Sensitive identity information must be protected.

====================================================================
11. RESUME PROCESSING PIPELINE
====================================================================

This is one of the core HireLens systems.

DO NOT send the raw PDF directly to the LLM and ask it to "understand
the resume."

Implement a structured pipeline.

Pipeline:

Resume upload
    |
    v
File validation
    |
    v
Private S3 storage
    |
    v
Resume processing job
    |
    v
PDF inspection
    |
    v
Native text extraction
    |
    v
Text quality evaluation
    |
    +---- Sufficient ----> Continue
    |
    +---- Insufficient --> OCR fallback
                              |
                              v
                        Extracted text
    |
    v
Text cleaning
    |
    v
Layout reconstruction where possible
    |
    v
Section detection
    |
    v
Entity extraction
    |
    v
Skill candidate extraction
    |
    v
Skill normalization
    |
    v
Canonical skill mapping
    |
    v
Evidence linking
    |
    v
Student skill profile
    |
    v
Resume analysis complete

====================================================================
12. RESUME FILE VALIDATION
====================================================================

Validate:

- file type
- MIME type
- file signature
- file size
- page count
- malformed PDF
- suspicious file content

Do not trust only the filename extension.

Reject unsafe/unsupported files.

Define reasonable file limits through configuration.

Do not allow unlimited uploads.

====================================================================
13. NATIVE PDF EXTRACTION
====================================================================

Use a mature PDF parser.

Preserve:

- page number
- text blocks
- positional information where available
- raw text

Do not immediately flatten everything into one string.

Example internal structure:

{
  page: 1,
  blocks: [
    {
      text: "...",
      x: ...,
      y: ...,
      width: ...,
      height: ...
    }
  ]
}

Preserve raw extraction separately from normalized text.

====================================================================
14. EXTRACTION QUALITY CHECK
====================================================================

Do not trigger OCR simply because the PDF exists.

Determine whether extracted text is usable.

Consider:

- total text length
- word count
- text density
- empty pages
- character quality
- extraction confidence where available
- presence of meaningful words

If the text layer is clearly insufficient:

trigger OCR fallback.

If extraction is sufficient:

do NOT unnecessarily run OCR.

Store:

extraction_method

Possible values:

NATIVE
OCR
HYBRID

====================================================================
15. OCR FALLBACK
====================================================================

For scanned/image resumes:

PDF page
    |
    v
Render page image
    |
    v
OCR
    |
    v
Text + confidence + location
    |
    v
Resume pipeline

Preserve:

- page
- text
- confidence
- bounding box where available

OCR must be a fallback, not the default.

====================================================================
16. TEXT NORMALIZATION
====================================================================

Normalize:

- whitespace
- repeated line breaks
- broken words
- encoding issues
- common OCR errors where safely identifiable
- casing for internal comparison

DO NOT destroy the original content.

Store:

raw_text
normalized_text

Original text is required for evidence/explainability.

====================================================================
17. SECTION DETECTION
====================================================================

Detect sections such as:

SUMMARY
EDUCATION
SKILLS
TECHNICAL SKILLS
EXPERIENCE
WORK EXPERIENCE
INTERNSHIPS
PROJECTS
CERTIFICATIONS
ACHIEVEMENTS
PUBLICATIONS
EXTRACURRICULAR
LANGUAGES

Use:

1. heading dictionary
2. aliases
3. layout/position
4. formatting cues
5. fuzzy matching
6. classifier/LLM fallback only when necessary

Do not use an LLM for obvious headings.

Normalize:

"Technical Skills"
"Skills"
"Technical Expertise"

to:

SKILLS

Normalize:

"Academic Background"
"Education"
"Educational Qualification"

to:

EDUCATION

Store section confidence internally.

====================================================================
18. ENTITY EXTRACTION
====================================================================

Extract structured information.

Education:

- degree
- specialization
- institution
- start year
- end year
- GPA/percentage if present

Experience:

- organization
- role
- start date
- end date
- description
- technologies/evidence

Projects:

- name
- description
- technologies
- project links if present

Certifications:

- certification
- issuer
- date if present

Contact:

- email
- phone if required
- location if relevant

Do not invent missing information.

If information is not present:

return null/empty.

Never hallucinate an employer, degree, skill, certification, or
project.

====================================================================
19. SKILL EXTRACTION
====================================================================

Use multiple layers.

Layer 1:
Canonical skill dictionary

Layer 2:
Alias matching

Layer 3:
Contextual extraction from projects/experience

Layer 4:
Semantic/LLM assistance where necessary

Example:

"JS"
"Javascript"
"Java Script"
"ECMAScript"

map to:

JavaScript

Example:

"Node"
"NodeJS"
"Node.js"

map to:

Node.js

BUT:

Java
JavaScript

must remain different.

Spring
Spring Boot

must not automatically become identical.

SQL
PostgreSQL

must not automatically become identical.

Use relationships rather than false equivalence.

====================================================================
20. CANONICAL SKILL DATABASE
====================================================================

Create a canonical skill taxonomy.

Categories:

- Programming Languages
- Frontend
- Backend
- Databases
- Cloud
- DevOps
- AI/ML
- Data
- Cybersecurity
- Networking
- Mobile
- Testing
- Tools
- Frameworks
- APIs
- Other relevant technical categories

Table:

canonical_skills

Fields:

id
name
category
description
active
created_at
updated_at

Table:

skill_aliases

Fields:

id
canonical_skill_id
alias
normalized_alias
created_at

Also support skill relationships:

RELATED
DEPENDENT
ECOSYSTEM
SPECIALIZATION

Do not mark related technologies as equivalent unless they truly are.

====================================================================
21. STUDENT SKILL EVIDENCE
====================================================================

Every extracted skill should have evidence.

Example:

Skill:

Node.js

Evidence:

Section:
PROJECTS

Text:
"Developed REST APIs using Node.js and Express."

Source:
Resume page 2

Confidence:
internal value

Source type:

EXPLICIT
CONTEXTUAL
INFERRED

Recruiter-visible skills should preferably be backed by explicit or
contextual evidence.

Do not silently convert weak semantic inference into a hard claim.

====================================================================
22. SKILL PRESENCE VS PROFICIENCY
====================================================================

IMPORTANT:

Resume mention does NOT prove proficiency.

Separate:

skill_presence

from:

skill_proficiency

Resume evidence can establish:

EXPOSURE / EVIDENCE

Assessment results can provide stronger evidence of:

TECHNICAL PERFORMANCE

Do not say:

"Java = 9/10"

merely because Java appears on the resume.

====================================================================
23. RESUME MATCHING
====================================================================

When a recruiter creates a drive:

Define:

- required skills
- preferred skills
- eligibility criteria
- assessment requirements
- configurable scoring weights

Normalize recruiter requirements using the SAME canonical skill system
used for student resumes.

Example:

Job description:

"Backend developer with Node, Express, Mongo and REST API experience."

Normalize to:

Node.js
Express
MongoDB
REST API

Candidate:

Node.js
Express
MongoDB
REST API
Docker

Matching should compare the canonical representations.

====================================================================
24. SEMANTIC MATCHING
====================================================================

Use Sentence Transformers for semantic similarity.

Initial model:

sentence-transformers/all-MiniLM-L6-v2

Pipeline:

Resume relevant content
      |
      v
Embedding

Job description
      |
      v
Embedding

      |
      v
Semantic similarity

Do NOT use semantic similarity alone.

Combine:

- required skill coverage
- preferred skill coverage
- semantic similarity
- evidence strength
- assessment performance

Weights must be configurable.

====================================================================
25. EXPLAINABLE MATCHING
====================================================================

NEVER show only:

"Match = 87%"

Show WHY.

Example:

Candidate Match: 84%

Required Skills:

Node.js
✓ Evidence found in project

Express
✓ Evidence found in project

MongoDB
✓ Evidence found in internship/project

Docker
✗ No evidence found

Preferred Skills:

Redis
✓ Evidence found

AWS
✓ Certification/project evidence

Semantic relevance:
84%

Assessment:
82%

The recruiter must be able to inspect evidence.

====================================================================
26. CANDIDATE SCORE
====================================================================

Do NOT allow the LLM to directly decide the candidate score.

Do NOT create:

resume -> LLM -> hire/reject

Instead:

Resume analysis
+
Canonical skills
+
Evidence
+
Assessment
+
Recruiter-defined criteria
       |
       v
Deterministic scoring engine
       |
       v
Candidate score

The score should be:

- deterministic
- reproducible
- explainable
- configurable

Recruiters must be able to define weights within allowed rules.

HireLens must assist recruiter decision-making.

It must NOT autonomously make final hiring decisions.

====================================================================
27. RECRUITMENT DRIVE
====================================================================

Recruiter can create:

- drive name
- company/organization
- job title
- job description
- location if applicable
- employment type
- eligibility criteria
- required skills
- preferred skills
- assessment configuration
- application deadline
- assessment window
- status

Drive states:

DRAFT
PUBLISHED
OPEN
CLOSED
COMPLETED
ARCHIVED

Only published/open drives appear to eligible students.

====================================================================
28. ELIGIBILITY ENGINE
====================================================================

Before allowing application:

Check configured criteria.

Examples:

- department
- batch
- graduation year
- minimum percentage/GPA if required
- backlog criteria if applicable
- other college-approved criteria

Eligibility must be deterministic.

Do not use an LLM to determine eligibility.

If ineligible:

show a clear reason where appropriate.

====================================================================
29. APPLICATION FLOW
====================================================================

Student:

View drive
    |
    v
Eligibility check
    |
    v
Review requirements
    |
    v
Apply
    |
    v
Application created
    |
    v
Resume associated
    |
    v
Status = APPLIED

Application states:

APPLIED
ELIGIBLE
ASSESSMENT_PENDING
ASSESSMENT_STARTED
ASSESSMENT_COMPLETED
UNDER_REVIEW
SHORTLISTED
REJECTED
SELECTED
WITHDRAWN

Prevent invalid application state transitions.

====================================================================
30. ASSESSMENT ENGINE
====================================================================

Assessment must be a real system.

Configuration:

- number of questions
- skills/topics
- difficulty
- duration
- time/question
- attempts
- navigation rules
- scoring
- pass criteria
- assessment availability window

Student starts assessment.

Create an assessment attempt.

Record:

- start time
- end time
- question order
- question version
- answers
- answer timestamps
- score
- integrity events

====================================================================
31. QUESTION GENERATION
====================================================================

Use Groq for question generation.

Input:

- skill
- topic
- target difficulty
- question format
- number of questions

Output must be structured.

Example:

{
  question: "...",
  options: [
    "...",
    "...",
    "...",
    "..."
  ],
  correct_answer: "...",
  explanation: "...",
  skill: "Java",
  topic: "OOP",
  difficulty: 6
}

Do not allow arbitrary unstructured LLM output into the database.

====================================================================
32. MCQ VALIDATION
====================================================================

Every generated question must pass validation.

Check:

- question exists
- exactly configured number of options
- no duplicate options
- valid answer
- exactly one intended correct answer
- skill relevance
- topic relevance
- difficulty metadata
- no malformed content
- no obvious duplicate
- no answer leakage
- no inappropriate content
- explanation consistency where possible

Failed questions:

DO NOT SHOW TO STUDENTS.

Regenerate or send to review.

====================================================================
33. QUESTION DUPLICATE DETECTION
====================================================================

Use semantic similarity to detect duplicates.

Example:

Q1:
"What is inheritance in Java?"

Q2:
"Which concept describes inheritance in Java?"

Potential duplicate.

Do not rely only on exact string matching.

Use an empirically calibrated similarity threshold.

Do not arbitrarily claim a universal threshold.

====================================================================
34. ADAPTIVE ASSESSMENT
====================================================================

Assessment difficulty must be controlled by a deterministic algorithm.

Initial difficulty:

configurable.

Example conceptual scale:

1–4 = Basic
5–7 = Medium
8–10 = Advanced

Do NOT allow Groq to freely choose difficulty during an assessment.

Example:

Correct answer:
increase difficulty according to configured step

Incorrect:
decrease difficulty according to configured step

Boundary:

never below minimum

never above maximum

Store:

current_difficulty
accuracy
recent_performance
skill
question_history

Prevent excessive difficulty oscillation.

Prevent repeated questions.

Prevent a question from appearing again in the same attempt unless
explicitly configured.

====================================================================
35. ASSESSMENT TIMING
====================================================================

Use server-authoritative timing wherever possible.

Do not trust the browser clock alone.

Store:

server start timestamp
server deadline

Client displays countdown.

Server validates:

assessment deadline
question timing if configured
submission window

When time expires:

attempt is automatically finalized according to policy.

====================================================================
36. ASSESSMENT NAVIGATION
====================================================================

Respect the drive configuration.

If back navigation is disabled:

student cannot return to previous question.

Do not rely only on hiding the button.

The backend must reject unauthorized navigation.

====================================================================
37. ATTEMPTS
====================================================================

If maximum attempts = 2:

backend must enforce:

attempt 1
attempt 2
then no more attempts.

Do not trust frontend state.

Record each attempt separately.

====================================================================
38. PROCTORING / ASSESSMENT INTEGRITY
====================================================================

HireLens uses:

Browser signals
+
Camera signals
+
Object detection where applicable
+
Temporal aggregation
+
Rule-based scoring

Do NOT describe this internally or externally as a system that can
prove cheating with certainty.

Use terminology:

Assessment Integrity
Integrity Event
Review Required

NOT:

Cheating confirmed

====================================================================
39. BROWSER SIGNALS
====================================================================

Monitor:

- tab visibility changes
- window focus loss
- fullscreen exit
- camera permission state
- relevant assessment-window events

Browser signals do NOT require ML.

Example:

visibilitychange

focus / blur

fullscreenchange

Record meaningful events.

Debounce noisy events.

Do not count duplicate signals generated by the same browser action.

====================================================================
40. CAMERA MONITORING
====================================================================

Use face detection/counting.

States:

0 faces
1 face
2+ faces

Do NOT generate one violation per video frame.

Example:

100 frames with no face:

ONE FACE_MISSING EVENT

with:

duration
confidence
start time
end time

====================================================================
41. FACE MISSING TEMPORAL LOGIC
====================================================================

Do not penalize a single lost frame.

Use duration.

Conceptual behavior:

very short absence:
log/ignore depending on configuration

short sustained absence:
low/moderate event

prolonged absence:
higher-severity event

Thresholds must be configurable and calibrated using real controlled
testing.

====================================================================
42. MULTIPLE FACE DETECTION
====================================================================

If multiple faces are detected:

record:

- face count
- confidence
- duration
- timestamp

Do not treat a single low-confidence frame as strong evidence.

Use temporal aggregation.

Example:

2 faces for 0.5 seconds:
weak signal

2 faces continuously for several seconds:
stronger event

Repeated multiple-face events:
higher review priority

====================================================================
43. OBJECT DETECTION
====================================================================

Use an appropriate object detector for configured prohibited objects,
such as a phone.

Do not automatically classify every detected object as malpractice.

Record:

object
confidence
duration
timestamp

Use temporal persistence.

A single weak phone detection should not automatically terminate an
assessment.

====================================================================
44. AUDIO
====================================================================

Do NOT make background noise a major malpractice signal in V1.

Background noise can come from:

- traffic
- fan
- construction
- roommates
- keyboard
- normal surroundings

If audio is ever added, treat it as weak contextual information.

Do not use background noise alone to classify malpractice.

====================================================================
45. VIOLATION TAXONOMY
====================================================================

Supported initial event types:

TAB_SWITCH
FOCUS_LOSS
FULLSCREEN_EXIT
FACE_MISSING
MULTIPLE_FACE
PHONE_DETECTED
CAMERA_DISABLED
UNAUTHORIZED_OBJECT

Additional events may be added only with a documented requirement.

====================================================================
46. VIOLATION SEVERITY
====================================================================

Use:

0 = informational
1 = low
2 = moderate
3 = high
4 = critical

Initial engineering mapping:

TAB_SWITCH
severity = LOW
base penalty = 2

FOCUS_LOSS
severity = LOW
base penalty = 2

FULLSCREEN_EXIT
severity = MODERATE
base penalty = 5

FACE_MISSING
severity = MODERATE
base penalty = 5

PROLONGED_FACE_MISSING
severity = HIGH
base penalty = 12

MULTIPLE_FACE
severity = HIGH
base penalty = 12

PHONE_DETECTED
severity = CRITICAL
base penalty = 25

CAMERA_DISABLED
severity = HIGH
base penalty = 12

UNAUTHORIZED_OBJECT
severity = HIGH
base penalty = 15

These values are INITIAL CONFIGURATION VALUES.

They are not scientifically validated facts.

Store them in configuration so they can be calibrated after testing.

====================================================================
47. CONFIDENCE FACTOR
====================================================================

Conceptual configuration:

confidence < 0.50
ignore as penalty

0.50–0.69
factor = 0.50

0.70–0.84
factor = 0.75

0.85–0.94
factor = 1.00

>= 0.95
factor = 1.10

The system must not allow confidence to create unlimited penalties.

====================================================================
48. DURATION FACTOR
====================================================================

Initial configurable values:

< 3 sec
0.25

3–5 sec
0.50

5–10 sec
0.75

10–30 sec
1.00

> 30 sec
1.25

Apply per-event maximum penalty caps.

Do not multiply penalties indefinitely with duration.

====================================================================
49. REPETITION FACTOR
====================================================================

For repeated events of the same type within a configurable rolling
window:

1st occurrence:
1.0

2nd:
1.25

3rd:
1.50

4th+:
1.75

Apply category/session caps.

Repeated browser noise must be debounced before repetition scoring.

====================================================================
50. PENALTY FORMULA
====================================================================

For an aggregated event:

penalty =
base_penalty
× confidence_factor
× duration_factor
× repetition_factor

Then:

integrity_score =
max(0, 100 - sum(validated_penalties))

Add:

per-event cap
per-category cap
overall session cap where appropriate

Do not allow one noisy detector to destroy the score.

====================================================================
51. INTEGRITY SCORE
====================================================================

Start:

100

Initial interpretation:

90–100:
NORMAL

75–89:
LOW_CONCERN

50–74:
REVIEW_REQUIRED

25–49:
HIGH_CONCERN

0–24:
CRITICAL_REVIEW

These are initial engineering thresholds.

They must be calibrated during validation.

IMPORTANT:

Integrity Score is NOT:

- probability of cheating
- proof of cheating
- final hiring score

It represents the severity of observed assessment-integrity signals.

====================================================================
52. EVENT-BASED ESCALATION
====================================================================

Do not rely only on total score.

Certain high-confidence high-severity events should create:

PRIORITY_REVIEW

even if total integrity score remains high.

Example:

High-confidence sustained multiple-face detection

or

High-confidence sustained phone detection

should trigger review visibility.

Do NOT automatically reject a student solely because of one detector
event unless a separately approved institutional policy explicitly
requires it.

====================================================================
53. HUMAN REVIEW
====================================================================

Recruiter/authorized college admin can inspect:

- integrity score
- risk/status
- event timeline
- event type
- confidence
- duration
- repetition
- calculated penalty
- timestamp

Example:

Integrity Score: 72

Events:

10:31:22
Tab switch
Low

10:34:18–10:34:26
Multiple people detected
High

10:41:07–10:41:14
Face unavailable
Moderate

Show:

duration
confidence
penalty
source

Do not label the student "Cheater".

====================================================================
54. PROCTORING DATA
====================================================================

Prefer storing event metadata rather than continuous webcam recordings.

Store:

- event type
- timestamp
- duration
- confidence
- detection source
- metadata
- attempt ID

Avoid storing continuous video unless there is a specific approved
business requirement.

====================================================================
55. DATABASE
====================================================================

Use Supabase PostgreSQL.

Core tables:

users

students

recruiters

college_admins if necessary

drives

drive_skills

applications

resumes

resume_documents

resume_sections

canonical_skills

skill_aliases

student_skills

skill_evidence

assessments

questions

assessment_attempts

assessment_answers

proctoring_sessions

proctoring_events

candidate_scores

notifications

audit_logs

ai_jobs

====================================================================
56. USERS
====================================================================

users:

id
email
role
status
created_at
updated_at
last_login_at

Roles:

STUDENT
RECRUITER
COLLEGE_ADMIN

Do not duplicate authentication logic across roles.

====================================================================
57. STUDENTS
====================================================================

students:

id
user_id
register_number
name
department
batch
graduation_year
phone if required
profile_photo_url if required
status
created_at
updated_at

Institutional email remains in users.

====================================================================
58. DRIVES
====================================================================

drives:

id
created_by
company_name
job_title
description
location
employment_type
application_deadline
assessment_start
assessment_end
status
created_at
updated_at

====================================================================
59. DRIVE SKILLS
====================================================================

drive_skills:

id
drive_id
canonical_skill_id
requirement_type
weight
minimum_evidence_level if needed
created_at

requirement_type:

REQUIRED
PREFERRED

====================================================================
60. APPLICATIONS
====================================================================

applications:

id
drive_id
student_id
resume_id
status
applied_at
updated_at

Prevent duplicate applications to the same drive.

Enforce valid state transitions.

====================================================================
61. RESUMES
====================================================================

resumes:

id
student_id
s3_key
file_name
mime_type
file_size
file_hash
page_count
status
extraction_method
extraction_quality
uploaded_at
processed_at
error_code if needed

Never store the actual PDF inside PostgreSQL.

====================================================================
62. RESUME DOCUMENTS
====================================================================

resume_documents:

id
resume_id
page_number
raw_text
normalized_text
ocr_used
ocr_confidence
layout_data if needed

====================================================================
63. RESUME SECTIONS
====================================================================

resume_sections:

id
resume_id
section_type
page_number
content
confidence
start_position
end_position

====================================================================
64. STUDENT SKILLS
====================================================================

student_skills:

id
student_id
canonical_skill_id
source
confidence
proficiency_evidence
created_at
updated_at

source:

EXPLICIT
PROJECT
EXPERIENCE
CERTIFICATION
INFERRED

====================================================================
65. SKILL EVIDENCE
====================================================================

skill_evidence:

id
student_skill_id
resume_id
section_id
page_number
evidence_text
source_type
confidence
created_at

This makes the system explainable.

====================================================================
66. ASSESSMENTS
====================================================================

assessments:

id
drive_id
title
question_count
duration_seconds
time_per_question
max_attempts
allow_back_navigation
adaptive_enabled
min_difficulty
max_difficulty
passing_score
status
created_at

====================================================================
67. QUESTIONS
====================================================================

questions:

id
assessment_id
skill_id
topic
question_text
options
correct_answer
explanation
difficulty
source
validation_status
created_at

Never store an unvalidated question as active.

====================================================================
68. ASSESSMENT ATTEMPTS
====================================================================

assessment_attempts:

id
assessment_id
student_id
attempt_number
started_at
deadline_at
submitted_at
score
integrity_score
integrity_status
status
created_at

====================================================================
69. ASSESSMENT ANSWERS
====================================================================

assessment_answers:

id
attempt_id
question_id
selected_answer
correct
answered_at
response_time_ms

Do not expose correct answers before the assessment is finalized.

====================================================================
70. PROCTORING EVENTS
====================================================================

proctoring_events:

id
attempt_id
event_type
severity
started_at
ended_at
duration_seconds
confidence
base_penalty
confidence_factor
duration_factor
repetition_factor
calculated_penalty
source
metadata
created_at

====================================================================
71. CANDIDATE SCORES
====================================================================

candidate_scores:

id
application_id
resume_match_score
required_skill_score
preferred_skill_score
semantic_match_score
evidence_score
assessment_score
overall_score
score_version
calculated_at

Store score versioning.

If scoring logic changes later, historical scores should remain
traceable to the logic version used.

====================================================================
72. NOTIFICATIONS
====================================================================

notifications:

id
user_id
type
title
message
read_at
created_at

Email notification records should also track:

- delivery status
- sent_at
- failure reason if applicable

====================================================================
73. AUDIT LOGS
====================================================================

Every sensitive action must be auditable.

audit_logs:

id
actor_user_id
action
resource_type
resource_id
timestamp
ip_hash or appropriate privacy-preserving information if justified
metadata

Actions:

LOGIN
LOGOUT
RESUME_UPLOAD
RESUME_VIEW
DRIVE_CREATED
DRIVE_PUBLISHED
APPLICATION_CREATED
ASSESSMENT_STARTED
ASSESSMENT_SUBMITTED
SCORE_GENERATED
CANDIDATE_SHORTLISTED
CANDIDATE_REJECTED
PROFILE_UPDATED
ADMIN_ACTION
PERMISSION_CHANGE

Do not log full resume contents or unnecessary personal data.

====================================================================
74. BACKGROUND JOBS
====================================================================

Use Redis-backed asynchronous processing for heavy work.

Examples:

resume processing
OCR
resume analysis
MCQ generation
question validation
semantic matching
notification sending
analytics aggregation

Flow:

FastAPI
  |
  v
Create job
  |
  v
Redis
  |
  v
Worker
  |
  v
Process
  |
  v
Update database
  |
  v
Frontend polls/receives status

Do not make users wait on a long AI process inside a normal HTTP
request.

====================================================================
75. JOB STATES
====================================================================

Use:

QUEUED
PROCESSING
COMPLETED
FAILED
RETRYING

Store:

job ID
type
status
attempt count
created_at
started_at
completed_at
error category

Do not expose raw stack traces to users.

====================================================================
76. RETRIES
====================================================================

Retry transient failures.

Do NOT endlessly retry:

- invalid file
- invalid request
- invalid LLM output
- permanent authorization failure

Use bounded retries.

====================================================================
77. SECURITY
====================================================================

Security is critical.

Implement:

- HTTPS
- secure authentication
- RBAC
- backend authorization
- Supabase Row Level Security
- private S3
- signed temporary URLs
- input validation
- file validation
- rate limiting
- secure headers
- CORS restrictions
- secure cookies/tokens according to chosen auth architecture
- secret management
- audit logs
- database constraints
- transaction handling

Never trust frontend authorization.

====================================================================
78. ROW LEVEL SECURITY
====================================================================

Student:

Can access own:

- profile
- resume
- applications
- assessment attempts
- notifications

Student must NOT access another student's:

- resume
- application
- score
- assessment
- proctoring events

Recruiter:

Can access only candidates belonging to their authorized drives.

Recruiter A must NOT access Recruiter B's candidates.

College Admin:

Can access authorized college-wide information.

Implement and test RLS.

====================================================================
79. S3 SECURITY
====================================================================

S3 bucket must be private.

Do not make resume URLs public.

Use short-lived signed URLs for authorized access.

Test:

unauthorized user
    |
    v
resume
    |
    v
DENIED

authorized user
    |
    v
temporary signed URL
    |
    v
ALLOWED

====================================================================
80. FILE SECURITY
====================================================================

Validate uploaded resumes.

Check:

- extension
- MIME
- file signature
- size
- page count
- malformed file
- potentially malicious content

Never execute uploaded files.

====================================================================
81. API SECURITY
====================================================================

Test:

- missing authentication
- expired authentication
- invalid authentication
- unauthorized role
- IDOR
- malformed IDs
- oversized requests
- injection attempts
- rate abuse
- repeated OTP requests
- invalid file uploads

====================================================================
82. PRIVACY
====================================================================

HireLens handles potentially sensitive information.

Minimize collection.

Store only what is required.

Define retention policies for:

- resumes
- assessment data
- proctoring events
- notifications
- audit logs

Do not retain webcam video by default.

Obtain appropriate institutional consent/approval for assessment
monitoring and personal data processing before real student deployment.

Provide clear student-facing explanations of:

- what is collected
- why it is collected
- how it affects assessment integrity
- who can access it
- how long it is retained

====================================================================
83. RECRUITER DASHBOARD
====================================================================

Recruiter dashboard should feel like a professional recruitment
workspace.

Main sections:

Overview
Drives
Candidates
Assessments
Analytics
Notifications
Profile

Overview:

- active drives
- applicants
- assessments pending
- candidates under review
- shortlisted candidates

====================================================================
84. CANDIDATE LIST
====================================================================

Table columns:

Candidate
Department
Application status
Resume match
Assessment
Integrity status
Overall score
Action

Filters:

- drive
- department
- batch
- application status
- score range
- assessment status
- integrity status
- skills

Do not make the recruiter scroll through huge cards.

Use a professional data table.

====================================================================
85. CANDIDATE DETAIL
====================================================================

Candidate page:

Header:

Name
Department
Application status

Sections:

Resume Summary
Skills
Skill Evidence
Projects
Education
Assessment
Assessment Performance
Integrity Timeline
Match Explanation
Recruiter Actions

Show evidence.

Do not overwhelm with internal AI terminology.

====================================================================
86. CANDIDATE MATCH VIEW
====================================================================

Example:

Candidate Match
84%

Required Skills
----------------
Node.js       ✓
Express       ✓
MongoDB       ✓
Docker        ✗

Preferred Skills
----------------
Redis         ✓
AWS           ✓

Assessment
-----------
82%

Resume Evidence
---------------
Project A → Node.js
Project B → MongoDB
Internship → REST APIs

The recruiter should understand the result without knowing how the
internal algorithms work.

====================================================================
87. RECRUITER ACTIONS
====================================================================

Allowed:

SHORTLIST
MOVE TO REVIEW
REJECT
SELECT if college workflow permits
ADD NOTE
VIEW DETAILS

Every sensitive decision should be audited.

Do not let AI perform these actions automatically.

====================================================================
88. COLLEGE ADMIN DASHBOARD
====================================================================

Sections:

Overview
Students
Recruiters
Drives
Applications
Assessments
Placement Analytics
Integrity Reviews
Notifications
Audit Logs
Settings

Overview:

- total students
- active students
- active drives
- applications
- assessments
- shortlisted candidates
- placement statistics

====================================================================
89. STUDENT DASHBOARD UI
====================================================================

Student should see:

Welcome

Profile completion

Resume status

Skill overview

Available opportunities

Upcoming assessments

Applications

Notifications

Do NOT expose internal scoring formulas unless institutionally
appropriate.

====================================================================
90. ASSESSMENT UI
====================================================================

Assessment screen should be distraction-free.

Header:

Assessment title
Question number
Timer
Integrity status indicator

Main:

Question
Options
Next

Do not show:

AI model names
technology names
internal confidence values
raw detection events

If an integrity warning is necessary:

Use simple language.

Example:

"We noticed that the assessment window is no longer active."

Not:

"visibilitychange event detected."

====================================================================
91. ASSESSMENT INTEGRITY UI
====================================================================

Student-facing:

Use a subtle indicator:

Assessment Integrity Monitoring: Active

Before starting, clearly explain:

- camera requirement
- browser requirements
- what signals are monitored
- what happens if an issue occurs

During assessment, do not constantly display alarming warnings.

Avoid anxiety-inducing UI.

====================================================================
92. INTEGRITY REVIEW UI
====================================================================

Recruiter/admin:

Integrity Score
72/100

Status:
Review Required

Timeline:

10:31:22
Tab switch
Low

10:34:18–10:34:26
Multiple people detected
High

10:41:07–10:41:14
Face unavailable
Moderate

Show:

duration
confidence
penalty
source

Do not label the student "Cheater".

====================================================================
93. NOTIFICATIONS
====================================================================

Student notifications:

- drive published
- application submitted
- assessment scheduled
- assessment reminder
- assessment completed
- shortlisted
- rejected
- selected where applicable

Recruiter notifications:

- new application
- assessment completed
- candidate review required
- important integrity review

Admin:

- system issue
- drive status
- assessment status
- important operational alerts

====================================================================
94. EMAIL NOTIFICATIONS
====================================================================

Email should be backend-triggered.

Examples:

Application submitted:

"Your application for [Drive] has been submitted successfully."

Assessment invitation:

"You have been invited to complete an assessment for [Drive]."

Shortlist:

"Your application status has been updated."

Do not expose internal AI/system information in email.

====================================================================
95. ANALYTICS
====================================================================

Student analytics:

- skills
- assessment performance
- application history

Recruiter analytics:

- applicant count
- skill distribution
- assessment performance
- application funnel

College analytics:

- applications per drive
- participation
- assessment completion
- department distribution
- skill distribution
- placement outcomes if data is available

Do not invent analytics from missing data.

====================================================================
96. ANALYTICS RULE
====================================================================

If insufficient data exists:

show:

"Not enough data yet."

Do NOT show fake percentages.

Do NOT create random charts just to fill the dashboard.

Every chart must answer a real business question.

====================================================================
97. AI RESPONSIBILITY MATRIX
====================================================================

Resume extraction:

PDF parser + OCR

Section detection:

rules + layout + fallback intelligence

Skill extraction:

NER/rules/context/LLM where useful

Skill normalization:

canonical skill database

Semantic matching:

Sentence Transformers

MCQ generation:

Groq

MCQ validation:

deterministic validation + optional supporting AI

Adaptive assessment:

deterministic algorithm

Face detection:

MediaPipe

Object detection:

YOLO where appropriate

Tab switching:

browser APIs

Violation scoring:

deterministic rules

Candidate scoring:

deterministic scoring engine

Recruiter explanation:

optional LLM-generated natural language based ONLY on
already-computed structured evidence

====================================================================
98. AI SAFETY RULE
====================================================================

LLM output must never directly:

- reject a student
- shortlist a student
- change an application status
- alter a score
- determine eligibility
- declare cheating
- invent candidate information

LLM output can assist with:

- structured extraction
- question generation
- summaries
- explanations

All important business decisions must pass through deterministic
application logic.

====================================================================
99. RESUME AI SAFETY
====================================================================

If the LLM says:

"Candidate has AWS expertise"

but no evidence exists:

Do NOT silently store it as a confirmed skill.

Every inferred item must be marked appropriately.

Never fabricate:

- experience
- education
- skills
- certification
- employment
- project

====================================================================
100. MATCHING ENGINE
====================================================================

Implement as an isolated module.

Input:

candidate
drive
canonical skills
evidence
assessment result

Output:

required_skill_score
preferred_skill_score
semantic_score
evidence_score
assessment_score
overall_score
explanations

Store score_version.

Do not hard-code recruiter weights into frontend.

====================================================================
101. SCORE VERSIONING
====================================================================

Every score must contain:

score_version

Example:

v1.0

If scoring rules change:

v1.1

Historical records should remain reproducible.

====================================================================
102. ERROR HANDLING
====================================================================

Every user-facing error must be understandable.

Bad:

"500 Internal Server Error"

Better:

"We couldn't process your resume right now. Your uploaded file is
safe, and you can try processing it again."

Bad:

"Groq timeout."

Better:

"The assessment generator is temporarily unavailable. Please try
again."

Do not expose stack traces.

====================================================================
103. RESUME FAILURE FLOW
====================================================================

Upload
  |
  v
Processing
  |
  +---- Success --> Processed
  |
  +---- Failure --> Processing failed
                         |
                         v
                    Retry available
                         |
                         v
                    User informed

Do not leave resumes permanently stuck in PROCESSING.

====================================================================
104. AI FAILURE FLOW
====================================================================

If LLM unavailable:

Retry transient failure.

If still unavailable:

mark job failed.

For assessments:

Use previously validated question bank if the product configuration
allows it.

Do not generate invalid questions merely to keep the workflow alive.

====================================================================
105. NOTIFICATION FAILURE
====================================================================

Application state must not depend on successful email delivery.

Example:

Candidate shortlisted
    |
    v
Database state updated
    |
    v
Notification job
    |
    v
Email failure

Candidate remains:

SHORTLISTED

Notification can be retried.

====================================================================
106. TESTING REQUIREMENTS
====================================================================

Testing is mandatory.

Create:

unit tests
integration tests
API tests
database authorization tests
AI pipeline tests
assessment tests
proctoring scoring tests
security tests
end-to-end tests

====================================================================
107. RESUME VALIDATION
====================================================================

Create a controlled validation dataset.

Target:

50–100 representative resumes initially.

Include:

- normal PDF
- two-column
- scanned
- poor scan
- multi-page
- tables
- icons
- different templates
- different section naming
- OCR-heavy resumes

Manually annotate ground truth:

- sections
- skills
- education
- experience
- projects
- certifications

Measure:

- extraction error
- section precision/recall/F1
- skill precision/recall/F1
- OCR quality
- evidence accuracy

Do not invent results.

====================================================================
108. MCQ VALIDATION
====================================================================

Build a reviewed question set.

Target:

100–500 reviewed questions.

Measure:

- correctness
- relevance
- clarity
- ambiguity
- difficulty
- distractor quality
- duplicate rate

Reject critical failures.

====================================================================
109. PROCTORING VALIDATION
====================================================================

Use controlled consenting test sessions.

Include:

NORMAL
TAB_SWITCH
FACE_MISSING
MULTIPLE_FACE
PHONE_VISIBLE
CAMERA_BLOCKED
FULLSCREEN_EXIT
POOR_LIGHTING
GLASSES
LOOKING_DOWN
POSITION_CHANGE
TEMPORARY_FACE_LOSS

Measure separately:

precision
recall
false-positive rate
false-negative rate
detection latency

Do not report one generic "AI accuracy" number.

====================================================================
110. SCORING VALIDATION
====================================================================

Test:

same events → same score

Run same input 100 times.

Expected:

same result every time.

Test:

duplicate event submission

Expected:

penalty applied only once.

Test:

events in valid temporal order.

Test:

repetition factor.

Test:

duration factor.

Test:

confidence factor.

Test:

per-event cap.

Test:

overall cap.

====================================================================
111. SECURITY VALIDATION
====================================================================

Create test users:

Student A
Student B
Recruiter A
Recruiter B
College Admin

Test:

Student A accessing Student B resume
Student A accessing Student B assessment
Recruiter A accessing Recruiter B candidates
Student accessing recruiter endpoints
Recruiter accessing admin endpoints
unauthenticated access
expired session
invalid session

Expected:

access denied.

====================================================================
112. RECRUITER AGREEMENT
====================================================================

For validation, use several independent recruiters/placement staff.

Give them candidate information.

Compare:

human evaluation

against:

HireLens structured evaluation.

Measure appropriate ranking agreement statistics such as:

Spearman correlation
Kendall's tau

For categorical decisions where applicable:

Cohen's kappa or appropriate multi-rater agreement measure.

Do not optimize the system to blindly imitate one recruiter.

====================================================================
113. EXPLAINABILITY VALIDATION
====================================================================

Ask reviewers:

"Can you understand why HireLens produced this candidate match?"

Use a simple rating:

1–5

Track:

- explanation clarity
- evidence usefulness
- score transparency
- missing-skill usefulness

====================================================================
114. PRIORITY-BASED DEVELOPMENT
====================================================================

Priority P0 — MUST WORK

1. Authentication
2. RBAC
3. Student directory
4. Student profile
5. Resume upload
6. Resume processing
7. Skill normalization
8. Drive creation
9. Eligibility
10. Applications
11. Assessment
12. Assessment scoring
13. Basic proctoring
14. Integrity scoring
15. Recruiter candidate view
16. College admin
17. Security
18. Audit logs

Priority P1 — HIGH VALUE

1. Semantic matching
2. Explainable scoring
3. Adaptive assessment
4. MCQ validation
5. Background jobs
6. Notifications
7. Recruiter analytics
8. College analytics
9. Improved proctoring
10. Validation dashboard

Priority P2 — FUTURE

1. Advanced anomaly detection
2. Additional ML models
3. Advanced analytics
4. More sophisticated assessment models
5. Additional integrations

Do NOT implement P2 features before P0 is stable.

====================================================================
115. PHASED BUILD PLAN
====================================================================

CRITICAL RULE:

At the end of EVERY phase, the system must run.

Do not build the entire backend first and leave the application
unusable until the final phase.

====================================================================
PHASE 0 — PROJECT FOUNDATION
====================================================================

Create:

- repository
- frontend
- backend
- worker architecture
- environment configuration
- linting
- formatting
- test infrastructure
- Docker development setup where useful
- documentation
- error handling base
- logging base

Create:

/frontend
/backend
/workers
/ai
/tests
/docs

At the end:

Frontend loads.

Backend health endpoint works.

Database connection works.

Redis connection works.

Environment validation works.

No fake application functionality.

====================================================================
PHASE 1 — AUTH + USERS + RBAC
====================================================================

Implement:

- email authentication
- institutional-domain validation for students
- student directory
- role assignment
- student dashboard shell
- recruiter dashboard shell
- admin dashboard shell
- protected routes
- backend authorization
- RLS

At the end:

Student can log in.

Recruiter can log in.

Admin can log in.

Wrong-role access is blocked.

====================================================================
PHASE 2 — STUDENT PROFILE
====================================================================

Implement:

- profile
- education
- projects
- certifications
- skills
- profile completion
- validation
- persistence

At the end:

Student can create and edit their profile.

====================================================================
PHASE 3 — RESUME PIPELINE
====================================================================

Implement:

- upload
- private S3 storage
- file validation
- PDF extraction
- quality detection
- OCR fallback
- cleaning
- section detection
- entity extraction
- skill extraction
- normalization
- canonical skills
- evidence

At the end:

Student uploads a real resume.

System processes it.

Student sees processed resume information.

No fake extracted values.

====================================================================
PHASE 4 — DRIVE + APPLICATIONS
====================================================================

Implement:

Recruiter:

- create drive
- edit
- publish
- close
- requirements
- required skills
- preferred skills
- eligibility

Student:

- browse drives
- view details
- eligibility
- apply

At the end:

A recruiter can publish a real drive.

A student can apply.

Recruiter can see the application.

====================================================================
PHASE 5 — MATCHING
====================================================================

Implement:

- canonical job skills
- candidate skill comparison
- semantic similarity
- evidence scoring
- deterministic scoring
- score versioning
- explanations

At the end:

Recruiter sees:

- match score
- matched skills
- missing skills
- evidence
- semantic relevance

====================================================================
PHASE 6 — ASSESSMENT
====================================================================

Implement:

- assessment creation
- question generation
- question validation
- question bank
- difficulty
- timer
- attempts
- navigation rules
- submission
- scoring

At the end:

Student can complete a real assessment.

Recruiter can see results.

====================================================================
PHASE 7 — ADAPTIVE ASSESSMENT
====================================================================

Implement deterministic difficulty adaptation.

Test:

correct → difficulty increase

incorrect → difficulty decrease

boundary conditions

duplicate prevention

At the end:

Adaptive assessments actually work.

====================================================================
PHASE 8 — ASSESSMENT INTEGRITY
====================================================================

Implement:

- browser monitoring
- face detection
- multiple face detection
- face missing
- object detection
- temporal aggregation
- confidence
- duration
- repetition
- penalties
- integrity score
- review status
- event timeline

At the end:

A controlled test assessment produces real integrity events.

====================================================================
PHASE 9 — RECRUITER + ADMIN ANALYTICS
====================================================================

Implement:

Recruiter:

- candidate table
- filters
- candidate detail
- comparison
- shortlist
- review
- reject
- analytics

Admin:

- student statistics
- drive statistics
- application funnel
- assessment participation
- placement analytics

At the end:

The entire recruitment workflow works.

====================================================================
PHASE 10 — NOTIFICATIONS
====================================================================

Implement:

- in-app notifications
- email notifications
- retry
- delivery status
- templates

At the end:

Application and assessment events trigger real notifications.

====================================================================
PHASE 11 — SECURITY HARDENING
====================================================================

Run:

- authorization tests
- RLS tests
- S3 tests
- API security tests
- file upload tests
- rate limiting
- session tests
- audit tests

Fix all P0/P1 vulnerabilities.

====================================================================
PHASE 12 — VALIDATION
====================================================================

Run:

Resume evaluation

MCQ evaluation

Proctoring evaluation

Scoring reproducibility

Security evaluation

Recruiter agreement

Record actual metrics.

Do not fabricate numbers.

====================================================================
PHASE 13 — PRODUCTION READINESS
====================================================================

Implement:

- production environment
- HTTPS
- secrets
- database backup strategy
- S3 backup/versioning strategy where appropriate
- monitoring
- structured logs
- health checks
- worker health
- error alerts
- deployment documentation
- rollback procedure

Perform full end-to-end testing.

====================================================================
116. REQUIRED API DESIGN
====================================================================

Use RESTful endpoints with clear versioning.

Example:

/api/v1/auth/...

/api/v1/students/...

/api/v1/resumes/...

/api/v1/drives/...

/api/v1/applications/...

/api/v1/assessments/...

/api/v1/proctoring/...

/api/v1/recruiter/...

/api/v1/admin/...

Use Pydantic request/response schemas.

Never return uncontrolled database objects directly.

====================================================================
117. API BUSINESS RULES
====================================================================

Every endpoint must check:

1. Authentication
2. Role
3. Resource ownership
4. Drive/application relationship
5. State transition
6. Input validation

Example:

Student cannot submit an assessment belonging to another student.

Recruiter cannot modify another recruiter's drive.

Student cannot modify published drive requirements.

Candidate score cannot be modified by frontend request.

====================================================================
118. STATE MACHINES
====================================================================

Implement explicit state transitions.

Drive:

DRAFT → PUBLISHED → OPEN → CLOSED → COMPLETED → ARCHIVED

Application:

APPLIED → ELIGIBLE → ASSESSMENT_PENDING
→ ASSESSMENT_STARTED
→ ASSESSMENT_COMPLETED
→ UNDER_REVIEW
→ SHORTLISTED / REJECTED / SELECTED

Assessment:

CREATED → ACTIVE → COMPLETED / EXPIRED

Resume:

UPLOADED → PROCESSING → PROCESSED / FAILED

Do not allow arbitrary state changes.

====================================================================
119. NO MOCK DATA RULE
====================================================================

Do not create fake:

students
candidates
scores
applications
analytics
resume results

for production screens.

For development only, a clearly isolated seed script may exist.

It must never automatically run in production.

If there is no real data:

show:

"No data available yet."

====================================================================
120. NO DEAD UI
====================================================================

Every button must have a real action.

No:

"Coming soon"

unless explicitly marked as future.

No fake loading forever.

No fake success messages.

No dummy charts.

No fake AI analysis.

====================================================================
121. PERFORMANCE
====================================================================

For 200 students:

prioritize reliability over extreme scale.

Avoid:

- unnecessary database queries
- N+1 queries
- repeated AI calls
- processing the same resume repeatedly
- generating the same questions repeatedly
- storing large files in database

Cache appropriate expensive results.

Use Redis where useful.

Use background processing for heavy work.

====================================================================
122. RESUME REPROCESSING
====================================================================

Calculate file hash.

If identical resume is uploaded again:

avoid unnecessary processing where possible.

If processing fails:

allow retry.

If parser version changes:

support reprocessing.

Store processing version.

====================================================================
123. AI COST CONTROL
====================================================================

Do not call Groq unnecessarily.

Cache/reuse:

- validated questions
- resume analyses
- embeddings
- semantic matching results where valid

Do not regenerate an assessment every time a recruiter opens the
assessment page.

====================================================================
124. AI OUTPUT VALIDATION
====================================================================

LLM responses must be:

1. schema validated
2. sanitized
3. checked
4. persisted only after validation

If invalid:

retry/regenerate.

Never trust raw LLM output.

====================================================================
125. LOGGING
====================================================================

Use structured logs.

Include:

request ID
user ID where appropriate
operation
status
latency
error category

AI jobs:

job ID
operation
model identifier internally
latency
success/failure
cost metadata where available

Do NOT log:

full resume
unnecessary personal information
assessment answers unnecessarily
authentication secrets
tokens
API keys

====================================================================
126. ENVIRONMENT VARIABLES
====================================================================

Create .env.example.

Expected categories:

Application:

APP_ENV
APP_URL
FRONTEND_URL

Supabase:

SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

S3:

AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BUCKET_NAME

Redis:

REDIS_URL

Groq:

GROQ_API_KEY

Email:

EMAIL_PROVIDER configuration

Security:

JWT/session related secrets according to implementation

Never commit real secrets.

Service-role credentials must NEVER be exposed to frontend.

====================================================================
127. CONFIGURATION
====================================================================

Move configurable business rules into configuration/database:

- college domain
- assessment duration
- attempts
- difficulty ranges
- scoring weights
- integrity penalties
- review thresholds
- upload limits
- notification settings

Do not hard-code everything.

====================================================================
128. OBSERVABILITY
====================================================================

Provide:

/health

/readiness

worker health

database connectivity check

Redis connectivity check

AI service availability state

Do not expose secrets.

====================================================================
129. BACKUP/RECOVERY
====================================================================

Document:

database backup
resume storage strategy
recovery process
failure recovery
worker retry behavior

Production must not depend on a developer's local machine.

====================================================================
130. DOCUMENTATION
====================================================================

Create:

README.md

docs/architecture.md
docs/business-logic.md
docs/database.md
docs/api.md
docs/resume-pipeline.md
docs/assessment.md
docs/proctoring.md
docs/scoring.md
docs/security.md
docs/privacy.md
docs/testing.md
docs/deployment.md
docs/troubleshooting.md

====================================================================
131. BUSINESS LOGIC VERIFICATION BEFORE CODING
====================================================================

Before implementing each feature:

1. Identify actor.
2. Identify input.
3. Identify business rule.
4. Identify state change.
5. Identify database records.
6. Identify authorization.
7. Identify failure cases.
8. Identify audit requirement.
9. Identify notification requirement.
10. Identify frontend behavior.

Do not implement UI first and invent backend behavior later.

====================================================================
132. CRITICAL PRODUCT RISKS
====================================================================

P0:

1. False-positive assessment integrity detection
2. Unauthorized access to student data
3. Incorrect resume extraction
4. Hallucinated skills
5. Incorrect MCQs
6. Non-deterministic candidate scoring
7. Broken assessment timing
8. Broken application state transitions
9. Sensitive data leakage
10. Fake analytics

P1:

1. Poor semantic matching
2. Poor adaptive assessment
3. Notification failures
4. Slow resume processing
5. Poor recruiter usability

P2:

1. Advanced anomaly detection
2. More complex ML
3. Advanced analytics

Fix P0 before P1.

====================================================================
133. WHAT NOT TO CLAIM
====================================================================

Do not claim:

"100% accurate resume parsing"

"100% cheat detection"

"AI knows who cheated"

"AI chooses the best candidate"

"AI predicts who will get hired"

"AI eliminates recruiter bias"

"AI completely prevents cheating"

Instead:

"AI-assisted resume analysis"

"Assessment integrity monitoring"

"Evidence-backed candidate matching"

"Recruiter-configurable scoring"

"Automated assessment generation with validation"

====================================================================
134. MODEL SELECTION
====================================================================

Initial models:

Resume:

Use a suitable pretrained resume NER model if evaluation confirms
it works adequately.

Do not assume the pretrained model is accurate for college resumes.

Semantic matching:

sentence-transformers/all-MiniLM-L6-v2

Face:

MediaPipe

Object:

YOLO

LLM:

Groq-supported model selected through configuration.

Do not hard-code an arbitrary model name if the selected provider's
current API requires a different supported identifier.

Always isolate model configuration from business logic.

====================================================================
135. MODEL VALIDATION
====================================================================

Before production:

Test pretrained models on representative college resumes and
controlled assessment conditions.

If performance is poor:

1. improve preprocessing
2. improve normalization
3. improve rules
4. fine-tune only if justified by data
5. replace model only if evaluation supports it

Do not train models merely to make the project sound more advanced.

====================================================================
136. COLLEGE-SPECIFIC DATA
====================================================================

Create a controlled validation dataset.

Resume:

50–100 representative resumes initially.

MCQ:

100–500 reviewed questions.

Proctoring:

30–50 controlled consenting sessions initially.

Use public datasets where licensing permits.

Do not blindly train on real student data.

Protect personal information.

====================================================================
137. CANONICAL SKILL DATA
====================================================================

Build an initial skill taxonomy.

At minimum cover:

Java
Python
C
C++
JavaScript
TypeScript
HTML
CSS
React
Next.js
Node.js
Express
FastAPI
Spring
Spring Boot
MongoDB
PostgreSQL
MySQL
SQL
Redis
Docker
Kubernetes
AWS
Azure
GCP
Git
GitHub
REST API
GraphQL
Machine Learning
Deep Learning
NLP
Computer Vision
TensorFlow
PyTorch
scikit-learn
Pandas
NumPy

Expand based on actual college recruitment requirements.

Do not claim this is a complete universal skill taxonomy.

====================================================================
138. RECRUITER EXPERIENCE
====================================================================

Recruiter should be able to answer quickly:

1. Who applied?
2. Who is eligible?
3. What skills do they have?
4. Where is the evidence?
5. How well did they perform?
6. What assessment score did they get?
7. Were there assessment-integrity events?
8. Why did the candidate receive this score?
9. What action can I take?

If the dashboard does not answer these questions efficiently,
redesign it.

====================================================================
139. STUDENT EXPERIENCE
====================================================================

Student should be able to answer:

1. Is my profile complete?
2. Has my resume been processed?
3. What skills were recognized?
4. What opportunities can I apply for?
5. What assessments do I have?
6. When are they due?
7. What is my application status?
8. Have I been notified?

Keep student UI simple.

====================================================================
140. ADMIN EXPERIENCE
====================================================================

Admin should be able to answer:

1. How many students are active?
2. Which drives are active?
3. How many applications exist?
4. How many assessments were completed?
5. What is the placement/application funnel?
6. Which candidates require integrity review?
7. Are there system failures?
8. Who changed important records?

====================================================================
141. FRONTEND NAVIGATION
====================================================================

Student:

Dashboard
Profile
Resume
Skills
Opportunities
Applications
Assessments
Notifications
Settings

Recruiter:

Dashboard
Drives
Candidates
Assessments
Analytics
Notifications
Settings

Admin:

Dashboard
Students
Recruiters
Drives
Applications
Assessments
Integrity Reviews
Analytics
Audit Logs
Settings

Do not expose technical architecture.

====================================================================
142. FINAL END-TO-END BUSINESS FLOW
====================================================================

College Admin
    |
    v
Import/activate students
    |
    v
Student verifies institutional email
    |
    v
Student completes profile
    |
    v
Student uploads resume
    |
    v
Private file storage
    |
    v
Resume processing job
    |
    v
PDF extraction
    |
    v
Quality check
    |
    +---- poor --> OCR
    |
    v
Section detection
    |
    v
Skill extraction
    |
    v
Skill normalization
    |
    v
Canonical skill profile
    |
    v
Evidence mapping
    |
    v
Recruiter creates drive
    |
    v
Drive requirements normalized
    |
    v
Student views drive
    |
    v
Eligibility check
    |
    v
Application
    |
    v
Resume matching
    |
    v
Assessment invitation
    |
    v
Validated questions
    |
    v
Adaptive assessment
    |
    +---- browser monitoring
    |
    +---- face monitoring
    |
    +---- object monitoring
    |
    v
Temporal integrity aggregation
    |
    v
Integrity score
    |
    v
Assessment score
    |
    v
Candidate score
    |
    v
Recruiter dashboard
    |
    +---- review
    +---- shortlist
    +---- reject
    +---- select according to workflow
    |
    v
Notification
    |
    v
Student
    |
    v
College placement analytics

====================================================================
143. IMPORTANT ARCHITECTURAL PRINCIPLE
====================================================================

Do not create independent infrastructure for every feature.

Logical modules inside FastAPI:

auth
users
students
recruiters
drives
applications
resumes
skills
matching
assessments
proctoring
scoring
notifications
analytics
audit

Background workers:

resume_worker
assessment_worker
notification_worker
analytics_worker

This gives modularity without unnecessary distributed-system
complexity.

====================================================================
144. DEVELOPMENT RULE
====================================================================

When you encounter an ambiguity:

DO NOT invent a business rule.

Look for:

1. this specification
2. existing code
3. database constraints
4. documented product behavior

If still ambiguous:

create a clear TODO in documentation and choose the safest minimal
implementation without pretending that an undocumented requirement
exists.

Do not silently add major features.

====================================================================
145. CODE QUALITY
====================================================================

Follow:

- clear naming
- modular functions
- typed interfaces
- validation
- error handling
- comments only where useful
- no giant files
- no duplicated business logic
- no hard-coded secrets
- no hard-coded URLs
- no hard-coded scoring values in UI
- reusable components
- reusable services
- repository/service separation where useful
- testable business logic

====================================================================
146. DATABASE QUALITY
====================================================================

Use:

- primary keys
- foreign keys
- unique constraints
- indexes
- check constraints where useful
- timestamps
- appropriate nullable fields

Add indexes for common queries:

student_id
drive_id
application_id
assessment_id
attempt_id
canonical_skill_id
created_at
status

Do not create indexes blindly.

====================================================================
147. FRONTEND QUALITY
====================================================================

Use:

- reusable layout
- reusable buttons
- reusable forms
- reusable tables
- reusable status badges
- reusable modal/drawer
- centralized API client
- centralized error handling
- loading states
- empty states
- skeleton states
- success/error feedback
- responsive layouts

Every page must handle:

loading
success
empty
error

====================================================================
148. ACCESSIBILITY
====================================================================

Support:

- keyboard navigation
- visible focus
- readable contrast
- accessible form labels
- semantic HTML
- accessible buttons
- meaningful error messages

Do not depend only on icons.

====================================================================
149. ASSESSMENT RELIABILITY
====================================================================

The assessment must survive:

- refresh
- temporary network interruption
- browser focus changes
- repeated event delivery
- duplicate answer submission

Where possible:

save progress safely.

Server remains authoritative for:

- attempt
- timer
- score
- state

====================================================================
150. PROCTORING RELIABILITY
====================================================================

Do not send every camera frame to the backend.

Perform appropriate lightweight processing on the client where feasible.

Send meaningful events/aggregated signals.

Avoid excessive network traffic.

If connectivity temporarily fails:

store events locally where appropriate and synchronize safely when
possible.

Do not duplicate events.

====================================================================
151. PRIVACY BY DESIGN
====================================================================

Default behavior:

process only what is required.

Prefer:

camera frame
    |
    v
local/temporary detection
    |
    v
event metadata
    |
    v
backend

rather than:

camera
    |
    v
continuous recording
    |
    v
permanent storage

====================================================================
152. VALIDATION RELEASE GATES
====================================================================

Do not call the project production-ready until:

RESUME:

- extraction evaluated
- OCR fallback evaluated
- section detection evaluated
- skill extraction evaluated
- normalization evaluated
- evidence verified

ASSESSMENT:

- MCQs validated
- duplicate detection works
- timing works
- attempt limits work
- adaptive logic tested

PROCTORING:

- false-positive rate measured
- recall measured
- temporal aggregation tested
- confidence tested
- repetition tested
- scoring tested

SCORING:

- deterministic
- reproducible
- idempotent
- explainable

SECURITY:

- RBAC tested
- RLS tested
- S3 tested
- IDOR tested
- authentication tested
- upload security tested
- rate limiting tested

RECRUITER:

- candidate information understandable
- matching explainable
- scoring understandable
- workflows tested

====================================================================
153. FIRST BUILD ACTION
====================================================================

Before generating large amounts of code:

1. Inspect the repository.
2. Detect existing files.
3. Detect installed dependencies.
4. Detect current environment.
5. Do not overwrite working code unnecessarily.
6. Create an architecture document.
7. Create the database schema plan.
8. Create the API contract.
9. Create the implementation roadmap.
10. Then begin Phase 0.

====================================================================
154. PHASE COMPLETION REQUIREMENT
====================================================================

At the end of every phase, report internally:

PHASE STATUS

Implemented:
...

Database:
...

APIs:
...

Frontend:
...

Tests:
...

Known issues:
...

Next phase:
...

And verify the application actually runs.

Do not mark a phase complete merely because files were generated.

====================================================================
155. FINAL ACCEPTANCE CRITERIA
====================================================================

HireLens is complete only when the following journey works with
real data:

1. College admin activates a student.
2. Student authenticates using institutional email.
3. Student completes profile.
4. Student uploads a real PDF resume.
5. Resume is securely stored.
6. Resume is extracted.
7. OCR fallback works when necessary.
8. Sections are detected.
9. Skills are normalized.
10. Canonical skills are created.
11. Evidence is stored.
12. Recruiter creates a real drive.
13. Drive requirements are normalized.
14. Student eligibility is checked.
15. Student applies.
16. Recruiter sees application.
17. Resume match is calculated.
18. Match explanation is displayed.
19. Assessment is created.
20. Questions are generated/validated.
21. Student starts assessment.
22. Timing works.
23. Adaptive logic works.
24. Browser integrity signals work.
25. Camera integrity signals work.
26. Violations are temporally aggregated.
27. Integrity score is calculated.
28. Assessment score is calculated.
29. Candidate score is calculated deterministically.
30. Recruiter sees candidate evidence.
31. Recruiter can review/shortlist/reject.
32. Action is audited.
33. Student receives appropriate notification.
34. Admin sees updated analytics.
35. Unauthorized users cannot access restricted data.

====================================================================
156. FINAL IMPLEMENTATION PHILOSOPHY
====================================================================

Build less, but build it properly.

Do not add infrastructure because it sounds impressive.

Do not add AI because a feature sounds better with AI.

Do not let AI replace deterministic business rules.

Do not let one proctoring event determine malpractice.

Do not let resume parsing invent information.

Do not hide scoring logic from the engineering architecture.

Do not create fake metrics.

Do not create fake candidate data.

Do not expose internal technology terminology to end users.

Do not sacrifice usability for technical complexity.

Every AI output should be:

measurable
traceable
validated
appropriately bounded

Every important business action should be:

authorized
audited
reproducible

Every phase should leave a working system.

The final result should feel like a real college recruitment product,
not a collection of AI demonstrations.

====================================================================
START IMPLEMENTATION
====================================================================

First:

Inspect the existing project/repository/environment.

Then:

Create/update:

docs/architecture.md
docs/business-logic.md
docs/database.md
docs/api.md
docs/resume-pipeline.md
docs/assessment.md
docs/proctoring.md
docs/scoring.md
docs/security.md
docs/privacy.md
docs/testing.md
docs/deployment.md

Then implement PHASE 0.

Do not jump directly to advanced AI.

Do not skip validation.

Do not skip security.

Do not create fake functionality.

After PHASE 0 is verified working, proceed sequentially through the
remaining phases.

====================================================================
END OF HIRELENS MASTER BUILD SPECIFICATION
====================================================================
