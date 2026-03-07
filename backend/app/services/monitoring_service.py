from datetime import datetime, timedelta, timezone

from app.database.supabase_client import supabase


def _period_config(period: str) -> tuple[timedelta, timedelta, str]:
    if period == "day":
        return timedelta(days=1), timedelta(hours=1), "%H:00"
    if period == "week":
        return timedelta(days=7), timedelta(days=1), "%d %b"
    if period == "month":
        return timedelta(days=30), timedelta(days=1), "%d %b"
    return timedelta(days=365), timedelta(days=30), "%b %Y"


def _make_buckets(start: datetime, end: datetime, step: timedelta, label_format: str):
    buckets = {}
    cursor = start
    while cursor <= end:
        key = cursor.isoformat()
        buckets[key] = {
            "start": cursor,
            "end": cursor + step,
            "label": cursor.strftime(label_format),
            "unique_users": set(),
            "logins": 0,
        }
        cursor += step
    return buckets


def _bucket_key(event_time: datetime, start: datetime, step: timedelta) -> str:
    delta = event_time - start
    index = int(delta.total_seconds() // step.total_seconds())
    bucket_start = start + (step * index)
    return bucket_start.isoformat()


async def get_usage_timeseries(period: str) -> dict:
    window, step, label_format = _period_config(period)
    now = datetime.now(timezone.utc)
    start = now - window

    buckets = _make_buckets(start, now, step, label_format)

    login_rows = (
        supabase.table("login_events")
        .select("user_id, created_at")
        .gte("created_at", start.isoformat())
        .lte("created_at", now.isoformat())
        .order("created_at", desc=False)
        .execute()
    ).data or []

    for row in login_rows:
        event_time = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
        if event_time < start or event_time > now:
            continue
        key = _bucket_key(event_time, start, step)
        if key not in buckets:
            continue
        buckets[key]["logins"] += 1
        buckets[key]["unique_users"].add(row["user_id"])

    points = []
    all_unique_users = set()
    total_logins = 0
    for key in sorted(buckets.keys()):
        bucket = buckets[key]
        unique_count = len(bucket["unique_users"])
        total_logins += bucket["logins"]
        all_unique_users.update(bucket["unique_users"])
        points.append(
            {
                "label": bucket["label"],
                "unique_users": unique_count,
                "logins": bucket["logins"],
            }
        )

    return {
        "period": period,
        "points": points,
        "total_unique_users": len(all_unique_users),
        "total_logins": total_logins,
    }


async def get_users_for_monitoring() -> list[dict]:
    response = (
        supabase.table("users")
        .select(
            "id, full_name, email, is_active, chat_assistant_enabled, monitoring_dashboard_enabled, created_at"
        )
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


async def update_user_flags(user_id: str, flags: dict) -> dict | None:
    existing = (
        supabase.table("users")
        .select("id")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        return None

    (
        supabase.table("users")
        .update(flags)
        .eq("id", user_id)
        .execute()
    )
    refreshed = (
        supabase.table("users")
        .select(
            "id, full_name, email, is_active, chat_assistant_enabled, monitoring_dashboard_enabled, created_at"
        )
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not refreshed.data:
        return None
    return refreshed.data[0]


async def get_activity_logs_for_monitoring(user_id: str | None, limit: int) -> dict:
    query = (
        supabase.table("user_activity_logs")
        .select("id, user_id, action, created_at")
        .order("created_at", desc=True)
        .limit(limit)
    )
    if user_id:
        query = query.eq("user_id", user_id)

    rows = query.execute().data or []
    if not rows:
        return {"total": 0, "items": []}

    user_ids = list({row["user_id"] for row in rows})
    users = (
        supabase.table("users")
        .select("id, full_name, email")
        .in_("id", user_ids)
        .execute()
    ).data or []
    users_map = {u["id"]: u for u in users}

    items = []
    for row in rows:
        user = users_map.get(row["user_id"], {})
        items.append(
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "full_name": user.get("full_name", "Unknown User"),
                "email": user.get("email", "unknown@example.com"),
                "action": row["action"],
                "created_at": row["created_at"],
            }
        )

    return {"total": len(items), "items": items}
