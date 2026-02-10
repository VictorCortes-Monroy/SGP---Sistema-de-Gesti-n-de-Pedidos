from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from decimal import Decimal


class ApprovalMatrixCreate(BaseModel):
    company_id: Optional[UUID] = None
    cost_center_id: Optional[UUID] = None
    min_amount: Decimal = Decimal("0")
    max_amount: Optional[Decimal] = None
    role_id: UUID
    step_order: int = 1


class ApprovalMatrixUpdate(BaseModel):
    company_id: Optional[UUID] = None
    cost_center_id: Optional[UUID] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    role_id: Optional[UUID] = None
    step_order: Optional[int] = None


class ApprovalMatrixResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: Optional[UUID] = None
    cost_center_id: Optional[UUID] = None
    min_amount: Decimal
    max_amount: Optional[Decimal] = None
    role_id: UUID
    role_name: Optional[str] = None
    step_order: int
