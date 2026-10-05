from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.schemas.common import APIResponse
from app.services.auth_service import AuthService
from app.core.security import create_access_token
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter()


@router.post("/register", response_model=APIResponse[UserResponse], status_code=status.HTTP_201_CREATED, summary="Register a new seller account")
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> Any:
    """Register a new user account."""
    existing_user = AuthService.get_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )
    user = AuthService.create_user(db, user_in)
    return APIResponse(
        success=True,
        message="User registered successfully",
        data=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=Token, summary="Login to obtain JWT access token")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Any:
    """OAuth2 compatible token login, getting an access token for future requests."""
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login-json", response_model=Token, summary="JSON payload login for Lovable frontend")
def login_json(user_in: UserLogin, db: Session = Depends(get_db)) -> Any:
    """Standard JSON body login for easy integration with frontend clients."""
    user = AuthService.authenticate_user(db, user_in.email, user_in.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=APIResponse[UserResponse], summary="Get current logged in user profile")
def read_user_me(current_user: User = Depends(get_current_user)) -> Any:
    """Fetch current user profile using Bearer token."""
    return APIResponse(
        success=True,
        message="User retrieved successfully",
        data=UserResponse.model_validate(current_user),
    )
