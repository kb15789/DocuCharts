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


async def record_user_query_log(user_id: str, query_type: str, query_text: str) -> None:
    cleaned_query = query_text.strip()
    if not cleaned_query:
        return

    supabase.table("user_query_logs").insert(
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "query_type": query_type,
            "query_text": cleaned_query,
        }
    ).execute()
