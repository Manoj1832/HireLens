from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime, timezone
import uuid

class UserRole(str, Enum):
    STUDENT = "STUDENT"
    RECRUITER = "RECRUITER"
    COLLEGE_ADMIN = "COLLEGE_ADMIN"

class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    SUSPENDED = "SUSPENDED"

class StudentDirectoryRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    register_number: str
    name: str
    institutional_email: EmailStr
    department: str
    batch: str
    graduation_year: int
    cgpa: float
    status: str = "ACTIVE"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE
    full_name: str
    department: Optional[str] = None
    register_number: Optional[str] = None
    batch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    company_name: Optional[str] = None
    designation: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login_at: Optional[datetime] = None
