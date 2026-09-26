import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.drive import Drive, RequirementType, DriveSkill, DriveEligibility
from app.models.resume import ResumeAnalysis, SkillEvidence
from app.services.matching_service import MatchingEngine, SCORE_VERSION
from tests.test_resume_pipeline import create_sample_resume_pdf
from app.db.repository import repo

def create_mock_resume_for_matching(user_id: str, skills: list, evidence: list = None) -> ResumeAnalysis:
    """Helper to construct a mock ResumeAnalysis with 384-d embedding."""
    from app.services.embedding_service import generate_embedding, build_resume_embedding_text
    
    text = f"Experienced software engineer proficient in {', '.join(skills)}. Built scalable web services."
    emb_text = build_resume_embedding_text(text, skills, ["Skills", "Projects", "Experience"])
    embedding = generate_embedding(emb_text)
    
    ev_items = []
    if evidence:
        for idx, (s_name, c_name, sec, snip) in enumerate(evidence):
            ev_items.append(
                SkillEvidence(
                    id=f"ev-{idx}",
                    skill_name=s_name,
                    canonical_name=c_name,
                    category="Technical",
                    section=sec,
                    snippet=snip,
                    page_number=1,
                    source_type="project_bullet",
                    confidence=0.92,
                )
            )

    return ResumeAnalysis(
        user_id=user_id,
        filename="test_resume.pdf",
        file_size=12000,
        sha256="mocksha256hash1234567890",
        storage_path="/tmp/test_resume.pdf",
        page_count=1,
        word_count=250,
        raw_text=text,
        normalized_text=text,
        extraction_method="NATIVE",
        canonical_skills=skills,
        evidence_items=ev_items,
        embedding_vector=embedding,
        embedding_dim=384,
        embedding_model="all-MiniLM-L6-v2",
    )

def test_exact_weighted_skill_matching():
    """Verify deterministic required vs preferred skill weights formula."""
    drive = Drive(
        id="drv-test-weights",
        created_by="usr-recruiter-1",
        company_name="Cloud Corp",
        job_title="Backend Engineer",
        description="Python and FastAPI services.",
        location="Remote",
        employment_type="Full-Time",
        ctc_range="15-20 LPA",
        skills=[
            DriveSkill(name="Python", canonical_name="Python", requirement_type=RequirementType.REQUIRED, weight=9),
            DriveSkill(name="FastAPI", canonical_name="FastAPI", requirement_type=RequirementType.REQUIRED, weight=6),
            DriveSkill(name="Docker", canonical_name="Docker", requirement_type=RequirementType.PREFERRED, weight=5),
        ],
        eligibility=DriveEligibility(allowed_departments=["CSE"], min_cgpa=7.0),
    )

    # Candidate 1: Has Python (9), Missing FastAPI (6). Required score should be 9 / (9 + 6) * 100 = 60.0%
    resume_1 = create_mock_resume_for_matching("usr-cand-1", ["Python", "Docker"])
    match_1 = MatchingEngine.evaluate_match(drive, resume_1)
    assert match_1.scores.required_skill_score == 60.0
    assert match_1.scores.preferred_skill_score == 100.0  # Has Docker (5/5)

    # Candidate 2: Has both Python (9) and FastAPI (6). Required score = 100.0%
    resume_2 = create_mock_resume_for_matching("usr-cand-2", ["Python", "FastAPI"])
    match_2 = MatchingEngine.evaluate_match(drive, resume_2)
    assert match_2.scores.required_skill_score == 100.0
    assert match_2.scores.preferred_skill_score == 0.0  # Missing Docker (0/5)

def test_evidence_strength_scoring():
    """Verify evidence found in projects/experience scores higher than keyword mentions."""
    drive = Drive(
        id="drv-test-ev",
        created_by="usr-recruiter-1",
        company_name="Cloud Corp",
        job_title="Backend Engineer",
        description="Python services.",
        location="Remote",
        employment_type="Full-Time",
        ctc_range="15-20 LPA",
        skills=[DriveSkill(name="Python", canonical_name="Python", requirement_type=RequirementType.REQUIRED, weight=10)],
        eligibility=DriveEligibility(allowed_departments=["CSE"], min_cgpa=7.0),
    )

    # Cand A: Python verified in Projects section
    resume_proj = create_mock_resume_for_matching(
        "usr-cand-proj",
        ["Python"],
        evidence=[("Python", "Python", "Projects", "Developed asynchronous microservices using Python and asyncio.")],
    )
    match_proj = MatchingEngine.evaluate_match(drive, resume_proj)

    # Cand B: Python only in Skills summary
    resume_skills = create_mock_resume_for_matching(
        "usr-cand-skills",
        ["Python"],
        evidence=[("Python", "Python", "Skills", "Languages: Python, C++")],
    )
    match_skills = MatchingEngine.evaluate_match(drive, resume_skills)

    assert match_proj.scores.evidence_score > match_skills.scores.evidence_score
    assert "project" in match_proj.evidence_summary.lower()

def test_explainable_match_breakdown_and_versioning():
    """Verify explainability breakdown, recommendations, and v1.0 versioning."""
    drive = repo.get_drive("drv-google-cloud-2025")
    assert drive is not None

    resume = create_mock_resume_for_matching(
        "usr-cand-full",
        ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis"],
        evidence=[
            ("Python", "Python", "Projects", "Built high-throughput API with Python and FastAPI."),
            ("FastAPI", "FastAPI", "Projects", "Designed REST routes with FastAPI."),
            ("PostgreSQL", "PostgreSQL", "Experience", "Optimized PostgreSQL indexes."),
        ],
    )
    res = MatchingEngine.evaluate_match(drive, resume)
    assert res.score_version == SCORE_VERSION
    assert res.score_version == "v1.0"
    assert res.scores.overall_score >= 75.0
    assert res.recommendation in ["STRONG_FIT", "GOOD_FIT"]
    assert len(res.matched_required_skills) >= 3
    assert any(m.skill_name == "Python" for m in res.matched_required_skills)
    assert res.semantic_summary != ""

@pytest.mark.asyncio
async def test_recruiter_ranked_applicants_api():
    """Verify recruiter endpoint returns applicants sorted by match score descending."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Recruiter
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        assert recruiter_login.status_code == 200
        rec_data = recruiter_login.json()
        rec_token = rec_data["access_token"]
        rec_headers = {"Authorization": f"Bearer {rec_token}"}
        rec_id = rec_data["user"]["id"]

        # Ensure drive belongs to recruiter
        zoho = repo.get_drive("drv-zoho-sde-2025")
        if zoho:
            zoho.created_by = rec_id
            repo.save_drive(zoho)

        # 2. Student uploads resume and applies
        stud_login = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456",
        })
        stud_token = stud_login.json()["access_token"]
        stud_headers = {"Authorization": f"Bearer {stud_token}"}

        # Upload resume
        pdf_bytes = create_sample_resume_pdf()
        files = {"file": ("aravind_phase5.pdf", pdf_bytes, "application/pdf")}
        await ac.post("/api/v1/resumes/upload", headers=stud_headers, files=files)

        # Apply to Zoho drive if not already applied
        repo.delete_applications_for_drive("drv-zoho-sde-2025")
        apply_res = await ac.post(
            "/api/v1/drives/drv-zoho-sde-2025/apply",
            headers=stud_headers,
            json={"notes": "Strong candidate for full stack."},
        )
        assert apply_res.status_code == 201

        # 3. Recruiter fetches ranked applicants
        ranked_res = await ac.get("/api/v1/drives/drv-zoho-sde-2025/ranked-applicants", headers=rec_headers)
        assert ranked_res.status_code == 200
        data = ranked_res.json()
        assert data["drive_id"] == "drv-zoho-sde-2025"
        assert data["total_applicants"] >= 1
        top = data["applicants"][0]
        assert top["overall_match_score"] > 0.0
        assert top["score_version"] == "v1.0"
        assert top["student_name"] != ""

        # 4. Detailed match breakdown
        match_detail = await ac.get(
            f"/api/v1/drives/drv-zoho-sde-2025/applications/{top['application_id']}/match",
            headers=rec_headers,
        )
        assert match_detail.status_code == 200
        detail_data = match_detail.json()
        assert "scores" in detail_data
        assert detail_data["score_version"] == "v1.0"
        assert len(detail_data["matched_required_skills"]) > 0

@pytest.mark.asyncio
async def test_student_skill_gap_and_readiness_api():
    """Verify student can view personalized match score, readiness, and preparation tips."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        stud_login = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456",
        })
        stud_token = stud_login.json()["access_token"]
        stud_headers = {"Authorization": f"Bearer {stud_token}"}

        res = await ac.get("/api/v1/drives/drv-google-cloud-2025/my-match", headers=stud_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["drive_id"] == "drv-google-cloud-2025"
        assert data["overall_match_score"] > 0.0
        assert data["readiness_level"] != ""
        assert len(data["preparation_tips"]) > 0
