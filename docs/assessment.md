# HireLens Assessment Engine Specification

## 1. Overview & Objectives

The HireLens Assessment Engine delivers technical assessments tailored to recruitment drive requirements. It combines structured MCQ generation via Groq API, deterministic validation, deduplication, and real-time difficulty adaptation.

---

## 2. Question Generation & Validation

### 2.1 Generation via Groq
- Generates questions on demand for specified canonical skills and difficulty levels (1 to 5).
- Enforces strict Pydantic JSON response format:
  ```json
  {
    "skill": "Python",
    "topic": "List Comprehensions & Generators",
    "difficulty": 3,
    "question_text": "What will be the output of the following generator expression...",
    "options": {
      "A": "...",
      "B": "...",
      "C": "...",
      "D": "..."
    },
    "correct_answer": "B",
    "explanation": "Generators evaluate lazily, hence..."
  }
  ```

### 2.2 Deterministic Validation Pipeline
Before any generated question is marked `VALIDATED` and added to the active question bank:
1. **Option Count & Uniqueness**: Must contain exactly 4 non-empty, distinct options (A, B, C, D).
2. **Key Validity**: `correct_answer` must be one of `['A', 'B', 'C', 'D']`.
3. **No Self-Referential Distractors**: Options like "None of the above" or "All of the above" are rejected.
4. **Length & Formatting**: Question stem must be at least 20 characters and free of markdown syntax errors.

### 2.3 Duplicate Detection
- Each question's text is normalized (lowercased, stripped of punctuation, stop-words removed) and hashed.
- New questions with cosine similarity > 0.85 (using MiniLM embeddings) against existing questions in the same topic are discarded.

---

## 3. Adaptive Assessment Algorithm

The assessment adjusts difficulty dynamically based on the student's answer trajectory:

1. **Initial Difficulty**: Assessment starts at Difficulty 3 (Medium) on a 1–5 scale.
2. **Correct Response**:
   - Next question difficulty increases: $\min(5, \text{current\_difficulty} + 1)$.
3. **Incorrect Response**:
   - Next question difficulty decreases: $\max(1, \text{current\_difficulty} - 1)$.
4. **Topic Distribution**: Ensures questions cover both Required and Preferred skills defined in the drive.
5. **No Duplicate Question in Single Attempt**: An attempt tracks served `question_id`s; questions previously served in the attempt are excluded from selection.

---

## 4. Authoritative Timing & State Protection

- **Server-Authoritative Clock**: The test deadline is fixed at `started_at + duration_seconds`. Client-side clock tampering cannot extend the test window.
- **Auto-Submission**: If an answer is received past `deadline_at + 15s` (grace period for network latency), the attempt is marked `EXPIRED` and evaluated on answered questions.
- **Refresh & Disconnect Resilience**: In-progress answers are saved immediately. On page refresh, the frontend queries the backend for the current attempt state and remaining time.
