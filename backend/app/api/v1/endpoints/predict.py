"""
HireLens Machine Learning Inference Endpoints.
Predicts candidate employability, placement probability, salary tier,
and returns explainable AI feature attribution.
"""

from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status

from app.api import deps
from app.models.user import User, UserRole
from app.schemas.ml_prediction import (
    CandidateProfileFeatures,
    EmployabilityPredictionResponse,
)
from app.services.placement_ml_service import PlacementMLService
from app.db.repository import repo

router = APIRouter()


@router.post(
    "/employability",
    response_model=EmployabilityPredictionResponse,
    summary="Predict candidate employability, placement probability, and salary tier",
)
def predict_candidate_employability(
    features: Optional[CandidateProfileFeatures] = None,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Computes candidate employability probability and readiness tier using
    the regularized machine learning placement model.

    If features are not supplied and current user is a STUDENT, automatically
    aggregates the student's actual profile, adaptive assessment IRT theta,
    and proctoring integrity trust score.
    """
    if features is None:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate features must be provided for recruiter or admin requests.",
            )

        # Aggregate student profile data
        profile = repo.get_profile(current_user.id)
        cgpa = profile.cgpa if profile else 7.5
        projects_count = len(profile.projects) if profile and hasattr(profile, "projects") and profile.projects else 2
        internship_months = len(profile.experience) * 3 if profile and hasattr(profile, "experience") and profile.experience else 0

        # Query latest assessment attempt for IRT theta & proctoring trust score
        student_attempts = [
            att for att in repo.attempts.values()
            if att.student_id == current_user.id and att.status == "COMPLETED"
        ]

        if student_attempts:
            latest_attempt = student_attempts[-1]
            adaptive_theta = latest_attempt.theta_estimate or 0.0
            technical_score = latest_attempt.score or 70.0
            coding_score = latest_attempt.score or 65.0

            # Proctoring trust score
            integrity_report = repo.get_integrity_report(latest_attempt.id)
            trust_score = integrity_report.trust_score if integrity_report else 100.0
        else:
            adaptive_theta = 0.0
            technical_score = 70.0
            coding_score = 65.0
            trust_score = 100.0

        features = CandidateProfileFeatures(
            cgpa=cgpa,
            backlogs_active=0,
            history_of_arrears=0,
            aptitude_score=75.0,
            technical_score=technical_score,
            coding_score=coding_score,
            adaptive_irt_theta=adaptive_theta,
            proctoring_trust_score=trust_score,
            projects_count=projects_count,
            internship_months=internship_months,
            certifications_count=1,
            core_skill_match_ratio=0.80,
            soft_skills_score=75.0,
        )

    try:
        return PlacementMLService.predict(features)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}",
        )


@router.get(
    "/model-info",
    summary="Get ML model metadata, regularization config, and test metrics",
)
def get_model_metadata(
    current_user: User = Depends(deps.get_current_user),
):
    """
    Returns diagnostic metrics of the deployed placement prediction model:
    architecture, test accuracy, ROC-AUC, generalization gap, and feature importances.
    """
    try:
        artifact = PlacementMLService.get_artifact()
        return {
            "model_version": artifact.get("model_version", "1.0.0"),
            "architecture": artifact.get("base_model_name"),
            "metrics": artifact.get("metrics"),
            "feature_names": artifact.get("feature_names"),
            "feature_importances": artifact.get("feature_importances"),
            "trained_at": artifact.get("trained_at"),
            "status": "OPERATIONAL",
        }
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
