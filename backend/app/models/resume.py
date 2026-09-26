from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field

class SkillEvidence(BaseModel):
    """
    Evidence backing an extracted canonical skill as required by Section 21:
    - skill_name: Canonical skill name
    - category: Technical category
    - section: Section detected (e.g., PROJECTS, EXPERIENCE, SKILLS)
    - snippet: Contextual sentence or bullet from the resume
    - page_number: Page where the skill appeared (1-indexed)
    - source_type: EXPLICIT | CONTEXTUAL | INFERRED
    - confidence: Extraction confidence score (0.0 - 1.0)
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    skill_name: str
    canonical_name: str
    category: str
    section: str
    snippet: str
    page_number: int = 1
    source_type: str = "EXPLICIT"  # "EXPLICIT", "CONTEXTUAL", "INFERRED"
    confidence: float = 0.95

class ExtractedProject(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    technologies: List[str] = []
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    page_number: int = 1

class ExtractedEducation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    degree: str
    institution: str
    field_of_study: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    score: Optional[str] = None

class ExtractedExperience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str
    company: str
    location: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None
    technologies: List[str] = []

class ExtractedCertification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    issuing_organization: Optional[str] = None
    year: Optional[int] = None

class ResumeAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    filename: str
    file_size: int
    sha256: str
    storage_path: str
    page_count: int
    word_count: int
    extraction_method: str = "NATIVE"  # "NATIVE", "OCR", "HYBRID"
    
    # Candidate contact & metadata
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    candidate_links: Dict[str, str] = {}
    
    # Text representations
    raw_text: str
    normalized_text: str
    sections_detected: List[str] = []
    
    # Extracted canonical intelligence
    canonical_skills: List[str] = []
    evidence_items: List[SkillEvidence] = []
    extracted_projects: List[ExtractedProject] = []
    extracted_education: List[ExtractedEducation] = []
    extracted_certifications: List[ExtractedCertification] = []
    extracted_experience: List[ExtractedExperience] = []
    
    # Semantic Embedding (Section 24: Sentence Transformers all-MiniLM-L6-v2)
    embedding_vector: List[float] = []
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dim: int = 384

    # Metadata
    parsed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
