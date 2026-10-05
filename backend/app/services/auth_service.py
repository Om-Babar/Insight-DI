from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth import UserCreate
from app.core.security import get_password_hash, verify_password


class AuthService:
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.lower()).first()

    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def create_user(db: Session, user_in: UserCreate) -> User:
        db_user = User(
            email=user_in.email.lower(),
            hashed_password=get_password_hash(user_in.password),
            company_name=user_in.company_name or "My E-Commerce Store",
            is_active=True,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        user = AuthService.get_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
