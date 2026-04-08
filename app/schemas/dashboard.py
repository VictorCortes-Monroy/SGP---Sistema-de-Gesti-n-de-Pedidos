from pydantic import BaseModel
from typing import Dict, List, Optional
from uuid import UUID
from decimal import Decimal
from datetime import datetime


class PendingActionItem(BaseModel):
    request_id: UUID
    title: str
    status: str
    total_amount: Decimal
    requester_name: Optional[str] = None
    created_at: datetime


class RecentRequestItem(BaseModel):
    id: UUID
    title: str
    status: str
    total_amount: Decimal
    created_at: datetime


class BudgetSummaryItem(BaseModel):
    cost_center_name: str
    total_amount: Decimal
    reserved_amount: Decimal
    executed_amount: Decimal
    available_amount: Decimal


class POPendingActionItem(BaseModel):
    po_id: UUID
    oc_number: str
    status: str
    total_amount: Decimal
    currency: str
    request_id: UUID
    created_at: datetime


class DashboardSummary(BaseModel):
    total_requests: int
    status_distribution: Dict[str, int]
    pending_actions: List[PendingActionItem]
    pending_oc_approvals: List[POPendingActionItem] = []
    recent_requests: List[RecentRequestItem]
    budget_summary: List[BudgetSummaryItem]
