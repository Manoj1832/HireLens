import random
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from jose import jwt, JWTError
from app.core.config import settings

ALGORITHM = "HS256"

def create_access_token(
    subject: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
    token_version: int = 1
) -> str:
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "ver": token_version,
        "exp": expire,
        "iat": now_utc
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

import secrets

def generate_otp(length: int = 6) -> str:
    """Cryptographically secure OTP generation using secrets module."""
    return "".join(secrets.choice(string.digits) for _ in range(length))

def is_institutional_student_email(email: str) -> bool:
    """
    Validates that the email domain belongs to permitted collegiate domains.
    e.g. 21cs101@student.psgtech.ac.in -> domain: student.psgtech.ac.in
    """
    if "@" not in email:
        return False
    domain = email.split("@")[1].lower().strip()
    return domain in settings.ALLOWED_DOMAINS


import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against a stored bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password[:72].encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Generates a secure bcrypt hash for a user password."""
    pwd_bytes = password[:72].encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


