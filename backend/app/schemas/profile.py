from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.profile import (
    EducationItem,
    SkillItem,
    ProjectItem,
    CertificationItem,
    ExperienceItem,
    StudentProfile
)

class EducationInput(BaseModel):
    institution: str
    degree: str
    field_of_study: str
    start_year: int
    end_year: Optional[int] = None
    score_type: str = "CGPA"
    score: float

class SkillInput(BaseModel):
    name: str
    category: str = "Technical"
    proficiency: Optional[str] = "Intermediate"

class ProjectInput(BaseModel):
    title: str
    description: str
    skills_used: List[str] = []
    project_url: Optional[str] = None
    github_url: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class CertificationInput(BaseModel):
    name: str
    issuing_organization: str
    issue_date: Optional[str] = None
    expiration_date: Optional[str] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None

class ExperienceInput(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    description: Optional[str] = None

class StudentProfileUpdateInput(BaseModel):
    """
    Student editable fields only.
    Institutional fields (register_number, institutional_email, department, batch, verified_cgpa)
    cannot be altered by the student.
    """
    full_name: Optional[str] = None
    headline: Optional[str] = None
    summary: Optional[str] = None
    phone: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    education: Optional[List[EducationItem]] = None
    skills: Optional[List[SkillItem]] = None
    projects: Optional[List[ProjectItem]] = None
    certifications: Optional[List[CertificationItem]] = None
    experience: Optional[List[ExperienceItem]] = None

class StudentProfileResponse(BaseModel):
    id: str
    user_id: str
    register_number: str
    institutional_email: EmailStr
    department: str
    batch: str
    graduation_year: int
    verified_cgpa: float
    full_name: str
    headline: Optional[str] = None
    summary: Optional[str] = None
    phone: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    education: List[EducationItem]
    skills: List[SkillItem]
    projects: List[ProjectItem]
    certifications: List[CertificationItem]
    experience: List[ExperienceItem]
    completion_percentage: int
    updated_at: datetime
    placement_opt_in: bool = True
    opt_out_reason: Optional[str] = None
    opt_in_updated_at: Optional[datetime] = None

class OptInUpdateRequest(BaseModel):
    placement_opt_in: bool
    opt_out_reason: Optional[str] = None

