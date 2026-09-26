from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.drive import RequirementType, ApplicationStatus

class SkillMatchSchema(BaseModel):
    skill_name: str
    canonical_name: str
    requirement_type: RequirementType
    weight: int
    is_matched: bool
    evidence_found: bool
    evidence_snippet: Optional[str] = None
    evidence_section: Optional[str] = None
    confidence: float

class MatchComponentScoresSchema(BaseModel):
    required_skill_score: float
    preferred_skill_score: float
    semantic_score: float
    evidence_score: float
    assessment_score: Optional[float] = None
    overall_score: float

class MatchDetailResponse(BaseModel):
    application_id: Optional[str] = None
    drive_id: str
    student_id: str
    scores: MatchComponentScoresSchema
    score_version: str
    weights_used: Dict[str, float]
    matched_required_skills: List[SkillMatchSchema]
    missing_required_skills: List[SkillMatchSchema]
    matched_preferred_skills: List[SkillMatchSchema]
    missing_preferred_skills: List[SkillMatchSchema]
    semantic_summary: str
    evidence_summary: str
    recommendation: str
    evaluated_at: datetime

class DriveApplicantRankedItem(BaseModel):
    application_id: str
    drive_id: str
    student_id: str
    student_name: str
    student_email: str
    roll_number: str
    department: str
    verified_cgpa: float
    graduation_year: int
    active_backlogs: int
    application_status: ApplicationStatus
    overall_match_score: float
    required_skill_score: float
    preferred_skill_score: float
    semantic_score: float
    evidence_score: float
    matched_required_count: int
    total_required_count: int
    matched_preferred_count: int
    total_preferred_count: int
    recommendation: str
    score_version: str
    applied_at: datetime

class DriveRankedApplicantsResponse(BaseModel):
    drive_id: str
    job_title: str
    company_name: str
    score_version: str
    total_applicants: int
    applicants: List[DriveApplicantRankedItem]

class StudentSkillGapResponse(BaseModel):
    drive_id: str
    job_title: str
    company_name: str
    overall_match_score: float
    required_skill_score: float
    preferred_skill_score: float
    semantic_score: float
    evidence_score: float
    matched_required_skills: List[str]
    missing_required_skills: List[str]
    matched_preferred_skills: List[str]
    missing_preferred_skills: List[str]
    readiness_level: str  # High, Medium, Needs Preparation
    preparation_tips: List[str]
