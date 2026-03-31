from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from app.models.maintenance.request import MaintRequestStatus, MaintenanceType

class MaintRequestBase(BaseModel):
    equipment_id: UUID
    provider_id: Optional[UUID] = None
    maintenance_type: MaintenanceType
    description: str
    planned_date: datetime
    estimated_cost: Optional[float] = None
    currency: str = "CLP"

class MaintRequestCreate(MaintRequestBase):
    pass

class CloseInput(BaseModel):
    invoice_number: str
    invoice_amount: Decimal

class MaintRequestResponse(MaintRequestBase):
    id: UUID
    code: str
    requested_by_id: UUID
    approved_by_id: Optional[UUID] = None
    status: MaintRequestStatus
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    reception_status: Optional[str] = None
    reception_date: Optional[datetime] = None
    reception_by: Optional[UUID] = None
    certificate_uploaded: bool = False
    certificate_file_id: Optional[UUID] = None
    certificate_date: Optional[datetime] = None
    equipment_returned_date: Optional[datetime] = None
    
    invoice_number: Optional[str] = None
    invoice_amount: Optional[Decimal] = None

    # D2 — Quotation
    d2_quotation_amount: Optional[Decimal] = None
    d2_quotation_notes: Optional[str] = None
    d2_registered_at: Optional[datetime] = None

    # D5 — Termination document
    d5_signed_at: Optional[datetime] = None
    d5_signed_by_id: Optional[UUID] = None

    # Payment confirmation
    payment_confirmed_at: Optional[datetime] = None
    payment_confirmed_by_id: Optional[UUID] = None

    sgp_request_id: Optional[UUID] = None
    completed_at: Optional[datetime] = None

    rejection_reason: Optional[str] = None
    remediation_deadline: Optional[datetime] = None
    notes: Optional[str] = None
    purchase_order_code: Optional[str] = None
    provider_confirmed: bool
    transport_scheduled: bool
    
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MaintRequestDetail(MaintRequestResponse):
    pass

class MaintWorkflowLogResponse(BaseModel):
    id: UUID
    actor_id: UUID
    from_status: Optional[MaintRequestStatus] = None
    to_status: MaintRequestStatus
    action: str
    notes: Optional[str] = None
    created_at: datetime
    
    # We can embed the actor name/email if needed dynamically, but returning pure DB shape for now
    model_config = ConfigDict(from_attributes=True)
