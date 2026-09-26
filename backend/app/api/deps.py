from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import decode_token
from app.db.repository import repo
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/verify-otp")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session has expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = repo.get_user_by_id(user_id)
    if user is None:
        user = repo.get_user_by_email(user_id)
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles):
    if not isinstance(allowed_roles, (list, tuple, set)):
        allowed_list = [allowed_roles]
    else:
        allowed_list = list(allowed_roles)

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        allowed_vals = [r.value if hasattr(r, "value") else str(r) for r in allowed_list]
        if user_role_val not in allowed_vals:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of authorized roles: {allowed_vals}. Current role: {user_role_val}"
            )
        return current_user
    return role_checker
