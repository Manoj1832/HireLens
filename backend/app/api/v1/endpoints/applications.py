"""
Student Applications Management Endpoints.
Complies with Section 29 & Section 60 of the Master Build Specification.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
from app.api import deps
from app.models.user import User, UserRole
from app.models.drive import ApplicationStatus
from app.db.repository import repo

router = APIRouter()

class StudentApplicationItem(BaseModel):
    id: str
    drive_id: str
    company_name: str
    job_title: str
    location: str
    employment_type: str
    ctc_range: str | None = None
    status: ApplicationStatus
    applied_at: datetime
    updated_at: datetime
    notes: str | None = None

@router.get("/my", response_model=List[StudentApplicationItem])
def get_my_applications(
    current_user: User = Depends(deps.require_role(UserRole.STUDENT)),
):
    """Retrieves all recruitment drive applications submitted by the current student."""
    apps = repo.list_applications_for_student(current_user.id)
    items: List[StudentApplicationItem] = []

    for a in apps:
        drive = repo.get_drive(a.drive_id)
        if drive:
            items.append(
                StudentApplicationItem(
                    id=a.id,
                    drive_id=drive.id,
                    company_name=drive.company_name,
                    job_title=drive.job_title,
                    location=drive.location,
                    employment_type=drive.employment_type,
                    ctc_range=drive.ctc_range,
                    status=a.status,
                    applied_at=a.applied_at,
                    updated_at=a.updated_at,
                    notes=a.notes,
                )
            )

    return sorted(items, key=lambda x: x.applied_at, reverse=True)
