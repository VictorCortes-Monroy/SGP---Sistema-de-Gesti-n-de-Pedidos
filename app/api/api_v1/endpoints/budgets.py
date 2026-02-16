from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api import deps
from app.models.users import User
from app.models.budget import Budget
from app.schemas.budget import BudgetResponse
from app.schemas.pagination import PaginatedResponse

router = APIRouter()


def _to_response(budget: Budget) -> BudgetResponse:
    """Convert Budget model to response with computed available_amount."""
    available = budget.total_amount - budget.reserved_amount - budget.executed_amount
    return BudgetResponse(
        id=budget.id,
        cost_center_id=budget.cost_center_id,
        year=budget.year,
        total_amount=budget.total_amount,
        reserved_amount=budget.reserved_amount,
        executed_amount=budget.executed_amount,
        available_amount=available
    )


@router.get("/", response_model=PaginatedResponse[BudgetResponse])
async def list_budgets(
    *,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List all budgets."""
    base = select(Budget)

    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar()

    query = base.order_by(Budget.year.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    budgets = result.scalars().all()
    return {"items": [_to_response(b) for b in budgets], "total": total, "skip": skip, "limit": limit}


@router.get("/{cost_center_id}", response_model=BudgetResponse)
async def get_budget(
    *,
    db: AsyncSession = Depends(deps.get_db),
    cost_center_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get budget for a specific cost center."""
    query = select(Budget).where(Budget.cost_center_id == cost_center_id)
    result = await db.execute(query)
    budget = result.scalars().first()

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found for this cost center")

    return _to_response(budget)
