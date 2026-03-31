from pydantic import BaseModel, ConfigDict
from typing import Optional, List
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


# ── Budget Report schemas ──

class BudgetReportItem(BaseModel):
    cost_center_id: UUID
    cost_center_name: str
    cost_center_code: str
    total_amount: Decimal
    reserved_amount: Decimal
    executed_amount: Decimal
    available_amount: Decimal
    utilization_pct: float


class CompanyBudgetGroup(BaseModel):
    company_id: UUID
    company_name: str
    total_amount: Decimal
    reserved_amount: Decimal
    executed_amount: Decimal
    available_amount: Decimal
    budgets: List[BudgetReportItem]


class BudgetReportResponse(BaseModel):
    year: int
    groups: List[CompanyBudgetGroup]
    grand_total: Decimal
    grand_reserved: Decimal
    grand_executed: Decimal
    grand_available: Decimal
