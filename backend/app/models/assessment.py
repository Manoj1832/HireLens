from enum import Enum
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field

class AssessmentStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"

class QuestionValidationStatus(str, Enum):
    VALID = "VALID"
    FLAGGED = "FLAGGED"
    REJECTED = "REJECTED"

class QuestionSource(str, Enum):
    BANK = "BANK"
    GENERATED = "GENERATED"

class AttemptStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"

class Assessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    drive_id: str
    title: str
    description: str
    skills: List[str] = Field(default_factory=list)
    question_count: int = 10
    duration_seconds: int = 900  # Default 15 minutes
    time_per_question: Optional[int] = None  # Optional per-question timer
    max_attempts: int = 2  # Allows up to 2 attempts per assessment
    allow_back_navigation: bool = False  # Section 36: Server-enforced navigation
    passing_score: float = 60.0  # Percentage required to pass
    adaptive_mode: bool = False  # Phase 7: IRT-inspired adaptive difficulty adjustment
    starting_difficulty: int = 5  # Phase 7: Initial difficulty level for adaptive sessions
    status: AssessmentStatus = AssessmentStatus.PUBLISHED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assessment_id: Optional[str] = None
    skill: str
    topic: str
    question_text: str
    options: List[str]  # Exactly 4 options (Section 32)
    correct_answer: str
    explanation: str
    difficulty: int = Field(ge=1, le=10, default=5)
    source: QuestionSource = QuestionSource.BANK
    validation_status: QuestionValidationStatus = QuestionValidationStatus.VALID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssessmentAnswer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    attempt_id: str
    question_id: str
    selected_answer: str
    is_correct: bool = False
    answered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    response_time_ms: int = 0

class AssessmentAttempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assessment_id: str
    student_id: str
    attempt_number: int = 1
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deadline_at: datetime
    submitted_at: Optional[datetime] = None
    raw_score: float = 0.0  # Unadjusted objective test score
    penalty_deduction: float = 0.0  # Score deducted due to proctoring/cheating incidents
    penalty_breakdown: List[str] = Field(default_factory=list)  # Audit explanation of score deductions
    score: float = 0.0  # Final score after penalty deduction
    passed: bool = False
    total_answered: int = 0
    total_correct: int = 0
    question_order: List[str] = Field(default_factory=list)  # Ordered question IDs for session
    status: AttemptStatus = AttemptStatus.IN_PROGRESS
    # Phase 7: Adaptive Assessment Tracking
    adaptive_mode: bool = False  # Whether this attempt uses adaptive difficulty
    current_difficulty: int = 5  # Current adaptive difficulty level (1-10)
    difficulty_history: List[Dict] = Field(default_factory=list)  # [{q_id, difficulty, correct, new_difficulty}]
    theta_estimate: float = 0.0  # IRT ability estimate (logit scale)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
