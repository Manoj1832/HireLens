from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel
from app.models.resume import (
    SkillEvidence,
    ExtractedProject,
    ExtractedEducation,
    ExtractedExperience,
    ExtractedCertification,
)

class ResumeUploadResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    page_count: int
    word_count: int
    extraction_method: str
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    candidate_links: Dict[str, str] = {}
    sections_detected: List[str]
    canonical_skills: List[str]
    evidence_items: List[SkillEvidence]
    extracted_projects: List[ExtractedProject]
    extracted_education: List[ExtractedEducation]
    extracted_certifications: List[ExtractedCertification]
    extracted_experience: List[ExtractedExperience]
    embedding_model: str = ""
    embedding_dim: int = 0
    has_embedding: bool = False
    parsed_at: datetime
    message: str = "Resume successfully processed."

class ResumeDetailResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    page_count: int
    word_count: int
    extraction_method: str
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    candidate_links: Dict[str, str] = {}
    sections_detected: List[str]
    canonical_skills: List[str]
    evidence_items: List[SkillEvidence]
    extracted_projects: List[ExtractedProject]
    extracted_education: List[ExtractedEducation]
    extracted_certifications: List[ExtractedCertification]
    extracted_experience: List[ExtractedExperience]
    embedding_model: str = ""
    embedding_dim: int = 0
    has_embedding: bool = False
    parsed_at: datetime

class ResumeSyncRequest(BaseModel):
    sync_skills: bool = True
    sync_projects: bool = True
    sync_certifications: bool = True

class ResumeSyncResponse(BaseModel):
    message: str
    skills_added: int
    projects_added: int
    certifications_added: int
    updated_completion_percentage: int
