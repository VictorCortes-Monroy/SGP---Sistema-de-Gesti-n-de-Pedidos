from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from decimal import Decimal


class BudgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cost_center_id: UUID
    year: int
    total_amount: Decimal
    reserved_amount: Decimal
    executed_amount: Decimal
    available_amount: Decimal
