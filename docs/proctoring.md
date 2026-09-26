# HireLens Assessment Integrity & Proctoring Specification

## 1. Principles & Philosophy

- **Integrity Score $\neq$ Proof of Malpractice**: The Integrity Score is an objective quantification of observed assessment-integrity signals, not a definitive verdict.
- **No Demeaning Labels**: Candidates are never labeled "Cheater" or "Fraud" in the UI.
- **Privacy by Design**: No continuous video recordings are stored. The client processes frames locally and transmits lightweight, structured event metadata.
- **Temporal Debouncing**: Accidental blurs (e.g. 1-second system pop-up) are filtered out.

---

## 2. Signal Types & Thresholds

| Signal Category | Event Type | Detection Mechanism | Trigger Condition |
| :--- | :--- | :--- | :--- |
| **Browser** | `TAB_SWITCH` / `WINDOW_BLUR` | `document.visibilityState` / `window.onblur` | Active window focus lost for > 2 seconds |
| **Browser** | `FULLSCREEN_EXIT` | Fullscreen API events | Assessment window leaves fullscreen mode |
| **Camera** | `FACE_MISSING` | MediaPipe Face Detection | Face undetectable for continuous > 5 seconds |
| **Camera** | `MULTIPLE_FACE` | MediaPipe Face Detection | 2+ faces detected for continuous > 3 seconds |
| **Camera** | `OBJECT_DETECTED` | YOLO (Edge/Client model) | Mobile phone or tablet detected for continuous > 2 seconds |

---

## 3. Temporal Aggregation & Debouncing

Signals are batched and aggregated into discrete episodes rather than spamming the database per frame:
- **Cooldown Window**: Rapid successive occurrences of the same event within 5 seconds are coalesced into a single event with an updated `duration_seconds`.
- **Minimum Duration Filter**: Events lasting under 1.5 seconds are discarded as transient noise (e.g. brief sneeze, glancing down at keyboard).

---

## 4. Penalty Calculation Formula

For each aggregated event $i$:
$$\text{Penalty}_i = \text{Base Penalty} \times C_i \times D_i \times R_i$$

Where:
- **Base Penalty**:
  - `TAB_SWITCH`: 5.0
  - `FULLSCREEN_EXIT`: 4.0
  - `FACE_MISSING`: 6.0
  - `MULTIPLE_FACE`: 15.0
  - `OBJECT_DETECTED` (Phone): 20.0
- **Confidence Factor ($C_i$)**: Model detection confidence (e.g. 0.85).
- **Duration Factor ($D_i$)**:
  $$D_i = \min\left(2.5, 1.0 + \frac{\text{duration\_seconds}}{30}\right)$$
- **Repetition Factor ($R_i$)**:
  $$R_i = 1.0 + (0.35 \times (\text{occurrence\_count} - 1))$$

### 4.1 Caps & Guardrails
- **Per-Event Cap**: No single event penalty may exceed 25.0 points.
- **Category Cap**: Browser-related events capped at 30.0 total cumulative penalty.
- **Final Score**:
  $$\text{Integrity Score} = \max\left(0, 100 - \sum \text{Validated Penalties}\right)$$

---

## 5. Integrity Status Tiers

| Score Range | Status | Recruiter UI Display |
| :--- | :--- | :--- |
| **90 – 100** | `NORMAL` | Green badge ("Normal") |
| **75 – 89** | `LOW_CONCERN` | Blue badge ("Low Concern") |
| **50 – 74** | `REVIEW_REQUIRED` | Amber badge ("Review Required") |
| **25 – 49** | `HIGH_CONCERN` | Orange badge ("High Concern") |
| **0 – 24** | `CRITICAL_REVIEW` | Red badge ("Critical Review") |

*Special Event Trigger*: High-confidence sustained phone detection or multiple faces immediately tags the attempt with `PRIORITY_REVIEW`, regardless of total score.
