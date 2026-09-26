"""
Recruitment Drive and Application Models.
Complies with Sections 27, 28, 29, and 58–60 of the Master Build Specification.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field

class DriveStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"

class RequirementType(str, Enum):
    REQUIRED = "REQUIRED"
    PREFERRED = "PREFERRED"

class DriveSkill(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    canonical_name: str
    requirement_type: RequirementType = RequirementType.REQUIRED
    weight: int = Field(default=5, ge=1, le=10)
    minimum_evidence_level: Optional[str] = "CONTEXTUAL"  # EXPLICIT | CONTEXTUAL | INFERRED

class DriveEligibility(BaseModel):
    allowed_departments: List[str] = Field(default_factory=list)  # e.g. ["Computer Science & Engineering", "Information Technology", "CSE", "IT"]
    min_cgpa: float = Field(default=0.0, ge=0.0, le=10.0)
    eligible_graduation_years: List[int] = Field(default_factory=list)  # e.g. [2025, 2026, 2027]
    max_active_backlogs: int = Field(default=0, ge=0)

class Drive(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str  # Recruiter user_id
    company_name: str
    job_title: str
    description: str
    location: str = "On-Campus / Hybrid"
    employment_type: str = "Full-Time"  # Full-Time, Internship, Internship + PPO
    ctc_range: Optional[str] = None  # e.g. "12-16 LPA" or "40,000 / month"
    application_deadline: Optional[datetime] = None
    assessment_start: Optional[datetime] = None
    assessment_end: Optional[datetime] = None
    status: DriveStatus = DriveStatus.DRAFT
    
    # Requirements & Criteria
    skills: List[DriveSkill] = Field(default_factory=list)
    eligibility: DriveEligibility = Field(default_factory=DriveEligibility)
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ApplicationStatus(str, Enum):
    APPLIED = "APPLIED"
    UNDER_REVIEW = "UNDER_REVIEW"
    SHORTLISTED = "SHORTLISTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"

class Application(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    drive_id: str
    student_id: str
    resume_id: str
    status: ApplicationStatus = ApplicationStatus.APPLIED
    applied_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
