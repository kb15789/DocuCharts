from datetime import datetime
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
