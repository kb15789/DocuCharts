from fastapi import APIRouter, Depends, HTTPException, status

from app.models.auth import TokenResponse, UserLoginRequest, UserResponse, UserSignupRequest
from app.services.auth_service import (
    authenticate_user,
    create_user,
    generate_unique_email,
)
from app.utils.deps import get_current_user
from app.utils.security import create_access_token


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: UserSignupRequest):
    generated_email = await generate_unique_email(payload.full_name)
    user = await create_user(payload.full_name, generated_email, payload.password)
    token = create_access_token(subject=user["id"])

    return TokenResponse(
        access_token=token,
        user=UserResponse(**user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLoginRequest):
    user = await authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(subject=user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            full_name=user["full_name"],
            email=user["email"],
            chat_assistant_enabled=user.get("chat_assistant_enabled", True),
            created_at=user["created_at"],
        ),
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        full_name=current_user["full_name"],
        email=current_user["email"],
        chat_assistant_enabled=current_user.get("chat_assistant_enabled", True),
        created_at=current_user["created_at"],
    )
