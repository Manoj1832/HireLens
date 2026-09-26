from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from app.models.drive import RequirementType
from app.models.resume import SkillEvidence

class SkillMatchDetail(BaseModel):
    skill_name: str
    canonical_name: str
    requirement_type: RequirementType
    weight: int = Field(ge=1, le=10, default=5)
    is_matched: bool = False
    evidence_found: bool = False
    evidence_snippet: Optional[str] = None
    evidence_section: Optional[str] = None
    confidence: float = 0.0

class MatchComponentScores(BaseModel):
    required_skill_score: float = Field(ge=0.0, le=100.0, description="Weighted required skills match percentage")
    preferred_skill_score: float = Field(ge=0.0, le=100.0, description="Weighted preferred skills match percentage")
    semantic_score: float = Field(ge=0.0, le=100.0, description="Cosine similarity between job and resume embeddings (0-100)")
    evidence_score: float = Field(ge=0.0, le=100.0, description="Credibility of evidence (projects/experience vs keyword lists)")
    assessment_score: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Objective test score (Phase 6)")
    overall_score: float = Field(ge=0.0, le=100.0, description="Composite weighted match score (0-100)")

class MatchEvaluationResult(BaseModel):
    application_id: Optional[str] = None
    drive_id: str
    student_id: str
    scores: MatchComponentScores
    score_version: str = "v1.0"
    weights_used: Dict[str, float] = Field(
        default_factory=lambda: {
            "required": 0.40,
            "semantic": 0.25,
            "evidence": 0.20,
            "preferred": 0.15,
        }
    )
    matched_required_skills: List[SkillMatchDetail] = Field(default_factory=list)
    missing_required_skills: List[SkillMatchDetail] = Field(default_factory=list)
    matched_preferred_skills: List[SkillMatchDetail] = Field(default_factory=list)
    missing_preferred_skills: List[SkillMatchDetail] = Field(default_factory=list)
    semantic_summary: str = ""
    evidence_summary: str = ""
    recommendation: str = "RECOMMENDED"  # STRONG_FIT, GOOD_FIT, PARTIAL_FIT, LOW_FIT
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
