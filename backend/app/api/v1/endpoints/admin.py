from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.api.deps import require_role
from app.db.repository import repo
from app.models.user import UserRole, StudentDirectoryRecord, User
from app.schemas.auth import (
    StudentDirectoryCreateInput,
    StudentDirectoryImportInput,
    UserResponse
)

router = APIRouter()

class InviteRecruiterInput(BaseModel):
    email: EmailStr
    full_name: str
    company_name: str
    designation: str

@router.get("/student-directory", response_model=List[StudentDirectoryRecord])
async def get_student_directory(
    current_admin: User = Depends(require_role([UserRole.COLLEGE_ADMIN]))
):
    """
    Returns full college student directory. Restricted to COLLEGE_ADMIN.
    """
    return repo.list_student_directory()

@router.post("/student-directory", response_model=StudentDirectoryRecord, status_code=status.HTTP_201_CREATED)
async def add_student_to_directory(
    payload: StudentDirectoryCreateInput,
    current_admin: User = Depends(require_role([UserRole.COLLEGE_ADMIN]))
):
    """
    Enroll a single verified student into the directory.
    """
    existing = repo.find_in_student_directory(payload.institutional_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student record with email {payload.institutional_email} already exists."
        )

    record = StudentDirectoryRecord(
        register_number=payload.register_number,
        name=payload.name,
        institutional_email=payload.institutional_email,
        department=payload.department,
        batch=payload.batch,
        graduation_year=payload.graduation_year,
        cgpa=payload.cgpa
    )
    return repo.add_to_student_directory(record)

@router.post("/student-directory/import", response_model=List[StudentDirectoryRecord])
async def import_students(
    payload: StudentDirectoryImportInput,
    current_admin: User = Depends(require_role([UserRole.COLLEGE_ADMIN]))
):
    """
    Batch import student records from college placement office files.
    """
    added = []
    for item in payload.students:
        record = StudentDirectoryRecord(
            register_number=item.register_number,
            name=item.name,
            institutional_email=item.institutional_email,
            department=item.department,
            batch=item.batch,
            graduation_year=item.graduation_year,
            cgpa=item.cgpa
        )
        repo.add_to_student_directory(record)
        added.append(record)
    return added

@router.post("/invite-recruiter", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def invite_recruiter(
    payload: InviteRecruiterInput,
    current_admin: User = Depends(require_role([UserRole.COLLEGE_ADMIN]))
):
    """
    Provision authorized Recruiter account.
    """
    existing = repo.get_user_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User {payload.email} already exists with role {existing.role.value}"
        )

    user = User(
        email=payload.email,
        role=UserRole.RECRUITER,
        full_name=payload.full_name,
        company_name=payload.company_name,
        designation=payload.designation
    )
    repo.save_user(user)
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
        full_name=user.full_name,
        company_name=user.company_name,
        designation=user.designation
    )


class CleanDatabaseResponse(BaseModel):
    success: bool
    message: str
    reseeded: bool


@router.post("/clean-database", response_model=CleanDatabaseResponse)
async def clean_database_endpoint(
    reseed: bool = True,
    current_admin: User = Depends(require_role([UserRole.COLLEGE_ADMIN]))
):
    """
    Cleans all temporary JSON persistence stores and re-seeds with fresh OOP synchronized baseline data.
    Restricted to COLLEGE_ADMIN.
    """
    repo.clean_database(reseed=reseed)
    return CleanDatabaseResponse(
        success=True,
        message="Database successfully purged and synchronized via Strong OOP Observer pattern.",
        reseeded=reseed
    )

