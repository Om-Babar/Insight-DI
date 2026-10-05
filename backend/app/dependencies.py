from typing import Generator, Optional
from fastapi import Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_access_token
from app.core.exceptions import AuthenticationException
from app.models.user import User
from app.services.auth_service import AuthService
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """Dependency to retrieve the currently authenticated user from Bearer token."""
    payload = decode_access_token(token)
    if not payload:
        raise AuthenticationException(detail="Could not validate credentials")
    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationException(detail="Token payload missing subject")
    user = AuthService.get_by_id(db, int(user_id))
    if not user:
        raise AuthenticationException(detail="User not found")
    if not user.is_active:
        raise AuthenticationException(detail="Inactive user account")
    return user
