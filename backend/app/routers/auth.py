from fastapi import APIRouter, Depends, HTTPException, status

from app.models.auth import (
    ChangePasswordRequest,
    PresencePingRequest,
    TokenResponse,
    UserLoginRequest,
    UserResponse,
    UserSignupRequest,
)
from app.services.auth_service import (
    authenticate_user,
    change_user_password,
    create_user,
    get_user_by_username,
    normalize_username,
    record_login_event,
    upsert_user_presence,
)
from app.services.activity_service import record_user_activity_log
from app.utils.deps import get_current_user
from app.utils.security import create_access_token


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: UserSignupRequest):
    normalized_username = normalize_username(payload.username)

    existing = await get_user_by_username(normalized_username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    try:
        user = await create_user(normalized_username, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    token = create_access_token(subject=user["id"])

    return TokenResponse(
        access_token=token,
        user=UserResponse(**user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLoginRequest):
    user = await authenticate_user(payload.login, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
        )
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    token = create_access_token(subject=user["id"])
    await record_login_event(user["id"])
    await record_user_activity_log(user["id"], "login")
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            full_name=user["full_name"],
            email=user["email"],
            is_active=user.get("is_active", True),
            chat_assistant_enabled=user.get("chat_assistant_enabled", False),
            monitoring_dashboard_enabled=user.get("monitoring_dashboard_enabled", False),
            created_at=user["created_at"],
        ),
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        full_name=current_user["full_name"],
        email=current_user["email"],
        is_active=current_user.get("is_active", True),
        chat_assistant_enabled=current_user.get("chat_assistant_enabled", False),
        monitoring_dashboard_enabled=current_user.get("monitoring_dashboard_enabled", False),
        created_at=current_user["created_at"],
    )


@router.post("/presence")
async def presence_ping(
    payload: PresencePingRequest,
    current_user: dict = Depends(get_current_user),
):
    await upsert_user_presence(
        current_user["id"],
        payload.country_code,
        payload.timezone,
    )
    return {"status": "ok"}


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

    changed = await change_user_password(
        current_user["id"],
        payload.current_password,
        payload.new_password,
    )
    if not changed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    await record_user_activity_log(current_user["id"], "change_password")
    return {"message": "Password updated successfully"}
