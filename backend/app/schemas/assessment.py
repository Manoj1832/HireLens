from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.assessment import AssessmentStatus, AttemptStatus, QuestionSource

class AssessmentCreateRequest(BaseModel):
    drive_id: str
    title: str
    description: str
    skills: List[str] = Field(default_factory=list)
    question_count: int = Field(default=10, ge=3, le=50)
    duration_seconds: int = Field(default=900, ge=60, le=7200)
    time_per_question: Optional[int] = None
    max_attempts: int = Field(default=2, ge=1, le=5)
    allow_back_navigation: bool = False
    passing_score: float = Field(default=60.0, ge=0.0, le=100.0)
    adaptive_mode: bool = False  # Phase 7: Enable IRT-inspired adaptive difficulty
    starting_difficulty: int = Field(default=5, ge=1, le=10)  # Phase 7: Initial difficulty

class AssessmentResponse(BaseModel):
    id: str
    drive_id: str
    title: str
    description: str
    skills: List[str]
    question_count: int
    duration_seconds: int
    time_per_question: Optional[int] = None
    max_attempts: int
    allow_back_navigation: bool
    passing_score: float
    adaptive_mode: bool = False
    starting_difficulty: int = 5
    status: AssessmentStatus
    created_at: datetime

class QuestionCreateRequest(BaseModel):
    skill: str
    topic: str
    question_text: str
    options: List[str] = Field(..., min_length=4, max_length=4)
    correct_answer: str
    explanation: str
    difficulty: int = Field(default=5, ge=1, le=10)

class QuestionClientView(BaseModel):
    id: str
    question_number: int
    total_questions: int
    skill: str
    topic: str
    question_text: str
    options: List[str]  # Shuffled options without answers
    difficulty: int

class StartAttemptResponse(BaseModel):
    attempt_id: str
    assessment_id: str
    drive_id: str
    title: str
    student_id: str
    attempt_number: int
    started_at: datetime
    deadline_at: datetime
    duration_seconds: int
    allow_back_navigation: bool
    total_questions: int
    adaptive_mode: bool = False  # Phase 7: Whether this attempt uses adaptive difficulty
    current_difficulty: int = 5  # Phase 7: Current difficulty level
    current_question: QuestionClientView

class SubmitAnswerRequest(BaseModel):
    attempt_id: str
    question_id: str
    selected_answer: str
    response_time_ms: int = 0

class SubmitAnswerResponse(BaseModel):
    success: bool
    attempt_id: str
    answered_count: int
    total_questions: int
    next_question: Optional[QuestionClientView] = None
    is_finished: bool = False
    adaptive_difficulty: Optional[int] = None  # Phase 7: Next difficulty level after this answer

class FinalizeAttemptResponse(BaseModel):
    attempt_id: str
    assessment_id: str
    student_id: str
    attempt_number: int = 1
    max_attempts: int = 2
    can_retake: bool = False
    raw_score: float = 0.0
    penalty_deduction: float = 0.0
    penalty_breakdown: List[str] = Field(default_factory=list)
    score: float  # Final score after penalty deduction
    passed: bool
    passing_score: float
    total_questions: int
    total_answered: int
    total_correct: int
    status: AttemptStatus
    submitted_at: datetime
    adaptive_mode: bool = False
    final_difficulty: Optional[int] = None
    theta_estimate: Optional[float] = None
    integrity_trust_score: float = 100.0  # Phase 8: Proctoring integrity trust score (0-100)
    integrity_risk_level: str = "CLEAN"  # Phase 8: Risk classification

class AttemptDetailResponse(BaseModel):
    attempt_id: str
    assessment_id: str
    student_id: str
    attempt_number: int
    max_attempts: int = 2
    can_retake: bool = False
    raw_score: float = 0.0
    penalty_deduction: float = 0.0
    penalty_breakdown: List[str] = Field(default_factory=list)
    started_at: datetime
    deadline_at: datetime
    submitted_at: Optional[datetime] = None
    score: float  # Final score after penalty deduction
    passed: bool
    passing_score: float
    total_questions: int
    total_answered: int
    total_correct: int
    status: AttemptStatus
    adaptive_mode: bool = False  # Phase 7
    final_difficulty: Optional[int] = None  # Phase 7: Final adapted difficulty level
    theta_estimate: Optional[float] = None  # Phase 7: IRT ability estimate
    integrity_trust_score: float = 100.0  # Phase 8: Proctoring integrity trust score (0-100)
    integrity_risk_level: str = "CLEAN"  # Phase 8: Risk classification

class RecruiterCandidateAttemptItem(BaseModel):
    attempt_id: str
    student_id: str
    student_name: str
    student_email: str
    roll_number: str
    department: str
    attempt_number: int
    score: float
    passed: bool
    status: AttemptStatus
    started_at: datetime
    submitted_at: Optional[datetime] = None
    adaptive_mode: bool = False
    final_difficulty: Optional[int] = None
    theta_estimate: Optional[float] = None
    integrity_trust_score: float = 100.0  # Phase 8: Proctoring integrity trust score
    integrity_risk_level: str = "CLEAN"  # Phase 8: Risk classification

class RecruiterAssessmentResultsResponse(BaseModel):
    assessment_id: str
    drive_id: str
    title: str
    passing_score: float
    total_attempts: int
    average_score: float
    pass_rate: float
    attempts: List[RecruiterCandidateAttemptItem]
