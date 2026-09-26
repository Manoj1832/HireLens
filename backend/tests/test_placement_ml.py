"""
Comprehensive Test Suite for HireLens Machine Learning Placement Prediction Engine.
Tests:
- Model artifact serialization (.pkl) integrity and performance metrics
- Overfit / generalization gap bounds (< 5%)
- Inference behavior across high-performing, average, and at-risk candidate profiles
- Bias-variance regularization stability
- API endpoints: /api/v1/predict/employability and /api/v1/predict/model-info
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.placement_ml_service import PlacementMLService
from app.schemas.ml_prediction import CandidateProfileFeatures


class TestModelArtifactMetrics:
    """Verifies that the serialized ML model meets the required accuracy and regularization criteria."""

    def test_artifact_exists_and_loads(self):
        artifact = PlacementMLService.get_artifact()
        assert artifact is not None
        assert "model" in artifact
        assert "scaler" in artifact
        assert len(artifact["feature_names"]) == 13

    def test_accuracy_and_generalization_gap(self):
        artifact = PlacementMLService.get_artifact()
        metrics = artifact["metrics"]

        # High accuracy requirement
        assert metrics["test_accuracy"] >= 0.80, f"Expected >= 80% accuracy, got {metrics['test_accuracy']}"
        assert metrics["test_roc_auc"] >= 0.90, f"Expected >= 0.90 ROC-AUC, got {metrics['test_roc_auc']}"

        # Regularization / Overfitting guard: Generalization gap must be tightly bounded
        assert metrics["generalization_gap"] <= 0.06, (
            f"Overfitting detected! Generalization gap {metrics['generalization_gap']} exceeds 6% limit."
        )

    def test_feature_importances_exist(self):
        artifact = PlacementMLService.get_artifact()
        importances = artifact["feature_importances"]
        assert len(importances) == 13
        # Key academic and technical features should have non-trivial weights
        assert importances["cgpa"] > 0.05
        assert importances["coding_score"] > 0.03


class TestMLInferenceScenarios:
    """Tests realistic predictions across varied candidate profiles."""

    def test_high_performing_candidate_high_probability(self):
        """Top-tier candidate should receive high probability and Tier 1 product classification."""
        features = CandidateProfileFeatures(
            cgpa=9.1,
            backlogs_active=0,
            history_of_arrears=0,
            aptitude_score=92.0,
            technical_score=90.0,
            coding_score=88.0,
            adaptive_irt_theta=1.6,
            proctoring_trust_score=98.0,
            projects_count=4,
            internship_months=6,
            certifications_count=3,
            core_skill_match_ratio=0.95,
            soft_skills_score=88.0,
        )

        res = PlacementMLService.predict(features)

        assert res.placement_probability >= 0.75
        assert res.employability_score >= 75.0
        assert res.employability_tier in ("TIER_1_PRODUCT_READY", "TIER_2_CORE_TECH")
        assert len(res.key_strengths) > 0
        assert any(a.feature_name == "cgpa" and a.impact == "POSITIVE" for a in res.feature_attributions)

    def test_at_risk_candidate_needs_intervention(self):
        """Candidate with multiple active backlogs and poor integrity should be flagged as at-risk."""
        features = CandidateProfileFeatures(
            cgpa=5.8,
            backlogs_active=2,
            history_of_arrears=3,
            aptitude_score=35.0,
            technical_score=40.0,
            coding_score=30.0,
            adaptive_irt_theta=-1.4,
            proctoring_trust_score=45.0,  # High risk proctoring
            projects_count=1,
            internship_months=0,
            certifications_count=0,
            core_skill_match_ratio=0.35,
            soft_skills_score=50.0,
        )

        res = PlacementMLService.predict(features)

        assert res.placement_probability < 0.40
        assert res.employability_tier == "NEEDS_INTERVENTION"
        assert len(res.growth_areas) > 0
        assert any("backlog" in g.lower() for g in res.growth_areas)
        assert any(a.feature_name == "backlogs_active" and a.impact == "NEGATIVE" for a in res.feature_attributions)

    def test_regularization_stability(self):
        """Small noise in non-critical features should not cause wild swings in output probability."""
        base = CandidateProfileFeatures(
            cgpa=7.8,
            backlogs_active=0,
            history_of_arrears=0,
            aptitude_score=75.0,
            technical_score=72.0,
            coding_score=70.0,
            adaptive_irt_theta=0.5,
            proctoring_trust_score=95.0,
            projects_count=2,
            internship_months=2,
            certifications_count=1,
            core_skill_match_ratio=0.80,
            soft_skills_score=75.0,
        )

        perturbed = CandidateProfileFeatures(
            cgpa=7.8,
            backlogs_active=0,
            history_of_arrears=0,
            aptitude_score=76.0,  # +1 point
            technical_score=71.0, # -1 point
            coding_score=70.0,
            adaptive_irt_theta=0.5,
            proctoring_trust_score=95.0,
            projects_count=2,
            internship_months=2,
            certifications_count=1,
            core_skill_match_ratio=0.81, # +0.01
            soft_skills_score=74.0, # -1 point
        )

        res1 = PlacementMLService.predict(base)
        res2 = PlacementMLService.predict(perturbed)

        diff = abs(res1.placement_probability - res2.placement_probability)
        assert diff < 0.05, f"Unstable prediction! Difference was {diff:.4f}"


# ====================================================================
# API Endpoint Integration Tests
# ====================================================================

@pytest.mark.asyncio
async def test_get_model_metadata_endpoint():
    """Verify GET /api/v1/predict/model-info returns diagnostics."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "recruiter@hirelens.ai", "passkey": "HireLens",
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.get("/api/v1/predict/model-info", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "OPERATIONAL"
        assert "architecture" in data
        assert data["metrics"]["test_accuracy"] >= 0.80
        assert data["metrics"]["test_roc_auc"] >= 0.90
        assert len(data["feature_names"]) == 13


@pytest.mark.asyncio
async def test_post_predict_employability_endpoint():
    """Verify POST /api/v1/predict/employability with candidate feature payload."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/passkey-login", json={
            "email": "21cs101@student.psgtech.ac.in", "passkey": "HireLens",
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "cgpa": 8.4,
            "backlogs_active": 0,
            "history_of_arrears": 0,
            "aptitude_score": 80.0,
            "technical_score": 82.0,
            "coding_score": 85.0,
            "adaptive_irt_theta": 1.1,
            "proctoring_trust_score": 96.0,
            "projects_count": 3,
            "internship_months": 3,
            "certifications_count": 2,
            "core_skill_match_ratio": 0.88,
            "soft_skills_score": 80.0,
        }

        res = await ac.post("/api/v1/predict/employability", headers=headers, json=payload)
        assert res.status_code == 200
        data = res.json()
        assert 0.0 <= data["placement_probability"] <= 1.0
        assert 0.0 <= data["employability_score"] <= 100.0
        assert data["employability_tier"] in ("TIER_1_PRODUCT_READY", "TIER_2_CORE_TECH", "TIER_3_SERVICES")
        assert len(data["key_strengths"]) > 0
        assert len(data["feature_attributions"]) > 0
