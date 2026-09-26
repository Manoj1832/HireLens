import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from app.main import app
from app.db.repository import repo
from app.models.assessment import AssessmentAttempt, AttemptStatus
from app.models.proctoring import ProctoringIncident, IncidentType, IncidentSeverity, IntegrityReport
from app.services.assessment_service import (
    IScoreAdjustmentStrategy,
    ProctoringIntegrityAdjustmentStrategy,
    AssessmentService,
)

@pytest.fixture(autouse=True)
def clean_test_state():
    repo._attempts.clear()
    repo._answers.clear()
    repo._proctoring_incidents.clear()
    repo._integrity_reports.clear()
    repo._save_attempts_to_disk()
    repo._save_answers_to_disk()
    repo._save_proctoring_incidents_to_disk()
    repo._save_integrity_reports_to_disk()
    yield

def test_oop_score_adjustment_strategy():
    """Verify OOP Strategy Pattern for proctoring integrity score adjustments."""
    strategy = ProctoringIntegrityAdjustmentStrategy()
    assert isinstance(strategy, IScoreAdjustmentStrategy)

    now = datetime.now(timezone.utc)
    attempt = AssessmentAttempt(
        assessment_id="asm-test-01",
        student_id="usr-student-23z342",
        status=AttemptStatus.IN_PROGRESS,
        started_at=now,
        deadline_at=now + timedelta(minutes=15),
        trust_score=100.0,
    )
    repo.save_attempt(attempt)

    # 1. No incidents, clean report -> 0 deduction
    final_score, deduction, breakdown = strategy.calculate_adjusted_score(80.0, attempt.id)
    assert deduction == 0.0
    assert final_score == 80.0
    assert len(breakdown) > 0

    # 2. Add high severity cheating incidents (Mobile phone, Multiple faces)
    incidents = [
        ProctoringIncident(
            attempt_id=attempt.id,
            incident_type=IncidentType.OBJECT_DETECTED,
            severity=IncidentSeverity.HIGH,
            description="Unauthorized device detected: mobile phone",
            penalty_points=15.0,
        ),
        ProctoringIncident(
            attempt_id=attempt.id,
            incident_type=IncidentType.MULTIPLE_FACES,
            severity=IncidentSeverity.HIGH,
            description="Multiple faces detected in frame (2 people)",
            penalty_points=10.0,
        ),
        ProctoringIncident(
            attempt_id=attempt.id,
            incident_type=IncidentType.TAB_SWITCH,
            severity=IncidentSeverity.MEDIUM,
            description="Candidate switched application tabs",
            penalty_points=5.0,
        ),
    ]
    report = IntegrityReport(
        attempt_id=attempt.id,
        trust_score=70.0,
        risk_level="HIGH_RISK",
        total_incidents=3,
        total_penalty=30.0,
        incidents=incidents,
    )
    repo.save_integrity_report(report)

    final_score, deduction, breakdown = strategy.calculate_adjusted_score(85.0, attempt.id)
    assert deduction > 0.0
    assert final_score < 85.0
    assert len(breakdown) >= 3
    # Check that itemized breakdown reports malpractices
    assert any("OBJECT_DETECTED" in b or "mobile phone" in b for b in breakdown)
    assert any("MULTIPLE_FACES" in b for b in breakdown)
    assert any("TAB_SWITCH" in b for b in breakdown)

    # 3. Penalty cannot drive score below 0.0
    final_extreme, deduction_extreme, _ = strategy.calculate_adjusted_score(5.0, attempt.id)
    assert final_extreme >= 0.0

@pytest.mark.asyncio
async def test_two_attempt_policy_and_penalty_e2e():
    """Verify 2-attempt lifecycle: Attempt 1 -> Retake -> Attempt 2 -> Max Reached."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login Recruiter & Create Drive + Assessment with max_attempts = 2
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        assert recruiter_login.status_code == 200
        recruiter_token = recruiter_login.json()["access_token"]
        recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

        drive_res = await ac.post("/api/v1/drives", headers=recruiter_headers, json={
            "company_name": "Google DeepMind",
            "job_title": "AI Research Engineer",
            "description": "Multi-agent systems and deep learning role.",
            "location": "Bengaluru",
            "employment_type": "Full-Time",
            "ctc_range": "35 - 50 LPA",
            "skills": [
                {"name": "Python", "canonical_name": "Python", "requirement_type": "REQUIRED", "weight": 9},
                {"name": "Machine Learning", "canonical_name": "Machine Learning", "requirement_type": "REQUIRED", "weight": 9},
            ],
            "eligibility": {
                "allowed_departments": ["Computer Science & Engineering"],
                "min_cgpa": 8.0,
                "eligible_graduation_years": [2027],
                "max_active_backlogs": 0,
            },
            "publish_now": True,
        })
        assert drive_res.status_code == 201
        drive_id = drive_res.json()["id"]

        asm_res = await ac.post("/api/v1/assessments", headers=recruiter_headers, json={
            "drive_id": drive_id,
            "title": "DeepMind Core Systems Exam",
            "description": "Evaluating high-performance systems and neural networks.",
            "skills": ["Python", "Machine Learning"],
            "question_count": 3,
            "duration_seconds": 600,
            "pass_percentage": 50.0,
            "adaptive_mode": False,
            "max_attempts": 2,
        })
        assert asm_res.status_code == 201
        asm_id = asm_res.json()["id"]
        assert asm_res.json()["max_attempts"] == 2

        # Add 3 questions to the assessment
        q1_res = await ac.post(f"/api/v1/assessments/{asm_id}/questions", headers=recruiter_headers, json={
            "skill": "Python",
            "topic": "OOP",
            "question_text": "What design pattern defines a family of algorithms and encapsulates each one?",
            "options": ["Strategy", "Observer", "Factory", "Singleton"],
            "correct_answer": "Strategy",
            "explanation": "The Strategy pattern encapsulates interchangeable algorithms.",
            "difficulty": 5,
        })
        assert q1_res.status_code == 201

        q2_res = await ac.post(f"/api/v1/assessments/{asm_id}/questions", headers=recruiter_headers, json={
            "skill": "Machine Learning",
            "topic": "Metrics",
            "question_text": "What metric balances precision and recall as their harmonic mean?",
            "options": ["F1 Score", "Accuracy", "AUC-ROC", "Log Loss"],
            "correct_answer": "F1 Score",
            "explanation": "The F1 score is the harmonic mean of precision and recall.",
            "difficulty": 5,
        })
        assert q2_res.status_code == 201

        q3_res = await ac.post(f"/api/v1/assessments/{asm_id}/questions", headers=recruiter_headers, json={
            "skill": "Python",
            "topic": "Memory",
            "question_text": "What built-in mechanism in Python handles cyclic garbage collection?",
            "options": ["gc module", "malloc", "free list", "pointer swap"],
            "correct_answer": "gc module",
            "explanation": "The gc module handles cyclic reference detection and reclamation.",
            "difficulty": 5,
        })
        assert q3_res.status_code == 201

        # 2. Login Student (23Z342)
        student_login = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456",
        })
        assert student_login.status_code == 200
        student_token = student_login.json()["access_token"]
        student_headers = {"Authorization": f"Bearer {student_token}"}

        # 3. Start Attempt 1
        start_res1 = await ac.post(f"/api/v1/assessments/{asm_id}/start", headers=student_headers)
        assert start_res1.status_code == 200
        attempt1 = start_res1.json()
        assert attempt1["attempt_number"] == 1
        attempt1_id = attempt1["attempt_id"]

        # Log a malpractice incident for attempt 1 (Simulated Cheating: Phone detected)
        incident_res = await ac.post("/api/v1/proctoring/event", headers=student_headers, json={
            "attempt_id": attempt1_id,
            "event_type": "OBJECT_DETECTED",
            "details": "Simulated Cheating: Unauthorized Mobile Phone detected on camera",
        })
        assert incident_res.status_code == 200

        # Answer question 1 correctly
        curr_q = attempt1["current_question"]
        ans1_res = await ac.post(f"/api/v1/assessments/{asm_id}/answer", headers=student_headers, json={
            "attempt_id": attempt1_id,
            "question_id": curr_q["id"],
            "selected_answer": "Strategy",
            "response_time_ms": 5000,
        })
        assert ans1_res.status_code == 200
        ans1_data = ans1_res.json()
        assert ans1_data["is_finished"] is False

        # Answer question 2 correctly
        q2 = ans1_data["next_question"]
        ans2_res = await ac.post(f"/api/v1/assessments/{asm_id}/answer", headers=student_headers, json={
            "attempt_id": attempt1_id,
            "question_id": q2["id"],
            "selected_answer": "F1 Score",
            "response_time_ms": 6000,
        })
        assert ans2_res.status_code == 200
        ans2_data = ans2_res.json()
        assert ans2_data["is_finished"] is False

        # Answer question 3 correctly (Final question)
        q3 = ans2_data["next_question"]
        ans3_res = await ac.post(f"/api/v1/assessments/{asm_id}/answer", headers=student_headers, json={
            "attempt_id": attempt1_id,
            "question_id": q3["id"],
            "selected_answer": "gc module",
            "response_time_ms": 7000,
        })
        assert ans3_res.status_code == 200
        assert ans3_res.json()["is_finished"] is True

        # Check my-attempt endpoint reflects Attempt 1 status, penalty deduction, and can_retake=True
        my_res1 = await ac.get(f"/api/v1/assessments/{asm_id}/my-attempt", headers=student_headers)
        assert my_res1.status_code == 200
        my1_data = my_res1.json()
        assert my1_data["attempt_number"] == 1
        assert my1_data["max_attempts"] == 2
        assert my1_data["can_retake"] is True
        assert my1_data["status"] == "COMPLETED"
        assert my1_data["raw_score"] == 100.0
        assert my1_data["penalty_deduction"] > 0.0
        assert my1_data["score"] < 100.0  # Cheating penalty reduced score!
        assert len(my1_data["penalty_breakdown"]) > 0

        # 4. Start Attempt 2 (Retake)
        start_res2 = await ac.post(f"/api/v1/assessments/{asm_id}/start", headers=student_headers)
        assert start_res2.status_code == 200
        attempt2 = start_res2.json()
        assert attempt2["attempt_number"] == 2
        attempt2_id = attempt2["attempt_id"]
        assert attempt2_id != attempt1_id

        # Answer all 3 questions cleanly (No proctoring incidents)
        curr_q2 = attempt2["current_question"]
        ans2_1_res = await ac.post(f"/api/v1/assessments/{asm_id}/answer", headers=student_headers, json={
            "attempt_id": attempt2_id,
            "question_id": curr_q2["id"],
            "selected_answer": "Strategy",
            "response_time_ms": 4000,
        })
        assert ans2_1_res.status_code == 200
        q2_2 = ans2_1_res.json()["next_question"]

        ans2_2_res = await ac.post(f"/api/v1/assessments/{asm_id}/answer", headers=student_headers, json={
            "attempt_id": attempt2_id,
            "question_id": q2_2["id"],
            "selected_answer": "F1 Score",
            "response_time_ms": 4500,
        })
        assert ans2_2_res.status_code == 200
        q2_3 = ans2_2_res.json()["next_question"]

        ans2_3_res = await ac.post(f"/api/v1/assessments/{asm_id}/answer", headers=student_headers, json={
            "attempt_id": attempt2_id,
            "question_id": q2_3["id"],
            "selected_answer": "gc module",
            "response_time_ms": 5000,
        })
        assert ans2_3_res.status_code == 200
        assert ans2_3_res.json()["is_finished"] is True

        # Check my-attempt endpoint reflects Attempt 2 and can_retake=False (all 2 attempts exhausted)
        my_res2 = await ac.get(f"/api/v1/assessments/{asm_id}/my-attempt", headers=student_headers)
        assert my_res2.status_code == 200
        my2_data = my_res2.json()
        assert my2_data["attempt_number"] == 2
        assert my2_data["max_attempts"] == 2
        assert my2_data["can_retake"] is False
        assert my2_data["penalty_deduction"] == 0.0
        assert my2_data["score"] == 100.0

        # 5. Attempt 3 must be blocked
        start_res3 = await ac.post(f"/api/v1/assessments/{asm_id}/start", headers=student_headers)
        assert start_res3.status_code == 400
        assert "Maximum attempt limit" in start_res3.json()["detail"]
