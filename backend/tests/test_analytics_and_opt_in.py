"""
Tests for Machine Learning Analytics Endpoints and Placement Opt-In / Opt-Out Enforcement.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.repository import repo
from app.services.eligibility_service import EligibilityEngine

@pytest.mark.asyncio
async def test_analytics_diagnostics():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        req_res = await ac.post("/api/v1/auth/request-otp", json={"email": "admin@psgtech.ac.in"})
        assert req_res.status_code == 200
        otp = req_res.json()["dev_otp"]
        verify_res = await ac.post("/api/v1/auth/verify-otp", json={"email": "admin@psgtech.ac.in", "otp": otp})
        token = verify_res.json()["access_token"]

        response = await ac.get(
            "/api/v1/analytics/diagnostics",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["best_model"] == "Regularized_Gradient_Boosting_Regressor"
        assert "Regularized_Gradient_Boosting_Regressor" in data["models"]
        gb = data["models"]["Regularized_Gradient_Boosting_Regressor"]
        assert gb["test_r2"] > 0.95
        assert gb["generalization_gap"] < 0.05
        assert "adaptive_irt_theta" in data["feature_importances"]


@pytest.mark.asyncio
async def test_analytics_skill_elasticity():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        req_res = await ac.post("/api/v1/auth/request-otp", json={"email": "admin@psgtech.ac.in"})
        otp = req_res.json()["dev_otp"]
        verify_res = await ac.post("/api/v1/auth/verify-otp", json={"email": "admin@psgtech.ac.in", "otp": otp})
        token = verify_res.json()["access_token"]

        response = await ac.get(
            "/api/v1/analytics/skill-elasticity",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        items = response.json()
        assert len(items) >= 5
        keys = [item["feature_key"] for item in items]
        assert "coding_score" in keys
        assert "adaptive_irt_theta" in keys
        assert "cgpa" in keys


@pytest.mark.asyncio
async def test_analytics_cohort_forecast():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        req_res = await ac.post("/api/v1/auth/request-otp", json={"email": "recruiter@microsoft.com"})
        otp = req_res.json()["dev_otp"]
        verify_res = await ac.post("/api/v1/auth/verify-otp", json={"email": "recruiter@microsoft.com", "otp": otp})
        token = verify_res.json()["access_token"]

        response = await ac.get(
            "/api/v1/analytics/cohort-forecast",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_evaluated"] > 0
        assert data["mean_expected_ctc_lpa"] > 0
        assert len(data["tier_distribution"]) == 4
        assert len(data["top_driver_features"]) >= 3


@pytest.mark.asyncio
async def test_student_opt_in_opt_out_flow():
    student_email = "21cs101@student.psgtech.ac.in"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        req_res = await ac.post("/api/v1/auth/request-otp", json={"email": student_email})
        otp = req_res.json()["dev_otp"]
        verify_res = await ac.post("/api/v1/auth/verify-otp", json={"email": student_email, "otp": otp})
        token = verify_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Check profile has placement_opt_in = True by default
        res = await ac.get("/api/v1/student/profile", headers=headers)
        assert res.status_code == 200
        prof = res.json()
        assert prof["placement_opt_in"] is True

        # 2. Opt Out with reason
        opt_out_res = await ac.put(
            "/api/v1/student/profile/opt-in-status",
            headers=headers,
            json={
                "placement_opt_in": False,
                "opt_out_reason": "Pursuing Master's at CMU"
            }
        )
        assert opt_out_res.status_code == 200
        updated = opt_out_res.json()
        assert updated["placement_opt_in"] is False
        assert updated["opt_out_reason"] == "Pursuing Master's at CMU"
        assert updated["opt_in_updated_at"] is not None

        # 3. Check EligibilityEngine fails student when opted out
        user = repo.get_user_by_email(student_email)
        profile = repo.get_student_profile(user.id)
        drives = list(repo._drives.values())
        assert len(drives) > 0
        test_drive = drives[0]

        is_eligible, reasons, breakdown = EligibilityEngine.evaluate(test_drive, profile)
        assert is_eligible is False
        assert breakdown["placement_opt_in"] is False
        assert any("Placement Participation Inactive" in r for r in reasons)

        # 4. Opt back in
        opt_in_res = await ac.put(
            "/api/v1/student/profile/opt-in-status",
            headers=headers,
            json={
                "placement_opt_in": True,
                "opt_out_reason": None
            }
        )
        assert opt_in_res.status_code == 200
        re_opted = opt_in_res.json()
        assert re_opted["placement_opt_in"] is True
        assert re_opted["opt_out_reason"] is None
