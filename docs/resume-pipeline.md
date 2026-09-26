# HireLens Resume Processing Pipeline Specification

## 1. Overview & Core Directives

The resume processing pipeline converts unconstrained PDF resumes into structured, verifiable candidate profiles with canonical skill mapping and direct textual evidence.

**Core Rules (Sections 11–22, 99, 122):**
- Never send raw PDFs directly to an LLM asking it to "understand the resume."
- Native text extraction is the primary path; OCR (Tesseract) is strictly a fallback for scanned or low-density text.
- Extracted skills must map to a **Canonical Skill Database** with alias resolution.
- Every recognized skill must be anchored by **Skill Evidence** pointing to a specific page, section, and text snippet.
- The pipeline never hallucinates or fabricates candidate skills, projects, or experiences.

---

## 2. Pipeline Execution Flow

```
   1. Resume Upload (Client -> S3 Presigned URL)
          │
          ▼
   2. File Validation (MIME, Magic Bytes, Page Limits)
          │
          ▼
   3. Async Worker Job Queued (Redis -> Resume Worker)
          │
          ▼
   4. Native PDF Parsing (PyMuPDF - Page & Block Extraction)
          │
          ▼
   5. Extraction Quality Evaluation
          ├───────────────────────────────────────────┐
          │ Text density & word count sufficient      │ Scanned / Low text quality
          ▼                                           ▼
   6. Native Text Stream                       7. OCR Fallback (Tesseract)
          │                                           │
          └─────────────────────┬─────────────────────┘
                                ▼
   8. Text Cleaning & Normalization
          │
          ▼
   9. Section Detection (Education, Skills, Experience, Projects, Certifications)
          │
          ▼
  10. Entity & Skill Candidate Extraction
          │
          ▼
  11. Canonical Skill Normalization & Alias Mapping
          │
          ▼
  12. Evidence Linking (Persist to `skill_evidence` & `student_skills`)
          │
          ▼
  13. Resume Status: PROCESSED
```

---

## 3. Step Details

### 3.1 File Validation
- Allowed MIME type: `application/pdf`.
- Magic byte check: Starts with `%PDF-`.
- Maximum size: 10 MB (configurable via `.env`).
- Maximum page count: 4 pages (college student resumes typically 1–2 pages).

### 3.2 Native Extraction & Quality Evaluation
- Uses `PyMuPDF` (`fitz`) to extract text blocks with bounding coordinates:
  ```json
  {
    "page": 1,
    "blocks": [
      { "text": "Education\nB.Tech Computer Science...", "x": 54.0, "y": 120.5, "width": 500.0, "height": 45.0 }
    ]
  }
  ```
- **Quality Metric**:
  - If total readable alphabetic words < 50 across the document or average character confidence is below 60%, switch `extraction_method` to `OCR` and trigger Tesseract page-by-page.
  - Otherwise, `extraction_method` is `NATIVE`.

### 3.3 Section Segmentation
- Identifies section boundaries using heading dictionaries and regex patterns:
  - `EDUCATION`: "Education", "Academic Background", "Qualifications"
  - `SKILLS`: "Technical Skills", "Skills & Proficiencies", "Core Competencies"
  - `PROJECTS`: "Academic Projects", "Personal Projects", "Key Projects"
  - `EXPERIENCE`: "Work Experience", "Internships", "Professional Experience"
  - `CERTIFICATIONS`: "Certifications", "Licenses & Certifications", "Achievements"

### 3.4 Skill Normalization & Evidence Linking
- For every candidate skill token:
  1. Lookup in `skill_aliases` (e.g. "ReactJS", "React.js" -> "React").
  2. If found, link to `canonical_skills`.
  3. Generate a `skill_evidence` record containing the exact surrounding snippet, page number, and section ID.
  4. Classify source: `EXPLICIT` (listed in skills section), `PROJECT` (described in project text), `EXPERIENCE` (used in internship/job).
