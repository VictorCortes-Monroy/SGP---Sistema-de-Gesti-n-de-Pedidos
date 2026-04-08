from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.users import User
from app.models.request import Request, RequestStatus
from app.models.budget import Budget
from app.models.organization import CostCenter
from app.models.purchase_order import PurchaseOrder, PurchaseOrderStatus
from app.schemas.dashboard import (
    DashboardSummary, PendingActionItem, RecentRequestItem,
    BudgetSummaryItem, POPendingActionItem,
)

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Consolidated dashboard data in a single call."""

    # 1. Status distribution
    status_query = (
        select(Request.status, func.count())
        .where(Request.is_deleted == False)
        .group_by(Request.status)
    )
    status_result = await db.execute(status_query)
    status_distribution = {}
    total_requests = 0
    for status, count in status_result.all():
        key = status.value if hasattr(status, "value") else str(status)
        status_distribution[key] = count
        total_requests += count

    # 2. Pending REQUEST actions by role
    role_name = current_user.role.name if current_user.role else ""
    pending_statuses = []

    if role_name == "Admin":
        pending_statuses = [RequestStatus.PENDING_TECHNICAL]
    elif role_name == "Technical Approver":
        pending_statuses = [RequestStatus.PENDING_TECHNICAL]
    elif role_name == "Purchasing":
        pending_statuses = [RequestStatus.APPROVED, RequestStatus.PURCHASING]
    elif role_name == "Requester":
        pending_statuses = [RequestStatus.DRAFT, RequestStatus.REJECTED]
    # Financial Approver and Finance 2 no longer approve requests — handled via OC approvals below

    pending_actions = []
    if pending_statuses:
        pending_query = (
            select(Request)
            .options(selectinload(Request.requester))
            .where(Request.is_deleted == False)
            .where(Request.status.in_(pending_statuses))
        )
        if role_name == "Requester":
            pending_query = pending_query.where(Request.requester_id == current_user.id)

        pending_query = pending_query.order_by(Request.created_at.desc()).limit(20)
        result = await db.execute(pending_query)
        for req in result.scalars().all():
            pending_actions.append(PendingActionItem(
                request_id=req.id,
                title=req.title,
                status=req.status.value,
                total_amount=req.total_amount,
                requester_name=req.requester.full_name if req.requester else None,
                created_at=req.created_at,
            ))

    # 3. Pending OC approvals (for finance roles)
    pending_oc_approvals = []
    oc_pending_statuses = []

    if role_name == "Admin":
        oc_pending_statuses = [
            PurchaseOrderStatus.PENDING_FINANCE_1,
            PurchaseOrderStatus.PENDING_FINANCE_2,
        ]
    elif role_name == "Financial Approver":
        oc_pending_statuses = [PurchaseOrderStatus.PENDING_FINANCE_1]
    elif role_name == "Finance 2":
        oc_pending_statuses = [PurchaseOrderStatus.PENDING_FINANCE_2]

    if oc_pending_statuses:
        po_query = (
            select(PurchaseOrder)
            .where(PurchaseOrder.status.in_(oc_pending_statuses))
            .order_by(PurchaseOrder.created_at.desc())
            .limit(20)
        )
        po_result = await db.execute(po_query)
        for po in po_result.scalars().all():
            pending_oc_approvals.append(POPendingActionItem(
                po_id=po.id,
                oc_number=po.oc_number,
                status=po.status if isinstance(po.status, str) else po.status.value,
                total_amount=po.total_amount,
                currency=po.currency,
                request_id=po.request_id,
                created_at=po.created_at,
            ))

    # 4. Recent requests
    recent_query = (
        select(Request)
        .where(Request.is_deleted == False)
        .order_by(Request.created_at.desc())
        .limit(5)
    )
    if role_name == "Requester":
        recent_query = recent_query.where(Request.requester_id == current_user.id)

    recent_result = await db.execute(recent_query)
    recent_requests = [
        RecentRequestItem(
            id=req.id,
            title=req.title,
            status=req.status.value,
            total_amount=req.total_amount,
            created_at=req.created_at,
        )
        for req in recent_result.scalars().all()
    ]

    # 5. Budget summary
    budget_query = (
        select(Budget, CostCenter)
        .join(CostCenter, Budget.cost_center_id == CostCenter.id)
        .order_by(CostCenter.name)
    )
    budget_result = await db.execute(budget_query)
    budget_summary = []
    for budget, cc in budget_result.all():
        available = budget.total_amount - budget.reserved_amount - budget.executed_amount
        budget_summary.append(BudgetSummaryItem(
            cost_center_name=cc.name,
            total_amount=budget.total_amount,
            reserved_amount=budget.reserved_amount,
            executed_amount=budget.executed_amount,
            available_amount=available,
        ))

    return DashboardSummary(
        total_requests=total_requests,
        status_distribution=status_distribution,
        pending_actions=pending_actions,
        pending_oc_approvals=pending_oc_approvals,
        recent_requests=recent_requests,
        budget_summary=budget_summary,
    )
