import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.user import User, UserRole
from app.models.profile import (
    StudentProfile,
    SkillItem,
    ProjectItem,
    CertificationItem,
    EducationItem,
    ExperienceItem
)
from app.schemas.profile import (
    StudentProfileResponse,
    StudentProfileUpdateInput,
    SkillInput,
    ProjectInput,
    CertificationInput,
    EducationInput,
    ExperienceInput,
    OptInUpdateRequest
)
from app.api.deps import require_role
from app.db.repository import repo

logger = logging.getLogger("hirelens.student")
router = APIRouter()

@router.get("/profile", response_model=StudentProfileResponse)
async def get_my_profile(current_user: User = Depends(require_role(UserRole.STUDENT))):
    """
    Retrieve the authenticated student's full profile, including verified academic records,
    skills, projects, certifications, and dynamic profile completion score.
    """
    profile = repo.get_student_profile(current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found."
        )
    return profile

@router.put("/profile", response_model=StudentProfileResponse)
async def update_my_profile(
    payload: StudentProfileUpdateInput,
    current_user: User = Depends(require_role(UserRole.STUDENT))
):
    """
    Update student profile details.
    Enforces strict institutional boundary: institutional_email, register_number,
    department, batch, graduation_year, and verified_cgpa are immutable.
    """
    profile = repo.get_student_profile(current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found."
        )

    # Apply editable fields
    if payload.full_name is not None:
        profile.full_name = payload.full_name.strip()
        current_user.full_name = profile.full_name
        repo.save_user(current_user)

    if payload.headline is not None:
        profile.headline = payload.headline.strip()

    if payload.summary is not None:
        profile.summary = payload.summary.strip()

    if payload.phone is not None:
        profile.phone = payload.phone.strip()

    if payload.github_url is not None:
        profile.github_url = payload.github_url.strip()

    if payload.linkedin_url is not None:
        profile.linkedin_url = payload.linkedin_url.strip()

    if payload.portfolio_url is not None:
        profile.portfolio_url = payload.portfolio_url.strip()

    if payload.skills is not None:
        profile.skills = payload.skills

    if payload.projects is not None:
        profile.projects = payload.projects

    if payload.certifications is not None:
        profile.certifications = payload.certifications

    if payload.education is not None:
        profile.education = payload.education

    if payload.experience is not None:
        profile.experience = payload.experience

    profile.updated_at = datetime.now(timezone.utc)
    updated_profile = repo.save_student_profile(profile)
    logger.info(f"Updated profile for student {current_user.email} (completion: {updated_profile.completion_percentage}%)")
    return updated_profile

@router.post("/profile/skills", response_model=StudentProfileResponse)
async def add_skill(
    payload: SkillInput,
    current_user: User = Depends(require_role(UserRole.STUDENT))
):
    profile = repo.get_student_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    new_skill = SkillItem(
        name=payload.name.strip(),
        category=payload.category.strip(),
        proficiency=payload.proficiency.strip() if payload.proficiency else "Intermediate"
    )
    profile.skills.append(new_skill)
    profile.updated_at = datetime.now(timezone.utc)
    return repo.save_student_profile(profile)

@router.delete("/profile/skills/{skill_id}", response_model=StudentProfileResponse)
async def delete_skill(
    skill_id: str,
    current_user: User = Depends(require_role(UserRole.STUDENT))
):
    profile = repo.get_student_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    profile.skills = [s for s in profile.skills if s.id != skill_id]
    profile.updated_at = datetime.now(timezone.utc)
    return repo.save_student_profile(profile)

@router.post("/profile/projects", response_model=StudentProfileResponse)
async def add_project(
    payload: ProjectInput,
    current_user: User = Depends(require_role(UserRole.STUDENT))
):
    profile = repo.get_student_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    new_project = ProjectItem(
        title=payload.title.strip(),
        description=payload.description.strip(),
        skills_used=[s.strip() for s in payload.skills_used if s.strip()],
        project_url=payload.project_url.strip() if payload.project_url else None,
        github_url=payload.github_url.strip() if payload.github_url else None,
        start_date=payload.start_date,
        end_date=payload.end_date
    )
    profile.projects.append(new_project)
    profile.updated_at = datetime.now(timezone.utc)
    return repo.save_student_profile(profile)

@router.delete("/profile/projects/{project_id}", response_model=StudentProfileResponse)
async def delete_project(
    project_id: str,
    current_user: User = Depends(require_role(UserRole.STUDENT))
):
    profile = repo.get_student_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    profile.projects = [p for p in profile.projects if p.id != project_id]
    profile.updated_at = datetime.now(timezone.utc)
    return repo.save_student_profile(profile)

@router.post("/profile/certifications", response_model=StudentProfileResponse)
async def add_certification(
    payload: CertificationInput,
    current_user: User = Depends(require_role(UserRole.STUDENT))
):
    profile = repo.get_student_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    new_cert = CertificationItem(
        name=payload.name.strip(),
        issuing_organization=payload.issuing_organization.strip(),
        issue_date=payload.issue_date,
        expiration_date=payload.expiration_date,
        credential_id=payload.credential_id.strip() if payload.credential_id else None,
        credential_url=payload.credential_url.strip() if payload.credential_url else None
    )
    profile.certifications.append(new_cert)
    profile.updated_at = datetime.now(timezone.utc)
    return repo.save_student_profile(profile)

@router.delete("/profile/certifications/{cert_id}", response_model=StudentProfileResponse)
async def delete_certification(
    cert_id: str,
    current_user: User = Depends(require_role(UserRole.STUDENT))
):
    profile = repo.get_student_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    profile.certifications = [c for c in profile.certifications if c.id != cert_id]
    profile.updated_at = datetime.now(timezone.utc)
    return repo.save_student_profile(profile)

@router.put("/profile/opt-in-status", response_model=StudentProfileResponse)
async def update_opt_in_status(
    payload: OptInUpdateRequest,
    current_user: User = Depends(require_role(UserRole.STUDENT))
):
    """
    Toggle campus recruitment participation consent.
    Students who opt out will not appear in recruiter candidate shortlists
    or be eligible to submit applications to campus recruitment drives.
    """
    profile = repo.get_student_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    profile.placement_opt_in = payload.placement_opt_in
    profile.opt_out_reason = payload.opt_out_reason.strip() if (not payload.placement_opt_in and payload.opt_out_reason) else None
    profile.opt_in_updated_at = datetime.now(timezone.utc)
    profile.updated_at = datetime.now(timezone.utc)

    saved = repo.save_student_profile(profile)
    status_label = "OPTED_IN" if saved.placement_opt_in else f"OPTED_OUT (Reason: {saved.opt_out_reason})"
    logger.info(f"Student {current_user.email} updated placement consent: {status_label}")
    return saved

