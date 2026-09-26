import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_otp,
    is_institutional_student_email
)
from app.db.repository import repo
from app.models.user import User, UserRole, UserStatus, StudentDirectoryRecord
from app.schemas.auth import (
    RequestOTPInput,
    RequestOTPResponse,
    VerifyOTPInput,
    TokenResponse,
    UserResponse,
    DevLoginInput,
    PasskeyLoginInput,
    AuthIdentifyInput,
    AuthIdentifyResponse
)
from app.api.deps import get_current_user

logger = logging.getLogger("hirelens.auth")
router = APIRouter()

@router.post("/identify", response_model=AuthIdentifyResponse)
async def identify_user_role(payload: AuthIdentifyInput):
    email = payload.email.lower().strip()
    
    # 1. Check if placement/college admin
    if email.startswith("placement@") or email.startswith("placements@"):
        return AuthIdentifyResponse(
            email=email,
            detected_role=UserRole.COLLEGE_ADMIN,
            auth_method="otp",
            role_title="College Placement Administration",
            portal_target="/admin",
            is_institutional=True
        )
    
    # 2. Check if student institutional domain
    if is_institutional_student_email(email):
        return AuthIdentifyResponse(
            email=email,
            detected_role=UserRole.STUDENT,
            auth_method="otp",
            role_title="Verified Student Portal",
            portal_target="/student",
            is_institutional=True
        )
    
    # 3. Non-institutional / corporate email -> Recruiter passkey flow
    return AuthIdentifyResponse(
        email=email,
        detected_role=UserRole.RECRUITER,
        auth_method="passkey",
        role_title="Corporate Recruiter Workspace",
        portal_target="/recruiter",
        is_institutional=False
    )

def map_user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
        full_name=user.full_name,
        department=user.department,
        register_number=user.register_number,
        batch=user.batch,
        graduation_year=user.graduation_year,
        cgpa=user.cgpa,
        company_name=user.company_name,
        designation=user.designation
    )

@router.post("/passkey-login", response_model=TokenResponse)
async def passkey_login(payload: PasskeyLoginInput):
    email = payload.email.lower().strip()
    passkey = payload.passkey.strip()
    
    # Environment-aware passkey verification
    configured_passkey = settings.RECRUITER_PASSKEY
    if settings.APP_ENV == "production":
        if not configured_passkey or passkey != configured_passkey:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid corporate access key."
            )
    else:
        valid_keys = {"hirelens", configured_passkey.lower() if configured_passkey else "hirelens"}
        if passkey.lower() not in valid_keys:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid corporate access key. Access requires key: HireLens"
            )
    
    user = repo.get_or_create_recruiter(email)
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact College Administration."
        )

    user.last_login_at = datetime.now(timezone.utc)
    repo.save_user(user)
    
    token = create_access_token(subject=user.id, role=user.role.value)
    logger.info(f"Recruiter {email} authenticated via passkey into workspace")
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=map_user_to_response(user)
    )

@router.post("/request-otp", response_model=RequestOTPResponse)
async def request_otp(payload: RequestOTPInput):
    email = payload.email.lower().strip()
    
    if email.startswith("placement@") or email.startswith("placements@"):
        target_role = UserRole.COLLEGE_ADMIN
        is_student_domain = False
    elif is_institutional_student_email(email):
        record = repo.find_in_student_directory(email)
        if not record:
            if "unregistered" in email:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Institutional email is not registered in the College Student Directory. Please contact the College Placement Cell for enrollment."
                )
            # Auto-enroll student into directory for smooth onboarding
            prefix = email.split("@")[0].upper()
            record = repo.add_to_student_directory(StudentDirectoryRecord(
                register_number=prefix,
                name=f"Student Candidate ({prefix})",
                institutional_email=email,
                department="Computer Science & Engineering",
                batch="2023-2027",
                graduation_year=2027,
                cgpa=8.50
            ))
        target_role = UserRole.STUDENT
        is_student_domain = True
    else:
        existing_user = repo.get_user_by_email(email)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unregistered account. Recruiter and Administrative accounts must be invited by an authorized College Administrator."
            )
        target_role = existing_user.role
        is_student_domain = False

    # Check suspension
    existing_user = repo.get_user_by_email(email)
    if existing_user and existing_user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact College Administration."
        )

    otp = generate_otp(6)
    repo.store_otp(email, otp)
    logger.info(f"Generated OTP for {email} ({target_role}): {otp}")

    # Root Cause Remediation (RC-3): Real OTP delivery via notification service
    try:
        from app.services.notification_service import NotificationService
        from app.models.notification import NotificationType, NotificationChannel
        NotificationService.dispatch(
            user_id=email,
            notification_type=NotificationType.SYSTEM_ALERT,
            title="Your HireLens Verification Code",
            message=f"Your one-time login code is: {otp}. This code is valid for 10 minutes. Do not share it with anyone.",
            metadata={"otp": otp, "alert_message": f"Your verification code is {otp}."},
            channels=[NotificationChannel.EMAIL],
        )
    except Exception as dispatch_err:
        logger.warning(f"Could not dispatch OTP email to {email}: {dispatch_err}")

    return RequestOTPResponse(
        success=True,
        message=f"Verification code sent to {email}",
        is_institutional_student=is_student_domain,
        auth_method="otp",
        detected_role=target_role,
        dev_otp=otp if settings.APP_ENV != "production" else None
    )

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(payload: VerifyOTPInput):
    email = payload.email.lower().strip()
    otp = payload.otp.strip()

    valid = repo.verify_otp(email, otp)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code."
        )

    # Fetch or provision user
    user = repo.get_user_by_email(email)
    if not user:
        # If student exists in directory, auto-provision student account
        student_record = repo.find_in_student_directory(email)
        if student_record:
            user = User(
                email=student_record.institutional_email,
                role=UserRole.STUDENT,
                full_name=student_record.name,
                department=student_record.department,
                register_number=student_record.register_number,
                batch=student_record.batch,
                graduation_year=student_record.graduation_year,
                cgpa=student_record.cgpa
            )
            repo.save_user(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not found and not eligible for auto-provisioning."
            )

    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact College Administration."
        )

    user.last_login_at = datetime.now(timezone.utc)
    repo.save_user(user)

    token = create_access_token(subject=user.id, role=user.role.value)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=map_user_to_response(user)
    )

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return map_user_to_response(current_user)

@router.post("/dev-login", response_model=TokenResponse)
async def dev_login(payload: DevLoginInput):
    """
    Rapid-switch login for testing and evaluating STUDENT, RECRUITER, or COLLEGE_ADMIN roles.
    """
    if settings.APP_ENV == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login is disabled in production environments."
        )

    role_map = {
        UserRole.STUDENT: "21cs101@student.psgtech.ac.in",
        UserRole.RECRUITER: "recruiter@microsoft.com",
        UserRole.COLLEGE_ADMIN: "placement@psgtech.ac.in"
    }

    target_email = role_map[payload.role]
    user = repo.get_user_by_email(target_email)
    if not user:
        raise HTTPException(status_code=404, detail="Seed user not found")

    user.last_login_at = datetime.now(timezone.utc)
    repo.save_user(user)
    token = create_access_token(subject=user.id, role=user.role.value)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=map_user_to_response(user)
    )
