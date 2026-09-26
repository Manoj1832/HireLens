"""
Pydantic Schemas for HireLens Machine Learning Analytics & Cohort Forecasting.
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class ModelMetricDetail(BaseModel):
    train_r2: float
    test_r2: float
    cv_r2_mean: float
    test_mae_lpa: float
    test_rmse_lpa: float
    generalization_gap: float

class ModelComparisonSummary(BaseModel):
    best_model: str
    target: str
    sample_count: int
    models: Dict[str, ModelMetricDetail]
    feature_importances: Dict[str, float]

class SkillElasticityItem(BaseModel):
    feature_key: str
    feature_label: str
    ctc_impact_lpa: float
    unit_description: str
    recommendation_tier: str  # "HIGH_LEVERAGE", "MODERATE_LEVERAGE", "BASELINE"

class CohortDistributionTier(BaseModel):
    tier_name: str  # "SUPER_DREAM", "DREAM", "ENHANCED", "FOUNDATIONAL"
    ctc_range: str
    student_count: int
    percentage: float
    accent_color: str

class StudentForecastItem(BaseModel):
    student_id: str
    full_name: str
    department: str
    verified_cgpa: float
    expected_ctc_lpa: float
    tier: str
    placement_opt_in: bool

class CohortForecastSummary(BaseModel):
    total_evaluated: int
    opted_in_count: int
    opted_out_count: int
    mean_expected_ctc_lpa: float
    median_expected_ctc_lpa: float
    min_expected_ctc_lpa: float
    max_expected_ctc_lpa: float
    tier_distribution: List[CohortDistributionTier]
    top_driver_features: List[Dict[str, Any]]
    model_r2_score: float
    generalization_gap: float
    students: List[StudentForecastItem] = []

class CustomCohortSimulateRequest(BaseModel):
    departments: Optional[List[str]] = None
    min_cgpa: Optional[float] = None
    opt_in_only: bool = True
    coding_score_boost: float = Field(default=0.0, ge=0.0, le=30.0, description="Hypothetical boost in coding scores from training")
    internship_boost_months: int = Field(default=0, ge=0, le=12, description="Hypothetical extra internship months")
    projects_boost: int = Field(default=0, ge=0, le=5, description="Hypothetical extra verified capstone projects")
