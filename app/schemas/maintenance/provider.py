from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class ProviderBase(BaseModel):
    name: str
    rut: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True

class ProviderCreate(ProviderBase):
    equipment_types: List[str] = []

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    equipment_types: Optional[List[str]] = None

class ProviderResponse(ProviderBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    equipment_types: List[str] = []

    model_config = ConfigDict(from_attributes=True)
