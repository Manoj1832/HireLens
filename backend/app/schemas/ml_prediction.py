"""
HireLens Machine Learning Prediction Schemas.
Request and Response models for the Candidate Employability & Placement Prediction Engine.
"""

from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class CandidateProfileFeatures(BaseModel):
    """Input features for candidate employability ML prediction."""
    cgpa: float = Field(..., ge=0.0, le=10.0, description="Cumulative Grade Point Average (0-10)")
    backlogs_active: int = Field(default=0, ge=0, description="Current active backlogs")
    history_of_arrears: int = Field(default=0, ge=0, description="Total historical backlogs/arrears")
    aptitude_score: float = Field(default=70.0, ge=0.0, le=100.0, description="Aptitude screening score")
    technical_score: float = Field(default=70.0, ge=0.0, le=100.0, description="Technical MCQs score")
    coding_score: float = Field(default=65.0, ge=0.0, le=100.0, description="Hands-on coding score")
    adaptive_irt_theta: float = Field(default=0.0, ge=-4.0, le=4.0, description="Phase 7 IRT ability estimate (theta)")
    proctoring_trust_score: float = Field(default=100.0, ge=0.0, le=100.0, description="Phase 8 proctoring trust score")
    projects_count: int = Field(default=2, ge=0, description="Number of completed academic/portfolio projects")
    internship_months: int = Field(default=0, ge=0, description="Months of industry internship experience")
    certifications_count: int = Field(default=1, ge=0, description="Verified professional certifications")
    core_skill_match_ratio: float = Field(default=0.75, ge=0.0, le=1.0, description="Core technical skill match ratio (0-1)")
    soft_skills_score: float = Field(default=75.0, ge=0.0, le=100.0, description="Communication & behavioral score")


class FeatureAttribution(BaseModel):
    """Explainable AI feature impact breakdown."""
    feature_name: str
    impact: str  # "POSITIVE", "NEGATIVE", "NEUTRAL"
    description: str


class EmployabilityPredictionResponse(BaseModel):
    """Predictive inference response from the regularized ML placement model."""
    placement_probability: float = Field(..., description="Calibrated placement likelihood (0.0 - 1.0)")
    employability_score: float = Field(..., description="Standardized employability index (0 - 100)")
    employability_tier: str = Field(..., description="Classification: TIER_1_PRODUCT, TIER_2_CORE, TIER_3_SERVICES, NEEDS_INTERVENTION")
    recommended_track: str
    estimated_ctc_range: str
    key_strengths: List[str]
    growth_areas: List[str]
    feature_attributions: List[FeatureAttribution]
    model_metadata: Dict
