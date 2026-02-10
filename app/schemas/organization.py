from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID


# ── Company ──────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    tax_id: str


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    tax_id: Optional[str] = None


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    tax_id: Optional[str] = None


# ── Cost Center ──────────────────────────────────────────

class CostCenterCreate(BaseModel):
    name: str
    code: str
    company_id: UUID


class CostCenterUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None


class CostCenterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    code: str
    company_id: UUID


class CompanyDetail(CompanyResponse):
    """Company with its cost centers."""
    cost_centers: List[CostCenterResponse] = []
