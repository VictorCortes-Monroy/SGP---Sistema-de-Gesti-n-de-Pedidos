from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Any, List, Optional
from uuid import UUID

from app.api import deps
from app.models.maintenance.provider import MaintProvider, MaintProviderEquipmentType
from app.schemas.maintenance.provider import ProviderCreate, ProviderUpdate, ProviderResponse
from app.schemas.pagination import PaginatedResponse
from app.models.users import User

router = APIRouter()

@router.post("/", response_model=ProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_provider(
    *,
    db: AsyncSession = Depends(deps.get_db),
    provider_in: ProviderCreate,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_planner", "maintenance_chief"))
) -> Any:
    query = select(MaintProvider).where(MaintProvider.rut == provider_in.rut)
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=409, detail="Provider RUT already exists")
        
    db_obj = MaintProvider(
        name=provider_in.name,
        rut=provider_in.rut,
        contact_name=provider_in.contact_name,
        contact_email=provider_in.contact_email,
        contact_phone=provider_in.contact_phone,
        address=provider_in.address,
        is_active=provider_in.is_active
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    if provider_in.equipment_types:
        for eq_type in provider_in.equipment_types:
            eq_type_obj = MaintProviderEquipmentType(provider_id=db_obj.id, equipment_type=eq_type)
            db.add(eq_type_obj)
        await db.commit()
    
    return {
        "id": db_obj.id,
        "name": db_obj.name,
        "rut": db_obj.rut,
        "contact_name": db_obj.contact_name,
        "contact_email": db_obj.contact_email,
        "contact_phone": db_obj.contact_phone,
        "address": db_obj.address,
        "is_active": db_obj.is_active,
        "created_at": db_obj.created_at,
        "updated_at": db_obj.updated_at,
        "equipment_types": provider_in.equipment_types
    }

@router.get("/", response_model=PaginatedResponse[ProviderResponse])
async def read_providers(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    from sqlalchemy.orm import selectinload
    
    query = select(MaintProvider).options(selectinload(MaintProvider.equipment_types))
    
    if search:
        query = query.where(
            or_(
                MaintProvider.name.ilike(f"%{search}%"),
                MaintProvider.rut.ilike(f"%{search}%")
            )
        )
    if is_active is not None:
        query = query.where(MaintProvider.is_active == is_active)
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(MaintProvider.name.asc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    
    formatted_items = []
    for item in items:
        eq_types = [et.equipment_type for et in item.equipment_types]
        formatted_items.append({
            "id": item.id,
            "name": item.name,
            "rut": item.rut,
            "contact_name": item.contact_name,
            "contact_email": item.contact_email,
            "contact_phone": item.contact_phone,
            "address": item.address,
            "is_active": item.is_active,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "equipment_types": eq_types
        })
    
    return {
        "items": formatted_items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.put("/{id}", response_model=ProviderResponse)
async def update_provider(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    provider_in: ProviderUpdate,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_planner", "maintenance_chief"))
) -> Any:
    from sqlalchemy.orm import selectinload
    from sqlalchemy import delete
    
    query = select(MaintProvider).options(selectinload(MaintProvider.equipment_types)).where(MaintProvider.id == id)
    result = await db.execute(query)
    db_obj = result.scalars().first()
    
    if not db_obj:
        raise HTTPException(status_code=404, detail="Provider not found")
        
    update_data = provider_in.model_dump(exclude_unset=True)
    
    if "equipment_types" in update_data:
        await db.execute(
            delete(MaintProviderEquipmentType).where(MaintProviderEquipmentType.provider_id == id)
        )
        for eq_type in update_data["equipment_types"]:
            db.add(MaintProviderEquipmentType(provider_id=id, equipment_type=eq_type))
            
    for field, value in update_data.items():
        if field != "equipment_types":
            setattr(db_obj, field, value)
            
    await db.commit()
    
    result = await db.execute(query)
    db_obj = result.scalars().first()
    
    eq_types = [et.equipment_type for et in db_obj.equipment_types]
    
    return {
        "id": db_obj.id,
        "name": db_obj.name,
        "rut": db_obj.rut,
        "contact_name": db_obj.contact_name,
        "contact_email": db_obj.contact_email,
        "contact_phone": db_obj.contact_phone,
        "address": db_obj.address,
        "is_active": db_obj.is_active,
        "created_at": db_obj.created_at,
        "updated_at": db_obj.updated_at,
        "equipment_types": eq_types
    }
