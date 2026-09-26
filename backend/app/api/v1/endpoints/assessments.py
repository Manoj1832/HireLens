"""
Assessment Engine API Endpoints.
Complies with Sections 30-33, 35-37, 66-69, and 90 of the Master Build Specification.
Provides:
- Recruiter assessment authoring and configuration
- Strict MCQ validation and semantic duplicate detection
- Server-authoritative test runner with timer synchronization
- Distraction-free question delivery (answers masked)
- Candidate score evaluation and recruiter analytics
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.api import deps
from app.models.user import User, UserRole
from app.models.assessment import (
    Assessment,
    AssessmentStatus,
    Question,
    QuestionSource,
    QuestionValidationStatus,
)
from app.models.drive import DriveStatus
from app.schemas.assessment import (
    AssessmentCreateRequest,
    AssessmentResponse,
    QuestionCreateRequest,
    StartAttemptResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    FinalizeAttemptResponse,
    AttemptDetailResponse,
    RecruiterAssessmentResultsResponse,
)
from app.schemas.mcq_generator import (
    GenerateMCQRequest,
    GenerateMCQResponse,
    PublishWithAssessmentRequest,
)
from app.services.assessment_service import AssessmentService
from app.services.hybrid_mcq_service import HybridMCQGeneratorService
from app.db.repository import repo

router = APIRouter()

# ----------------------------------------------------------------------
# Recruiter / Admin Assessment Authoring, Hybrid Generation & Publishing
# ----------------------------------------------------------------------

@router.post(
    "/generate-mcqs",
    response_model=GenerateMCQResponse,
    summary="Generate technical MCQs using Hybrid ML + LLM",
)
def generate_technical_mcqs(
    req: GenerateMCQRequest,
    current_user: User = Depends(deps.require_role([UserRole.RECRUITER, UserRole.COLLEGE_ADMIN])),
):
    """
    Generates industry-grade MCQs using a Hybrid architecture:
    1. LLM (Groq Llama 3.3 70B) with strict pedagogical rules.
    2. Fallback to calibrated procedural ML item bank with Bloom's taxonomy difficulty mapping.
    3. Sentence-transformer embedding deduplication.
    """
    try:
        return HybridMCQGeneratorService.generate_questions(req)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate MCQs: {str(e)}",
        )

@router.post(
    "/drive/{drive_id}/publish-with-assessment",
    summary="Publish drive with custom or auto-generated assessment",
)
def publish_drive_with_assessment(
    drive_id: str,
    req: PublishWithAssessmentRequest,
    current_user: User = Depends(deps.require_role([UserRole.RECRUITER, UserRole.COLLEGE_ADMIN])),
):
    """
    Publishes a recruitment drive while configuring an assessment:
    - Mode AUTO: Generates calibrated MCQs (Easy / Medium / Hard / Balanced) and attaches them.
    - Mode CUSTOM: Attaches recruiter-authored custom questions.
    - Mode NONE: Publishes drive directly without assessment.
    """
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=404, detail="Recruitment drive not found.")

    created_assessment = None
    questions_count = 0

    if req.mode == "AUTO":
        drive_skills = [s.name for s in drive.skills] if drive.skills else ["Problem Solving", "Core CS"]
        title = req.assessment_title or f"{drive.job_title} Technical Assessment"

        # Generate questions via Hybrid Service
        gen_req = GenerateMCQRequest(
            skills=drive_skills,
            difficulty=req.difficulty,
            count=req.question_count,
            job_title=drive.job_title,
            drive_id=drive_id,
        )
        gen_resp = HybridMCQGeneratorService.generate_questions(gen_req)

        # Check existing assessment or create new
        existing_asm = repo.get_assessment_by_drive(drive_id)
        if existing_asm:
            created_assessment = existing_asm
        else:
            created_assessment = Assessment(
                drive_id=drive_id,
                title=title,
                description=f"Online technical screening assessment for {drive.company_name} - {drive.job_title}.",
                skills=drive_skills,
                question_count=len(gen_resp.questions),
                duration_seconds=req.duration_seconds,
                passing_score=req.passing_score,
                adaptive_mode=req.adaptive_mode,
                status=AssessmentStatus.PUBLISHED,
            )
            created_assessment = repo.save_assessment(created_assessment)

        # Persist generated questions
        for q in gen_resp.questions:
            question_obj = Question(
                assessment_id=created_assessment.id,
                skill=q.skill,
                topic=q.topic,
                question_text=q.question_text,
                options=q.options,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                difficulty=q.difficulty,
                source=QuestionSource.GENERATED,
                validation_status=QuestionValidationStatus.VALID,
            )
            repo.save_question(question_obj)
            questions_count += 1

    elif req.mode == "CUSTOM" and req.custom_questions:
        title = req.assessment_title or f"{drive.job_title} Custom Screening Assessment"
        drive_skills = [s.name for s in drive.skills] if drive.skills else ["Technical"]

        existing_asm = repo.get_assessment_by_drive(drive_id)
        if existing_asm:
            created_assessment = existing_asm
        else:
            created_assessment = Assessment(
                drive_id=drive_id,
                title=title,
                description=f"Custom technical screening assessment for {drive.company_name}.",
                skills=drive_skills,
                question_count=len(req.custom_questions),
                duration_seconds=req.duration_seconds,
                passing_score=req.passing_score,
                adaptive_mode=req.adaptive_mode,
                status=AssessmentStatus.PUBLISHED,
            )
            created_assessment = repo.save_assessment(created_assessment)

        for q in req.custom_questions:
            question_obj = Question(
                assessment_id=created_assessment.id,
                skill=q.skill or "Technical",
                topic=q.topic or "Core",
                question_text=q.question_text,
                options=q.options,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                difficulty=q.difficulty,
                source=QuestionSource.BANK,
                validation_status=QuestionValidationStatus.VALID,
            )
            repo.save_question(question_obj)
            questions_count += 1

    # Publish drive
    drive.status = DriveStatus.PUBLISHED
    repo.save_drive(drive)

    return {
        "status": "PUBLISHED",
        "drive_id": drive.id,
        "company_name": drive.company_name,
        "job_title": drive.job_title,
        "assessment_id": created_assessment.id if created_assessment else None,
        "question_count": questions_count,
        "mode": req.mode,
    }


@router.post(
    "",
    response_model=AssessmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create assessment for recruitment drive",
)
def create_assessment(
    req: AssessmentCreateRequest,
    current_user: User = Depends(deps.require_role([UserRole.RECRUITER, UserRole.COLLEGE_ADMIN])),
):
    """Configures a new technical assessment associated with a placement drive."""
    try:
        assessment = AssessmentService.create_assessment(req)

        # Phase 10: Section 105 Asynchronous Best-Effort Notification Dispatch
        try:
            drive = repo.get_drive(req.drive_id)
            company_name = drive.company_name if drive else "Recruitment Partner"
            job_title = drive.job_title if drive else "Technical Role"
            apps = repo.list_applications_for_drive(req.drive_id)
            student_ids = [a.student_id for a in apps]
            if student_ids:
                from app.services.notification_service import NotificationService
                from app.models.notification import NotificationType
                NotificationService.dispatch_bulk(
                    user_ids=student_ids,
                    notification_type=NotificationType.ASSESSMENT_SCHEDULED,
                    title=f"Technical Assessment Ready: {company_name}",
                    message=f"A {assessment.duration_minutes}-minute screening assessment has been scheduled for {job_title}.",
                    metadata={"assessment_id": assessment.id, "drive_id": req.drive_id},
                )
        except Exception as dispatch_err:
            import logging
            logging.getLogger(__name__).warning(f"Error dispatching assessment scheduled notifications: {dispatch_err}")

        return assessment
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.get(
    "/drive/{drive_id}",
    response_model=Optional[AssessmentResponse],
    summary="Get assessment by drive ID",
)
def get_assessment_by_drive(
    drive_id: str,
    current_user: User = Depends(deps.get_current_user),
):
    """Retrieves the assessment associated with a given drive if one exists."""
    assessment = repo.get_assessment_by_drive(drive_id)
    return assessment

@router.get(
    "/{assessment_id}",
    response_model=AssessmentResponse,
    summary="Get assessment metadata by ID",
)
def get_assessment(
    assessment_id: str,
    current_user: User = Depends(deps.get_current_user),
):
    """Retrieves assessment configuration by assessment ID."""
    assessment = repo.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found.",
        )
    return assessment

@router.post(
    "/{assessment_id}/questions",
    status_code=status.HTTP_201_CREATED,
    summary="Add question with strict MCQ validation & semantic duplicate detection",
)
def add_question(
    assessment_id: str,
    req: QuestionCreateRequest,
    current_user: User = Depends(deps.require_role([UserRole.RECRUITER, UserRole.COLLEGE_ADMIN])),
):
    """
    Adds a validated question to the assessment.
    Rejects questions failing MCQ rules (Section 32) or matching existing questions (Section 33).
    """
    try:
        question = AssessmentService.add_question(assessment_id, req)
        return {
            "success": True,
            "message": "Question validated and added successfully.",
            "question_id": question.id,
            "validation_status": question.validation_status,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.get(
    "/{assessment_id}/questions",
    summary="List questions in an assessment (Recruiter view)",
)
def list_questions(
    assessment_id: str,
    current_user: User = Depends(deps.require_role([UserRole.RECRUITER, UserRole.COLLEGE_ADMIN])),
):
    """Returns all questions with answers and explanations for recruiter auditing."""
    assessment = repo.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found.",
        )
    questions = repo.list_questions_for_assessment(assessment_id)
    return {
        "assessment_id": assessment_id,
        "count": len(questions),
        "questions": questions,
    }

@router.get(
    "/{assessment_id}/results",
    response_model=RecruiterAssessmentResultsResponse,
    summary="Get candidate assessment results and analytics",
)
def get_recruiter_results(
    assessment_id: str,
    current_user: User = Depends(deps.require_role([UserRole.RECRUITER, UserRole.COLLEGE_ADMIN])),
):
    """Aggregates all candidate test attempts, pass/fail metrics, and score distributions."""
    try:
        return AssessmentService.get_recruiter_results(assessment_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

# ----------------------------------------------------------------------
# Student Test Runner (Server-Authoritative Timing & Question Masking)
# ----------------------------------------------------------------------

@router.post(
    "/{assessment_id}/start",
    response_model=StartAttemptResponse,
    summary="Start or resume an assessment attempt",
)
def start_attempt(
    assessment_id: str,
    current_user: User = Depends(deps.require_role([UserRole.STUDENT])),
):
    """
    Initiates a new test attempt or resumes an active one.
    Establishes server-authoritative deadline and delivers the first question.
    """
    try:
        return AssessmentService.start_attempt(assessment_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.post(
    "/{assessment_id}/answer",
    response_model=SubmitAnswerResponse,
    summary="Submit answer for the current question",
)
def submit_answer(
    assessment_id: str,
    req: SubmitAnswerRequest,
    current_user: User = Depends(deps.require_role([UserRole.STUDENT])),
):
    """
    Records an answer choice. Enforces server deadline and navigation restrictions.
    Returns next unanswered question or flags attempt as finished.
    """
    try:
        return AssessmentService.submit_answer(req, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.post(
    "/{assessment_id}/submit",
    response_model=FinalizeAttemptResponse,
    summary="Finalize and score assessment attempt",
)
def finalize_attempt(
    assessment_id: str,
    attempt_id: str,
    current_user: User = Depends(deps.require_role([UserRole.STUDENT])),
):
    """Finalizes an active attempt and returns the final objective score."""
    try:
        return AssessmentService.finalize_attempt(attempt_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.get(
    "/{assessment_id}/my-attempt",
    response_model=Optional[AttemptDetailResponse],
    summary="Get authenticated student's latest attempt status",
)
def get_my_attempt(
    assessment_id: str,
    current_user: User = Depends(deps.require_role([UserRole.STUDENT])),
):
    """Returns the student's latest attempt status, score, and passing verdict."""
    return AssessmentService.get_student_attempt(assessment_id, current_user.id)
