from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Any, List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from app.api import deps
from app.models.maintenance.request import MaintRequest, MaintRequestStatus, MaintenanceType
from app.schemas.maintenance.request import MaintRequestCreate, MaintRequestResponse, MaintRequestDetail, CloseInput, MaintWorkflowLogResponse
from app.schemas.pagination import PaginatedResponse
from app.models.users import User
from app.services.maintenance.sm_service import SmService

router = APIRouter()

@router.post("/", response_model=MaintRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_in: MaintRequestCreate,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_planner", "maintenance_chief"))
) -> Any:
    sm = await SmService.create_sm(db=db, obj_in=request_in.model_dump(), user_id=current_user.id)
    return sm

@router.get("/export")
async def export_requests(
    db: AsyncSession = Depends(deps.get_db),
    format: str = Query("excel", description="Format to export: 'excel' or 'pdf'"),
    search: Optional[str] = None,
    item_status: Optional[MaintRequestStatus] = Query(None, alias="status"),
    equipment_id: Optional[UUID] = None,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Export maintenance requests to Excel or PDF."""
    from app.services.export_service import export_maint_requests_excel, export_maint_requests_pdf
    from fastapi.responses import StreamingResponse
    from sqlalchemy.orm import selectinload
    
    query = select(MaintRequest).options(selectinload(MaintRequest.equipment))
    
    if search:
        query = query.where(MaintRequest.code.ilike(f"%{search}%"))
    if item_status is not None:
        query = query.where(MaintRequest.status == item_status)
    if equipment_id is not None:
        query = query.where(MaintRequest.equipment_id == equipment_id)
        
    query = query.order_by(MaintRequest.created_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()

    if format.lower() == "pdf":
        file_stream = export_maint_requests_pdf(items)
        media_type = "application/pdf"
        filename = "mantenciones.pdf"
    else:
        file_stream = export_maint_requests_excel(items)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "mantenciones.xlsx"

    return StreamingResponse(
        file_stream,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/", response_model=PaginatedResponse[MaintRequestResponse])
async def read_requests(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    item_status: Optional[MaintRequestStatus] = Query(None, alias="status"),
    equipment_id: Optional[UUID] = None,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    query = select(MaintRequest)
    
    if search:
        query = query.where(MaintRequest.code.ilike(f"%{search}%"))
    if item_status is not None:
        query = query.where(MaintRequest.status == item_status)
    if equipment_id is not None:
        query = query.where(MaintRequest.equipment_id == equipment_id)
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(MaintRequest.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{id}", response_model=MaintRequestDetail)
async def read_request_by_id(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    sm = await SmService.get_sm(db, sm_id=id)
    return sm

@router.get("/{id}/timeline", response_model=List[MaintWorkflowLogResponse])
async def get_request_timeline(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    logs = await SmService.get_timeline(db=db, sm_id=id)
    return logs

@router.post("/{id}/submit", response_model=MaintRequestResponse)
async def submit_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_planner", "maintenance_chief"))
) -> Any:
    sm = await SmService.submit_sm(db=db, sm_id=id, user_id=current_user.id)
    return sm

class ApproveInput(BaseModel):
    cost_center_id: Optional[UUID] = None

@router.post("/{id}/approve", response_model=MaintRequestResponse)
async def approve_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    approve_in: ApproveInput,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_chief"))
) -> Any:
    sm = await SmService.approve_sm(db=db, sm_id=id, user_id=current_user.id, cost_center_id=approve_in.cost_center_id)
    return sm

class RejectInput(BaseModel):
    reason: str

@router.post("/{id}/reject", response_model=MaintRequestResponse)
async def reject_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    reject_in: RejectInput,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_chief"))
) -> Any:
    sm = await SmService.reject_sm(db=db, sm_id=id, user_id=current_user.id, reason=reject_in.reason)
    return sm

class ProviderConfirmInput(BaseModel):
    provider_id: UUID
    scheduled_start: Optional[datetime] = None

@router.post("/{id}/confirm-provider", response_model=MaintRequestResponse)
async def confirm_provider(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    confirm_in: ProviderConfirmInput,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_planner", "maintenance_chief"))
) -> Any:
    sm = await SmService.confirm_provider_sm(
        db=db, 
        sm_id=id, 
        user_id=current_user.id, 
        provider_id=confirm_in.provider_id,
        scheduled_start=confirm_in.scheduled_start
    )
    return sm

class TransportScheduleInput(BaseModel):
    scheduled_date: datetime
    notes: Optional[str] = None

@router.post("/{id}/schedule-transport", response_model=MaintRequestResponse)
async def schedule_transport(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    transport_in: TransportScheduleInput,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_planner", "maintenance_chief"))
) -> Any:
    sm = await SmService.schedule_transport_sm(
        db=db,
        sm_id=id,
        user_id=current_user.id,
        scheduled_date=transport_in.scheduled_date,
        notes=transport_in.notes
    )
    return sm

class LinkOCInput(BaseModel):
    purchase_order_code: str

@router.post("/{id}/link-purchase-order", response_model=MaintRequestResponse)
async def link_purchase_order(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    link_in: LinkOCInput,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_planner", "maintenance_chief", "Requester"))
) -> Any:
    """Links an associated SGP Purchase Order code back to the Maintenance Request."""
    sm = await SmService.link_purchase_order(db=db, sm_id=id, user_id=current_user.id, po_code=link_in.purchase_order_code)
    return sm

from typing import Dict
@router.get("/{id}/gate-status", response_model=Dict[str, Any])
async def get_gate_status(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Returns the boolean status of the 3 gating prerequisites."""
    sm = await SmService.get_sm(db, sm_id=id)
    
    # Prerequisite 1: OC Generated (has code or is linked to SGP request)
    has_oc = sm.purchase_order_code is not None or sm.sgp_request_id is not None
    
    # Prerequisite 2: Provider Confirmed
    provider_confirmed = sm.provider_confirmed
    
    # Prerequisite 3: Transport Scheduled
    transport_scheduled = sm.transport_scheduled
    
    return {
        "maint_request_id": sm.id,
        "status": sm.status.value,
        "gate_conditions": {
            "purchase_order": has_oc,
            "provider_confirmed": provider_confirmed,
            "transport_scheduled": transport_scheduled
        },
        "is_ready_for_execution": has_oc and provider_confirmed and transport_scheduled
    }

@router.post("/{id}/start-execution", response_model=MaintRequestResponse)
async def start_execution(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_chief"))
) -> Any:
    sm = await SmService.start_execution(db=db, sm_id=id, user_id=current_user.id)
    return sm

@router.post("/{id}/confirm-workshop-arrival", response_model=MaintRequestResponse)
async def confirm_workshop_arrival(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_chief"))
) -> Any:
    sm = await SmService.confirm_workshop_arrival(db=db, sm_id=id, user_id=current_user.id)
    return sm

@router.post("/{id}/complete-execution", response_model=MaintRequestResponse)
async def complete_execution(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_chief", "maintenance_planner"))
) -> Any:
    sm = await SmService.complete_execution(db=db, sm_id=id, user_id=current_user.id)
    return sm

from app.schemas.maintenance.checklist import ReceptionInput
@router.post("/{id}/reception", response_model=MaintRequestResponse)
async def process_reception(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    reception_in: ReceptionInput,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_chief"))
) -> Any:
    sm = await SmService.process_reception(db=db, sm_id=id, user_id=current_user.id, reception_in=reception_in.model_dump())
    return sm

@router.post("/{id}/upload-certificate", response_model=MaintRequestResponse)
async def upload_certificate(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(deps.require_role("Admin", "maintenance_chief", "maintenance_planner"))
) -> Any:
    # Basic file handling, saving to a local directory for now
    import os
    import shutil
    import hashlib
    
    upload_dir = "uploads/certificates"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, f"{id}_{file.filename}")
    
    # Calculate SHA-256 and save
    sha256_hash = hashlib.sha256()
    with open(file_path, "wb") as buffer:
        while chunk := file.file.read(8192):
            sha256_hash.update(chunk)
            buffer.write(chunk)
            
    file_hash = sha256_hash.hexdigest()
    
    sm = await SmService.upload_certificate(
        db=db, 
        sm_id=id, 
        user_id=current_user.id, 
        file_path=file_path, 
        file_name=file.filename,
        file_hash=file_hash
    )
    return sm

@router.post("/{id}/confirm-field-return", response_model=MaintRequestResponse)
async def confirm_field_return(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_chief", "maintenance_planner"))
) -> Any:
    sm = await SmService.confirm_field_return(db=db, sm_id=id, user_id=current_user.id)
    return sm

class QuotationInput(BaseModel):
    quotation_amount: float
    notes: Optional[str] = None

@router.post("/{id}/register-quotation", response_model=MaintRequestResponse)
async def register_quotation(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    quotation_in: QuotationInput,
    current_user: User = Depends(deps.require_role("Admin", "purchasing"))
) -> Any:
    sm = await SmService.register_quotation(
        db=db,
        sm_id=id,
        user_id=current_user.id,
        quotation_amount=quotation_in.quotation_amount,
        notes=quotation_in.notes
    )
    return sm

class D5Input(BaseModel):
    notes: Optional[str] = None

@router.post("/{id}/sign-d5", response_model=MaintRequestResponse)
async def sign_d5(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    d5_in: D5Input,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_chief"))
) -> Any:
    sm = await SmService.sign_d5(db=db, sm_id=id, user_id=current_user.id, notes=d5_in.notes)
    return sm

class InvoiceInput(BaseModel):
    invoice_number: str
    invoice_amount: float

@router.post("/{id}/register-invoice", response_model=MaintRequestResponse)
async def register_invoice(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    invoice_in: InvoiceInput,
    current_user: User = Depends(deps.require_role("Admin", "purchasing"))
) -> Any:
    sm = await SmService.register_invoice(
        db=db,
        sm_id=id,
        user_id=current_user.id,
        invoice_number=invoice_in.invoice_number,
        invoice_amount=invoice_in.invoice_amount
    )
    return sm

class PaymentInput(BaseModel):
    notes: Optional[str] = None

@router.post("/{id}/confirm-payment", response_model=MaintRequestResponse)
async def confirm_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    payment_in: PaymentInput,
    current_user: User = Depends(deps.require_role("Admin", "finance"))
) -> Any:
    sm = await SmService.confirm_payment(db=db, sm_id=id, user_id=current_user.id, notes=payment_in.notes)
    return sm

@router.post("/{id}/close", response_model=MaintRequestResponse)
async def close_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    close_in: CloseInput,
    current_user: User = Depends(deps.require_role("Admin", "maintenance_chief"))
) -> Any:
    sm = await SmService.close_sm(
        db=db, 
        sm_id=id, 
        user_id=current_user.id, 
        invoice_number=close_in.invoice_number, 
        invoice_amount=float(close_in.invoice_amount)
    )
    return sm
