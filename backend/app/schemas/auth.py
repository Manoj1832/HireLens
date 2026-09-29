from typing import Optional, List
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole, UserStatus, StudentDirectoryRecord

class RequestOTPInput(BaseModel):
    email: EmailStr

class RequestOTPResponse(BaseModel):
    success: bool
    message: str
    is_institutional_student: bool
    auth_method: str = "otp"
    detected_role: Optional[UserRole] = None
    dev_otp: Optional[str] = None  # Provided in development environment for convenience

class VerifyOTPInput(BaseModel):
    email: EmailStr
    otp: str

class PasskeyLoginInput(BaseModel):
    email: EmailStr
    passkey: str

class AuthIdentifyInput(BaseModel):
    email: EmailStr

class AuthIdentifyResponse(BaseModel):
    email: EmailStr
    detected_role: UserRole
    auth_method: str  # "otp" or "passkey"
    role_title: str
    portal_target: str
    is_institutional: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: UserRole
    status: UserStatus
    full_name: str
    department: Optional[str] = None
    register_number: Optional[str] = None
    batch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    company_name: Optional[str] = None
    designation: Optional[str] = None

class DevLoginInput(BaseModel):
    role: UserRole

class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.STUDENT
    department: Optional[str] = None
    register_number: Optional[str] = None
    batch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    company_name: Optional[str] = None
    designation: Optional[str] = None

class VerifyEmailInput(BaseModel):
    email: EmailStr
    code: str

class PasswordLoginInput(BaseModel):
    email: EmailStr
    password: str

class StudentDirectoryCreateInput(BaseModel):
    register_number: str
    name: str
    institutional_email: EmailStr
    department: str
    batch: str
    graduation_year: int
    cgpa: float

class StudentDirectoryImportInput(BaseModel):
    students: List[StudentDirectoryCreateInput]

TokenResponse.model_rebuild()

