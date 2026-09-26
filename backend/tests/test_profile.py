import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.user import UserRole

@pytest.mark.asyncio
async def test_student_can_fetch_profile():
    """A student can retrieve their own profile with pre-seeded education and skills."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Dev login as student 23Z342
        req_res = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456"
        })
        assert req_res.status_code == 200
        token = req_res.json()["access_token"]

        # 2. Get profile
        prof_res = await ac.get(
            "/api/v1/student/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert prof_res.status_code == 200
        data = prof_res.json()
        assert data["register_number"] == "23Z342"
        assert data["institutional_email"] == "23z342@psgtech.ac.in"
        assert data["department"] == "Computer Science & Engineering"
        assert data["verified_cgpa"] == 8.80
        assert data["completion_percentage"] >= 80
        assert len(data["skills"]) >= 5
        assert len(data["projects"]) >= 1

@pytest.mark.asyncio
async def test_recruiter_blocked_from_student_profile():
    """Recruiters cannot access the student profile editing endpoints."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Dev login as recruiter
        rec_res = await ac.post("/api/v1/auth/dev-login", json={"role": "RECRUITER"})
        token = rec_res.json()["access_token"]

        # Attempt to access student profile
        prof_res = await ac.get(
            "/api/v1/student/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert prof_res.status_code == 403

@pytest.mark.asyncio
async def test_student_can_update_profile_and_recalculate_completion():
    """Students can update personal bio and add skills, dynamically updating completion percentage."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Authenticate
        auth_res = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456"
        })
        token = auth_res.json()["access_token"]

        # Update profile
        update_payload = {
            "headline": "Lead Systems Architect & Backend Developer",
            "summary": "Specialized in event-driven systems and microservice reliability.",
            "phone": "+91 9988776655",
            "portfolio_url": "https://portfolio-updated.dev"
        }
        update_res = await ac.put(
            "/api/v1/student/profile",
            json=update_payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["headline"] == "Lead Systems Architect & Backend Developer"
        assert updated["phone"] == "+91 9988776655"
        # Verify read-only fields remained secure
        assert updated["register_number"] == "23Z342"
        assert updated["verified_cgpa"] == 8.80

@pytest.mark.asyncio
async def test_student_skill_and_project_lifecycle():
    """Students can dynamically add and delete skills and projects."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        auth_res = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456"
        })
        token = auth_res.json()["access_token"]

        # 1. Add skill
        skill_res = await ac.post(
            "/api/v1/student/profile/skills",
            json={"name": "Rust", "category": "Languages", "proficiency": "Intermediate"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert skill_res.status_code == 200
        skills = skill_res.json()["skills"]
        rust_skill = next((s for s in skills if s["name"] == "Rust"), None)
        assert rust_skill is not None
        skill_id = rust_skill["id"]

        # 2. Delete skill
        del_res = await ac.delete(
            f"/api/v1/student/profile/skills/{skill_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert del_res.status_code == 200
        skills_after = del_res.json()["skills"]
        assert not any(s["id"] == skill_id for s in skills_after)

        # 3. Add Project
        proj_res = await ac.post(
            "/api/v1/student/profile/projects",
            json={
                "title": "Automated Code Analysis Bot",
                "description": "Scans pull requests for performance bottlenecks and lint violations.",
                "skills_used": ["Python", "AST Parsing", "GitHub Actions"]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert proj_res.status_code == 200
        projects = proj_res.json()["projects"]
        bot_proj = next((p for p in projects if p["title"] == "Automated Code Analysis Bot"), None)
        assert bot_proj is not None
        proj_id = bot_proj["id"]

        # 4. Delete Project
        del_proj = await ac.delete(
            f"/api/v1/student/profile/projects/{proj_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert del_proj.status_code == 200
        assert not any(p["id"] == proj_id for p in del_proj.json()["projects"])
