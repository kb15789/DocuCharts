from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class MonitoringPoint(BaseModel):
    label: str
    unique_users: int
    logins: int


class MonitoringUsageResponse(BaseModel):
    period: str
    points: list[MonitoringPoint]
    total_unique_users: int
    total_logins: int


class MonitoringUserItem(BaseModel):
    id: UUID
    full_name: str
    email: str
    is_active: bool
    chat_assistant_enabled: bool
    monitoring_dashboard_enabled: bool
    created_at: datetime


class MonitoringUserFlagsUpdateRequest(BaseModel):
    is_active: bool | None = None
    chat_assistant_enabled: bool | None = None
    monitoring_dashboard_enabled: bool | None = None

    @model_validator(mode="after")
    def validate_any_flag_present(self):
        if (
            self.is_active is None
            and self.chat_assistant_enabled is None
            and self.monitoring_dashboard_enabled is None
        ):
            raise ValueError("At least one flag must be provided")
        return self


class MonitoringActivityLogItem(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    email: str
    action: str
    created_at: datetime


class MonitoringActivityLogsResponse(BaseModel):
    total: int
    items: list[MonitoringActivityLogItem]


class MonitoringActivityLogsQuery(BaseModel):
    user_id: UUID | None = None
    limit: int = Field(default=100, ge=1, le=500)
