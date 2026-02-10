from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user
from app.models.users import User
from app.models.workflow import ApprovalMatrix
from app.schemas.approval_matrix import (
    ApprovalMatrixCreate, ApprovalMatrixUpdate, ApprovalMatrixResponse,
)

router = APIRouter()


def _to_response(rule: ApprovalMatrix) -> dict:
    """Convert model to response dict, injecting role_name."""
    data = {
        "id": rule.id,
        "company_id": rule.company_id,
        "cost_center_id": rule.cost_center_id,
        "min_amount": rule.min_amount,
        "max_amount": rule.max_amount,
        "role_id": rule.role_id,
        "role_name": rule.role.name if rule.role else None,
        "step_order": rule.step_order,
    }
    return data


@router.get("/", response_model=List[ApprovalMatrixResponse])
async def list_rules(
    company_id: UUID = None,
    cost_center_id: UUID = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ApprovalMatrix).options(selectinload(ApprovalMatrix.role))
    if company_id:
        query = query.where(ApprovalMatrix.company_id == company_id)
    if cost_center_id:
        query = query.where(ApprovalMatrix.cost_center_id == cost_center_id)
    query = query.order_by(ApprovalMatrix.step_order)

    result = await db.execute(query)
    rules = result.scalars().all()
    return [_to_response(r) for r in rules]


@router.get("/{rule_id}", response_model=ApprovalMatrixResponse)
async def get_rule(
    rule_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ApprovalMatrix).options(
        selectinload(ApprovalMatrix.role)
    ).where(ApprovalMatrix.id == rule_id)
    result = await db.execute(query)
    rule = result.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Approval rule not found")
    return _to_response(rule)


@router.post("/", response_model=ApprovalMatrixResponse, status_code=201)
async def create_rule(
    data: ApprovalMatrixCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = ApprovalMatrix(**data.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)

    # Reload with role relationship
    query = select(ApprovalMatrix).options(
        selectinload(ApprovalMatrix.role)
    ).where(ApprovalMatrix.id == rule.id)
    result = await db.execute(query)
    rule = result.scalars().first()
    return _to_response(rule)


@router.put("/{rule_id}", response_model=ApprovalMatrixResponse)
async def update_rule(
    rule_id: UUID,
    data: ApprovalMatrixUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ApprovalMatrix).where(ApprovalMatrix.id == rule_id))
    rule = result.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Approval rule not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)

    await db.commit()

    # Reload with role
    query = select(ApprovalMatrix).options(
        selectinload(ApprovalMatrix.role)
    ).where(ApprovalMatrix.id == rule_id)
    result = await db.execute(query)
    rule = result.scalars().first()
    return _to_response(rule)


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ApprovalMatrix).where(ApprovalMatrix.id == rule_id))
    rule = result.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Approval rule not found")

    await db.delete(rule)
    await db.commit()
