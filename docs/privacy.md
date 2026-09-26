# HireLens Privacy by Design Specification

## 1. Privacy Principles

HireLens enforces strict data minimization principles:
1. **No Raw Video Storage**: Continuous webcam video streams are never transmitted or stored on server infrastructure. The client runs lightweight on-device models and only sends discrete event telemetry.
2. **Institutional Transparency**: Before starting an assessment, students are presented with clear, plain-language disclosure detailing:
   - What events are monitored (e.g. window switching, face count).
   - Who can access the event timeline (assigned recruiters and college placement staff).
   - How long data is retained.
3. **Audit Trail**: Every viewing of a candidate's resume, test results, or proctoring timeline is logged in `audit_logs`.

---

## 2. Retention Schedules

| Data Category | Retention Period | Deletion / Anonymization Policy |
| :--- | :--- | :--- |
| **Resumes (PDFs)** | Active recruitment cycle + 6 months | Secure S3 deletion after student graduation or placement |
| **Proctoring Events** | 90 days post-assessment | Telemetry purged after drive completion review window |
| **Assessment Answers**| 1 year | Used for placement auditability; anonymized after placement cycle |
| **Audit Logs** | 2 years | Immutable record maintained for placement cell governance |
