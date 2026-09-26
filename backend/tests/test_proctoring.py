"""
Phase 8: Assessment Integrity & Telemetry Proctoring - Comprehensive Test Suite.
Tests:
- Proctoring engine penalty calculation with escalation
- Risk level classification thresholds
- Batch telemetry event processing
- Rapid answer detection integration
- API endpoint authorization and functionality
- Integrity report generation and retrieval
- End-to-end telemetry flow during assessment
"""

import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.repository import repo
from app.models.proctoring import IncidentType, IncidentSeverity, ProctoringIncident, IntegrityReport, PENALTY_CONFIG
from app.models.assessment import AttemptStatus
from app.services.proctoring_engine import ProctoringEngine
from app.schemas.proctoring import TelemetryEventRequest, TelemetryBatchRequest


@pytest.fixture(autouse=True)
def clean_test_state():
    """Reset proctoring state before each test."""
    repo._proctoring_incidents.clear()
    repo._integrity_reports.clear()
    repo._attempts.clear()
    repo._answers.clear()
    repo._save_proctoring_incidents_to_disk()
    repo._save_integrity_reports_to_disk()
    repo._save_attempts_to_disk()
    repo._save_answers_to_disk()
    yield


# ====================================================================
# Unit Tests: Proctoring Engine Penalty Calculation
# ====================================================================

class TestPenaltyCalculation:
    """Verify penalty escalation math and severity classification."""

    def test_first_tab_switch_applies_base_penalty(self):
        """First tab switch should deduct base penalty (3.0 points)."""
        event = TelemetryEventRequest(
            attempt_id="test-attempt-1",
            event_type=IncidentType.TAB_SWITCH,
        )
        result = ProctoringEngine.process_event(event)

        assert result.success is True
        assert result.incident_type == IncidentType.TAB_SWITCH
        assert result.penalty_applied == 3.0
        assert result.current_trust_score == 97.0
        assert result.total_incidents == 1
        assert result.severity == IncidentSeverity.LOW

    def test_penalty_escalates_on_repeated_violations(self):
        """Repeated violations of same type should escalate penalty."""
        attempt_id = "test-attempt-escalation"

        # First tab switch: 3.0 base
        r1 = ProctoringEngine.process_event(TelemetryEventRequest(
            attempt_id=attempt_id, event_type=IncidentType.TAB_SWITCH,
        ))
        assert r1.penalty_applied == 3.0

        # Second tab switch: 3.0 + 1*2.0 = 5.0
        r2 = ProctoringEngine.process_event(TelemetryEventRequest(
            attempt_id=attempt_id, event_type=IncidentType.TAB_SWITCH,
        ))
        assert r2.penalty_applied == 5.0

        # Third tab switch: 3.0 + 2*2.0 = 7.0
        r3 = ProctoringEngine.process_event(TelemetryEventRequest(
            attempt_id=attempt_id, event_type=IncidentType.TAB_SWITCH,
        ))
        assert r3.penalty_applied == 7.0

        # Trust score should be 100 - 3 - 5 - 7 = 85
        assert r3.current_trust_score == 85.0

    def test_penalty_capped_at_maximum(self):
        """Penalty should not exceed configured maximum per type."""
        attempt_id = "test-attempt-cap"
        config = PENALTY_CONFIG[IncidentType.TAB_SWITCH]

        # Submit enough events to exceed max
        for i in range(10):
            result = ProctoringEngine.process_event(TelemetryEventRequest(
                attempt_id=attempt_id, event_type=IncidentType.TAB_SWITCH,
            ))

        # Last penalty should be capped at max_penalty
        assert result.penalty_applied <= config["max_penalty"]

    def test_clipboard_paste_applies_higher_penalty(self):
        """Clipboard paste should have higher base penalty than tab switch."""
        event = TelemetryEventRequest(
            attempt_id="test-attempt-paste",
            event_type=IncidentType.CLIPBOARD_PASTE,
            metadata={"paste_length": 120},
        )
        result = ProctoringEngine.process_event(event)

        assert result.penalty_applied == 8.0  # Higher than tab switch base
        assert result.severity == IncidentSeverity.MEDIUM
        assert result.current_trust_score == 92.0

    def test_multiple_faces_is_high_severity(self):
        """Multiple faces detected should be HIGH severity with heavy penalty."""
        event = TelemetryEventRequest(
            attempt_id="test-attempt-faces",
            event_type=IncidentType.MULTIPLE_FACES,
            metadata={"face_count": 3},
        )
        result = ProctoringEngine.process_event(event)

        assert result.penalty_applied == 10.0
        assert result.severity == IncidentSeverity.HIGH
        assert result.current_trust_score == 90.0

    def test_severity_escalates_after_threshold(self):
        """After 3+ repeated low/medium incidents, severity should escalate to HIGH."""
        attempt_id = "test-attempt-severity-escalation"

        for i in range(4):
            result = ProctoringEngine.process_event(TelemetryEventRequest(
                attempt_id=attempt_id, event_type=IncidentType.WINDOW_BLUR,
            ))

        # 4th occurrence (count 3+) should escalate from LOW to HIGH
        assert result.severity == IncidentSeverity.HIGH

    def test_severity_escalates_to_critical_after_five(self):
        """After 5+ repeated incidents of any type, severity should escalate to CRITICAL."""
        attempt_id = "test-attempt-critical"

        for i in range(6):
            result = ProctoringEngine.process_event(TelemetryEventRequest(
                attempt_id=attempt_id, event_type=IncidentType.FULLSCREEN_EXIT,
            ))

        # 6th occurrence (count 5+) should be CRITICAL
        assert result.severity == IncidentSeverity.CRITICAL


# ====================================================================
# Unit Tests: Risk Level Classification
# ====================================================================

class TestRiskClassification:
    """Verify risk level thresholds."""

    def test_clean_score(self):
        """Trust score >= 90 should be CLEAN."""
        assert ProctoringEngine._classify_risk(100.0) == "CLEAN"
        assert ProctoringEngine._classify_risk(90.0) == "CLEAN"

    def test_low_risk_score(self):
        """Trust score 70-89 should be LOW_RISK."""
        assert ProctoringEngine._classify_risk(89.9) == "LOW_RISK"
        assert ProctoringEngine._classify_risk(70.0) == "LOW_RISK"

    def test_medium_risk_score(self):
        """Trust score 50-69 should be MEDIUM_RISK."""
        assert ProctoringEngine._classify_risk(69.9) == "MEDIUM_RISK"
        assert ProctoringEngine._classify_risk(50.0) == "MEDIUM_RISK"

    def test_high_risk_score(self):
        """Trust score 30-49 should be HIGH_RISK."""
        assert ProctoringEngine._classify_risk(49.9) == "HIGH_RISK"
        assert ProctoringEngine._classify_risk(30.0) == "HIGH_RISK"

    def test_flagged_score(self):
        """Trust score < 30 should be FLAGGED."""
        assert ProctoringEngine._classify_risk(29.9) == "FLAGGED"
        assert ProctoringEngine._classify_risk(0.0) == "FLAGGED"


# ====================================================================
# Unit Tests: Batch Processing
# ====================================================================

class TestBatchProcessing:
    """Verify batch telemetry event processing."""

    def test_batch_processes_all_events(self):
        """Batch should process all events and return aggregated results."""
        batch = TelemetryBatchRequest(
            attempt_id="test-attempt-batch",
            events=[
                TelemetryEventRequest(attempt_id="test-attempt-batch", event_type=IncidentType.TAB_SWITCH),
                TelemetryEventRequest(attempt_id="test-attempt-batch", event_type=IncidentType.WINDOW_BLUR),
                TelemetryEventRequest(attempt_id="test-attempt-batch", event_type=IncidentType.FULLSCREEN_EXIT),
            ],
        )
        result = ProctoringEngine.process_batch(batch)

        assert result.success is True
        assert result.processed_count == 3
        assert result.total_incidents == 3
        # Total penalty: 3.0 + 2.0 + 5.0 = 10.0, trust = 90.0
        assert result.current_trust_score == 90.0
        assert result.risk_level == "CLEAN"

    def test_batch_with_mixed_types_accumulates_correctly(self):
        """Mixed event types in batch should accumulate independently."""
        batch = TelemetryBatchRequest(
            attempt_id="test-attempt-mixed",
            events=[
                TelemetryEventRequest(attempt_id="test-attempt-mixed", event_type=IncidentType.TAB_SWITCH),
                TelemetryEventRequest(attempt_id="test-attempt-mixed", event_type=IncidentType.TAB_SWITCH),
                TelemetryEventRequest(attempt_id="test-attempt-mixed", event_type=IncidentType.CLIPBOARD_PASTE),
            ],
        )
        result = ProctoringEngine.process_batch(batch)

        assert result.processed_count == 3
        # Tab switch 1: 3.0, Tab switch 2: 5.0, Paste 1: 8.0 = 16.0 total
        assert result.current_trust_score == 84.0


# ====================================================================
# Unit Tests: Rapid Answer Detection
# ====================================================================

class TestRapidAnswerDetection:
    """Verify server-side rapid answer detection."""

    def test_rapid_answer_triggers_incident(self):
        """Response time below threshold should create a proctoring incident."""
        result = ProctoringEngine.detect_rapid_answer("test-attempt-rapid", response_time_ms=500)

        assert result is not None
        assert result.incident_type == IncidentType.RAPID_ANSWER
        assert result.penalty_applied == 4.0  # Base penalty for rapid answer

    def test_normal_response_no_incident(self):
        """Normal response time should not trigger any incident."""
        result = ProctoringEngine.detect_rapid_answer("test-attempt-normal", response_time_ms=5000)

        assert result is None

    def test_zero_response_time_no_incident(self):
        """Zero response time should not trigger (likely a data issue)."""
        result = ProctoringEngine.detect_rapid_answer("test-attempt-zero", response_time_ms=0)

        assert result is None

    def test_custom_threshold(self):
        """Custom threshold should be respected."""
        result = ProctoringEngine.detect_rapid_answer("test-attempt-custom", response_time_ms=1500, threshold_ms=1000)

        assert result is None  # 1500 > 1000, no incident


# ====================================================================
# Unit Tests: Integrity Report
# ====================================================================

class TestIntegrityReport:
    """Verify integrity report generation and retrieval."""

    def test_clean_report_for_no_incidents(self):
        """Attempt with no incidents should return clean report."""
        report = ProctoringEngine.get_integrity_report("nonexistent-attempt")

        assert report.trust_score == 100.0
        assert report.risk_level == "CLEAN"
        assert report.total_incidents == 0
        assert len(report.incidents) == 0

    def test_report_reflects_accumulated_incidents(self):
        """Report should accurately reflect all recorded incidents."""
        attempt_id = "test-attempt-report"

        ProctoringEngine.process_event(TelemetryEventRequest(
            attempt_id=attempt_id, event_type=IncidentType.TAB_SWITCH,
        ))
        ProctoringEngine.process_event(TelemetryEventRequest(
            attempt_id=attempt_id, event_type=IncidentType.CLIPBOARD_PASTE,
            metadata={"paste_length": 50},
        ))
        ProctoringEngine.process_event(TelemetryEventRequest(
            attempt_id=attempt_id, event_type=IncidentType.FACE_MISSING,
            metadata={"duration_ms": 3000},
        ))

        report = ProctoringEngine.get_integrity_report(attempt_id)

        assert report.total_incidents == 3
        assert report.incidents_by_type.get("TAB_SWITCH") == 1
        assert report.incidents_by_type.get("CLIPBOARD_PASTE") == 1
        assert report.incidents_by_type.get("FACE_MISSING") == 1
        assert report.total_penalty == 17.0  # 3 + 8 + 6
        assert report.trust_score == 83.0
        assert len(report.incidents) == 3

    def test_summary_has_breakdown_by_type(self):
        """Integrity summary should break down incidents by type."""
        attempt_id = "test-attempt-summary"

        ProctoringEngine.process_event(TelemetryEventRequest(
            attempt_id=attempt_id, event_type=IncidentType.TAB_SWITCH,
        ))
        ProctoringEngine.process_event(TelemetryEventRequest(
            attempt_id=attempt_id, event_type=IncidentType.TAB_SWITCH,
        ))
        ProctoringEngine.process_event(TelemetryEventRequest(
            attempt_id=attempt_id, event_type=IncidentType.WINDOW_BLUR,
        ))

        summary = ProctoringEngine.get_integrity_summary(attempt_id)

        assert summary.tab_switches == 2
        assert summary.window_blurs == 1
        assert summary.paste_attempts == 0
        assert summary.total_incidents == 3

    def test_trust_score_floors_at_zero(self):
        """Trust score should never go below 0."""
        attempt_id = "test-attempt-floor"

        # Hammer with enough high-penalty events to exceed 100
        for _ in range(20):
            ProctoringEngine.process_event(TelemetryEventRequest(
                attempt_id=attempt_id, event_type=IncidentType.MULTIPLE_FACES,
            ))

        report = ProctoringEngine.get_integrity_report(attempt_id)
        assert report.trust_score >= 0.0
        assert report.risk_level == "FLAGGED"


# ====================================================================
# Integration Tests: API Endpoints
# ====================================================================

@pytest.mark.asyncio
async def test_submit_telemetry_event_requires_auth():
    """Telemetry event submission should require student authentication."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/proctoring/event", json={
            "attempt_id": "fake",
            "event_type": "TAB_SWITCH",
        })
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_recruiter_cannot_submit_telemetry():
    """Recruiters should not be able to submit telemetry events."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        token = login.json()["access_token"]

        res = await ac.post("/api/v1/proctoring/event",
            headers={"Authorization": f"Bearer {token}"},
            json={"attempt_id": "fake", "event_type": "TAB_SWITCH"},
        )
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_e2e_telemetry_during_assessment():
    """Full end-to-end: start assessment → submit telemetry → verify integrity report."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Recruiter and create a drive + assessment
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        recruiter_token = recruiter_login.json()["access_token"]
        rh = {"Authorization": f"Bearer {recruiter_token}"}

        drive_res = await ac.post("/api/v1/drives", headers=rh, json={
            "company_name": "Proctoring Test Corp",
            "job_title": "SDE - Integrity Testing",
            "description": "Drive for proctoring E2E tests.",
            "location": "Chennai",
            "employment_type": "Full-Time",
            "ctc_range": "12 - 18 LPA",
            "skills": [
                {"name": "Python", "canonical_name": "Python", "requirement_type": "REQUIRED", "weight": 8},
            ],
            "eligibility": {
                "allowed_departments": ["Computer Science & Engineering"],
                "min_cgpa": 7.0,
                "eligible_graduation_years": [2025],
                "max_active_backlogs": 0,
            },
            "publish_now": True,
        })
        assert drive_res.status_code == 201
        drive_id = drive_res.json()["id"]

        asm_res = await ac.post("/api/v1/assessments", headers=rh, json={
            "drive_id": drive_id,
            "title": "Proctoring Test Assessment",
            "description": "Testing integrity telemetry pipeline.",
            "skills": ["Python"],
            "question_count": 3,
            "duration_seconds": 600,
            "passing_score": 50.0,
        })
        assert asm_res.status_code == 201
        assessment_id = asm_res.json()["id"]

        # Add questions (semantically distinct to avoid duplicate detection)
        test_questions = [
            {
                "skill": "Python",
                "topic": "Data Structures",
                "question_text": "Which built-in Python data structure provides O(1) average-case lookup by key and uses hash tables internally?",
                "options": ["dict", "list", "tuple", "set"],
                "correct_answer": "dict",
                "explanation": "Python dictionaries use hash tables internally, providing O(1) average-case lookup by key.",
                "difficulty": 5,
            },
            {
                "skill": "Python",
                "topic": "Memory Management",
                "question_text": "What garbage collection mechanism does CPython primarily use to reclaim memory from unreferenced objects?",
                "options": ["Reference counting", "Mark and sweep", "Generational GC", "Tracing GC"],
                "correct_answer": "Reference counting",
                "explanation": "CPython primarily uses reference counting for garbage collection, supplemented by a cyclic GC.",
                "difficulty": 6,
            },
            {
                "skill": "Python",
                "topic": "Concurrency",
                "question_text": "What is the name of the CPython mechanism that prevents true parallel execution of multiple threads within a single process?",
                "options": ["Global Interpreter Lock", "Thread Pool Executor", "Async Event Loop", "Semaphore"],
                "correct_answer": "Global Interpreter Lock",
                "explanation": "The GIL (Global Interpreter Lock) prevents multiple threads from executing Python bytecode simultaneously in CPython.",
                "difficulty": 7,
            },
        ]
        for q in test_questions:
            q_res = await ac.post(f"/api/v1/assessments/{assessment_id}/questions", headers=rh, json=q)
            assert q_res.status_code == 201

        # 2. Login as Student
        student_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "21cs101@student.psgtech.ac.in",
            "passkey": "HireLens",
        })
        student_token = student_login.json()["access_token"]
        sh = {"Authorization": f"Bearer {student_token}"}

        # 3. Start assessment
        start_res = await ac.post(f"/api/v1/assessments/{assessment_id}/start", headers=sh)
        assert start_res.status_code == 200
        attempt_id = start_res.json()["attempt_id"]

        # 4. Submit proctoring telemetry events
        # Tab switch
        tel_res = await ac.post("/api/v1/proctoring/event", headers=sh, json={
            "attempt_id": attempt_id,
            "event_type": "TAB_SWITCH",
        })
        assert tel_res.status_code == 200
        tel_data = tel_res.json()
        assert tel_data["success"] is True
        assert tel_data["incident_type"] == "TAB_SWITCH"
        assert tel_data["penalty_applied"] == 3.0
        assert tel_data["current_trust_score"] == 97.0

        # Window blur
        tel_res2 = await ac.post("/api/v1/proctoring/event", headers=sh, json={
            "attempt_id": attempt_id,
            "event_type": "WINDOW_BLUR",
        })
        assert tel_res2.status_code == 200
        tel_data2 = tel_res2.json()
        assert tel_data2["current_trust_score"] == 95.0  # 97 - 2

        # Clipboard paste
        tel_res3 = await ac.post("/api/v1/proctoring/event", headers=sh, json={
            "attempt_id": attempt_id,
            "event_type": "CLIPBOARD_PASTE",
            "metadata": {"paste_length": 85},
        })
        assert tel_res3.status_code == 200
        tel_data3 = tel_res3.json()
        assert tel_data3["current_trust_score"] == 87.0  # 95 - 8
        assert tel_data3["warning_message"] is not None  # Medium severity

        # 5. Verify integrity report via recruiter API
        report_res = await ac.get(f"/api/v1/proctoring/report/{attempt_id}", headers=rh)
        assert report_res.status_code == 200
        report = report_res.json()
        assert report["trust_score"] == 87.0
        assert report["total_incidents"] == 3
        assert report["risk_level"] == "LOW_RISK"
        assert report["incidents_by_type"]["TAB_SWITCH"] == 1
        assert report["incidents_by_type"]["WINDOW_BLUR"] == 1
        assert report["incidents_by_type"]["CLIPBOARD_PASTE"] == 1

        # 6. Verify recruiter summary
        summary_res = await ac.get(f"/api/v1/proctoring/summary/{attempt_id}", headers=rh)
        assert summary_res.status_code == 200
        summary = summary_res.json()
        assert summary["tab_switches"] == 1
        assert summary["window_blurs"] == 1
        assert summary["paste_attempts"] == 1
        assert summary["total_incidents"] == 3


@pytest.mark.asyncio
async def test_batch_telemetry_api():
    """Test batch telemetry event submission through the API."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Setup: login and create drive+assessment+attempt
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai", "passkey": "HireLens",
        })
        rh = {"Authorization": f"Bearer {recruiter_login.json()['access_token']}"}

        drive_res = await ac.post("/api/v1/drives", headers=rh, json={
            "company_name": "Batch Test Corp",
            "job_title": "SDE - Batch Testing",
            "description": "Drive for batch telemetry tests.",
            "location": "Mumbai",
            "employment_type": "Full-Time",
            "ctc_range": "10 - 15 LPA",
            "skills": [{"name": "Java", "canonical_name": "Java", "requirement_type": "REQUIRED", "weight": 7}],
            "eligibility": {
                "allowed_departments": ["Computer Science & Engineering"],
                "min_cgpa": 7.0,
                "eligible_graduation_years": [2025],
                "max_active_backlogs": 0,
            },
            "publish_now": True,
        })
        drive_id = drive_res.json()["id"]

        asm_res = await ac.post("/api/v1/assessments", headers=rh, json={
            "drive_id": drive_id,
            "title": "Batch Test Assessment",
            "description": "Batch proctoring telemetry test.",
            "skills": ["Java"],
            "question_count": 3,
            "duration_seconds": 600,
            "passing_score": 50.0,
        })
        assessment_id = asm_res.json()["id"]

        for i in range(3):
            await ac.post(f"/api/v1/assessments/{assessment_id}/questions", headers=rh, json={
                "skill": "Java",
                "topic": f"Java Topic {i+1}",
                "question_text": f"What is the difference between Java interface vs abstract class approach {i+1}? Detail the key distinctions.",
                "options": [f"Option A{i}", f"Option B{i}", f"Option C{i}", f"Option D{i}"],
                "correct_answer": f"Option A{i}",
                "explanation": f"Java interfaces provide full abstraction while abstract classes can have implementation details, scenario {i+1}.",
                "difficulty": 5,
            })

        student_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "21cs101@student.psgtech.ac.in", "passkey": "HireLens",
        })
        sh = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

        start_res = await ac.post(f"/api/v1/assessments/{assessment_id}/start", headers=sh)
        attempt_id = start_res.json()["attempt_id"]

        # Submit batch
        batch_res = await ac.post("/api/v1/proctoring/batch", headers=sh, json={
            "attempt_id": attempt_id,
            "events": [
                {"attempt_id": attempt_id, "event_type": "TAB_SWITCH"},
                {"attempt_id": attempt_id, "event_type": "WINDOW_BLUR"},
                {"attempt_id": attempt_id, "event_type": "TAB_SWITCH"},
            ],
        })
        assert batch_res.status_code == 200
        batch_data = batch_res.json()
        assert batch_data["processed_count"] == 3
        assert batch_data["total_incidents"] == 3
        # Tab switch 1: 3.0, Blur: 2.0, Tab switch 2: 5.0 = 10.0
        assert batch_data["current_trust_score"] == 90.0


@pytest.mark.asyncio
async def test_student_cannot_view_other_student_report():
    """Students should not be able to view another student's integrity report."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create an attempt owned by a different student
        from app.models.assessment import AssessmentAttempt
        from datetime import datetime, timezone, timedelta

        fake_attempt = AssessmentAttempt(
            id="other-student-attempt",
            assessment_id="fake-assessment",
            student_id="other-student-id",
            deadline_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        repo.save_attempt(fake_attempt)

        # Login as student 21cs101
        student_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "21cs101@student.psgtech.ac.in", "passkey": "HireLens",
        })
        sh = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

        # Try to access other student's report
        report_res = await ac.get("/api/v1/proctoring/report/other-student-attempt", headers=sh)
        assert report_res.status_code == 403


@pytest.mark.asyncio
async def test_integrity_in_finalize_response():
    """Finalized attempt should include integrity trust score and risk level."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Setup drive + assessment
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai", "passkey": "HireLens",
        })
        rh = {"Authorization": f"Bearer {recruiter_login.json()['access_token']}"}

        drive_res = await ac.post("/api/v1/drives", headers=rh, json={
            "company_name": "Integrity Score Corp",
            "job_title": "SDE - Integrity Final",
            "description": "Drive for integrity finalize test.",
            "location": "Bangalore",
            "employment_type": "Full-Time",
            "ctc_range": "15 - 20 LPA",
            "skills": [{"name": "Go", "canonical_name": "Go", "requirement_type": "REQUIRED", "weight": 8}],
            "eligibility": {
                "allowed_departments": ["Computer Science & Engineering"],
                "min_cgpa": 7.0,
                "eligible_graduation_years": [2025],
                "max_active_backlogs": 0,
            },
            "publish_now": True,
        })
        drive_id = drive_res.json()["id"]

        asm_res = await ac.post("/api/v1/assessments", headers=rh, json={
            "drive_id": drive_id,
            "title": "Integrity Final Test",
            "description": "Testing integrity score in finalize.",
            "skills": ["Go"],
            "question_count": 3,
            "duration_seconds": 600,
            "passing_score": 50.0,
        })
        assessment_id = asm_res.json()["id"]

        for i in range(3):
            await ac.post(f"/api/v1/assessments/{assessment_id}/questions", headers=rh, json={
                "skill": "Go",
                "topic": f"Go Topic {i+1}",
                "question_text": f"What concurrency pattern does Go use for goroutine management approach {i+1}? Explain channels vs mutexes.",
                "options": [f"Channels {i}", f"Mutexes {i}", f"Semaphores {i}", f"Locks {i}"],
                "correct_answer": f"Channels {i}",
                "explanation": f"Go uses CSP (Communicating Sequential Processes) with channels as the primary concurrency primitive, scenario {i+1}.",
                "difficulty": 5,
            })

        # Student flow
        student_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "21cs101@student.psgtech.ac.in", "passkey": "HireLens",
        })
        sh = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

        start_res = await ac.post(f"/api/v1/assessments/{assessment_id}/start", headers=sh)
        attempt_id = start_res.json()["attempt_id"]

        # Record some telemetry
        await ac.post("/api/v1/proctoring/event", headers=sh, json={
            "attempt_id": attempt_id, "event_type": "TAB_SWITCH",
        })
        await ac.post("/api/v1/proctoring/event", headers=sh, json={
            "attempt_id": attempt_id, "event_type": "CLIPBOARD_PASTE",
        })

        # Answer all questions
        current_q = start_res.json()["current_question"]
        for i in range(3):
            ans_res = await ac.post(f"/api/v1/assessments/{assessment_id}/answer", headers=sh, json={
                "attempt_id": attempt_id,
                "question_id": current_q["id"],
                "selected_answer": current_q["options"][0],
                "response_time_ms": 5000,
            })
            ans_data = ans_res.json()
            if ans_data.get("next_question"):
                current_q = ans_data["next_question"]

        # Finalize
        finalize_res = await ac.post(
            f"/api/v1/assessments/{assessment_id}/submit?attempt_id={attempt_id}",
            headers=sh,
        )
        assert finalize_res.status_code == 200
        finalize_data = finalize_res.json()

        # Verify integrity fields are present
        assert "integrity_trust_score" in finalize_data
        assert "integrity_risk_level" in finalize_data
        # Trust: 100 - 3 (tab) - 8 (paste) = 89
        assert finalize_data["integrity_trust_score"] == 89.0
        assert finalize_data["integrity_risk_level"] == "LOW_RISK"


# ====================================================================
# Unit Tests: Incident Description Generation
# ====================================================================

class TestIncidentDescriptions:
    """Verify human-readable incident descriptions."""

    def test_tab_switch_description(self):
        desc = ProctoringEngine._generate_incident_description(
            IncidentType.TAB_SWITCH, 2, {}
        )
        assert "Tab switch" in desc
        assert "#2" in desc

    def test_paste_description_includes_length(self):
        desc = ProctoringEngine._generate_incident_description(
            IncidentType.CLIPBOARD_PASTE, 1, {"paste_length": 200}
        )
        assert "200" in desc
        assert "Clipboard" in desc

    def test_face_missing_includes_duration(self):
        desc = ProctoringEngine._generate_incident_description(
            IncidentType.FACE_MISSING, 3, {"duration_ms": 5000}
        )
        assert "5000" in desc
        assert "Face" in desc

    def test_multiple_faces_includes_count(self):
        desc = ProctoringEngine._generate_incident_description(
            IncidentType.MULTIPLE_FACES, 1, {"face_count": 3}
        )
        assert "3" in desc
        assert "faces" in desc

    def test_rapid_answer_includes_time(self):
        desc = ProctoringEngine._generate_incident_description(
            IncidentType.RAPID_ANSWER, 1, {"response_time_ms": 800, "threshold_ms": 2000}
        )
        assert "800" in desc
        assert "2000" in desc

    def test_object_detected_description(self):
        desc = ProctoringEngine._generate_incident_description(
            IncidentType.OBJECT_DETECTED, 1, {"detected_object": "mobile device/phone", "confidence": 0.88}
        )
        assert "Prohibited object" in desc
        assert "mobile device/phone" in desc


# ====================================================================
# Unit & API Tests: Computer Vision ML Proctoring Subsystem
# ====================================================================

class TestVisionMLProctoring:
    """Test Computer Vision ML frame analysis and incident triggers."""

    def test_blank_frame_detects_face_missing(self):
        import numpy as np
        import cv2
        import sys
        sys.path.append("/home/manoj/Documents/HireLens")
        from ai.cv_proctoring import VisionProctorML

        blank = np.zeros((200, 200, 3), dtype=np.uint8)
        _, buf = cv2.imencode(".jpg", blank)
        result = VisionProctorML.analyze_frame(buf.tobytes())

        assert result["success"] is True
        assert result["face_count"] == 0
        assert result["incident_type"] == "FACE_MISSING"

    def test_phone_aspect_detects_prohibited_device(self):
        import numpy as np
        import cv2
        import sys
        sys.path.append("/home/manoj/Documents/HireLens")
        from ai.cv_proctoring import VisionProctorML

        frame = np.zeros((400, 400, 3), dtype=np.uint8)
        cv2.rectangle(frame, (150, 100), (250, 300), (255, 255, 255), -1)
        cv2.putText(frame, "PHONE", (160, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
        _, buf = cv2.imencode(".jpg", frame)
        result = VisionProctorML.analyze_frame(buf.tobytes())

        assert result["success"] is True
        assert result["incident_type"] == "OBJECT_DETECTED"
        assert len(result["prohibited_objects"]) > 0


@pytest.mark.asyncio
async def test_api_analyze_frame_endpoint():
    """Test POST /api/v1/proctoring/analyze-frame with simulated webcam frame."""
    import base64
    import numpy as np
    import cv2

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        student_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "21cs101@student.psgtech.ac.in", "passkey": "HireLens",
        })
        sh = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

        # Create active attempt owned by student
        from app.models.assessment import AssessmentAttempt
        from datetime import datetime, timezone, timedelta
        from app.db.repository import repo

        test_attempt = AssessmentAttempt(
            id="ml-vision-test-attempt",
            assessment_id="asm-test-ml",
            student_id=student_login.json()["user"]["id"],
            started_at=datetime.now(timezone.utc),
            deadline_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            status="IN_PROGRESS",
        )
        repo.save_attempt(test_attempt)

        # Generate test frame
        blank = np.zeros((200, 200, 3), dtype=np.uint8)
        _, buf = cv2.imencode(".jpg", blank)
        b64_frame = "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode("utf-8")

        res = await ac.post("/api/v1/proctoring/analyze-frame", headers=sh, json={
            "attempt_id": "ml-vision-test-attempt",
            "image_base64": b64_frame,
            "sustained_duration_ms": 4000,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["incident_triggered"] == "FACE_MISSING"
        assert data["current_trust_score"] < 100.0

