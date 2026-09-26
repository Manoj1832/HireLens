from typing import Optional, List
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, EmailStr

class EducationItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    institution: str
    degree: str
    field_of_study: str
    start_year: int
    end_year: Optional[int] = None
    score_type: str = "CGPA"  # "CGPA" or "PERCENTAGE"
    score: float

class SkillItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str = "Technical"  # "Languages", "Frameworks", "Databases", "Cloud & DevOps", "Core Concepts"
    proficiency: Optional[str] = "Intermediate"  # "Beginner", "Intermediate", "Advanced"

class ProjectItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    skills_used: List[str] = []
    project_url: Optional[str] = None
    github_url: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class CertificationItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    issuing_organization: str
    issue_date: Optional[str] = None
    expiration_date: Optional[str] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None

class ExperienceItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    company: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    description: Optional[str] = None

class StudentProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # References User.id
    
    # Institutional Verified Directory Fields (Read-Only)
    register_number: str
    institutional_email: EmailStr
    department: str
    batch: str
    graduation_year: int
    verified_cgpa: float
    active_backlogs: int = 0

    # Student Managed Personal Information
    full_name: str
    headline: Optional[str] = None
    summary: Optional[str] = None
    phone: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None

    # Academic & Career Sections
    education: List[EducationItem] = []
    skills: List[SkillItem] = []
    projects: List[ProjectItem] = []
    certifications: List[CertificationItem] = []
    experience: List[ExperienceItem] = []

    # Dynamic Profile Metrics
    completion_percentage: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Placement Participation & Consent (Opt-In / Opt-Out)
    placement_opt_in: bool = True
    opt_out_reason: Optional[str] = None
    opt_in_updated_at: Optional[datetime] = None

    def calculate_completion(self) -> int:
        """
        Calculates profile completion percentage based on Master Build Specification weighting:
        - Basic Info (Headline/Summary/Contact): 20%
        - Verified & Prior Education: 20%
        - Skills (at least 3 skills): 20%
        - Projects (at least 1 detailed project): 20%
        - Certifications or Experience: 20%
        Total = 100%
        """
        score = 0
        
        # 1. Basic Info (20%)
        if self.headline and (self.summary or self.phone or self.github_url or self.linkedin_url):
            score += 20
        elif self.headline or self.summary:
            score += 10

        # 2. Education (20%)
        if len(self.education) >= 1 or self.department:
            score += 20

        # 3. Skills (20%)
        if len(self.skills) >= 4:
            score += 20
        elif len(self.skills) >= 1:
            score += 10

        # 4. Projects (20%)
        if len(self.projects) >= 2:
            score += 20
        elif len(self.projects) >= 1:
            score += 10

        # 5. Certifications / Experience (20%)
        if len(self.certifications) >= 1 or len(self.experience) >= 1:
            score += 20

        self.completion_percentage = min(score, 100)
        return self.completion_percentage
