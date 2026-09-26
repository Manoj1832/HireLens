import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.repository import repo
from app.models.assessment import AttemptStatus

@pytest.fixture(autouse=True)
def clean_test_state():
    repo._attempts.clear()
    repo._answers.clear()
    repo._save_attempts_to_disk()
    repo._save_answers_to_disk()
    yield

@pytest.mark.asyncio
async def test_assessment_creation_and_retrieval():
    """Verify recruiter can configure an assessment and retrieve it by drive ID."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Recruiter
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        assert recruiter_login.status_code == 200
        recruiter_token = recruiter_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {recruiter_token}"}

        # 2. First create a new test drive
        drive_payload = {
            "company_name": "Microsoft",
            "job_title": "Software Engineer II - Azure",
            "description": "Azure cloud services engineering team screening.",
            "location": "Hyderabad",
            "employment_type": "Full-Time",
            "ctc_range": "24 - 32 LPA",
            "skills": [
                {"name": "C#", "canonical_name": "C#", "requirement_type": "REQUIRED", "weight": 8},
                {"name": "Docker", "canonical_name": "Docker", "requirement_type": "REQUIRED", "weight": 7},
            ],
            "eligibility": {
                "allowed_departments": ["Computer Science & Engineering", "Information Technology"],
                "min_cgpa": 7.5,
                "eligible_graduation_years": [2025],
                "max_active_backlogs": 0,
            },
            "publish_now": True,
        }
        create_drive_res = await ac.post("/api/v1/drives", headers=headers, json=drive_payload)
        assert create_drive_res.status_code == 201
        drive_id = create_drive_res.json()["id"]

        # 3. Create Assessment for Drive
        asm_payload = {
            "drive_id": drive_id,
            "title": "Microsoft Azure SDE Technical Assessment",
            "description": "Comprehensive evaluation of cloud fundamentals, async patterns, and container virtualization.",
            "skills": ["C#", "Docker", "Cloud"],
            "question_count": 5,
            "duration_seconds": 600,
            "max_attempts": 1,
            "allow_back_navigation": False,
            "passing_score": 70.0,
        }
        create_asm_res = await ac.post("/api/v1/assessments", headers=headers, json=asm_payload)
        assert create_asm_res.status_code == 201
        asm_data = create_asm_res.json()
        asm_id = asm_data["id"]
        assert asm_data["duration_seconds"] == 600
        assert asm_data["passing_score"] == 70.0

        # 4. Retrieve Assessment by Drive ID
        get_res = await ac.get(f"/api/v1/assessments/drive/{drive_id}", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == asm_id

@pytest.mark.asyncio
async def test_strict_mcq_quality_validation():
    """Verify Section 32 strict validation rules reject substandard questions."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        headers = {"Authorization": f"Bearer {recruiter_login.json()['access_token']}"}

        asm_id = "asm-google-cloud-2025"

        # Case 1: Wrong number of options (3 instead of 4)
        bad_q1 = {
            "skill": "Python",
            "topic": "Generators",
            "question_text": "What keyword turns a Python function into a generator function?",
            "options": ["yield", "return", "await"],
            "correct_answer": "yield",
            "explanation": "The yield keyword pauses execution and yields value.",
            "difficulty": 4,
        }
        res1 = await ac.post(f"/api/v1/assessments/{asm_id}/questions", headers=headers, json=bad_q1)
        assert res1.status_code == 422 or res1.status_code == 400

        # Case 2: Duplicate options
        bad_q2 = {
            "skill": "Python",
            "topic": "Generators",
            "question_text": "What keyword turns a Python function into a generator function?",
            "options": ["yield", "yield", "return", "pass"],
            "correct_answer": "yield",
            "explanation": "The yield keyword produces a generator object.",
            "difficulty": 4,
        }
        res2 = await ac.post(f"/api/v1/assessments/{asm_id}/questions", headers=headers, json=bad_q2)
        assert res2.status_code == 400
        assert "duplicate options" in res2.json()["detail"].lower()

        # Case 3: Correct answer not in options
        bad_q3 = {
            "skill": "Python",
            "topic": "Generators",
            "question_text": "What keyword turns a Python function into a generator function?",
            "options": ["return", "break", "continue", "pass"],
            "correct_answer": "yield",
            "explanation": "Yield turns function into generator.",
            "difficulty": 4,
        }
        res3 = await ac.post(f"/api/v1/assessments/{asm_id}/questions", headers=headers, json=bad_q3)
        assert res3.status_code == 400
        assert "match one of the 4" in res3.json()["detail"].lower()

@pytest.mark.asyncio
async def test_semantic_duplicate_question_detection():
    """Verify Section 33 semantic duplicate detection flags identical question intent."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        headers = {"Authorization": f"Bearer {recruiter_login.json()['access_token']}"}

        asm_id = "asm-google-cloud-2025"

        # Attempt to add a question nearly identical to asm-q-1:
        # "In CPython, why does multithreading fail to achieve linear CPU-bound speedup across multiple physical cores?"
        duplicate_candidate = {
            "skill": "Python",
            "topic": "Concurrency",
            "question_text": "Why does multithreading in CPython not achieve CPU-bound speedup across multiple cores?",
            "options": [
                "Because the Global Interpreter Lock limits execution to one thread at a time.",
                "Because Python processes cannot allocate more than 2GB of memory.",
                "Because thread context switching overhead exceeds processor clock speed.",
                "Because the Linux kernel deprioritizes Python thread groups automatically.",
            ],
            "correct_answer": "Because the Global Interpreter Lock limits execution to one thread at a time.",
            "explanation": "The GIL ensures thread safety by executing only one bytecode instruction at a time.",
            "difficulty": 6,
        }
        res = await ac.post(f"/api/v1/assessments/{asm_id}/questions", headers=headers, json=duplicate_candidate)
        assert res.status_code == 400
        assert "duplicate question rejected" in res.json()["detail"].lower() or "similarity" in res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_student_test_runner_and_question_masking():
    """
    Verify student can start an assessment, receives masked question view (Section 90),
    submits answers, and receives auto-scored results.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as student
        student_login = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456",
        })
        assert student_login.status_code == 200
        student_token = student_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {student_token}"}

        asm_id = "asm-zoho-sde-2025"

        # Clear prior attempts for idempotency across test runs
        repo._attempts = {k: v for k, v in repo._attempts.items() if not (v.student_id == "usr-student-23z342" and v.assessment_id == asm_id)}
        repo._save_attempts_to_disk()

        # 2. Start Assessment Attempt
        start_res = await ac.post(f"/api/v1/assessments/{asm_id}/start", headers=headers)
        assert start_res.status_code == 200
        start_data = start_res.json()
        attempt_id = start_data["attempt_id"]
        assert start_data["total_questions"] == 3
        curr_q = start_data["current_question"]

        # Section 90 Verification: Answers and explanations MUST NOT be leaked to client
        assert "correct_answer" not in curr_q
        assert "explanation" not in curr_q
        assert len(curr_q["options"]) == 4

        # 3. Answer Question 1 (Correct)
        ans1_res = await ac.post(
            f"/api/v1/assessments/{asm_id}/answer",
            headers=headers,
            json={
                "attempt_id": attempt_id,
                "question_id": curr_q["id"],
                "selected_answer": curr_q["options"][0],  # pick first
                "response_time_ms": 12500,
            }
        )
        assert ans1_res.status_code == 200
        ans1_data = ans1_res.json()
        assert ans1_data["answered_count"] == 1
        assert ans1_data["is_finished"] is False
        assert ans1_data["next_question"] is not None

        # 4. Answer Question 2
        q2 = ans1_data["next_question"]
        ans2_res = await ac.post(
            f"/api/v1/assessments/{asm_id}/answer",
            headers=headers,
            json={
                "attempt_id": attempt_id,
                "question_id": q2["id"],
                "selected_answer": q2["options"][0],
                "response_time_ms": 11000,
            }
        )
        assert ans2_res.status_code == 200
        q3 = ans2_res.json()["next_question"]

        # 5. Answer Question 3 (Final Question)
        ans3_res = await ac.post(
            f"/api/v1/assessments/{asm_id}/answer",
            headers=headers,
            json={
                "attempt_id": attempt_id,
                "question_id": q3["id"],
                "selected_answer": q3["options"][0],
                "response_time_ms": 9500,
            }
        )
        assert ans3_res.status_code == 200
        ans3_data = ans3_res.json()
        assert ans3_data["is_finished"] is True
        assert ans3_data["answered_count"] == 3

        # 6. Check student attempt status
        status_res = await ac.get(f"/api/v1/assessments/{asm_id}/my-attempt", headers=headers)
        assert status_res.status_code == 200
        attempt_detail = status_res.json()
        assert attempt_detail["status"] == AttemptStatus.COMPLETED
        assert attempt_detail["total_answered"] == 3
        assert 0.0 <= attempt_detail["score"] <= 100.0

@pytest.mark.asyncio
async def test_server_enforced_navigation_lock():
    """Verify Section 36: Server blocks back-navigation and re-answering when disallowed."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        student_login = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "21cs101@student.psgtech.ac.in",
            "otp": "123456",
        })
        headers = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

        # Clear prior attempts for idempotency
        repo._attempts = {k: v for k, v in repo._attempts.items() if not (v.student_id == "usr-student-21cs101" and v.assessment_id == "asm-google-cloud-2025")}
        repo._save_attempts_to_disk()

        # asm-google-cloud-2025 has allow_back_navigation = False
        start_res = await ac.post("/api/v1/assessments/asm-google-cloud-2025/start", headers=headers)
        assert start_res.status_code == 200
        start_data = start_res.json()
        attempt_id = start_data["attempt_id"]
        q1 = start_data["current_question"]

        # Submit answer for Q1
        ans_res = await ac.post(
            "/api/v1/assessments/asm-google-cloud-2025/answer",
            headers=headers,
            json={
                "attempt_id": attempt_id,
                "question_id": q1["id"],
                "selected_answer": q1["options"][0],
            }
        )
        assert ans_res.status_code == 200

        # Attempt to submit an answer for Q1 AGAIN (violating navigation lock)
        resubmit_res = await ac.post(
            "/api/v1/assessments/asm-google-cloud-2025/answer",
            headers=headers,
            json={
                "attempt_id": attempt_id,
                "question_id": q1["id"],
                "selected_answer": q1["options"][1],
            }
        )
        assert resubmit_res.status_code == 400
        assert "disallowed" in resubmit_res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_server_authoritative_deadline_expiration():
    """Verify Section 35: Server forcibly marks attempt as EXPIRED when submitted after deadline."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        student_login = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "21it204@student.psgtech.ac.in",
            "otp": "123456",
        })
        headers = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

        # Clear prior attempts for idempotency
        repo._attempts = {k: v for k, v in repo._attempts.items() if not (v.student_id == "usr-student-21it204" and v.assessment_id == "asm-google-cloud-2025")}
        repo._save_attempts_to_disk()

        start_res = await ac.post("/api/v1/assessments/asm-google-cloud-2025/start", headers=headers)
        assert start_res.status_code == 200
        attempt_id = start_res.json()["attempt_id"]

        # Artificially shift the attempt deadline into the past to simulate client timeout
        attempt = repo.get_attempt(attempt_id)
        assert attempt is not None
        attempt.deadline_at = datetime.now(timezone.utc) - timedelta(seconds=60)
        repo.save_attempt(attempt)

        # Attempt to answer after deadline
        late_ans = await ac.post(
            "/api/v1/assessments/asm-google-cloud-2025/answer",
            headers=headers,
            json={
                "attempt_id": attempt_id,
                "question_id": attempt.question_order[0],
                "selected_answer": "Any answer",
            }
        )
        assert late_ans.status_code == 200
        assert late_ans.json()["is_finished"] is True

        # Check attempt status transitioned to EXPIRED
        updated_attempt = repo.get_attempt(attempt_id)
        assert updated_attempt.status == AttemptStatus.EXPIRED

@pytest.mark.asyncio
async def test_recruiter_results_analytics():
    """Verify Section 37 & 68: Recruiter can view candidate results and aggregated test metrics."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Student takes assessment first to generate result data
        student_login = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456",
        })
        student_headers = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

        asm_id = "asm-zoho-sde-2025"
        start_res = await ac.post(f"/api/v1/assessments/{asm_id}/start", headers=student_headers)
        attempt_id = start_res.json()["attempt_id"]
        q1 = start_res.json()["current_question"]

        await ac.post(
            f"/api/v1/assessments/{asm_id}/answer",
            headers=student_headers,
            json={
                "attempt_id": attempt_id,
                "question_id": q1["id"],
                "selected_answer": q1["options"][0],
            }
        )

        # 2. Recruiter inspects analytics
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        recruiter_headers = {"Authorization": f"Bearer {recruiter_login.json()['access_token']}"}

        results_res = await ac.get(f"/api/v1/assessments/{asm_id}/results", headers=recruiter_headers)
        assert results_res.status_code == 200
        results_data = results_res.json()

        assert results_data["assessment_id"] == "asm-zoho-sde-2025"
        assert results_data["total_attempts"] >= 1
        assert "average_score" in results_data
        assert "pass_rate" in results_data
        assert len(results_data["attempts"]) >= 1

        first_candidate = results_data["attempts"][0]
        assert first_candidate["student_id"] == "usr-student-23z342"
        assert first_candidate["student_name"] is not None
        assert first_candidate["roll_number"] == "23Z342"
