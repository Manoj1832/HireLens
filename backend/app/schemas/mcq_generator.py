"""
Pydantic Schemas for Hybrid ML + LLM MCQ Generation & Assessment Publishing.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class MCQDifficultyLevel(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    BALANCED = "BALANCED"

class MCQGenerationMode(str, Enum):
    AUTO = "AUTO"
    CUSTOM = "CUSTOM"
    NONE = "NONE"

class GeneratedMCQItem(BaseModel):
    id: Optional[str] = None
    question_text: str
    options: List[str]  # Exactly 4 options
    correct_answer: str
    explanation: str
    difficulty: int = Field(ge=1, le=10, default=5)
    skill: str
    topic: str
    level: str = "MEDIUM"  # "EASY", "MEDIUM", "HARD"

class GenerateMCQRequest(BaseModel):
    skills: List[str]
    difficulty: MCQDifficultyLevel = MCQDifficultyLevel.BALANCED
    count: int = Field(default=10, ge=3, le=25)
    job_title: Optional[str] = None
    drive_id: Optional[str] = None

class GenerateMCQResponse(BaseModel):
    questions: List[GeneratedMCQItem]
    count: int
    generation_source: str  # "HYBRID_LLM_GROQ" | "HYBRID_ML_ITEM_BANK"
    model_name: str
    difficulty_level: str
    skills_covered: List[str]

class PublishWithAssessmentRequest(BaseModel):
    mode: MCQGenerationMode = MCQGenerationMode.AUTO
    assessment_title: Optional[str] = None
    difficulty: MCQDifficultyLevel = MCQDifficultyLevel.MEDIUM
    question_count: int = Field(default=10, ge=3, le=25)
    duration_seconds: int = Field(default=900, ge=180, le=7200)
    passing_score: float = Field(default=60.0, ge=0.0, le=100.0)
    adaptive_mode: bool = True
    custom_questions: Optional[List[GeneratedMCQItem]] = None
