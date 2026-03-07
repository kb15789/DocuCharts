from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ChatQueryRequest(BaseModel):
    question: str = Field(min_length=3, max_length=3000)
    document_ids: list[UUID] = Field(min_length=1)


class ChatResponse(BaseModel):
    answer: str


class ChatHistoryItem(BaseModel):
    id: UUID
    user_id: UUID
    document_ids: list[UUID] | None = None
    question: str
    answer: str
    created_at: datetime
