from uuid import uuid4

from app.database.supabase_client import supabase


async def record_user_activity_log(user_id: str, action: str) -> None:
    supabase.table("user_activity_logs").insert(
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "action": action,
        }
    ).execute()
