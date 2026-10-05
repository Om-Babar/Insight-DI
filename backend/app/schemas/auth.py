from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    company_name: Optional[str] = "My E-Commerce Store"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    company_name: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
