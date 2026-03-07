from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.monitoring import (
    MonitoringActivityLogsResponse,
    MonitoringMapResponse,
    MonitoringQueryLogsResponse,
    MonitoringUsageResponse,
    MonitoringUserFlagsUpdateRequest,
    MonitoringUserItem,
)
from app.services.monitoring_service import (
    get_activity_logs_for_monitoring,
    get_map_metrics_for_monitoring,
    get_query_logs_for_monitoring,
    get_usage_timeseries,
    get_users_for_monitoring,
    update_user_flags,
)
from app.utils.deps import get_current_user


router = APIRouter(prefix="/monitoring", tags=["monitoring"])


def _ensure_monitoring_access(current_user: dict) -> None:
    if not current_user.get("monitoring_dashboard_enabled", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Monitoring dashboard is disabled for this account.",
        )


@router.get("/usage", response_model=MonitoringUsageResponse)
async def monitoring_usage(
    period: str = Query(default="week", pattern="^(day|week|month|year)$"),
    current_user: dict = Depends(get_current_user),
):
    _ensure_monitoring_access(current_user)
    return MonitoringUsageResponse(**(await get_usage_timeseries(period)))


@router.get("/map", response_model=MonitoringMapResponse)
async def monitoring_map(current_user: dict = Depends(get_current_user)):
    _ensure_monitoring_access(current_user)
    return MonitoringMapResponse(**(await get_map_metrics_for_monitoring()))


@router.get("/activity-logs", response_model=MonitoringActivityLogsResponse)
async def monitoring_activity_logs(
    user_id: UUID | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    _ensure_monitoring_access(current_user)
    logs = await get_activity_logs_for_monitoring(str(user_id) if user_id else None, limit)
    return MonitoringActivityLogsResponse(**logs)


@router.get("/query-logs", response_model=MonitoringQueryLogsResponse)
async def monitoring_query_logs(
    user_id: UUID | None = Query(default=None),
    query_type: str | None = Query(default=None, pattern="^(chatbot|visualization)$"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    _ensure_monitoring_access(current_user)
    logs = await get_query_logs_for_monitoring(
        str(user_id) if user_id else None,
        query_type,
        date_from,
        date_to,
        limit,
    )
    return MonitoringQueryLogsResponse(**logs)


@router.get("/users", response_model=list[MonitoringUserItem])
async def monitoring_users(current_user: dict = Depends(get_current_user)):
    _ensure_monitoring_access(current_user)
    users = await get_users_for_monitoring()
    return [MonitoringUserItem(**item) for item in users]


@router.patch("/users/{user_id}/flags", response_model=MonitoringUserItem)
async def monitoring_update_user_flags(
    user_id: UUID,
    payload: MonitoringUserFlagsUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    _ensure_monitoring_access(current_user)

    flags: dict = {}
    if payload.is_active is not None:
        flags["is_active"] = payload.is_active
    if payload.chat_assistant_enabled is not None:
        flags["chat_assistant_enabled"] = payload.chat_assistant_enabled
    if payload.monitoring_dashboard_enabled is not None:
        flags["monitoring_dashboard_enabled"] = payload.monitoring_dashboard_enabled

    updated = await update_user_flags(str(user_id), flags)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return MonitoringUserItem(**updated)
