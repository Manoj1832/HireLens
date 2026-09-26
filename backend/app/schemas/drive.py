"""
Pydantic Schemas for Recruitment Drives, Eligibility, and Applications.
Complies with Sections 27, 28, 29, and 58–60 of the Master Build Specification.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.drive import DriveStatus, RequirementType, ApplicationStatus, DriveSkill, DriveEligibility

class DriveSkillInput(BaseModel):
    name: str
    canonical_name: str
    requirement_type: RequirementType = RequirementType.REQUIRED
    weight: int = Field(default=5, ge=1, le=10)
    minimum_evidence_level: Optional[str] = "CONTEXTUAL"

class DriveEligibilityInput(BaseModel):
    allowed_departments: List[str] = Field(default_factory=list)
    min_cgpa: float = Field(default=0.0, ge=0.0, le=10.0)
    eligible_graduation_years: List[int] = Field(default_factory=list)
    max_active_backlogs: int = Field(default=0, ge=0)

class DriveCreateRequest(BaseModel):
    company_name: str
    job_title: str
    description: str
    location: str = "On-Campus / Hybrid"
    employment_type: str = "Full-Time"
    ctc_range: Optional[str] = None
    application_deadline: Optional[datetime] = None
    assessment_start: Optional[datetime] = None
    assessment_end: Optional[datetime] = None
    skills: List[DriveSkillInput] = Field(default_factory=list)
    eligibility: DriveEligibilityInput = Field(default_factory=DriveEligibilityInput)
    publish_now: bool = False

class DriveUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    ctc_range: Optional[str] = None
    application_deadline: Optional[datetime] = None
    assessment_start: Optional[datetime] = None
    assessment_end: Optional[datetime] = None
    skills: Optional[List[DriveSkillInput]] = None
    eligibility: Optional[DriveEligibilityInput] = None
    status: Optional[DriveStatus] = None

class DriveResponse(BaseModel):
    id: str
    created_by: str
    company_name: str
    job_title: str
    description: str
    location: str
    employment_type: str
    ctc_range: Optional[str] = None
    application_deadline: Optional[datetime] = None
    assessment_start: Optional[datetime] = None
    assessment_end: Optional[datetime] = None
    status: DriveStatus
    skills: List[DriveSkill]
    eligibility: DriveEligibility
    created_at: datetime
    updated_at: datetime
    applicant_count: int = 0
    has_applied: bool = False
    is_eligible: Optional[bool] = None

class EligibilityEvaluationResponse(BaseModel):
    drive_id: str
    student_id: str
    is_eligible: bool
    reasons: List[str] = Field(default_factory=list)
    criteria_breakdown: Dict[str, bool] = Field(default_factory=dict)
    can_apply: bool
    has_active_resume: bool
    already_applied: bool

class ApplicationCreateRequest(BaseModel):
    notes: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: str
    drive_id: str
    student_id: str
    resume_id: str
    status: ApplicationStatus
    applied_at: datetime
    updated_at: datetime
    notes: Optional[str] = None

class ApplicantDetailResponse(BaseModel):
    id: str
    drive_id: str
    student_id: str
    resume_id: str
    status: ApplicationStatus
    applied_at: datetime
    updated_at: datetime
    notes: Optional[str] = None
    
    # Candidate details
    student_name: str
    student_email: str
    roll_number: str
    department: str
    cgpa: float
    graduation_year: int
    active_backlogs: int
    canonical_skills: List[str] = Field(default_factory=list)

class ApplicationStatusUpdateRequest(BaseModel):
    status: ApplicationStatus
    notes: Optional[str] = None
