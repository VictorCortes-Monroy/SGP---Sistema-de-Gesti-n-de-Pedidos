from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user
from app.models.users import User
from app.models.organization import Company, CostCenter
from app.schemas.organization import (
    CompanyCreate, CompanyUpdate, CompanyResponse, CompanyDetail,
    CostCenterCreate, CostCenterUpdate, CostCenterResponse,
)
from app.schemas.pagination import PaginatedResponse

router = APIRouter()


# ── Companies ────────────────────────────────────────────

@router.get("/companies", response_model=PaginatedResponse[CompanyResponse])
async def list_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = select(Company)
    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar()

    query = base.order_by(Company.name).offset(skip).limit(limit)
    result = await db.execute(query)
    return {"items": result.scalars().all(), "total": total, "skip": skip, "limit": limit}


@router.get("/companies/{company_id}", response_model=CompanyDetail)
async def get_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Company).options(
        selectinload(Company.cost_centers)
    ).where(Company.id == company_id)
    result = await db.execute(query)
    company = result.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.post("/companies", response_model=CompanyResponse, status_code=201)
async def create_company(
    data: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check duplicates
    existing = await db.execute(
        select(Company).where(
            (Company.name == data.name) | (Company.tax_id == data.tax_id)
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Company with this name or tax_id already exists")

    company = Company(**data.model_dump())
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


@router.put("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: UUID,
    data: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)

    await db.commit()
    await db.refresh(company)
    return company


@router.delete("/companies/{company_id}", status_code=204)
async def delete_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    await db.delete(company)
    await db.commit()


# ── Cost Centers ─────────────────────────────────────────

@router.get("/cost-centers", response_model=PaginatedResponse[CostCenterResponse])
async def list_cost_centers(
    company_id: UUID = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = select(CostCenter)
    if company_id:
        base = base.where(CostCenter.company_id == company_id)

    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar()

    query = base.order_by(CostCenter.code).offset(skip).limit(limit)
    result = await db.execute(query)
    return {"items": result.scalars().all(), "total": total, "skip": skip, "limit": limit}


@router.get("/cost-centers/{cc_id}", response_model=CostCenterResponse)
async def get_cost_center(
    cc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(CostCenter).where(CostCenter.id == cc_id))
    cc = result.scalars().first()
    if not cc:
        raise HTTPException(status_code=404, detail="Cost center not found")
    return cc


@router.post("/cost-centers", response_model=CostCenterResponse, status_code=201)
async def create_cost_center(
    data: CostCenterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify company exists
    company = await db.execute(select(Company).where(Company.id == data.company_id))
    if not company.scalars().first():
        raise HTTPException(status_code=404, detail="Company not found")

    # Check duplicate code
    existing = await db.execute(select(CostCenter).where(CostCenter.code == data.code))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Cost center code already exists")

    cc = CostCenter(**data.model_dump())
    db.add(cc)
    await db.commit()
    await db.refresh(cc)
    return cc


@router.put("/cost-centers/{cc_id}", response_model=CostCenterResponse)
async def update_cost_center(
    cc_id: UUID,
    data: CostCenterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(CostCenter).where(CostCenter.id == cc_id))
    cc = result.scalars().first()
    if not cc:
        raise HTTPException(status_code=404, detail="Cost center not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cc, field, value)

    await db.commit()
    await db.refresh(cc)
    return cc


@router.delete("/cost-centers/{cc_id}", status_code=204)
async def delete_cost_center(
    cc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(CostCenter).where(CostCenter.id == cc_id))
    cc = result.scalars().first()
    if not cc:
        raise HTTPException(status_code=404, detail="Cost center not found")

    await db.delete(cc)
    await db.commit()
