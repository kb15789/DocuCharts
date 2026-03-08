from datetime import datetime, timedelta, timezone

from app.database.supabase_client import supabase

COUNTRY_COORDS = {
    "US": {"lat": 37.0902, "lon": -95.7129},
    "IN": {"lat": 20.5937, "lon": 78.9629},
    "GB": {"lat": 55.3781, "lon": -3.4360},
    "DE": {"lat": 51.1657, "lon": 10.4515},
    "FR": {"lat": 46.2276, "lon": 2.2137},
    "CA": {"lat": 56.1304, "lon": -106.3468},
    "BR": {"lat": -14.2350, "lon": -51.9253},
    "AU": {"lat": -25.2744, "lon": 133.7751},
    "SG": {"lat": 1.3521, "lon": 103.8198},
    "JP": {"lat": 36.2048, "lon": 138.2529},
    "AE": {"lat": 23.4241, "lon": 53.8478},
}
IST_TZ = timezone(timedelta(hours=5, minutes=30))


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
            "label": cursor.astimezone(IST_TZ).strftime(label_format),
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


async def get_query_logs_for_monitoring(
    user_id: str | None,
    query_type: str | None,
    date_from: str | None,
    date_to: str | None,
    limit: int,
) -> dict:
    query = (
        supabase.table("user_query_logs")
        .select("id, user_id, query_type, query_text, created_at")
        .order("created_at", desc=True)
        .limit(limit)
    )
    if user_id:
        query = query.eq("user_id", user_id)
    if query_type:
        query = query.eq("query_type", query_type)
    if date_from:
        query = query.gte("created_at", date_from)
    if date_to:
        query = query.lte("created_at", date_to)

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
                "query_type": row.get("query_type", "chatbot"),
                "query_text": row.get("query_text", ""),
                "created_at": row["created_at"],
            }
        )

    return {"total": len(items), "items": items}


async def get_map_metrics_for_monitoring() -> dict:
    now = datetime.now(timezone.utc)
    current_cutoff = now - timedelta(minutes=5)
    active_cutoff = now - timedelta(minutes=30)

    rows = (
        supabase.table("user_presence")
        .select("user_id, country_code, last_seen_at")
        .gte("last_seen_at", active_cutoff.isoformat())
        .execute()
    ).data or []

    current_users = set()
    active_users = set()
    per_country: dict[str, dict] = {}

    for row in rows:
        user_id = row.get("user_id")
        seen_raw = row.get("last_seen_at")
        if not user_id or not seen_raw:
            continue

        seen_at = datetime.fromisoformat(seen_raw.replace("Z", "+00:00"))
        country = (row.get("country_code") or "US").upper()

        bucket = per_country.setdefault(country, {"current_users": set(), "active_users": set()})
        if seen_at >= active_cutoff:
            active_users.add(user_id)
            bucket["active_users"].add(user_id)
        if seen_at >= current_cutoff:
            current_users.add(user_id)
            bucket["current_users"].add(user_id)

    points = []
    for country, counts in per_country.items():
        coords = COUNTRY_COORDS.get(country)
        if not coords:
            continue
        points.append(
            {
                "country_code": country,
                "latitude": coords["lat"],
                "longitude": coords["lon"],
                "current_users": len(counts["current_users"]),
                "active_users": len(counts["active_users"]),
            }
        )

    points.sort(key=lambda item: item["active_users"], reverse=True)
    return {
        "current_users": len(current_users),
        "active_users": len(active_users),
        "points": points,
    }
