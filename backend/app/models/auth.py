import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9._-]{3,40}$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class UserSignupRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9._-]+$")
    password: str = Field(min_length=8, max_length=128)

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name cannot be empty")
        return cleaned

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not USERNAME_PATTERN.fullmatch(cleaned):
            raise ValueError("Username must be 3-40 chars and contain only letters, numbers, ., _, -")
        return cleaned


class UserLoginRequest(BaseModel):
    login: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("login")
    @classmethod
    def validate_login(cls, value: str) -> str:
        cleaned = value.strip()
        if "@" in cleaned:
            if not EMAIL_PATTERN.fullmatch(cleaned):
                raise ValueError("Invalid email format")
            return cleaned.lower()

        candidate = cleaned.lower()
        if not USERNAME_PATTERN.fullmatch(candidate):
            raise ValueError("Login must be a valid username or email")
        return candidate


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: UUID
    username: str
    full_name: str
    email: EmailStr
    is_active: bool = True
    chat_assistant_enabled: bool = False
    monitoring_dashboard_enabled: bool = False
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PresencePingRequest(BaseModel):
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    timezone: str | None = Field(default=None, max_length=100)
