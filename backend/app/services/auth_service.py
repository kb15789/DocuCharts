import re
from typing import Any
from uuid import uuid4

from app.database.supabase_client import supabase
from app.utils.security import hash_password, verify_password


DUMMY_USER = {
    "full_name": "Demo User",
    "email": "demo@docucharts.ai",
    "password": "Demo@12345",
}


async def ensure_dummy_user() -> None:
    existing = (
        supabase.table("users")
        .select("id")
        .eq("email", DUMMY_USER["email"])
        .limit(1)
        .execute()
    )
    if existing.data:
        # Keep dummy credentials deterministic across restarts and migrate
        # old hashes to the current configured algorithm.
        supabase.table("users").update(
            {
                "full_name": DUMMY_USER["full_name"],
                "password_hash": hash_password(DUMMY_USER["password"]),
            }
        ).eq("id", existing.data[0]["id"]).execute()
        return

    supabase.table("users").insert(
        {
            "id": str(uuid4()),
            "full_name": DUMMY_USER["full_name"],
            "email": DUMMY_USER["email"],
            "password_hash": hash_password(DUMMY_USER["password"]),
            "chat_assistant_enabled": False,
        }
    ).execute()


async def get_user_by_email(email: str) -> dict[str, Any] | None:
    response = (
        supabase.table("users")
        .select("id, full_name, email, chat_assistant_enabled, password_hash, created_at")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    if not response.data:
        return None
    return response.data[0]


async def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    response = (
        supabase.table("users")
        .select("id, full_name, email, chat_assistant_enabled, created_at")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        return None
    return response.data[0]


async def create_user(full_name: str, email: str, password: str) -> dict[str, Any]:
    payload = {
        "id": str(uuid4()),
        "full_name": full_name,
        "email": email,
        "password_hash": hash_password(password),
        "chat_assistant_enabled": False,
    }
    response = (
        supabase.table("users")
        .insert(payload)
        .execute()
    )
    return response.data[0]


async def generate_unique_email(full_name: str) -> str:
    local = re.sub(r"[^a-z0-9]+", ".", full_name.lower()).strip(".")
    if not local:
        local = "user"

    while True:
        candidate = f"{local}.{uuid4().hex[:8]}@docucharts.ai"
        existing = await get_user_by_email(candidate)
        if not existing:
            return candidate


async def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    user = await get_user_by_email(email)
    if not user:
        return None

    if not verify_password(password, user["password_hash"]):
        return None

    return user
