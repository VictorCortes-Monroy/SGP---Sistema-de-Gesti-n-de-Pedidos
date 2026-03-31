from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.maintenance.equipment import EquipmentStatus, EquipmentType

class EquipmentBase(BaseModel):
    code: Optional[str] = None  # Auto-generated if not provided
    name: str
    equipment_type: EquipmentType
    brand: Optional[str] = None
    model: Optional[str] = None
    model_year: Optional[int] = None
    serial_number: Optional[str] = None
    status: EquipmentStatus = EquipmentStatus.OPERATIVE
    company_id: UUID
    cost_center_id: Optional[UUID] = None
    current_horometer: float = 0.0
    maintenance_interval_hours: int = 500
    notes: Optional[str] = None
    is_active: bool = True

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    equipment_type: Optional[EquipmentType] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    model_year: Optional[int] = None
    serial_number: Optional[str] = None
    status: Optional[EquipmentStatus] = None
    cost_center_id: Optional[UUID] = None
    maintenance_interval_hours: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class EquipmentResponse(EquipmentBase):
    id: UUID
    last_maintenance_date: Optional[datetime] = None
    next_maintenance_due: Optional[float] = None
    last_certificate_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
