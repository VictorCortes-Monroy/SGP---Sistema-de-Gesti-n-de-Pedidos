from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from decimal import Decimal

from app.api.deps import get_db, get_current_user, require_role
from app.models.users import User
from app.models.catalog import Supplier, SupplierProduct, CatalogItem
from app.models.request import RequestItem, Request
from app.schemas.catalog import (
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierDetail,
    SupplierProductResponse, SupplierSpendEntry, PurchaseHistoryEntry
)

router = APIRouter()


@router.get("/", response_model=List[SupplierResponse])
async def list_suppliers(
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = True,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Supplier).order_by(Supplier.name)
    filters = []
    if is_active is not None:
        filters.append(Supplier.is_active == is_active)
    if category:
        filters.append(Supplier.category == category)
    if search:
        filters.append(Supplier.name.ilike(f"%{search}%"))
    if filters:
        q = q.where(and_(*filters))
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=SupplierResponse)
async def create_supplier(
    payload: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    if payload.rut:
        existing = await db.execute(select(Supplier).where(Supplier.rut == payload.rut))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="RUT ya registrado")
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier


@router.get("/stats/spend", response_model=List[SupplierSpendEntry])
async def supplier_spend_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Gasto total por proveedor (desde request_items con catalog_item vinculado)."""
    result = await db.execute(
        select(
            Supplier.id.label("supplier_id"),
            Supplier.name.label("supplier_name"),
            func.coalesce(func.sum(RequestItem.total_price), 0).label("total_spend"),
            func.count(RequestItem.id).label("purchase_count"),
        )
        .select_from(Supplier)
        .outerjoin(SupplierProduct, SupplierProduct.supplier_id == Supplier.id)
        .outerjoin(RequestItem, RequestItem.catalog_item_id == SupplierProduct.catalog_item_id)
        .where(Supplier.is_active == True)  # noqa: E712
        .group_by(Supplier.id, Supplier.name)
        .order_by(func.coalesce(func.sum(RequestItem.total_price), 0).desc())
    )
    rows = result.all()
    return [
        SupplierSpendEntry(
            supplier_id=r.supplier_id,
            supplier_name=r.supplier_name,
            total_spend=r.total_spend or Decimal(0),
            purchase_count=r.purchase_count or 0,
        )
        for r in rows
    ]


@router.get("/{supplier_id}", response_model=SupplierDetail)
async def get_supplier(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Supplier)
        .options(selectinload(Supplier.products).selectinload(SupplierProduct.catalog_item))
        .where(Supplier.id == supplier_id)
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    # calcular gasto total
    spend_result = await db.execute(
        select(func.sum(RequestItem.total_price), func.count(RequestItem.id))
        .join(CatalogItem, RequestItem.catalog_item_id == CatalogItem.id)
        .join(SupplierProduct, and_(
            SupplierProduct.catalog_item_id == CatalogItem.id,
            SupplierProduct.supplier_id == supplier_id,
        ))
    )
    spend_row = spend_result.one()

    detail = SupplierDetail.model_validate(supplier)
    detail.total_spend = spend_row[0] or Decimal(0)
    detail.purchase_count = spend_row[1] or 0
    detail.products = [
        SupplierProductResponse(
            id=p.id,
            supplier_id=p.supplier_id,
            catalog_item_id=p.catalog_item_id,
            supplier_sku=p.supplier_sku,
            unit_price=p.unit_price,
            currency=p.currency,
            lead_time_days=p.lead_time_days,
            is_preferred=p.is_preferred,
            last_purchase_date=p.last_purchase_date,
            updated_at=p.updated_at,
            catalog_item_name=p.catalog_item.name if p.catalog_item else None,
        )
        for p in supplier.products
    ]
    return detail


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: UUID,
    payload: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, k, v)
    await db.commit()
    await db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}")
async def deactivate_supplier(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    supplier.is_active = False
    await db.commit()
    return {"ok": True}
