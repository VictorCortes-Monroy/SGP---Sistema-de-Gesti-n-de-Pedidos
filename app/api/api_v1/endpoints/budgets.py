from typing import Any, List, Optional
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.users import User
from app.models.budget import Budget
from app.models.organization import Company, CostCenter
from app.schemas.budget import (
    BudgetResponse, BudgetReportResponse, BudgetReportItem,
    CompanyBudgetGroup,
)
from app.schemas.pagination import PaginatedResponse
from app.services.export_service import export_budget_excel, export_budget_pdf

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


async def _build_report(
    db: AsyncSession,
    year: int,
    company_id: Optional[str] = None,
) -> dict:
    """Build budget report grouped by company."""
    query = (
        select(Budget, CostCenter, Company)
        .join(CostCenter, Budget.cost_center_id == CostCenter.id)
        .join(Company, CostCenter.company_id == Company.id)
        .where(Budget.year == year)
    )
    if company_id:
        query = query.where(Company.id == company_id)
    query = query.order_by(Company.name, CostCenter.name)

    result = await db.execute(query)
    rows = result.all()

    groups_map: dict = {}
    grand_total = Decimal(0)
    grand_reserved = Decimal(0)
    grand_executed = Decimal(0)
    grand_available = Decimal(0)

    for budget, cc, company in rows:
        available = budget.total_amount - budget.reserved_amount - budget.executed_amount
        total = float(budget.total_amount) if budget.total_amount else 0
        utilization = ((float(budget.reserved_amount) + float(budget.executed_amount)) / total * 100) if total > 0 else 0

        item = BudgetReportItem(
            cost_center_id=cc.id,
            cost_center_name=cc.name,
            cost_center_code=cc.code,
            total_amount=budget.total_amount,
            reserved_amount=budget.reserved_amount,
            executed_amount=budget.executed_amount,
            available_amount=available,
            utilization_pct=round(utilization, 1),
        )

        cid = str(company.id)
        if cid not in groups_map:
            groups_map[cid] = {
                "company_id": company.id,
                "company_name": company.name,
                "total_amount": Decimal(0),
                "reserved_amount": Decimal(0),
                "executed_amount": Decimal(0),
                "available_amount": Decimal(0),
                "budgets": [],
            }
        g = groups_map[cid]
        g["total_amount"] += budget.total_amount
        g["reserved_amount"] += budget.reserved_amount
        g["executed_amount"] += budget.executed_amount
        g["available_amount"] += available
        g["budgets"].append(item)

        grand_total += budget.total_amount
        grand_reserved += budget.reserved_amount
        grand_executed += budget.executed_amount
        grand_available += available

    groups = [CompanyBudgetGroup(**g) for g in groups_map.values()]

    return BudgetReportResponse(
        year=year,
        groups=groups,
        grand_total=grand_total,
        grand_reserved=grand_reserved,
        grand_executed=grand_executed,
        grand_available=grand_available,
    ).model_dump()


@router.get("/report", response_model=BudgetReportResponse)
async def budget_report(
    *,
    year: int = Query(default=None),
    company_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Budget report grouped by company and cost center."""
    if year is None:
        year = datetime.utcnow().year
    return await _build_report(db, year, company_id)


@router.get("/report/export")
async def budget_report_export(
    *,
    format: str = Query("excel", regex="^(excel|pdf)$"),
    year: int = Query(default=None),
    company_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> StreamingResponse:
    """Export budget report as Excel or PDF."""
    if year is None:
        year = datetime.utcnow().year
    report = await _build_report(db, year, company_id)

    if format == "pdf":
        content = export_budget_pdf(report)
        return StreamingResponse(
            content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=presupuestos_{year}.pdf"},
        )
    else:
        content = export_budget_excel(report)
        return StreamingResponse(
            content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=presupuestos_{year}.xlsx"},
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
