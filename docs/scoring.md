# HireLens Candidate Scoring & Matching Specification

## 1. Overview & Core Philosophy

HireLens produces a transparent, deterministic candidate score that explains *why* a candidate received their rating. 

All scores are tagged with a immutable `score_version` (e.g. `v1.0`) so that historic hiring evaluations remain fully auditable and reproducible.

---

## 2. Overall Score Formulation

The composite candidate score (0–100%) is calculated deterministically as:

$$\text{Overall Score} = w_{\text{req}} S_{\text{req}} + w_{\text{pref}} S_{\text{pref}} + w_{\text{sem}} S_{\text{sem}} + w_{\text{evid}} S_{\text{evid}} + w_{\text{assess}} S_{\text{assess}}$$

### 2.1 Default Weights (Version `v1.0`)
- **$w_{\text{req}}$ (Required Skills)**: 0.35 (35%)
- **$w_{\text{pref}}$ (Preferred Skills)**: 0.15 (15%)
- **$w_{\text{sem}}$ (Semantic Resume Fit)**: 0.15 (15%)
- **$w_{\text{evid}}$ (Skill Evidence Quality)**: 0.10 (10%)
- **$w_{\text{assess}}$ (Technical Assessment Performance)**: 0.25 (25%)
- *Sum of weights*: $0.35 + 0.15 + 0.15 + 0.10 + 0.25 = 1.00$ (100%)

---

## 3. Sub-Score Calculations

### 3.1 Required Skill Score ($S_{\text{req}}$)
$$\frac{\sum_{s \in \text{Matched Req Skills}} \text{weight}(s)}{\sum_{s \in \text{All Req Skills}} \text{weight}(s)} \times 100$$
If a drive specifies no required skills, this sub-score defaults to 100.

### 3.2 Preferred Skill Score ($S_{\text{pref}}$)
$$\frac{\sum_{s \in \text{Matched Pref Skills}} \text{weight}(s)}{\sum_{s \in \text{All Pref Skills}} \text{weight}(s)} \times 100$$
If no preferred skills are listed, this sub-score defaults to 100.

### 3.3 Semantic Match Score ($S_{\text{sem}}$)
- Evaluates the cosine similarity between the job description embedding and the candidate's resume sections embedding using `sentence-transformers/all-MiniLM-L6-v2`:
  $$S_{\text{sem}} = \max\left(0, \cos(\mathbf{e}_{\text{job}}, \mathbf{e}_{\text{resume}}) \times 100\right)$$

### 3.4 Evidence Score ($S_{\text{evid}}$)
- Measures the depth of proof supporting recognized skills:
  - `EXPLICIT` only (just listed in skills block): 0.5 multiplier.
  - `PROJECT` (used in practical project work): 0.85 multiplier.
  - `EXPERIENCE` (applied in internship/work experience): 1.0 multiplier.
  - Average of normalized evidence multipliers scaled to 0–100.

### 3.5 Assessment Score ($S_{\text{assess}}$)
- Deterministic percentage of correct questions weighted by difficulty level (1–5).

---

## 4. Recruiter Match Breakdown View

Rather than displaying obscure mathematical models, recruiters see a clean, actionable breakdown:

```
Candidate Match: 84%
─────────────────────────────────────────────
Required Skills (3/4 Matched)
  ✓ Python (Internship & Projects)
  ✓ FastAPI (Project A)
  ✓ PostgreSQL (Project B)
  ✗ Docker (Missing)

Preferred Skills (2/2 Matched)
  ✓ Redis (Project A)
  ✓ AWS (Certified Cloud Practitioner)

Assessment Performance: 82% (Difficulty Avg: 3.8/5)
Resume Evidence Depth: High
```
