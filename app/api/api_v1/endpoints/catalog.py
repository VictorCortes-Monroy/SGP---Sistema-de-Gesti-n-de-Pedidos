from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from decimal import Decimal
from datetime import datetime

from app.api.deps import get_db, get_current_user, require_role
from app.models.users import User
from app.models.catalog import CatalogItem, Supplier, SupplierProduct
from app.models.request import RequestItem, Request
from app.schemas.catalog import (
    CatalogItemCreate, CatalogItemUpdate, CatalogItemResponse, CatalogItemDetail,
    SupplierProductCreate, SupplierProductResponse,
    PurchaseHistoryEntry, TopProductEntry
)

router = APIRouter()


@router.get("/", response_model=List[CatalogItemResponse])
async def list_catalog(
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = True,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(CatalogItem).options(selectinload(CatalogItem.preferred_supplier)).order_by(CatalogItem.name)
    filters = []
    if is_active is not None:
        filters.append(CatalogItem.is_active == is_active)
    if category:
        filters.append(CatalogItem.category == category)
    if search:
        filters.append(
            CatalogItem.name.ilike(f"%{search}%") | CatalogItem.sku.ilike(f"%{search}%")
        )
    if filters:
        q = q.where(and_(*filters))
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    items = result.scalars().all()
    return [
        CatalogItemResponse(
            **{k: getattr(i, k) for k in CatalogItemResponse.model_fields if hasattr(i, k)},
            preferred_supplier_name=i.preferred_supplier.name if i.preferred_supplier else None,
        )
        for i in items
    ]


@router.get("/stats/top-products", response_model=List[TopProductEntry])
async def top_products(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(
            CatalogItem.id.label("catalog_item_id"),
            CatalogItem.sku,
            CatalogItem.name,
            CatalogItem.category,
            func.coalesce(func.sum(RequestItem.quantity), 0).label("total_quantity"),
            func.coalesce(func.sum(RequestItem.total_price), 0).label("total_spend"),
            func.count(RequestItem.id).label("purchase_count"),
        )
        .join(RequestItem, RequestItem.catalog_item_id == CatalogItem.id)
        .group_by(CatalogItem.id, CatalogItem.sku, CatalogItem.name, CatalogItem.category)
        .order_by(func.coalesce(func.sum(RequestItem.total_price), 0).desc())
        .limit(limit)
    )
    return [
        TopProductEntry(
            catalog_item_id=r.catalog_item_id,
            sku=r.sku,
            name=r.name,
            category=r.category,
            total_quantity=r.total_quantity,
            total_spend=r.total_spend,
            purchase_count=r.purchase_count,
        )
        for r in result.all()
    ]


@router.post("/", response_model=CatalogItemResponse)
async def create_catalog_item(
    payload: CatalogItemCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    existing = await db.execute(select(CatalogItem).where(CatalogItem.sku == payload.sku))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="SKU ya existe en el catálogo")
    item = CatalogItem(**payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return CatalogItemResponse.model_validate(item)


@router.get("/{item_id}", response_model=CatalogItemDetail)
async def get_catalog_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CatalogItem)
        .options(
            selectinload(CatalogItem.preferred_supplier),
            selectinload(CatalogItem.suppliers).selectinload(SupplierProduct.supplier),
        )
        .where(CatalogItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Historial de compras
    history_result = await db.execute(
        select(
            RequestItem.request_id,
            Request.title.label("request_title"),
            RequestItem.quantity,
            RequestItem.unit_price,
            RequestItem.total_price,
            Request.created_at.label("purchased_at"),
            Request.status,
        )
        .join(Request, RequestItem.request_id == Request.id)
        .where(RequestItem.catalog_item_id == item_id)
        .order_by(Request.created_at.desc())
        .limit(20)
    )
    history = [
        PurchaseHistoryEntry(
            request_id=r.request_id,
            request_title=r.request_title,
            quantity=r.quantity,
            unit_price=r.unit_price,
            total_price=r.total_price,
            purchased_at=r.purchased_at,
            status=r.status.value if hasattr(r.status, 'value') else str(r.status),
        )
        for r in history_result.all()
    ]

    detail = CatalogItemDetail(
        **{k: getattr(item, k) for k in CatalogItemDetail.model_fields if hasattr(item, k)},
        preferred_supplier_name=item.preferred_supplier.name if item.preferred_supplier else None,
        suppliers=[
            SupplierProductResponse(
                id=sp.id,
                supplier_id=sp.supplier_id,
                catalog_item_id=sp.catalog_item_id,
                supplier_sku=sp.supplier_sku,
                unit_price=sp.unit_price,
                currency=sp.currency,
                lead_time_days=sp.lead_time_days,
                is_preferred=sp.is_preferred,
                last_purchase_date=sp.last_purchase_date,
                updated_at=sp.updated_at,
                supplier_name=sp.supplier.name if sp.supplier else None,
            )
            for sp in item.suppliers
        ],
        purchase_history=history,
    )
    return detail


@router.put("/{item_id}", response_model=CatalogItemResponse)
async def update_catalog_item(
    item_id: UUID,
    payload: CatalogItemUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    result = await db.execute(select(CatalogItem).where(CatalogItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return CatalogItemResponse.model_validate(item)


@router.get("/{item_id}/suppliers", response_model=List[SupplierProductResponse])
async def get_item_suppliers(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SupplierProduct)
        .options(selectinload(SupplierProduct.supplier))
        .where(SupplierProduct.catalog_item_id == item_id)
        .order_by(SupplierProduct.is_preferred.desc(), SupplierProduct.unit_price)
    )
    sps = result.scalars().all()
    return [
        SupplierProductResponse(
            id=sp.id,
            supplier_id=sp.supplier_id,
            catalog_item_id=sp.catalog_item_id,
            supplier_sku=sp.supplier_sku,
            unit_price=sp.unit_price,
            currency=sp.currency,
            lead_time_days=sp.lead_time_days,
            is_preferred=sp.is_preferred,
            last_purchase_date=sp.last_purchase_date,
            updated_at=sp.updated_at,
            supplier_name=sp.supplier.name if sp.supplier else None,
        )
        for sp in sps
    ]


@router.post("/{item_id}/suppliers", response_model=SupplierProductResponse)
async def link_supplier(
    item_id: UUID,
    payload: SupplierProductCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    # Verificar que existe el item y el supplier
    item = (await db.execute(select(CatalogItem).where(CatalogItem.id == item_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    supplier = (await db.execute(select(Supplier).where(Supplier.id == payload.supplier_id))).scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    # Si ya existe, actualizar
    existing = (await db.execute(
        select(SupplierProduct).where(
            and_(SupplierProduct.supplier_id == payload.supplier_id,
                 SupplierProduct.catalog_item_id == item_id)
        )
    )).scalar_one_or_none()

    if existing:
        for k, v in payload.model_dump(exclude_unset=True).items():
            if k != 'supplier_id':
                setattr(existing, k, v)
        await db.commit()
        await db.refresh(existing)
        sp = existing
    else:
        sp = SupplierProduct(catalog_item_id=item_id, **payload.model_dump())
        db.add(sp)
        await db.commit()
        await db.refresh(sp)

    return SupplierProductResponse(
        id=sp.id,
        supplier_id=sp.supplier_id,
        catalog_item_id=sp.catalog_item_id,
        supplier_sku=sp.supplier_sku,
        unit_price=sp.unit_price,
        currency=sp.currency,
        lead_time_days=sp.lead_time_days,
        is_preferred=sp.is_preferred,
        last_purchase_date=sp.last_purchase_date,
        updated_at=sp.updated_at,
        supplier_name=supplier.name,
    )
