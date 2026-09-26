"""
Assessment Service Engine.
Complies with Sections 30-33, 35-37, and 90 of the Master Build Specification.
- Strict MCQ quality validation (Section 32)
- Semantic duplicate question detection with sentence transformers (Section 33)
- Server-authoritative timing, deadline enforcement & attempt quota gatekeeping (Section 35, 36)
- Client-safe question masking (answers & explanations stripped during active test) (Section 90)
- Objective scoring, attempt lifecycle & recruiter result analytics
"""

import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)
from typing import List, Optional, Tuple, Dict
import random
import math

from app.models.assessment import (
    Assessment,
    AssessmentStatus,
    Question,
    QuestionSource,
    QuestionValidationStatus,
    AssessmentAnswer,
    AssessmentAttempt,
    AttemptStatus,
)
from app.schemas.assessment import (
    AssessmentCreateRequest,
    QuestionCreateRequest,
    QuestionClientView,
    StartAttemptResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    FinalizeAttemptResponse,
    AttemptDetailResponse,
    RecruiterAssessmentResultsResponse,
    RecruiterCandidateAttemptItem,
)
from app.db.repository import repo
from app.services.embedding_service import generate_embedding, compute_similarity
from app.services.adaptive_engine import AdaptiveEngine
from app.services.proctoring_engine import ProctoringEngine

from abc import ABC, abstractmethod

class IScoreAdjustmentStrategy(ABC):
    """
    Abstract Strategy Interface complying with Strong OOP design principles.
    Defines the contract for scoring adjustments based on exam integrity and proctoring incidents.
    """
    @abstractmethod
    def calculate_adjusted_score(
        self, raw_score: float, attempt_id: str
    ) -> Tuple[float, float, List[str]]:
        """Calculates (final_score, penalty_deduction, penalty_breakdown)."""
        pass


class ProctoringIntegrityAdjustmentStrategy(IScoreAdjustmentStrategy):
    """
    Concrete OOP Strategy:
    Deducts score points when cheating, malpractices, or proctoring incidents occur:
    - Tab switches & window blurs
    - Multiple faces or unauthorized background personnel
    - Prohibited mobile phones & recording devices
    - Sustained camera / face absences
    Scales deduction directly against the objective assessment score.
    """
    def calculate_adjusted_score(
        self, raw_score: float, attempt_id: str
    ) -> Tuple[float, float, List[str]]:
        report = repo.get_integrity_report(attempt_id)
        if not report or not report.incidents:
            return raw_score, 0.0, ["Clean exam session: 100% integrity maintained."]

        trust = max(0.0, min(100.0, float(report.trust_score)))
        total_penalties = float(report.total_penalty)

        # Proportion of score lost due to compromised trust:
        trust_deduction = raw_score * ((100.0 - trust) / 100.0)
        # Minimum flat deduction based on incident severity:
        incident_floor = min(raw_score, total_penalties * 0.5)
        deduction = round(max(trust_deduction, incident_floor), 1)

        final_score = max(0.0, round(raw_score - deduction, 1))

        breakdown = [
            f"Raw Objective Score: {raw_score}%",
            f"Proctoring Trust Rating: {trust}% ({report.risk_level})",
            f"Cheating / Malpractice Incidents: {len(report.incidents)} violations detected",
            f"Malpractice Penalty Deducted: -{deduction}%",
            f"Final Audited Score: {final_score}%",
        ]
        for inc in report.incidents:
            pts = getattr(inc, "penalty_points", 0.0)
            breakdown.append(f"• {inc.incident_type}: {inc.description} (-{pts} penalty pts)")
        return final_score, deduction, breakdown

class AssessmentService:
    @staticmethod
    def validate_question(q: QuestionCreateRequest) -> Tuple[bool, Optional[str]]:
        """
        Validates question against strict MCQ rules (Section 32):
        1. Exactly 4 options
        2. No duplicate options
        3. Correct answer must match one of the options exactly
        4. Explanation must be non-empty and informative (>= 10 chars)
        5. Difficulty must be between 1 and 10
        6. Question text must be sufficiently descriptive (>= 15 chars)
        """
        if not q.question_text or len(q.question_text.strip()) < 15:
            return False, "Question text must be at least 15 characters long."

        if not q.options or len(q.options) != 4:
            return False, "Questions must provide exactly 4 options."

        stripped_opts = [opt.strip() for opt in q.options if opt and opt.strip()]
        if len(stripped_opts) != 4:
            return False, "All 4 options must contain non-empty text."

        # Case-insensitive duplicate check
        unique_opts = set(opt.lower() for opt in stripped_opts)
        if len(unique_opts) != 4:
            return False, "Options must be distinct; duplicate options are rejected."

        correct = q.correct_answer.strip()
        if correct not in stripped_opts:
            return False, "The correct answer must exactly match one of the 4 provided options."

        if not q.explanation or len(q.explanation.strip()) < 10:
            return False, "A clear explanation of at least 10 characters is required for validation."

        if not (1 <= q.difficulty <= 10):
            return False, "Question difficulty must be an integer between 1 and 10."

        return True, None

    @staticmethod
    def detect_duplicate_question(
        question_text: str,
        existing_questions: List[Question],
        threshold: float = 0.85
    ) -> Optional[Tuple[Question, float]]:
        """
        Detects semantically identical or near-duplicate questions using
        sentence-transformers embeddings (Section 33).
        Threshold > 0.85 indicates near-duplicate question semantics.
        """
        if not existing_questions or not question_text or len(question_text.strip()) < 10:
            return None

        try:
            target_emb = generate_embedding(question_text.strip())
            for candidate in existing_questions:
                cand_emb = generate_embedding(candidate.question_text.strip())
                sim = compute_similarity(target_emb, cand_emb)
                if sim >= threshold:
                    logger.info(
                        f"Semantic duplicate detected (similarity: {sim:.3f}): "
                        f"'{question_text[:50]}...' vs '{candidate.question_text[:50]}...'"
                    )
                    return candidate, sim
        except Exception as e:
            logger.warning(f"Semantic duplicate detection skipped due to embedding error: {e}")

        return None

    @classmethod
    def create_assessment(cls, req: AssessmentCreateRequest) -> Assessment:
        """Creates a new assessment associated with a recruitment drive."""
        drive = repo.get_drive(req.drive_id)
        if not drive:
            raise ValueError(f"Drive {req.drive_id} does not exist.")

        # Check if drive already has an assessment
        existing = repo.get_assessment_by_drive(req.drive_id)
        if existing:
            raise ValueError(f"An assessment for drive {req.drive_id} already exists (ID: {existing.id}).")

        assessment = Assessment(
            drive_id=req.drive_id,
            title=req.title.strip(),
            description=req.description.strip(),
            skills=req.skills,
            question_count=req.question_count,
            duration_seconds=req.duration_seconds,
            time_per_question=req.time_per_question,
            max_attempts=req.max_attempts,
            allow_back_navigation=req.allow_back_navigation,
            passing_score=req.passing_score,
            adaptive_mode=req.adaptive_mode,
            starting_difficulty=req.starting_difficulty,
            status=AssessmentStatus.PUBLISHED,
        )
        return repo.save_assessment(assessment)

    @classmethod
    def add_question(cls, assessment_id: str, req: QuestionCreateRequest) -> Question:
        """Validates MCQ rules, checks semantic duplicates, and persists question."""
        assessment = repo.get_assessment(assessment_id)
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found.")

        is_valid, error_msg = cls.validate_question(req)
        if not is_valid:
            raise ValueError(f"Question validation failed: {error_msg}")

        # Check for semantic duplicates among existing questions for this assessment
        existing_questions = repo.list_questions_for_assessment(assessment_id)
        dup = cls.detect_duplicate_question(req.question_text, existing_questions)
        if dup:
            matched_q, sim = dup
            raise ValueError(
                f"Duplicate question rejected: Semantically identical to question '{matched_q.question_text[:60]}...' "
                f"(similarity: {sim*100:.1f}% exceeds 85% threshold)."
            )

        question = Question(
            assessment_id=assessment_id,
            skill=req.skill.strip(),
            topic=req.topic.strip(),
            question_text=req.question_text.strip(),
            options=[opt.strip() for opt in req.options],
            correct_answer=req.correct_answer.strip(),
            explanation=req.explanation.strip(),
            difficulty=req.difficulty,
            source=QuestionSource.BANK,
            validation_status=QuestionValidationStatus.VALID,
        )
        repo.save_question(question)
        return question

    @classmethod
    def start_attempt(cls, assessment_id: str, student_id: str) -> StartAttemptResponse:
        """
        Starts or resumes an assessment attempt with server-authoritative deadline
        and strict attempt quota enforcement (Sections 35, 36).
        Phase 7: Adaptive mode uses dynamic question selection from AdaptiveEngine.
        """
        assessment = repo.get_assessment(assessment_id)
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found.")

        if assessment.status != AssessmentStatus.PUBLISHED:
            raise ValueError(f"Assessment is not published (current status: {assessment.status}).")

        # 1. Check for existing active attempt to resume
        active_attempt = repo.get_active_attempt_for_student(student_id, assessment_id)
        now = datetime.now(timezone.utc)

        if active_attempt:
            # Check deadline expiry (+ 10 second network grace period)
            if now > active_attempt.deadline_at + timedelta(seconds=10):
                # Expired -> finalize as EXPIRED
                cls._finalize_attempt_record(active_attempt, AttemptStatus.EXPIRED)
                active_attempt = None
            else:
                # Active and valid -> resume
                return cls._build_start_attempt_response(assessment, active_attempt)

        # 2. Check attempt quota
        prior_attempts = [
            a for a in repo.list_attempts_for_student(student_id)
            if a.assessment_id == assessment_id
        ]
        if len(prior_attempts) >= assessment.max_attempts:
            raise ValueError(
                f"Maximum attempt limit ({assessment.max_attempts}) reached for this assessment."
            )

        # 3. Fetch questions
        questions = repo.list_questions_for_assessment(assessment_id)
        if not questions:
            raise ValueError("No questions are currently configured for this assessment.")

        # 4. Build question order: adaptive vs static
        if assessment.adaptive_mode:
            # Phase 7: Adaptive mode — select only the first question at starting_difficulty
            question_order = AdaptiveEngine.build_initial_question_order(
                assessment_id=assessment_id,
                starting_difficulty=assessment.starting_difficulty,
                question_count=assessment.question_count,
            )
            if not question_order:
                raise ValueError("No questions available at the starting difficulty level.")
        else:
            # Static mode: pre-select all questions
            selected_questions = questions[:assessment.question_count]
            question_order = [q.id for q in selected_questions]

        # 5. Create new attempt record with server-authoritative deadline
        deadline_at = now + timedelta(seconds=assessment.duration_seconds)
        attempt = AssessmentAttempt(
            assessment_id=assessment.id,
            student_id=student_id,
            attempt_number=len(prior_attempts) + 1,
            started_at=now,
            deadline_at=deadline_at,
            question_order=question_order,
            status=AttemptStatus.IN_PROGRESS,
            adaptive_mode=assessment.adaptive_mode,
            current_difficulty=assessment.starting_difficulty if assessment.adaptive_mode else 5,
        )
        repo.save_attempt(attempt)

        return cls._build_start_attempt_response(assessment, attempt)

    @classmethod
    def _build_start_attempt_response(
        cls,
        assessment: Assessment,
        attempt: AssessmentAttempt
    ) -> StartAttemptResponse:
        current_q_view = cls._get_current_question_client_view(attempt)
        if not current_q_view:
            raise ValueError("No questions available for this attempt.")

        return StartAttemptResponse(
            attempt_id=attempt.id,
            assessment_id=assessment.id,
            drive_id=assessment.drive_id,
            title=assessment.title,
            student_id=attempt.student_id,
            attempt_number=attempt.attempt_number,
            started_at=attempt.started_at,
            deadline_at=attempt.deadline_at,
            duration_seconds=assessment.duration_seconds,
            allow_back_navigation=assessment.allow_back_navigation,
            total_questions=assessment.question_count,
            adaptive_mode=attempt.adaptive_mode,
            current_difficulty=attempt.current_difficulty,
            current_question=current_q_view,
        )

    @classmethod
    def _get_current_question_client_view(cls, attempt: AssessmentAttempt) -> Optional[QuestionClientView]:
        """
        Determines the next unanswered question and returns a distraction-free,
        client-safe view (Section 90: answers and explanations stripped).
        """
        answers = repo.list_answers_for_attempt(attempt.id)
        answered_q_ids = {a.question_id for a in answers}

        assessment = repo.get_assessment(attempt.assessment_id)
        total_q = assessment.question_count if assessment else len(attempt.question_order)

        for idx, q_id in enumerate(attempt.question_order):
            if q_id not in answered_q_ids:
                q = repo.get_question(q_id)
                if q:
                    # Provide options in stable deterministic order
                    return QuestionClientView(
                        id=q.id,
                        question_number=idx + 1,
                        total_questions=total_q,
                        skill=q.skill,
                        topic=q.topic,
                        question_text=q.question_text,
                        options=list(q.options),
                        difficulty=q.difficulty,
                    )
        return None

    @classmethod
    def submit_answer(cls, req: SubmitAnswerRequest, student_id: str) -> SubmitAnswerResponse:
        """
        Processes answer submission with server-authoritative deadline check
        and navigation policy enforcement (Section 35, 36).
        Phase 7: For adaptive attempts, triggers difficulty adjustment and dynamic question selection.
        """
        attempt = repo.get_attempt(req.attempt_id)
        if not attempt:
            raise ValueError(f"Attempt {req.attempt_id} not found.")

        if attempt.student_id != student_id:
            raise ValueError("Unauthorized: Attempt does not belong to the authenticated student.")

        if attempt.status != AttemptStatus.IN_PROGRESS:
            raise ValueError(f"Cannot submit answer: Attempt is already {attempt.status}.")

        assessment = repo.get_assessment(attempt.assessment_id)
        now = datetime.now(timezone.utc)

        # 1. Check Deadline Enforcement (+ 10 second grace period)
        if now > attempt.deadline_at + timedelta(seconds=10):
            cls._finalize_attempt_record(attempt, AttemptStatus.EXPIRED)
            return SubmitAnswerResponse(
                success=False,
                attempt_id=attempt.id,
                answered_count=attempt.total_answered,
                total_questions=assessment.question_count if assessment else len(attempt.question_order),
                next_question=None,
                is_finished=True,
                adaptive_difficulty=attempt.current_difficulty if attempt.adaptive_mode else None,
            )

        # 2. Back navigation / Re-answer check
        existing_answers = repo.list_answers_for_attempt(attempt.id)
        already_answered_ids = {a.question_id for a in existing_answers}

        if req.question_id in already_answered_ids:
            if not assessment or not assessment.allow_back_navigation:
                raise ValueError("Resubmitting or navigating backwards to previously answered questions is disallowed.")

        # 3. Validate question exists
        question = repo.get_question(req.question_id)
        if not question:
            raise ValueError(f"Question {req.question_id} not found.")

        # 4. Objective scoring check
        is_correct = (req.selected_answer.strip() == question.correct_answer.strip())

        answer = AssessmentAnswer(
            attempt_id=attempt.id,
            question_id=req.question_id,
            selected_answer=req.selected_answer.strip(),
            is_correct=is_correct,
            response_time_ms=max(0, req.response_time_ms),
        )
        repo.save_answer(answer)

        # Phase 8: Server-side rapid answer detection (proctoring)
        if req.response_time_ms > 0:
            ProctoringEngine.detect_rapid_answer(attempt.id, req.response_time_ms)

        # 5. Update attempt counters
        updated_answers = repo.list_answers_for_attempt(attempt.id)
        attempt.total_answered = len(updated_answers)
        attempt.total_correct = sum(1 for a in updated_answers if a.is_correct)

        question_count = assessment.question_count if assessment else len(attempt.question_order)

        # 6. Phase 7: Adaptive difficulty adjustment
        if attempt.adaptive_mode and assessment:
            next_q = AdaptiveEngine.process_answer_and_select_next(
                attempt=attempt,
                question=question,
                was_correct=is_correct,
                total_correct=attempt.total_correct,
                total_answered=attempt.total_answered,
                question_count=question_count,
            )
            repo.save_attempt(attempt)

            if next_q is None or attempt.total_answered >= question_count:
                # All questions answered or pool exhausted -> auto-finalize
                cls._finalize_attempt_record(attempt, AttemptStatus.COMPLETED)
                return SubmitAnswerResponse(
                    success=True,
                    attempt_id=attempt.id,
                    answered_count=attempt.total_answered,
                    total_questions=question_count,
                    next_question=None,
                    is_finished=True,
                    adaptive_difficulty=attempt.current_difficulty,
                )

            # Build client view for the adaptively-selected next question
            next_q_view = QuestionClientView(
                id=next_q.id,
                question_number=attempt.total_answered + 1,
                total_questions=question_count,
                skill=next_q.skill,
                topic=next_q.topic,
                question_text=next_q.question_text,
                options=list(next_q.options),
                difficulty=next_q.difficulty,
            )
            return SubmitAnswerResponse(
                success=True,
                attempt_id=attempt.id,
                answered_count=attempt.total_answered,
                total_questions=question_count,
                next_question=next_q_view,
                is_finished=False,
                adaptive_difficulty=attempt.current_difficulty,
            )

        # Non-adaptive (static) path
        repo.save_attempt(attempt)

        # 7. Determine next question (static mode)
        next_q_view = cls._get_current_question_client_view(attempt)
        if next_q_view is None:
            # All questions answered -> auto-finalize attempt
            cls._finalize_attempt_record(attempt, AttemptStatus.COMPLETED)
            return SubmitAnswerResponse(
                success=True,
                attempt_id=attempt.id,
                answered_count=attempt.total_answered,
                total_questions=question_count,
                next_question=None,
                is_finished=True,
            )

        return SubmitAnswerResponse(
            success=True,
            attempt_id=attempt.id,
            answered_count=attempt.total_answered,
            total_questions=question_count,
            next_question=next_q_view,
            is_finished=False,
        )

    @classmethod
    def finalize_attempt(cls, attempt_id: str, student_id: str) -> FinalizeAttemptResponse:
        """Explicit submission / finalization by student."""
        attempt = repo.get_attempt(attempt_id)
        if not attempt:
            raise ValueError(f"Attempt {attempt_id} not found.")

        if attempt.student_id != student_id:
            raise ValueError("Unauthorized: Attempt does not belong to this student.")

        assessment = repo.get_assessment(attempt.assessment_id)
        passing_score = assessment.passing_score if assessment else 60.0
        max_attempts = assessment.max_attempts if assessment else 2

        if attempt.status == AttemptStatus.IN_PROGRESS:
            now = datetime.now(timezone.utc)
            final_status = AttemptStatus.EXPIRED if now > attempt.deadline_at + timedelta(seconds=10) else AttemptStatus.COMPLETED
            cls._finalize_attempt_record(attempt, final_status)

        prior_attempts = [
            a for a in repo.list_attempts_for_student(attempt.student_id)
            if a.assessment_id == attempt.assessment_id
        ]
        can_retake = len(prior_attempts) < max_attempts

        return FinalizeAttemptResponse(
            attempt_id=attempt.id,
            assessment_id=attempt.assessment_id,
            student_id=attempt.student_id,
            attempt_number=attempt.attempt_number,
            max_attempts=max_attempts,
            can_retake=can_retake,
            raw_score=attempt.raw_score,
            penalty_deduction=attempt.penalty_deduction,
            penalty_breakdown=attempt.penalty_breakdown,
            score=attempt.score,
            passed=attempt.passed,
            passing_score=passing_score,
            total_questions=len(attempt.question_order),
            total_answered=attempt.total_answered,
            total_correct=attempt.total_correct,
            status=attempt.status,
            submitted_at=attempt.submitted_at or datetime.now(timezone.utc),
            adaptive_mode=attempt.adaptive_mode,
            final_difficulty=attempt.current_difficulty if attempt.adaptive_mode else None,
            theta_estimate=attempt.theta_estimate if attempt.adaptive_mode else None,
            integrity_trust_score=cls._get_trust_score(attempt.id),
            integrity_risk_level=cls._get_risk_level(attempt.id),
        )

    @classmethod
    def _finalize_attempt_record(cls, attempt: AssessmentAttempt, status: AttemptStatus):
        """Internal helper to calculate score percentage and update status with cheating penalty deduction."""
        assessment = repo.get_assessment(attempt.assessment_id)
        passing_score = assessment.passing_score if assessment else 60.0

        total_q = max(len(attempt.question_order), 1)
        answers = repo.list_answers_for_attempt(attempt.id)
        attempt.total_answered = len(answers)
        attempt.total_correct = sum(1 for a in answers if a.is_correct)
        
        # Calculate raw objective score
        raw_score = round((attempt.total_correct / total_q) * 100.0, 1)

        # Apply Strong OOP Cheating Score Adjustment Strategy
        adjustment_strategy: IScoreAdjustmentStrategy = ProctoringIntegrityAdjustmentStrategy()
        final_score, deduction, breakdown = adjustment_strategy.calculate_adjusted_score(raw_score, attempt.id)

        attempt.raw_score = raw_score
        attempt.penalty_deduction = deduction
        attempt.penalty_breakdown = breakdown
        attempt.score = final_score
        attempt.passed = (attempt.score >= passing_score)
        attempt.status = status
        attempt.submitted_at = datetime.now(timezone.utc)
        repo.save_attempt(attempt)

        # Phase 10: Section 105 Asynchronous Best-Effort Notification Dispatch
        try:
            from app.services.notification_service import NotificationService
            from app.models.notification import NotificationType

            # 1. Notify Student of assessment completion
            status_text = "Passed" if attempt.passed else "Below Passing Threshold"
            NotificationService.dispatch(
                user_id=attempt.student_id,
                notification_type=NotificationType.ASSESSMENT_COMPLETED,
                title=f"Assessment Completed ({status_text})",
                message=f"You scored {attempt.score}% on the assessment. (Threshold: {passing_score}%).",
                metadata={"assessment_id": attempt.assessment_id, "attempt_id": attempt.id, "score": attempt.score, "passed": attempt.passed},
            )

            # 2. Notify Recruiter if linked to a recruitment drive
            if assessment and assessment.drive_id:
                drive = repo.get_drive(assessment.drive_id)
                if drive and drive.created_by:
                    student_user = repo.get_user_by_id(attempt.student_id)
                    student_name = student_user.full_name if student_user else "Candidate"
                    NotificationService.dispatch(
                        user_id=drive.created_by,
                        notification_type=NotificationType.ASSESSMENT_RESULTS_READY,
                        title=f"Assessment Result: {student_name}",
                        message=f"{student_name} completed the assessment for {drive.job_title} with a score of {attempt.score}%.",
                        metadata={"assessment_id": assessment.id, "attempt_id": attempt.id, "student_id": attempt.student_id, "score": attempt.score},
                    )

                    # 3. High Integrity Risk / Cheating Penalty Alert
                    if deduction > 0 or attempt.penalty_deduction > 0:
                        NotificationService.dispatch(
                            user_id=drive.created_by,
                            notification_type=NotificationType.INTEGRITY_REVIEW_REQUIRED,
                            title=f"Integrity Review Required: {student_name}",
                            message=f"{student_name} incurred a proctoring penalty deduction of {deduction}%. Review proctoring telemetry.",
                            metadata={"assessment_id": assessment.id, "attempt_id": attempt.id, "student_id": attempt.student_id, "penalty": deduction},
                        )
        except Exception as dispatch_err:
            logger.warning(f"Error dispatching assessment completion notification: {dispatch_err}")

    @classmethod
    def _get_trust_score(cls, attempt_id: str) -> float:
        """Phase 8: Retrieve trust score from integrity report."""
        report = repo.get_integrity_report(attempt_id)
        return report.trust_score if report else 100.0

    @classmethod
    def _get_risk_level(cls, attempt_id: str) -> str:
        """Phase 8: Retrieve risk level from integrity report."""
        report = repo.get_integrity_report(attempt_id)
        return report.risk_level if report else "CLEAN"

    @classmethod
    def get_student_attempt(cls, assessment_id: str, student_id: str) -> Optional[AttemptDetailResponse]:
        """Returns the most recent attempt summary for the student with attempt quota and penalty breakdown."""
        assessment = repo.get_assessment(assessment_id)
        attempts = [
            a for a in repo.list_attempts_for_student(student_id)
            if a.assessment_id == assessment_id
        ]
        if not attempts:
            return None

        # Return latest attempt
        latest = sorted(attempts, key=lambda a: a.started_at, reverse=True)[0]
        passing_score = assessment.passing_score if assessment else 60.0
        max_attempts = assessment.max_attempts if assessment else 2

        can_retake = (
            len(attempts) < max_attempts
            and latest.status in [AttemptStatus.COMPLETED, AttemptStatus.EXPIRED]
        )

        return AttemptDetailResponse(
            attempt_id=latest.id,
            assessment_id=latest.assessment_id,
            student_id=latest.student_id,
            attempt_number=latest.attempt_number,
            max_attempts=max_attempts,
            can_retake=can_retake,
            raw_score=latest.raw_score,
            penalty_deduction=latest.penalty_deduction,
            penalty_breakdown=latest.penalty_breakdown,
            started_at=latest.started_at,
            deadline_at=latest.deadline_at,
            submitted_at=latest.submitted_at,
            score=latest.score,
            passed=latest.passed,
            passing_score=passing_score,
            total_questions=assessment.question_count if assessment else len(latest.question_order),
            total_answered=latest.total_answered,
            total_correct=latest.total_correct,
            status=latest.status,
            adaptive_mode=latest.adaptive_mode,
            final_difficulty=latest.current_difficulty if latest.adaptive_mode else None,
            theta_estimate=latest.theta_estimate if latest.adaptive_mode else None,
            integrity_trust_score=cls._get_trust_score(latest.id),
            integrity_risk_level=cls._get_risk_level(latest.id),
        )

    @classmethod
    def get_recruiter_results(cls, assessment_id: str) -> RecruiterAssessmentResultsResponse:
        """Returns consolidated candidate assessment scores for recruiters (Section 37, 68)."""
        assessment = repo.get_assessment(assessment_id)
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found.")

        attempts = repo.list_attempts_for_assessment(assessment_id)
        candidate_items: List[RecruiterCandidateAttemptItem] = []

        for att in attempts:
            # Look up student details
            user = repo.get_user_by_id(att.student_id)
            profile = repo.get_student_profile(att.student_id)

            student_name = user.full_name if user else "Candidate"
            student_email = user.email if user else ""
            roll_number = profile.register_number if profile else (user.register_number if user else "N/A")
            department = profile.department if profile else (user.department if user else "Engineering")

            candidate_items.append(
                RecruiterCandidateAttemptItem(
                    attempt_id=att.id,
                    student_id=att.student_id,
                    student_name=student_name,
                    student_email=student_email,
                    roll_number=roll_number or "N/A",
                    department=department or "N/A",
                    attempt_number=att.attempt_number,
                    score=att.score,
                    passed=att.passed,
                    status=att.status,
                    started_at=att.started_at,
                    submitted_at=att.submitted_at,
                    adaptive_mode=att.adaptive_mode,
                    final_difficulty=att.current_difficulty if att.adaptive_mode else None,
                    theta_estimate=att.theta_estimate if att.adaptive_mode else None,
                    integrity_trust_score=cls._get_trust_score(att.id),
                    integrity_risk_level=cls._get_risk_level(att.id),
                )
            )

        # Calculate analytics
        total = len(candidate_items)
        avg_score = round(sum(c.score for c in candidate_items) / max(total, 1), 1)
        pass_count = sum(1 for c in candidate_items if c.passed)
        pass_rate = round((pass_count / max(total, 1)) * 100.0, 1)

        return RecruiterAssessmentResultsResponse(
            assessment_id=assessment.id,
            drive_id=assessment.drive_id,
            title=assessment.title,
            passing_score=assessment.passing_score,
            total_attempts=total,
            average_score=avg_score,
            pass_rate=pass_rate,
            attempts=candidate_items,
        )
