from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    file_type: str | None = None
    parse_status: str | None = None
    row_count: int | None = None
    uploaded_at: datetime


class UploadSummaryResponse(BaseModel):
    uploaded_count: int
    documents: list[DocumentResponse]


class DocumentDataRequest(BaseModel):
    document_ids: list[UUID] = Field(min_length=1)


class DocumentDataResponse(BaseModel):
    columns: list[str]
    rows: list[dict]


class AIVisualizationRequest(BaseModel):
    document_ids: list[UUID] = Field(min_length=1)
    x_axis: str
    y_axis: str | None = None
    aggregation: Literal["sum", "count", "average"] = "count"


class AIVisualizationPoint(BaseModel):
    x: str
    value: float


class AIVisualizationResponse(BaseModel):
    title: str
    x_axis: str
    y_axis: str | None = None
    aggregation: Literal["sum", "count", "average"]
    data: list[AIVisualizationPoint]


class AIInsightsRequest(BaseModel):
    document_ids: list[UUID] = Field(min_length=1)
    custom_prompt: str | None = None


class AIInsightChartPoint(BaseModel):
    x: str
    value: float


class AIInsightChart(BaseModel):
    title: str
    chart_type: Literal["bar", "line", "pie"]
    x_axis: str
    y_axis: str | None = None
    aggregation: Literal["sum", "count", "average"] = "count"
    data: list[AIInsightChartPoint]


class AIInsightsResponse(BaseModel):
    top_insight: str
    key_insights: list[str]
    charts: list[AIInsightChart]


class AIPivotRequest(BaseModel):
    document_ids: list[UUID] = Field(min_length=1)
    custom_prompt: str = Field(min_length=3, max_length=2000)


class AIPivotCell(BaseModel):
    row_key: str
    column_key: str
    value: float


class AIPivotResponse(BaseModel):
    title: str
    row_field: str
    column_field: str
    value_field: str | None = None
    aggregation: Literal["sum", "count", "average"] = "count"
    row_keys: list[str]
    column_keys: list[str]
    cells: list[AIPivotCell]
