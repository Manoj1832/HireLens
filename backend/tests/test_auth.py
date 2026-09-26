import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.user import UserRole

@pytest.mark.asyncio
async def test_domain_validation_for_unregistered_student():
    """Students not in directory are rejected even if email domain looks right."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/request-otp", json={
            "email": "unregistered999@student.psgtech.ac.in"
        })
    assert response.status_code == 403
    assert "not registered in the College Student Directory" in response.json()["detail"]

@pytest.mark.asyncio
async def test_domain_validation_for_non_institutional_email():
    """Random external emails cannot log in without being provisioned."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/request-otp", json={
            "email": "random_user@gmail.com"
        })
    assert response.status_code == 403
    assert "Unregistered account" in response.json()["detail"]

@pytest.mark.asyncio
async def test_valid_student_otp_flow():
    """Registered student receives OTP and can verify to get token."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Request OTP
        req_res = await ac.post("/api/v1/auth/request-otp", json={
            "email": "21cs101@student.psgtech.ac.in"
        })
        assert req_res.status_code == 200
        data = req_res.json()
        assert data["success"] is True
        assert data["is_institutional_student"] is True
        otp = data["dev_otp"]
        assert otp is not None

        # 2. Verify OTP
        verify_res = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "21cs101@student.psgtech.ac.in",
            "otp": otp
        })
        assert verify_res.status_code == 200
        token_data = verify_res.json()
        assert "access_token" in token_data
        assert token_data["user"]["role"] == "STUDENT"
        assert token_data["user"]["register_number"] == "21CS101"

@pytest.mark.asyncio
async def test_role_based_access_control_admin_forbidden_for_student():
    """Student cannot access /admin endpoints (HTTP 403 Forbidden)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Dev login as student
        login_res = await ac.post("/api/v1/auth/dev-login", json={"role": "STUDENT"})
        token = login_res.json()["access_token"]

        # Attempt to access admin student directory
        admin_res = await ac.get(
            "/api/v1/admin/student-directory",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert admin_res.status_code == 403
        assert "Access forbidden" in admin_res.json()["detail"]

@pytest.mark.asyncio
async def test_admin_can_access_and_manage_directory():
    """College Admin can inspect directory and add student records."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Dev login as admin
        login_res = await ac.post("/api/v1/auth/dev-login", json={"role": "COLLEGE_ADMIN"})
        token = login_res.json()["access_token"]

        # Read directory
        admin_res = await ac.get(
            "/api/v1/admin/student-directory",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert admin_res.status_code == 200
        students = admin_res.json()
        assert len(students) >= 4

        # Add new student
        new_student = {
            "register_number": "21CS999",
            "name": "Test Student Automated",
            "institutional_email": "21cs999@student.psgtech.ac.in",
            "department": "Computer Science & Engineering",
            "batch": "2021-2025",
            "graduation_year": 2025,
            "cgpa": 9.4
        }
        add_res = await ac.post(
            "/api/v1/admin/student-directory",
            json=new_student,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert add_res.status_code == 201
        assert add_res.json()["register_number"] == "21CS999"

@pytest.mark.asyncio
async def test_smart_identification_endpoint():
    """Identifies role and method cleanly: student -> OTP, placement -> OTP, corporate -> Passkey."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Student
        res_student = await ac.post("/api/v1/auth/identify", json={"email": "23z342@psgtech.ac.in"})
        assert res_student.status_code == 200
        assert res_student.json()["detected_role"] == "STUDENT"
        assert res_student.json()["auth_method"] == "otp"
        assert res_student.json()["portal_target"] == "/student"

        # Placement Admin
        res_admin = await ac.post("/api/v1/auth/identify", json={"email": "placements@psgtech.ac.in"})
        assert res_admin.status_code == 200
        assert res_admin.json()["detected_role"] == "COLLEGE_ADMIN"
        assert res_admin.json()["auth_method"] == "otp"
        assert res_admin.json()["portal_target"] == "/admin"

        # Corporate Recruiter
        res_recruiter = await ac.post("/api/v1/auth/identify", json={"email": "hr@google.com"})
        assert res_recruiter.status_code == 200
        assert res_recruiter.json()["detected_role"] == "RECRUITER"
        assert res_recruiter.json()["auth_method"] == "passkey"
        assert res_recruiter.json()["portal_target"] == "/recruiter"

@pytest.mark.asyncio
async def test_corporate_passkey_authentication():
    """Corporate recruiter authenticates using passkey 'HireLens'."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Invalid passkey
        fail_res = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "lead@meta.com",
            "passkey": "WrongPassword"
        })
        assert fail_res.status_code == 401

        # Valid passkey HireLens
        ok_res = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "lead@meta.com",
            "passkey": "HireLens"
        })
        assert ok_res.status_code == 200
        data = ok_res.json()
        assert "access_token" in data
        assert data["user"]["role"] == "RECRUITER"
        assert data["user"]["company_name"] == "Meta"

@pytest.mark.asyncio
async def test_student_23z342_login():
    """Student 23z342@psgtech.ac.in can request OTP and verify into student portal."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        req_res = await ac.post("/api/v1/auth/request-otp", json={
            "email": "23z342@psgtech.ac.in"
        })
        assert req_res.status_code == 200
        dev_otp = req_res.json()["dev_otp"]

        verify_res = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": dev_otp
        })
        assert verify_res.status_code == 200
        assert verify_res.json()["user"]["role"] == "STUDENT"
