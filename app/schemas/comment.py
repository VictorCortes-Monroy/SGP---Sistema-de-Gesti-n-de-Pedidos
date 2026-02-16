from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class CommentCreate(BaseModel):
    text: str


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    request_id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    text: str
    created_at: datetime
