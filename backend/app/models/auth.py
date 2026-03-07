from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserSignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    chat_assistant_enabled: bool = True
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
