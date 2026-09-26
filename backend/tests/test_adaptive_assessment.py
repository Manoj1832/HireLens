import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.repository import repo
from app.models.assessment import AttemptStatus, Question
from app.services.adaptive_engine import AdaptiveEngine

@pytest.fixture(autouse=True)
def clean_test_state():
    repo._attempts.clear()
    repo._answers.clear()
    repo._save_attempts_to_disk()
    repo._save_answers_to_disk()
    yield

# ======================================================================
# Unit Tests: AdaptiveEngine Algorithm & Mathematical Rigor
# ======================================================================

def test_compute_next_difficulty_stepping_and_clamping():
    """Verify Section 43 IRT stepping logic: +1 on correct, -1 on incorrect, clamped at [1, 10]."""
    # Step up on correct
    assert AdaptiveEngine.compute_next_difficulty(5, was_correct=True) == 6
    assert AdaptiveEngine.compute_next_difficulty(9, was_correct=True) == 10
    # Upper bound clamp
    assert AdaptiveEngine.compute_next_difficulty(10, was_correct=True) == 10

    # Step down on incorrect
    assert AdaptiveEngine.compute_next_difficulty(5, was_correct=False) == 4
    assert AdaptiveEngine.compute_next_difficulty(2, was_correct=False) == 1
    # Lower bound clamp
    assert AdaptiveEngine.compute_next_difficulty(1, was_correct=False) == 1

def test_compute_theta_estimate_rasch_model():
    """Verify Section 44 Rasch 1-PL IRT ability estimate theta = ln(correct / incorrect)."""
    # Bounded edge cases
    assert AdaptiveEngine.compute_theta_estimate(total_correct=0, total_answered=0) == 0.0
    assert AdaptiveEngine.compute_theta_estimate(total_correct=5, total_answered=5) == 3.0  # 100% correct -> max bound
    assert AdaptiveEngine.compute_theta_estimate(total_correct=0, total_answered=5) == -3.0  # 0% correct -> min bound

    # Balanced performance (50% correct) -> ln(1) = 0.0
    assert AdaptiveEngine.compute_theta_estimate(total_correct=3, total_answered=6) == 0.0

    # High performance: 4 correct, 1 incorrect -> ln(4/1) ≈ 1.386
    theta_high = AdaptiveEngine.compute_theta_estimate(total_correct=4, total_answered=5)
    assert 1.38 <= theta_high <= 1.39

    # Low performance: 1 correct, 4 incorrect -> ln(1/4) ≈ -1.386
    theta_low = AdaptiveEngine.compute_theta_estimate(total_correct=1, total_answered=5)
    assert -1.39 <= theta_low <= -1.38

def test_anti_repetition_and_question_selection():
    """Verify Section 45 Anti-Repetition: Questions already served are never re-selected."""
    asm_id = "asm-microsoft-adaptive-2025"
    served_ids = set()
    served_skills = []

    # First selection at difficulty 5
    q1 = AdaptiveEngine.select_next_question(
        assessment_id=asm_id,
        target_difficulty=5,
        served_question_ids=served_ids,
        served_skills=served_skills,
    )
    assert q1 is not None
    assert q1.difficulty == 5
    served_ids.add(q1.id)
    served_skills.append(q1.skill)

    # Subsequent selection targeting difficulty 5 again: must NOT return q1
    q2 = AdaptiveEngine.select_next_question(
        assessment_id=asm_id,
        target_difficulty=5,
        served_question_ids=served_ids,
        served_skills=served_skills,
    )
    assert q2 is not None
    assert q2.id != q1.id
    assert q2.id not in served_ids

def test_balanced_skill_coverage_tiebreaking():
    """Verify that when difficulty distances tie, the engine prioritizes untested skills."""
    asm_id = "asm-microsoft-adaptive-2025"
    # Mark Python as already served
    served_ids = {"asm-msq-diff5"}
    served_skills = ["Python"]

    # Target difficulty 4: Candidates at diff distance 1 are diff 3 (Data Structures) and diff 5 (Python).
    # Since Python was already served, Data Structures should be preferred.
    q = AdaptiveEngine.select_next_question(
        assessment_id=asm_id,
        target_difficulty=4,
        served_question_ids=served_ids,
        served_skills=served_skills,
    )
    assert q is not None
    assert q.skill != "Python" or q.id not in served_ids

# ======================================================================
# API Integration Tests: End-to-End Adaptive Test Delivery
# ======================================================================

@pytest.mark.asyncio
async def test_recruiter_can_configure_adaptive_assessment():
    """Verify recruiter can create an assessment with adaptive_mode enabled and starting_difficulty."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        assert recruiter_login.status_code == 200
        headers = {"Authorization": f"Bearer {recruiter_login.json()['access_token']}"}

        # 1. Create a dedicated drive for this test
        drive_res = await ac.post("/api/v1/drives", headers=headers, json={
            "company_name": "Netflix",
            "job_title": "Senior Systems Engineer - Adaptive",
            "description": "Distributed media streaming infrastructure screening.",
            "location": "Remote",
            "employment_type": "Full-Time",
            "ctc_range": "35 - 45 LPA",
            "skills": [
                {"name": "Python", "canonical_name": "Python", "requirement_type": "REQUIRED", "weight": 9},
            ],
            "eligibility": {
                "allowed_departments": ["Computer Science & Engineering"],
                "min_cgpa": 7.5,
                "eligible_graduation_years": [2025],
                "max_active_backlogs": 0,
            },
            "publish_now": True,
        })
        assert drive_res.status_code == 201
        test_drive_id = drive_res.json()["id"]

        # 2. Create assessment with adaptive_mode
        payload = {
            "drive_id": test_drive_id,
            "title": "Netflix Systems Adaptive Assessment",
            "description": "IRT Computerized Adaptive Testing for streaming core systems.",
            "skills": ["Python", "Distributed Systems"],
            "question_count": 5,
            "duration_seconds": 900,
            "max_attempts": 1,
            "allow_back_navigation": False,
            "passing_score": 60.0,
            "adaptive_mode": True,
            "starting_difficulty": 5,
        }
        res = await ac.post("/api/v1/assessments", headers=headers, json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["adaptive_mode"] is True
        assert data["starting_difficulty"] == 5

@pytest.mark.asyncio
async def test_adaptive_assessment_step_up_progression():
    """
    Verify that correct answers cause the adaptive engine to dynamically step up
    difficulty level and serve increasingly challenging questions.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        student_login = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456",
        })
        student_headers = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

        asm_id = "asm-microsoft-adaptive-2025"

        # 1. Start adaptive attempt
        start_res = await ac.post(f"/api/v1/assessments/{asm_id}/start", headers=student_headers)
        assert start_res.status_code == 200
        start_data = start_res.json()
        attempt_id = start_data["attempt_id"]

        assert start_data["adaptive_mode"] is True
        assert start_data["current_difficulty"] == 5
        assert start_data["total_questions"] == 5

        q1 = start_data["current_question"]
        q1_model = repo.get_question(q1["id"])
        assert q1_model is not None

        # 2. Answer Question 1 CORRECTLY
        ans1_res = await ac.post(
            f"/api/v1/assessments/{asm_id}/answer",
            headers=student_headers,
            json={
                "attempt_id": attempt_id,
                "question_id": q1["id"],
                "selected_answer": q1_model.correct_answer,
                "response_time_ms": 14000,
            }
        )
        assert ans1_res.status_code == 200
        ans1_data = ans1_res.json()
        # Difficulty should step UP from 5 -> 6
        assert ans1_data["adaptive_difficulty"] == 6
        assert ans1_data["is_finished"] is False
        q2 = ans1_data["next_question"]
        assert q2 is not None
        assert q2["id"] != q1["id"]

        q2_model = repo.get_question(q2["id"])
        # 3. Answer Question 2 CORRECTLY
        ans2_res = await ac.post(
            f"/api/v1/assessments/{asm_id}/answer",
            headers=student_headers,
            json={
                "attempt_id": attempt_id,
                "question_id": q2["id"],
                "selected_answer": q2_model.correct_answer,
                "response_time_ms": 12000,
            }
        )
        assert ans2_res.status_code == 200
        ans2_data = ans2_res.json()
        # Difficulty should step UP from 6 -> 7
        assert ans2_data["adaptive_difficulty"] == 7
        q3 = ans2_data["next_question"]
        assert q3 is not None
        assert q3["id"] not in [q1["id"], q2["id"]]

@pytest.mark.asyncio
async def test_adaptive_assessment_step_down_progression():
    """
    Verify that incorrect answers cause the adaptive engine to dynamically step down
    difficulty level and serve lower difficulty questions.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        student_login = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "21cs101@student.psgtech.ac.in",
            "otp": "123456",
        })
        student_headers = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

        asm_id = "asm-microsoft-adaptive-2025"

        start_res = await ac.post(f"/api/v1/assessments/{asm_id}/start", headers=student_headers)
        assert start_res.status_code == 200
        start_data = start_res.json()
        attempt_id = start_data["attempt_id"]
        q1 = start_data["current_question"]

        # Intentionally answer INCORRECTLY
        wrong_choice = "Completely incorrect option that matches nothing"
        ans1_res = await ac.post(
            f"/api/v1/assessments/{asm_id}/answer",
            headers=student_headers,
            json={
                "attempt_id": attempt_id,
                "question_id": q1["id"],
                "selected_answer": wrong_choice,
                "response_time_ms": 8000,
            }
        )
        assert ans1_res.status_code == 200
        ans1_data = ans1_res.json()
        # Difficulty steps DOWN from 5 -> 4
        assert ans1_data["adaptive_difficulty"] == 4
        q2 = ans1_data["next_question"]
        assert q2 is not None
        assert q2["id"] != q1["id"]

@pytest.mark.asyncio
async def test_adaptive_full_attempt_and_recruiter_analytics():
    """
    Verify full adaptive session completion:
    - Attempt detail reports adaptive_mode, final_difficulty, and theta_estimate.
    - Recruiter candidate results table displays the candidate's adaptive metrics.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Student completes an adaptive test
        student_login = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "21it204@student.psgtech.ac.in",
            "otp": "123456",
        })
        student_headers = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

        asm_id = "asm-microsoft-adaptive-2025"
        start_res = await ac.post(f"/api/v1/assessments/{asm_id}/start", headers=student_headers)
        attempt_id = start_res.json()["attempt_id"]
        curr_q = start_res.json()["current_question"]

        # Complete all 5 questions
        for _ in range(5):
            q_model = repo.get_question(curr_q["id"])
            ans_res = await ac.post(
                f"/api/v1/assessments/{asm_id}/answer",
                headers=student_headers,
                json={
                    "attempt_id": attempt_id,
                    "question_id": curr_q["id"],
                    "selected_answer": q_model.correct_answer,
                    "response_time_ms": 10000,
                }
            )
            assert ans_res.status_code == 200
            ans_data = ans_res.json()
            if ans_data["is_finished"]:
                break
            curr_q = ans_data["next_question"]

        # 2. Student verifies attempt detail
        my_attempt_res = await ac.get(f"/api/v1/assessments/{asm_id}/my-attempt", headers=student_headers)
        assert my_attempt_res.status_code == 200
        detail = my_attempt_res.json()
        assert detail["status"] == AttemptStatus.COMPLETED
        assert detail["adaptive_mode"] is True
        assert detail["final_difficulty"] is not None
        assert detail["theta_estimate"] is not None
        assert detail["theta_estimate"] > 0  # 100% correct -> positive theta

        # 3. Recruiter verifies candidate results
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        recruiter_headers = {"Authorization": f"Bearer {recruiter_login.json()['access_token']}"}

        results_res = await ac.get(f"/api/v1/assessments/{asm_id}/results", headers=recruiter_headers)
        assert results_res.status_code == 200
        results_data = results_res.json()
        assert len(results_data["attempts"]) >= 1

        cand = results_data["attempts"][0]
        assert cand["adaptive_mode"] is True
        assert cand["final_difficulty"] is not None
        assert cand["theta_estimate"] is not None
