from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from app.models.request import RequestStatus
from app.schemas.workflow import WorkflowLogResponse


class RequestItemBase(BaseModel):
    description: str
    sku: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal


class RequestItemCreate(RequestItemBase):
    pass


class RequestItem(RequestItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    total_price: Decimal


class RequestBase(BaseModel):
    title: str
    description: Optional[str] = None
    cost_center_id: UUID


class RequestCreate(RequestBase):
    items: List[RequestItemCreate]


class RequestUpdate(RequestBase):
    pass


class Request(RequestBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    requester_id: UUID
    status: RequestStatus
    total_amount: Decimal
    currency: str
    current_step: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[RequestItem] = []


class RequestDetail(Request):
    """Extended request schema with audit trail."""
    logs: List[WorkflowLogResponse] = []
