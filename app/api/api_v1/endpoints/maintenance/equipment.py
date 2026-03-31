import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Any, List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.api import deps
from app.models.maintenance.equipment import MaintEquipment, MaintHorometerLog, EquipmentStatus, EquipmentType
from app.schemas.maintenance.equipment import EquipmentCreate, EquipmentUpdate, EquipmentResponse
from app.schemas.pagination import PaginatedResponse
from app.models.users import User

router = APIRouter()


def _generate_equipment_code(brand: Optional[str], model: Optional[str], year: Optional[int], serial: Optional[str], count: int) -> str:
    """Generate equipment code: {BRAND3}-{MODEL4}-{YEAR2}-{VIN4|COUNT4}"""
    brand_part = re.sub(r'[^A-Z0-9]', '', (brand[:3] if brand else 'UNK').upper()) or 'UNK'
    model_part = re.sub(r'[^A-Z0-9]', '', (model[:4] if model else 'EQP').upper()) or 'EQP'
    year_part = str(year)[-2:] if year else '00'
    if serial:
        vin_clean = re.sub(r'[^A-Z0-9]', '', serial.upper())
        vin_part = vin_clean[-4:] if len(vin_clean) >= 4 else f'{count:04d}'
    else:
        vin_part = f'{count:04d}'
    return f'{brand_part}-{model_part}-{year_part}-{vin_part}'


async def _unique_code(db: AsyncSession, base_code: str) -> str:
    """Resolve code collisions by appending _2, _3, etc."""
    candidate = base_code
    suffix = 2
    while True:
        result = await db.execute(select(MaintEquipment).where(MaintEquipment.code == candidate))
        if not result.scalars().first():
            return candidate
        candidate = f'{base_code}_{suffix}'
        suffix += 1


@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    equipment_in: EquipmentCreate,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_planner", "maintenance_chief"))
) -> Any:
    # Determine code: use provided or auto-generate
    if equipment_in.code:
        code = equipment_in.code
        existing = await db.execute(select(MaintEquipment).where(MaintEquipment.code == code))
        if existing.scalars().first():
            raise HTTPException(status_code=409, detail="Equipment code already exists")
    else:
        count_result = await db.execute(select(func.count()).select_from(MaintEquipment))
        count = count_result.scalar_one()
        base_code = _generate_equipment_code(
            equipment_in.brand, equipment_in.model,
            equipment_in.model_year, equipment_in.serial_number,
            count + 1
        )
        code = await _unique_code(db, base_code)

    next_maintenance_due = equipment_in.current_horometer + equipment_in.maintenance_interval_hours

    data = equipment_in.model_dump()
    data['code'] = code
    db_obj = MaintEquipment(
        **data,
        next_maintenance_due=next_maintenance_due
    )
    db.add(db_obj)
    await db.flush()
    
    if equipment_in.current_horometer > 0:
        log = MaintHorometerLog(
            equipment_id=db_obj.id,
            reading=equipment_in.current_horometer,
            previous_reading=0.0,
            hours_delta=equipment_in.current_horometer,
            recorded_by_id=current_user.id,
            notes="Initial horometer entry"
        )
        db.add(log)
        
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=PaginatedResponse[EquipmentResponse])
async def read_equipment(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    item_status: Optional[EquipmentStatus] = Query(None, alias="status"),
    equipment_type: Optional[EquipmentType] = None,
    company_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    query = select(MaintEquipment)
    
    if search:
        query = query.where(
            or_(
                MaintEquipment.name.ilike(f"%{search}%"),
                MaintEquipment.code.ilike(f"%{search}%")
            )
        )
    if item_status is not None:
        query = query.where(MaintEquipment.status == item_status)
    if equipment_type is not None:
        query = query.where(MaintEquipment.equipment_type == equipment_type)
    if company_id is not None:
        query = query.where(MaintEquipment.company_id == company_id)
    if is_active is not None:
        query = query.where(MaintEquipment.is_active == is_active)
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(MaintEquipment.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{id}", response_model=EquipmentResponse)
async def read_equipment_by_id(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    db_obj = await db.get(MaintEquipment, id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return db_obj

@router.put("/{id}", response_model=EquipmentResponse)
async def update_equipment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    equipment_in: EquipmentUpdate,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_planner", "maintenance_chief"))
) -> Any:
    db_obj = await db.get(MaintEquipment, id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Equipment not found")
        
    update_data = equipment_in.model_dump(exclude_unset=True)
    
    if "maintenance_interval_hours" in update_data:
        db_obj.next_maintenance_due = float(db_obj.current_horometer) + float(update_data["maintenance_interval_hours"])
        
    for field, value in update_data.items():
        setattr(db_obj, field, value)
        
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

class HorometerUpdate(BaseModel):
    reading: float
    notes: Optional[str] = None

@router.put("/{id}/horometer", response_model=EquipmentResponse)
async def update_horometer(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    update_in: HorometerUpdate,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    db_obj = await db.get(MaintEquipment, id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Equipment not found")
        
    if update_in.reading < float(db_obj.current_horometer):
        raise HTTPException(status_code=400, detail="New horometer reading must be greater than or equal to current")
        
    delta = float(update_in.reading) - float(db_obj.current_horometer)
    
    log = MaintHorometerLog(
        equipment_id=db_obj.id,
        reading=update_in.reading,
        previous_reading=db_obj.current_horometer,
        hours_delta=delta,
        recorded_by_id=current_user.id,
        notes=update_in.notes
    )
    
    db_obj.current_horometer = update_in.reading
    db.add(log)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("/{id}/horometer-history")
async def get_horometer_history(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    db_obj = await db.get(MaintEquipment, id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Equipment not found")

    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(MaintHorometerLog)
        .options(selectinload(MaintHorometerLog.recorded_by))
        .where(MaintHorometerLog.equipment_id == id)
        .order_by(MaintHorometerLog.recorded_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "reading": float(log.reading),
            "previous_reading": float(log.previous_reading) if log.previous_reading else None,
            "hours_delta": float(log.hours_delta) if log.hours_delta else None,
            "recorded_by_name": log.recorded_by.full_name if log.recorded_by else None,
            "recorded_at": log.recorded_at.isoformat() if log.recorded_at else None,
            "notes": log.notes,
        }
        for log in logs
    ]


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.require_role("Admin"))
) -> None:
    db_obj = await db.get(MaintEquipment, id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Equipment not found")
        
    db_obj.is_active = False
    await db.commit()
    return None
