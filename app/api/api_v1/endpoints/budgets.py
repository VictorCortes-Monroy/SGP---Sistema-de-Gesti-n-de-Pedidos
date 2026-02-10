from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.users import User
from app.models.budget import Budget
from app.schemas.budget import BudgetResponse

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


@router.get("/", response_model=List[BudgetResponse])
async def list_budgets(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List all budgets."""
    query = select(Budget).order_by(Budget.year.desc())
    result = await db.execute(query)
    budgets = result.scalars().all()
    return [_to_response(b) for b in budgets]


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
