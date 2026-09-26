import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.drive import DriveStatus, ApplicationStatus
from tests.test_resume_pipeline import create_sample_resume_pdf

@pytest.mark.asyncio
async def test_recruiter_drive_lifecycle_create_and_publish():
    """Verify recruiter can create a draft drive, update it, and publish it."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Recruiter
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        assert recruiter_login.status_code == 200
        recruiter_token = recruiter_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {recruiter_token}"}

        # 2. Create Drive in DRAFT
        drive_payload = {
            "company_name": "Atlassian",
            "job_title": "Associate SDE - Distributed Systems",
            "description": "Building cloud collaboration tools and enterprise issue tracking systems.",
            "location": "Bengaluru (Hybrid)",
            "employment_type": "Full-Time",
            "ctc_range": "20 - 28 LPA",
            "skills": [
                {"name": "Java", "canonical_name": "Java", "requirement_type": "REQUIRED", "weight": 9},
                {"name": "Spring Boot", "canonical_name": "Spring Boot", "requirement_type": "REQUIRED", "weight": 8},
                {"name": "Docker", "canonical_name": "Docker", "requirement_type": "PREFERRED", "weight": 6},
            ],
            "eligibility": {
                "allowed_departments": ["Computer Science & Engineering", "Information Technology", "CSE", "IT"],
                "min_cgpa": 8.0,
                "eligible_graduation_years": [2025, 2026],
                "max_active_backlogs": 0,
            },
            "publish_now": False,
        }
        create_res = await ac.post("/api/v1/drives", headers=headers, json=drive_payload)
        assert create_res.status_code == 201
        drive_data = create_res.json()
        drive_id = drive_data["id"]
        assert drive_data["status"] == "DRAFT"
        assert len(drive_data["skills"]) == 3

        # 3. Publish Drive
        pub_res = await ac.post(f"/api/v1/drives/{drive_id}/publish", headers=headers)
        assert pub_res.status_code == 200
        assert pub_res.json()["status"] == "PUBLISHED"

@pytest.mark.asyncio
async def test_deterministic_eligibility_evaluation():
    """Verify deterministic eligibility engine passes eligible student and rejects mismatched criteria."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Auth as student Aravind (CSE, CGPA 8.85, batch 2021-2025, grad year 2025)
        login_res = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456",
        })
        assert login_res.status_code == 200
        student_token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Eligible case: Google Cloud seeded drive (requires CSE/IT, min CGPA 8.0)
        elig_res = await ac.get("/api/v1/drives/drv-google-cloud-2025/eligibility", headers=headers)
        assert elig_res.status_code == 200
        elig_data = elig_res.json()
        assert elig_data["is_eligible"] is True
        assert len(elig_data["reasons"]) == 0
        assert elig_data["criteria_breakdown"]["department"] is True
        assert elig_data["criteria_breakdown"]["cgpa"] is True

        # 2. Ineligible case: Recruiter creates drive with strict CGPA (9.5) and Mechanical only
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        rec_headers = {"Authorization": f"Bearer {recruiter_login.json()['access_token']}"}

        strict_drive = await ac.post("/api/v1/drives", headers=rec_headers, json={
            "company_name": "AeroDynamics Corp",
            "job_title": "CFD Research Engineer",
            "description": "Fluid dynamics simulations.",
            "eligibility": {
                "allowed_departments": ["Mechanical Engineering", "Aerospace"],
                "min_cgpa": 9.5,
                "eligible_graduation_years": [2025],
                "max_active_backlogs": 0,
            },
            "publish_now": True,
        })
        strict_id = strict_drive.json()["id"]

        # Evaluate student Aravind against strict drive
        inelig_res = await ac.get(f"/api/v1/drives/{strict_id}/eligibility", headers=headers)
        assert inelig_res.status_code == 200
        inelig_data = inelig_res.json()
        assert inelig_data["is_eligible"] is False
        assert len(inelig_data["reasons"]) >= 2
        assert inelig_data["criteria_breakdown"]["department"] is False
        assert inelig_data["criteria_breakdown"]["cgpa"] is False

@pytest.mark.asyncio
async def test_student_application_flow_and_duplicate_prevention():
    """Verify student can apply with verified resume, and duplicate applications are prevented."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Student
        login_res = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456",
        })
        student_token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {student_token}"}

        # 2. Ensure resume is uploaded
        pdf_bytes = create_sample_resume_pdf()
        files = {"file": ("aravind_resume.pdf", pdf_bytes, "application/pdf")}
        upload_res = await ac.post("/api/v1/resumes/upload", headers=headers, files=files)
        assert upload_res.status_code == 200

        # Clean any prior applications for isolated test run
        from app.db.repository import repo
        repo.delete_applications_for_drive("drv-zoho-sde-2025")

        # 3. Apply to Zoho Corporation drive
        apply_res = await ac.post(
            "/api/v1/drives/drv-zoho-sde-2025/apply",
            headers=headers,
            json={"notes": "Eager to contribute to Zoho cloud applications."},
        )
        assert apply_res.status_code == 201
        app_data = apply_res.json()
        assert app_data["drive_id"] == "drv-zoho-sde-2025"
        assert app_data["status"] == "APPLIED"

        # 4. Duplicate Check: Applying again must fail with 400 Bad Request
        dup_res = await ac.post(
            "/api/v1/drives/drv-zoho-sde-2025/apply",
            headers=headers,
            json={"notes": "Duplicate attempt."},
        )
        assert dup_res.status_code == 400
        assert "already submitted an active application" in dup_res.json()["detail"]

        # 5. Check My Applications
        my_apps = await ac.get("/api/v1/applications/my", headers=headers)
        assert my_apps.status_code == 200
        my_apps_data = my_apps.json()
        assert any(a["drive_id"] == "drv-zoho-sde-2025" for a in my_apps_data)

@pytest.mark.asyncio
async def test_recruiter_applicant_review_and_status_update():
    """Verify recruiter can list applicants for their drive and advance application status."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Recruiter
        recruiter_login = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai",
            "passkey": "HireLens",
        })
        rec_data = recruiter_login.json()
        rec_headers = {"Authorization": f"Bearer {rec_data['access_token']}"}
        recruiter_id = rec_data["user"]["id"]

        from app.db.repository import repo
        zoho = repo.get_drive("drv-zoho-sde-2025")
        if zoho:
            zoho.created_by = recruiter_id
            repo.save_drive(zoho)

        # 2. View Applicants for Zoho Drive
        apps_res = await ac.get("/api/v1/drives/drv-zoho-sde-2025/applications", headers=rec_headers)
        assert apps_res.status_code == 200
        applicants = apps_res.json()
        assert len(applicants) > 0
        aravind_app = next(a for a in applicants if "aravind" in a["student_email"].lower() or "23z342" in a["student_email"].lower())
        assert aravind_app["roll_number"] != ""
        assert aravind_app["status"] == "APPLIED"

        # 3. Update Status to SHORTLISTED
        update_res = await ac.put(
            f"/api/v1/drives/drv-zoho-sde-2025/applications/{aravind_app['id']}/status",
            headers=rec_headers,
            json={"status": "SHORTLISTED", "notes": "Strong distributed systems and Python skills."},
        )
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "SHORTLISTED"
