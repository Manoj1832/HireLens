import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.models.user import UserRole
from app.services.hybrid_mcq_service import hybrid_mcq_service
from app.schemas.mcq_generator import MCQDifficultyLevel, GeneratedMCQItem, GenerateMCQRequest
from app.db.repository import repo

client = TestClient(app)


def test_hybrid_mcq_service_offline_catalog():
    """Verify hybrid MCQ service generates calibrated MCQs across difficulty levels."""
    for diff in [MCQDifficultyLevel.EASY, MCQDifficultyLevel.MEDIUM, MCQDifficultyLevel.HARD, MCQDifficultyLevel.BALANCED]:
        res = hybrid_mcq_service._filter_item_bank(
            skills=["Python", "PostgreSQL"],
            difficulty=diff,
            count=6
        )
        assert len(res) >= 3
        for item in res:
            assert len(item.options) == 4
            assert item.correct_answer in item.options
            assert item.explanation != ""
            assert item.skill != ""


def test_generate_mcqs_api():
    """Test POST /api/v1/assessments/generate-mcqs endpoint."""
    token = create_access_token(subject="recruiter@microsoft.com", role=UserRole.RECRUITER.value)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "skills": ["Python", "FastAPI"],
        "difficulty": "MEDIUM",
        "count": 5,
        "job_title": "Backend Software Engineer"
    }

    resp = client.post("/api/v1/assessments/generate-mcqs", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "questions" in data
    assert len(data["questions"]) >= 3
    assert data["generation_source"] in ["HYBRID_LLM_GROQ", "HYBRID_ML_ITEM_BANK"]
    assert "difficulty_level" in data


def test_publish_with_assessment_auto():
    """Test recruiter publishing drive with AUTO generated assessment."""
    token = create_access_token(subject="recruiter@microsoft.com", role=UserRole.RECRUITER.value)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a draft drive
    drive_payload = {
        "company_name": "Stripe",
        "job_title": "Core Infrastructure Engineer",
        "description": "High scale payment backend systems",
        "location": "Bengaluru",
        "employment_type": "Full-Time",
        "ctc_range": "24 - 32 LPA",
        "skills": [
            {"name": "Python", "canonical_name": "Python", "requirement_type": "REQUIRED", "weight": 9},
            {"name": "PostgreSQL", "canonical_name": "PostgreSQL", "requirement_type": "REQUIRED", "weight": 8}
        ],
        "eligibility": {
            "allowed_departments": ["Computer Science & Engineering"],
            "min_cgpa": 7.0,
            "eligible_graduation_years": [2025, 2026],
            "max_active_backlogs": 0
        },
        "publish_now": False
    }
    create_resp = client.post("/api/v1/drives", json=drive_payload, headers=headers)
    assert create_resp.status_code == 201
    drive_id = create_resp.json()["id"]

    # 2. Publish with AUTO assessment (HARD level)
    pub_payload = {
        "mode": "AUTO",
        "difficulty": "HARD",
        "question_count": 5,
        "duration_seconds": 600,
        "passing_score": 70.0,
        "adaptive_mode": True
    }
    pub_resp = client.post(f"/api/v1/assessments/drive/{drive_id}/publish-with-assessment", json=pub_payload, headers=headers)
    assert pub_resp.status_code == 200
    pub_data = pub_resp.json()
    assert pub_data["status"] == "PUBLISHED"
    assert pub_data["assessment_id"] is not None
    assert pub_data["question_count"] >= 3

    # Check drive in repo
    drive = repo.get_drive(drive_id)
    assert drive.status.value == "PUBLISHED"


def test_publish_with_assessment_custom():
    """Test recruiter publishing drive with CUSTOM recruiter-authored questions."""
    token = create_access_token(subject="recruiter@microsoft.com", role=UserRole.RECRUITER.value)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a draft drive
    drive_payload = {
        "company_name": "Databricks",
        "job_title": "Data Platform Engineer",
        "description": "Distributed data engines",
        "location": "Bengaluru",
        "employment_type": "Full-Time",
        "ctc_range": "30 - 45 LPA",
        "skills": [
            {"name": "Python", "canonical_name": "Python", "requirement_type": "REQUIRED", "weight": 9}
        ],
        "eligibility": {
            "allowed_departments": ["Computer Science & Engineering"],
            "min_cgpa": 8.0,
            "eligible_graduation_years": [2025],
            "max_active_backlogs": 0
        },
        "publish_now": False
    }
    create_resp = client.post("/api/v1/drives", json=drive_payload, headers=headers)
    assert create_resp.status_code == 201
    drive_id = create_resp.json()["id"]

    # 2. Publish with CUSTOM questions
    custom_qs = [
        {
            "question_text": "What is the primary memory difference between Python generators and lists?",
            "options": [
                "Generators evaluate lazily yielding one item at a time in memory",
                "Lists always use less memory than generators",
                "Generators are stored directly on the GPU memory",
                "There is no difference in memory consumption"
            ],
            "correct_answer": "Generators evaluate lazily yielding one item at a time in memory",
            "explanation": "Generators produce items on demand using yield rather than allocating the entire sequence upfront.",
            "difficulty": 6,
            "skill": "Python",
            "topic": "Memory & Iterators",
            "level": "MEDIUM"
        }
    ]

    pub_payload = {
        "mode": "CUSTOM",
        "custom_questions": custom_qs,
        "duration_seconds": 900,
        "passing_score": 60.0,
        "adaptive_mode": False
    }
    pub_resp = client.post(f"/api/v1/assessments/drive/{drive_id}/publish-with-assessment", json=pub_payload, headers=headers)
    assert pub_resp.status_code == 200
    pub_data = pub_resp.json()
    assert pub_data["status"] == "PUBLISHED"
    assert pub_data["question_count"] == 1


def test_clean_database_endpoint():
    """Verify admin endpoint cleanly purges and reseeds DB using Strong OOP."""
    admin_token = create_access_token(subject="placements@psgtech.ac.in", role=UserRole.COLLEGE_ADMIN.value)
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.post("/api/v1/admin/clean-database?reseed=true", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["reseeded"] is True
