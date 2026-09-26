"""
HireLens Institutional Analytics & Placement Intelligence Endpoints.
Serves model benchmark diagnostics, skill ROI elasticity metrics,
and cohort CTC forecasting.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.api import deps
from app.models.user import User
from app.schemas.analytics import (
    ModelComparisonSummary,
    SkillElasticityItem,
    CohortForecastSummary,
    CustomCohortSimulateRequest,
)
from app.services.analytics_ml_service import AnalyticsMLService

router = APIRouter()


@router.get(
    "/diagnostics",
    response_model=ModelComparisonSummary,
    summary="Get ML model architecture, CV benchmarks, and regularization metrics",
)
def get_model_diagnostics(
    current_user: User = Depends(deps.get_current_user),
):
    """
    Returns comparative performance metrics for Ridge, Random Forest, and Gradient Boosting.
    Includes 5-Fold Cross Validation R2, Train/Test R2, Generalization Gap, and Feature Importances.
    """
    try:
        return AnalyticsMLService.get_model_diagnostics()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load analytics diagnostics: {str(e)}",
        )


@router.get(
    "/skill-elasticity",
    response_model=List[SkillElasticityItem],
    summary="Get skill ROI elasticity coefficients (CTC impact per unit)",
)
def get_skill_elasticity(
    current_user: User = Depends(deps.get_current_user),
):
    """
    Returns empirical sensitivity coefficients derived from regularized regression.
    Informs students and administrators which skill investments yield maximum CTC expansion.
    """
    try:
        return AnalyticsMLService.get_skill_elasticity()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute elasticity metrics: {str(e)}",
        )


@router.get(
    "/cohort-forecast",
    response_model=CohortForecastSummary,
    summary="Get live institutional student cohort CTC forecast & tier distribution",
)
def get_cohort_forecast(
    department: Optional[str] = None,
    min_cgpa: Optional[float] = None,
    opt_in_only: bool = True,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Runs the regularized Gradient Boosting model over live registered student profiles.
    Returns expected CTC statistics, compensation tier distribution, and student forecasts.
    """
    try:
        simulation = CustomCohortSimulateRequest(
            departments=[department] if department else None,
            min_cgpa=min_cgpa,
            opt_in_only=opt_in_only,
        )
        return AnalyticsMLService.evaluate_live_cohort(simulation)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error during cohort forecast: {str(e)}",
        )


@router.post(
    "/simulate-cohort",
    response_model=CohortForecastSummary,
    summary="Run what-if scenario simulation on cohort skill enhancements",
)
def simulate_cohort_enhancement(
    simulation: CustomCohortSimulateRequest,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Simulates institutional interventions (e.g. what happens to average CTC and Super Dream
    placement counts if coding scores increase by +15 pts or students complete +1 project).
    """
    try:
        return AnalyticsMLService.evaluate_live_cohort(simulation)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error during simulation: {str(e)}",
        )
