"""
Recruitment Drives and Student Applications Endpoints.
Complies with Sections 27, 28, 29, and 58–60 of the Master Build Specification.
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.api import deps
from app.models.user import User, UserRole
from app.models.drive import (
    Drive,
    DriveStatus,
    DriveSkill,
    DriveEligibility,
    Application,
    ApplicationStatus,
)
from app.schemas.drive import (
    DriveCreateRequest,
    DriveUpdateRequest,
    DriveResponse,
    EligibilityEvaluationResponse,
    ApplicationCreateRequest,
    ApplicationResponse,
    ApplicantDetailResponse,
    ApplicationStatusUpdateRequest,
)
from app.schemas.matching import (
    MatchDetailResponse,
    DriveApplicantRankedItem,
    DriveRankedApplicantsResponse,
    StudentSkillGapResponse,
    SkillMatchSchema,
    MatchComponentScoresSchema,
)
from app.services.eligibility_service import EligibilityEngine
from app.services.matching_service import MatchingEngine, SCORE_VERSION
from app.services.notification_service import NotificationService
from app.models.notification import NotificationType
from app.db.repository import repo

router = APIRouter()

# ----------------------------------------------------------------------
# 1. Recruitment Drives Lifecycle (Recruiter & Student Discovery)
# ----------------------------------------------------------------------

@router.get("", response_model=List[DriveResponse])
def list_drives(
    current_user: User = Depends(deps.get_current_user),
):
    """
    Lists recruitment drives based on caller role:
    - Recruiter: Drives created by the recruiter.
    - Student: Only PUBLISHED / OPEN drives, annotated with eligibility & application status.
    - Admin: All drives.
    """
    responses: List[DriveResponse] = []

    if current_user.role == UserRole.RECRUITER:
        drives = repo.list_drives_for_recruiter(current_user.id)
        for d in drives:
            apps = repo.list_applications_for_drive(d.id)
            responses.append(
                DriveResponse(
                    id=d.id,
                    created_by=d.created_by,
                    company_name=d.company_name,
                    job_title=d.job_title,
                    description=d.description,
                    location=d.location,
                    employment_type=d.employment_type,
                    ctc_range=d.ctc_range,
                    application_deadline=d.application_deadline,
                    assessment_start=d.assessment_start,
                    assessment_end=d.assessment_end,
                    status=d.status,
                    skills=d.skills,
                    eligibility=d.eligibility,
                    created_at=d.created_at,
                    updated_at=d.updated_at,
                    applicant_count=len(apps),
                )
            )

    elif current_user.role == UserRole.STUDENT:
        published_drives = repo.list_published_drives()
        profile = repo.get_student_profile(current_user.id)
        for d in published_drives:
            existing_app = repo.get_application_for_student_drive(current_user.id, d.id)
            is_eligible = True
            if profile:
                is_eligible, _, _ = EligibilityEngine.evaluate(d, profile)

            responses.append(
                DriveResponse(
                    id=d.id,
                    created_by=d.created_by,
                    company_name=d.company_name,
                    job_title=d.job_title,
                    description=d.description,
                    location=d.location,
                    employment_type=d.employment_type,
                    ctc_range=d.ctc_range,
                    application_deadline=d.application_deadline,
                    assessment_start=d.assessment_start,
                    assessment_end=d.assessment_end,
                    status=d.status,
                    skills=d.skills,
                    eligibility=d.eligibility,
                    created_at=d.created_at,
                    updated_at=d.updated_at,
                    applicant_count=0,
                    has_applied=existing_app is not None,
                    is_eligible=is_eligible,
                )
            )

    else:  # Admin
        for d in repo._drives.values():
            apps = repo.list_applications_for_drive(d.id)
            responses.append(
                DriveResponse(
                    id=d.id,
                    created_by=d.created_by,
                    company_name=d.company_name,
                    job_title=d.job_title,
                    description=d.description,
                    location=d.location,
                    employment_type=d.employment_type,
                    ctc_range=d.ctc_range,
                    application_deadline=d.application_deadline,
                    assessment_start=d.assessment_start,
                    assessment_end=d.assessment_end,
                    status=d.status,
                    skills=d.skills,
                    eligibility=d.eligibility,
                    created_at=d.created_at,
                    updated_at=d.updated_at,
                    applicant_count=len(apps),
                )
            )

    return responses

@router.post("", response_model=DriveResponse, status_code=status.HTTP_201_CREATED)
def create_drive(
    req: DriveCreateRequest,
    current_user: User = Depends(deps.require_role(UserRole.RECRUITER)),
):
    """Creates a new recruitment drive. Recruiter specifies job criteria, skills, and eligibility."""
    drive_skills = [
        DriveSkill(
            name=s.name,
            canonical_name=s.canonical_name,
            requirement_type=s.requirement_type,
            weight=s.weight,
            minimum_evidence_level=s.minimum_evidence_level,
        )
        for s in req.skills
    ]

    eligibility = DriveEligibility(
        allowed_departments=req.eligibility.allowed_departments,
        min_cgpa=req.eligibility.min_cgpa,
        eligible_graduation_years=req.eligibility.eligible_graduation_years,
        max_active_backlogs=req.eligibility.max_active_backlogs,
    )

    drive_status = DriveStatus.PUBLISHED if req.publish_now else DriveStatus.DRAFT

    drive = Drive(
        created_by=current_user.id,
        company_name=req.company_name,
        job_title=req.job_title,
        description=req.description,
        location=req.location,
        employment_type=req.employment_type,
        ctc_range=req.ctc_range,
        application_deadline=req.application_deadline,
        assessment_start=req.assessment_start,
        assessment_end=req.assessment_end,
        status=drive_status,
        skills=drive_skills,
        eligibility=eligibility,
    )
    repo.save_drive(drive)

    return DriveResponse(
        id=drive.id,
        created_by=drive.created_by,
        company_name=drive.company_name,
        job_title=drive.job_title,
        description=drive.description,
        location=drive.location,
        employment_type=drive.employment_type,
        ctc_range=drive.ctc_range,
        application_deadline=drive.application_deadline,
        assessment_start=drive.assessment_start,
        assessment_end=drive.assessment_end,
        status=drive.status,
        skills=drive.skills,
        eligibility=drive.eligibility,
        created_at=drive.created_at,
        updated_at=drive.updated_at,
        applicant_count=0,
    )

@router.get("/{drive_id}", response_model=DriveResponse)
def get_drive_details(
    drive_id: str,
    current_user: User = Depends(deps.get_current_user),
):
    """Retrieves drive details by ID."""
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruitment drive not found.")

    # Students cannot view DRAFT drives
    if current_user.role == UserRole.STUDENT and drive.status not in [DriveStatus.PUBLISHED, DriveStatus.OPEN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This drive is not published.")

    apps = repo.list_applications_for_drive(drive.id)
    has_applied = False
    is_eligible = None

    if current_user.role == UserRole.STUDENT:
        existing = repo.get_application_for_student_drive(current_user.id, drive.id)
        has_applied = existing is not None
        profile = repo.get_student_profile(current_user.id)
        if profile:
            is_eligible, _, _ = EligibilityEngine.evaluate(drive, profile)

    return DriveResponse(
        id=drive.id,
        created_by=drive.created_by,
        company_name=drive.company_name,
        job_title=drive.job_title,
        description=drive.description,
        location=drive.location,
        employment_type=drive.employment_type,
        ctc_range=drive.ctc_range,
        application_deadline=drive.application_deadline,
        assessment_start=drive.assessment_start,
        assessment_end=drive.assessment_end,
        status=drive.status,
        skills=drive.skills,
        eligibility=drive.eligibility,
        created_at=drive.created_at,
        updated_at=drive.updated_at,
        applicant_count=len(apps),
        has_applied=has_applied,
        is_eligible=is_eligible,
    )

@router.put("/{drive_id}", response_model=DriveResponse)
def update_drive(
    drive_id: str,
    req: DriveUpdateRequest,
    current_user: User = Depends(deps.require_role(UserRole.RECRUITER)),
):
    """Recruiter updates a recruitment drive. Section 134: Recruiter cannot modify another recruiter's drive."""
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found.")

    if drive.created_by != current_user.id and current_user.role != UserRole.COLLEGE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to modify another recruiter's drive.",
        )

    if req.company_name is not None:
        drive.company_name = req.company_name
    if req.job_title is not None:
        drive.job_title = req.job_title
    if req.description is not None:
        drive.description = req.description
    if req.location is not None:
        drive.location = req.location
    if req.employment_type is not None:
        drive.employment_type = req.employment_type
    if req.ctc_range is not None:
        drive.ctc_range = req.ctc_range
    if req.application_deadline is not None:
        drive.application_deadline = req.application_deadline
    if req.assessment_start is not None:
        drive.assessment_start = req.assessment_start
    if req.assessment_end is not None:
        drive.assessment_end = req.assessment_end
    if req.status is not None:
        drive.status = req.status
    if req.skills is not None:
        drive.skills = [
            DriveSkill(
                name=s.name,
                canonical_name=s.canonical_name,
                requirement_type=s.requirement_type,
                weight=s.weight,
                minimum_evidence_level=s.minimum_evidence_level,
            )
            for s in req.skills
        ]
    if req.eligibility is not None:
        drive.eligibility = DriveEligibility(
            allowed_departments=req.eligibility.allowed_departments,
            min_cgpa=req.eligibility.min_cgpa,
            eligible_graduation_years=req.eligibility.eligible_graduation_years,
            max_active_backlogs=req.eligibility.max_active_backlogs,
        )

    drive.updated_at = datetime.now(timezone.utc)
    repo.save_drive(drive)
    apps = repo.list_applications_for_drive(drive.id)

    return DriveResponse(
        id=drive.id,
        created_by=drive.created_by,
        company_name=drive.company_name,
        job_title=drive.job_title,
        description=drive.description,
        location=drive.location,
        employment_type=drive.employment_type,
        ctc_range=drive.ctc_range,
        application_deadline=drive.application_deadline,
        assessment_start=drive.assessment_start,
        assessment_end=drive.assessment_end,
        status=drive.status,
        skills=drive.skills,
        eligibility=drive.eligibility,
        created_at=drive.created_at,
        updated_at=drive.updated_at,
        applicant_count=len(apps),
    )

@router.post("/{drive_id}/publish", response_model=DriveResponse)
def publish_drive(
    drive_id: str,
    current_user: User = Depends(deps.require_role(UserRole.RECRUITER)),
):
    """Publishes a draft drive so eligible students can discover and apply."""
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found.")

    if drive.created_by != current_user.id and current_user.role != UserRole.COLLEGE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized.")

    drive.status = DriveStatus.PUBLISHED
    drive.updated_at = datetime.now(timezone.utc)
    repo.save_drive(drive)

    # Phase 10: Section 105 Asynchronous Best-Effort Notification Dispatch
    try:
        students = repo.list_users_by_role(UserRole.STUDENT)
        eligible_student_ids = []
        for s in students:
            p = repo.get_student_profile(s.id)
            if p:
                is_elig, _, _ = EligibilityEngine.evaluate(drive, p)
                if is_elig:
                    eligible_student_ids.append(s.id)
            else:
                eligible_student_ids.append(s.id)
        if eligible_student_ids:
            NotificationService.dispatch_bulk(
                user_ids=eligible_student_ids,
                notification_type=NotificationType.DRIVE_PUBLISHED,
                title=f"New Drive Published: {drive.company_name}",
                message=f"{drive.company_name} is hiring for {drive.job_title} ({drive.location}). Check eligibility and apply before deadline.",
                metadata={"drive_id": drive.id, "company_name": drive.company_name, "job_title": drive.job_title},
            )
    except Exception as dispatch_err:
        import logging
        logging.getLogger(__name__).warning(f"Error dispatching drive publish notification: {dispatch_err}")

    apps = repo.list_applications_for_drive(drive.id)
    return DriveResponse(
        id=drive.id,
        created_by=drive.created_by,
        company_name=drive.company_name,
        job_title=drive.job_title,
        description=drive.description,
        location=drive.location,
        employment_type=drive.employment_type,
        ctc_range=drive.ctc_range,
        application_deadline=drive.application_deadline,
        assessment_start=drive.assessment_start,
        assessment_end=drive.assessment_end,
        status=drive.status,
        skills=drive.skills,
        eligibility=drive.eligibility,
        created_at=drive.created_at,
        updated_at=drive.updated_at,
        applicant_count=len(apps),
    )

@router.post("/{drive_id}/close", response_model=DriveResponse)
def close_drive(
    drive_id: str,
    current_user: User = Depends(deps.require_role(UserRole.RECRUITER)),
):
    """Closes an active recruitment drive to new applications."""
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found.")

    if drive.created_by != current_user.id and current_user.role != UserRole.COLLEGE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized.")

    drive.status = DriveStatus.CLOSED
    drive.updated_at = datetime.now(timezone.utc)
    repo.save_drive(drive)

    apps = repo.list_applications_for_drive(drive.id)
    return DriveResponse(
        id=drive.id,
        created_by=drive.created_by,
        company_name=drive.company_name,
        job_title=drive.job_title,
        description=drive.description,
        location=drive.location,
        employment_type=drive.employment_type,
        ctc_range=drive.ctc_range,
        application_deadline=drive.application_deadline,
        assessment_start=drive.assessment_start,
        assessment_end=drive.assessment_end,
        status=drive.status,
        skills=drive.skills,
        eligibility=drive.eligibility,
        created_at=drive.created_at,
        updated_at=drive.updated_at,
        applicant_count=len(apps),
    )


# ----------------------------------------------------------------------
# 2. Deterministic Eligibility Check (Section 28)
# ----------------------------------------------------------------------

@router.get("/{drive_id}/eligibility", response_model=EligibilityEvaluationResponse)
def check_student_eligibility(
    drive_id: str,
    current_user: User = Depends(deps.require_role(UserRole.STUDENT)),
):
    """
    Evaluates deterministic eligibility for the calling student.
    Returns whether the student can apply, individual criteria breakdown,
    reasons for rejection if any, and active resume status.
    """
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found.")

    profile = repo.get_student_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")

    is_eligible, reasons, breakdown = EligibilityEngine.evaluate(drive, profile)
    resume = repo.get_resume_analysis(current_user.id)
    existing_app = repo.get_application_for_student_drive(current_user.id, drive_id)

    can_apply = is_eligible and (resume is not None) and (existing_app is None) and (drive.status in [DriveStatus.PUBLISHED, DriveStatus.OPEN])

    return EligibilityEvaluationResponse(
        drive_id=drive.id,
        student_id=current_user.id,
        is_eligible=is_eligible,
        reasons=reasons,
        criteria_breakdown=breakdown,
        can_apply=can_apply,
        has_active_resume=resume is not None,
        already_applied=existing_app is not None,
    )


# ----------------------------------------------------------------------
# 3. Student Application Submission (Section 29 & Section 60)
# ----------------------------------------------------------------------

@router.post("/{drive_id}/apply", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_to_drive(
    drive_id: str,
    req: ApplicationCreateRequest = ApplicationCreateRequest(),
    current_user: User = Depends(deps.require_role(UserRole.STUDENT)),
):
    """
    Student applies to a published drive:
    1. Checks drive status is PUBLISHED or OPEN.
    2. Runs deterministic eligibility engine.
    3. Verifies active uploaded resume exists.
    4. Enforces duplicate check (raises 400 if already applied).
    5. Creates Application with status APPLIED.
    """
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found.")

    if drive.status not in [DriveStatus.PUBLISHED, DriveStatus.OPEN]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This recruitment drive is {drive.status.value.lower()} and not currently accepting applications.",
        )

    # 1. Eligibility Check
    profile = repo.get_student_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student profile record not found.")

    is_eligible, reasons, _ = EligibilityEngine.evaluate(drive, profile)
    if not is_eligible:
        reason_msg = "; ".join(reasons)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You do not meet the eligibility requirements for this drive: {reason_msg}",
        )

    # 2. Resume Check
    resume = repo.get_resume_analysis(current_user.id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must upload and verify your resume PDF before applying to recruitment drives.",
        )

    # 3. Duplicate Application Check & Creation
    try:
        app = repo.create_application(
            drive_id=drive.id,
            student_id=current_user.id,
            resume_id=resume.id,
            notes=req.notes,
        )

        # Phase 10: Section 105 Asynchronous Best-Effort Notification Dispatch
        try:
            # 1. Student Notification
            NotificationService.dispatch(
                user_id=current_user.id,
                notification_type=NotificationType.APPLICATION_SUBMITTED,
                title="Application Submitted",
                message=f"Your application for {drive.company_name} - {drive.job_title} has been submitted successfully.",
                metadata={"drive_id": drive.id, "application_id": app.id, "company_name": drive.company_name, "job_title": drive.job_title},
            )
            # 2. Recruiter Notification
            if drive.created_by:
                NotificationService.dispatch(
                    user_id=drive.created_by,
                    notification_type=NotificationType.NEW_APPLICATION,
                    title=f"New Candidate Applied: {drive.job_title}",
                    message=f"{current_user.full_name} submitted an application for {drive.company_name} - {drive.job_title}.",
                    metadata={"drive_id": drive.id, "application_id": app.id, "student_id": current_user.id},
                )
        except Exception as dispatch_err:
            import logging
            logging.getLogger(__name__).warning(f"Error dispatching application notifications: {dispatch_err}")

        return ApplicationResponse(
            id=app.id,
            drive_id=app.drive_id,
            student_id=app.student_id,
            resume_id=app.resume_id,
            status=app.status,
            applied_at=app.applied_at,
            updated_at=app.updated_at,
            notes=app.notes,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


# ----------------------------------------------------------------------
# 4. Recruiter Applicant Review & Status Management
# ----------------------------------------------------------------------

@router.get("/{drive_id}/applications", response_model=List[ApplicantDetailResponse])
def list_drive_applicants(
    drive_id: str,
    current_user: User = Depends(deps.require_role(UserRole.RECRUITER)),
):
    """
    Recruiter reviews all applicants for their drive.
    Returns candidate profile information, verified academic metrics, and application status.
    """
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found.")

    if drive.created_by != current_user.id and current_user.role != UserRole.COLLEGE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view applications for this drive.",
        )

    apps = repo.list_applications_for_drive(drive_id)
    details: List[ApplicantDetailResponse] = []

    for a in apps:
        student_user = repo._users_by_id.get(a.student_id)
        profile = repo.get_student_profile(a.student_id)
        resume = repo.get_resume_analysis(a.student_id)

        student_name = student_user.full_name if student_user else "Candidate"
        student_email = student_user.email if student_user else ""
        roll_num = profile.register_number if profile else ""
        dept = profile.department if profile else ""
        cgpa = profile.verified_cgpa if profile else 0.0
        grad_year = profile.graduation_year if profile else 0
        backlogs = profile.active_backlogs if profile else 0
        skills = resume.canonical_skills if resume else [s.name for s in profile.skills] if profile else []

        details.append(
            ApplicantDetailResponse(
                id=a.id,
                drive_id=a.drive_id,
                student_id=a.student_id,
                resume_id=a.resume_id,
                status=a.status,
                applied_at=a.applied_at,
                updated_at=a.updated_at,
                notes=a.notes,
                student_name=student_name,
                student_email=student_email,
                roll_number=roll_num,
                department=dept,
                cgpa=cgpa,
                graduation_year=grad_year,
                active_backlogs=backlogs,
                canonical_skills=skills,
            )
        )

    return details

@router.put("/{drive_id}/applications/{app_id}/status", response_model=ApplicationResponse)
def update_applicant_status(
    drive_id: str,
    app_id: str,
    req: ApplicationStatusUpdateRequest,
    current_user: User = Depends(deps.require_role(UserRole.RECRUITER)),
):
    """Recruiter advances candidate status (SHORTLISTED, REJECTED, UNDER_REVIEW)."""
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found.")

    if drive.created_by != current_user.id and current_user.role != UserRole.COLLEGE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized.")

    app = repo.get_application(app_id)
    if not app or app.drive_id != drive_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    updated = repo.update_application_status(app_id, req.status, req.notes)

    # Phase 10: Section 105 Asynchronous Best-Effort Notification Dispatch
    try:
        if req.status == ApplicationStatus.SHORTLISTED:
            ntype = NotificationType.CANDIDATE_SHORTLISTED
            title = f"Shortlisted for {drive.company_name}"
            msg = f"Congratulations! You have been shortlisted for {drive.job_title} at {drive.company_name}."
        elif req.status == ApplicationStatus.REJECTED:
            ntype = NotificationType.CANDIDATE_REJECTED
            title = f"Application Status Update: {drive.company_name}"
            msg = f"Thank you for your interest in {drive.company_name} - {drive.job_title}. Your application was not selected at this stage."
        else:
            ntype = NotificationType.APPLICATION_STATUS_CHANGED
            title = f"Application Status Update: {drive.company_name}"
            msg = f"Your application status for {drive.job_title} at {drive.company_name} has been updated to {req.status.value}."

        NotificationService.dispatch(
            user_id=updated.student_id,
            notification_type=ntype,
            title=title,
            message=msg,
            metadata={"drive_id": drive.id, "application_id": updated.id, "new_status": req.status.value},
        )
    except Exception as dispatch_err:
        import logging
        logging.getLogger(__name__).warning(f"Error dispatching application status update notification: {dispatch_err}")

    return ApplicationResponse(
        id=updated.id,
        drive_id=updated.drive_id,
        student_id=updated.student_id,
        resume_id=updated.resume_id,
        status=updated.status,
        applied_at=updated.applied_at,
        updated_at=updated.updated_at,
        notes=updated.notes,
    )


# ----------------------------------------------------------------------
# 5. Phase 5 Hybrid Match Engine Endpoints (Sections 23–26, 30–35, 100)
# ----------------------------------------------------------------------

@router.get("/{drive_id}/ranked-applicants", response_model=DriveRankedApplicantsResponse)
def list_ranked_applicants(
    drive_id: str,
    current_user: User = Depends(deps.require_role([UserRole.RECRUITER, UserRole.COLLEGE_ADMIN])),
):
    """
    Returns candidate applications for a drive ranked by composite hybrid match score.
    Multi-factor evaluation: Required Skills (40%), Semantic (25%), Evidence (20%), Preferred (15%).
    Fully deterministic and explainable.
    """
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found.")

    if drive.created_by != current_user.id and current_user.role != UserRole.COLLEGE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view applications for this drive.",
        )

    apps = repo.list_applications_for_drive(drive_id)
    ranked_items: List[DriveApplicantRankedItem] = []

    for a in apps:
        student_user = repo._users_by_id.get(a.student_id)
        profile = repo.get_student_profile(a.student_id)
        resume = repo.get_resume_analysis(a.student_id)

        # Retrieve cached match or compute
        match_result = repo.get_match_result(drive_id, a.student_id)
        if not match_result and resume:
            match_result = MatchingEngine.evaluate_match(
                drive=drive,
                resume=resume,
                student_profile=profile,
                application_id=a.id,
            )
            repo.save_match_result(match_result)

        overall_score = match_result.scores.overall_score if match_result else 0.0
        req_score = match_result.scores.required_skill_score if match_result else 0.0
        pref_score = match_result.scores.preferred_skill_score if match_result else 0.0
        sem_score = match_result.scores.semantic_score if match_result else 0.0
        ev_score = match_result.scores.evidence_score if match_result else 0.0
        matched_req_cnt = len(match_result.matched_required_skills) if match_result else 0
        total_req_cnt = len(match_result.matched_required_skills) + len(match_result.missing_required_skills) if match_result else len([s for s in drive.skills if s.requirement_type == RequirementType.REQUIRED])
        matched_pref_cnt = len(match_result.matched_preferred_skills) if match_result else 0
        total_pref_cnt = len(match_result.matched_preferred_skills) + len(match_result.missing_preferred_skills) if match_result else len([s for s in drive.skills if s.requirement_type == RequirementType.PREFERRED])
        recommendation = match_result.recommendation if match_result else "PENDING_EVALUATION"

        student_name = student_user.full_name if student_user else "Candidate"
        student_email = student_user.email if student_user else ""
        roll_num = profile.register_number if profile else ""
        dept = profile.department if profile else ""
        cgpa = profile.verified_cgpa if profile else 0.0
        grad_year = profile.graduation_year if profile else 0
        backlogs = profile.active_backlogs if profile else 0

        ranked_items.append(
            DriveApplicantRankedItem(
                application_id=a.id,
                drive_id=a.drive_id,
                student_id=a.student_id,
                student_name=student_name,
                student_email=student_email,
                roll_number=roll_num,
                department=dept,
                verified_cgpa=cgpa,
                graduation_year=grad_year,
                active_backlogs=backlogs,
                application_status=a.status,
                overall_match_score=overall_score,
                required_skill_score=req_score,
                preferred_skill_score=pref_score,
                semantic_score=sem_score,
                evidence_score=ev_score,
                matched_required_count=matched_req_cnt,
                total_required_count=total_req_cnt,
                matched_preferred_count=matched_pref_cnt,
                total_preferred_count=total_pref_cnt,
                recommendation=recommendation,
                score_version=SCORE_VERSION,
                applied_at=a.applied_at,
            )
        )

    # Sort descending by overall match score
    ranked_items.sort(key=lambda x: x.overall_match_score, reverse=True)

    return DriveRankedApplicantsResponse(
        drive_id=drive.id,
        job_title=drive.job_title,
        company_name=drive.company_name,
        score_version=SCORE_VERSION,
        total_applicants=len(ranked_items),
        applicants=ranked_items,
    )


@router.get("/{drive_id}/applications/{app_id}/match", response_model=MatchDetailResponse)
def get_applicant_match_breakdown(
    drive_id: str,
    app_id: str,
    current_user: User = Depends(deps.require_role([UserRole.RECRUITER, UserRole.COLLEGE_ADMIN])),
):
    """
    Recruiter inspects transparent, evidence-backed candidate match breakdown (Section 25).
    Never shows only '87% match'; shows exact evidence citations, section attribution, and missing skills.
    """
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found.")

    if drive.created_by != current_user.id and current_user.role != UserRole.COLLEGE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized.")

    app = repo.get_application(app_id)
    if not app or app.drive_id != drive_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    resume = repo.get_resume_analysis(app.student_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student resume analysis not found.")

    profile = repo.get_student_profile(app.student_id)

    # Compute or retrieve match
    match_result = repo.get_match_result(drive_id, app.student_id)
    if not match_result:
        match_result = MatchingEngine.evaluate_match(
            drive=drive,
            resume=resume,
            student_profile=profile,
            application_id=app.id,
        )
        repo.save_match_result(match_result)

    def to_schema(d):
        return SkillMatchSchema(
            skill_name=d.skill_name,
            canonical_name=d.canonical_name,
            requirement_type=d.requirement_type,
            weight=d.weight,
            is_matched=d.is_matched,
            evidence_found=d.evidence_found,
            evidence_snippet=d.evidence_snippet,
            evidence_section=d.evidence_section,
            confidence=d.confidence,
        )

    return MatchDetailResponse(
        application_id=app.id,
        drive_id=drive.id,
        student_id=app.student_id,
        scores=MatchComponentScoresSchema(
            required_skill_score=match_result.scores.required_skill_score,
            preferred_skill_score=match_result.scores.preferred_skill_score,
            semantic_score=match_result.scores.semantic_score,
            evidence_score=match_result.scores.evidence_score,
            assessment_score=match_result.scores.assessment_score,
            overall_score=match_result.scores.overall_score,
        ),
        score_version=match_result.score_version,
        weights_used=match_result.weights_used,
        matched_required_skills=[to_schema(s) for s in match_result.matched_required_skills],
        missing_required_skills=[to_schema(s) for s in match_result.missing_required_skills],
        matched_preferred_skills=[to_schema(s) for s in match_result.matched_preferred_skills],
        missing_preferred_skills=[to_schema(s) for s in match_result.missing_preferred_skills],
        semantic_summary=match_result.semantic_summary,
        evidence_summary=match_result.evidence_summary,
        recommendation=match_result.recommendation,
        evaluated_at=match_result.evaluated_at,
    )


@router.get("/{drive_id}/my-match", response_model=StudentSkillGapResponse)
def get_student_drive_match(
    drive_id: str,
    current_user: User = Depends(deps.require_role(UserRole.STUDENT)),
):
    """
    Empowers students to inspect their own skill match readiness and preparation tips
    against a published placement drive.
    """
    drive = repo.get_drive(drive_id)
    if not drive:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drive not found.")

    resume = repo.get_resume_analysis(current_user.id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload and verify your resume first to view skill match readiness.",
        )

    profile = repo.get_student_profile(current_user.id)
    match_result = MatchingEngine.evaluate_match(
        drive=drive,
        resume=resume,
        student_profile=profile,
    )

    # Readiness level
    if match_result.scores.overall_score >= 80:
        readiness = "High (Excellent Candidate Fit)"
    elif match_result.scores.overall_score >= 60:
        readiness = "Medium (Competitive Candidate)"
    else:
        readiness = "Needs Preparation (Skill Gaps Detected)"

    tips = []
    if match_result.missing_required_skills:
        missing_names = [m.skill_name for m in match_result.missing_required_skills]
        tips.append(f"Consider acquiring or highlighting experience in core required skills: {', '.join(missing_names)}.")
    if match_result.missing_preferred_skills:
        missing_pref = [m.skill_name for m in match_result.missing_preferred_skills[:2]]
        tips.append(f"Adding preferred technologies such as {', '.join(missing_pref)} will increase your competitive edge.")
    if match_result.scores.evidence_score < 70:
        tips.append("Add code repositories, GitHub URLs, or live demo links in your projects to boost verified skill evidence.")
    if not tips:
        tips.append("Your skills and evidence strongly align with this recruiter's requirements. Proceed with confidence!")

    return StudentSkillGapResponse(
        drive_id=drive.id,
        job_title=drive.job_title,
        company_name=drive.company_name,
        overall_match_score=match_result.scores.overall_score,
        required_skill_score=match_result.scores.required_skill_score,
        preferred_skill_score=match_result.scores.preferred_skill_score,
        semantic_score=match_result.scores.semantic_score,
        evidence_score=match_result.scores.evidence_score,
        matched_required_skills=[m.skill_name for m in match_result.matched_required_skills],
        missing_required_skills=[m.skill_name for m in match_result.missing_required_skills],
        matched_preferred_skills=[m.skill_name for m in match_result.matched_preferred_skills],
        missing_preferred_skills=[m.skill_name for m in match_result.missing_preferred_skills],
        readiness_level=readiness,
        preparation_tips=tips,
    )

