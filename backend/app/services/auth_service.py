import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.database.supabase_client import supabase
from app.utils.security import hash_password, verify_password


USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9._-]{3,40}$")


def normalize_username(username: str) -> str:
    return username.strip().lower()


def username_to_email(username: str) -> str:
    return f"{username}@docucharts.ai"


async def get_user_by_email(email: str) -> dict[str, Any] | None:
    response = (
        supabase.table("users")
        .select(
            "id, username, full_name, email, is_active, chat_assistant_enabled, monitoring_dashboard_enabled, password_hash, created_at"
        )
        .eq("email", email.strip().lower())
        .limit(1)
        .execute()
    )
    if not response.data:
        return None
    return response.data[0]


async def get_user_by_username(username: str) -> dict[str, Any] | None:
    response = (
        supabase.table("users")
        .select(
            "id, username, full_name, email, is_active, chat_assistant_enabled, monitoring_dashboard_enabled, password_hash, created_at"
        )
        .eq("username", normalize_username(username))
        .limit(1)
        .execute()
    )
    if not response.data:
        return None
    return response.data[0]


async def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    response = (
        supabase.table("users")
        .select(
            "id, username, full_name, email, is_active, chat_assistant_enabled, monitoring_dashboard_enabled, created_at"
        )
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        return None
    return response.data[0]


async def get_user_with_password_by_id(user_id: str) -> dict[str, Any] | None:
    response = (
        supabase.table("users")
        .select(
            "id, username, full_name, email, is_active, chat_assistant_enabled, monitoring_dashboard_enabled, password_hash, created_at"
        )
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        return None
    return response.data[0]


async def create_user(username: str, password: str) -> dict[str, Any]:
    normalized = normalize_username(username)
    if not USERNAME_PATTERN.fullmatch(normalized):
        raise ValueError("Username must be 3-40 chars and contain only letters, numbers, ., _, -")

    payload = {
        "id": str(uuid4()),
        "username": normalized,
        "full_name": normalized,
        "email": username_to_email(normalized),
        "password_hash": hash_password(password),
        "is_active": True,
        "chat_assistant_enabled": False,
        "monitoring_dashboard_enabled": False,
    }
    response = supabase.table("users").insert(payload).execute()
    return response.data[0]


async def authenticate_user(login: str, password: str) -> dict[str, Any] | None:
    user = await (get_user_by_email(login) if "@" in login else get_user_by_username(login))
    if not user:
        return None

    if not verify_password(password, user["password_hash"]):
        return None

    return user


async def record_login_event(user_id: str) -> None:
    supabase.table("login_events").insert({"id": str(uuid4()), "user_id": user_id}).execute()


async def upsert_user_presence(
    user_id: str,
    country_code: str | None = None,
    timezone_name: str | None = None,
) -> None:
    payload = {"user_id": user_id, "last_seen_at": datetime.now(timezone.utc).isoformat()}
    if country_code:
        payload["country_code"] = country_code.upper()
    if timezone_name:
        payload["timezone"] = timezone_name
    supabase.table("user_presence").upsert(payload, on_conflict="user_id").execute()


async def change_user_password(user_id: str, current_password: str, new_password: str) -> bool:
    user = await get_user_with_password_by_id(user_id)
    if not user:
        return False

    if not verify_password(current_password, user["password_hash"]):
        return False

    supabase.table("users").update({"password_hash": hash_password(new_password)}).eq("id", user_id).execute()
    return True
