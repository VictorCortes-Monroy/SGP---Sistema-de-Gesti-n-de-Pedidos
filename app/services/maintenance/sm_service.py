from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from fastapi import HTTPException
from datetime import datetime

from app.models.maintenance.request import MaintRequest, MaintRequestStatus, MaintWorkflowLog
from app.models.users import User
from app.services.workflow import WorkflowEngine
from app.api import deps

class SmService:
    @staticmethod
    async def get_sm(db: AsyncSession, *, sm_id: UUID) -> MaintRequest:
        result = await db.execute(select(MaintRequest).where(MaintRequest.id == sm_id))
        sm = result.scalars().first()
        if not sm:
            raise HTTPException(status_code=404, detail="Maintenance Request not found")
        return sm

    @staticmethod
    async def create_sm(db: AsyncSession, *, obj_in: dict, user_id: UUID) -> MaintRequest:
        # Generate code from sequence using RAW SQL function generate_sm_code()
        code_result = await db.execute(select(func.generate_sm_code()))
        code = code_result.scalar_one()

        db_obj = MaintRequest(
            **obj_in,
            code=code,
            requested_by_id=user_id,
            status=MaintRequestStatus.DRAFT
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        
        # Log creation
        await SmService.log_action(db, sm_id=db_obj.id, actor_id=user_id, from_status=None, to_status=MaintRequestStatus.DRAFT, action="CREATED")
        await db.commit()
        return db_obj

    @staticmethod
    async def submit_sm(db: AsyncSession, *, sm_id: UUID, user_id: UUID) -> MaintRequest:
        sm = await SmService.get_sm(db, sm_id=sm_id)
        if sm.status != MaintRequestStatus.DRAFT:
            raise HTTPException(status_code=400, detail="Only DRAFT requests can be submitted")
        
        sm.status = MaintRequestStatus.PENDING_APPROVAL
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.DRAFT, to_status=MaintRequestStatus.PENDING_APPROVAL, action="SUBMITTED")
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def approve_sm(db: AsyncSession, *, sm_id: UUID, user_id: UUID, cost_center_id: UUID | None = None) -> MaintRequest:
        from sqlalchemy.orm import selectinload
        
        # Reload with equipment to have access to properties
        result = await db.execute(
            select(MaintRequest)
            .options(selectinload(MaintRequest.equipment))
            .where(MaintRequest.id == sm_id)
        )
        sm = result.scalars().first()
        if not sm:
            raise HTTPException(status_code=404, detail="Maintenance Request not found")
            
        if sm.status != MaintRequestStatus.PENDING_APPROVAL:
            raise HTTPException(status_code=400, detail="Request is not in PENDING_APPROVAL state")
            
        sm.status = MaintRequestStatus.APPROVED
        sm.approved_by_id = user_id
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.PENDING_APPROVAL, to_status=MaintRequestStatus.APPROVED, action="APPROVED")
        
        # Auto-create Purchase Request in SGP if a cost_center was provided
        if cost_center_id:
            wf_engine = WorkflowEngine(db)
            sgp_req = await wf_engine.create_purchase_request_from_sm(
                sm=sm,
                actor_id=str(user_id),
                cost_center_id=str(cost_center_id)
            )
            sm.sgp_request_id = sgp_req.id
            await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.APPROVED, to_status=MaintRequestStatus.APPROVED, action="SGP_REQUEST_CREATED", notes=f"Created PR {sgp_req.id}")
        
        # Transition to QUOTED_PENDING (awaiting provider quotation D2)
        sm.status = MaintRequestStatus.QUOTED_PENDING
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.APPROVED, to_status=MaintRequestStatus.QUOTED_PENDING, action="AUTO_TRANSITION")
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def reject_sm(db: AsyncSession, *, sm_id: UUID, user_id: UUID, reason: str) -> MaintRequest:
        sm = await SmService.get_sm(db, sm_id=sm_id)
        if sm.status != MaintRequestStatus.PENDING_APPROVAL:
            raise HTTPException(status_code=400, detail="Request is not in PENDING_APPROVAL state")
            
        sm.status = MaintRequestStatus.REJECTED
        sm.rejection_reason = reason
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.PENDING_APPROVAL, to_status=MaintRequestStatus.REJECTED, action="REJECTED", notes=reason)
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def confirm_provider_sm(db: AsyncSession, *, sm_id: UUID, user_id: UUID, provider_id: UUID, scheduled_start: datetime | None) -> MaintRequest:
        sm = await SmService.get_sm(db, sm_id=sm_id)
        
        # Valid states to confirm a provider
        if sm.status not in (MaintRequestStatus.APPROVED, MaintRequestStatus.QUOTED_PENDING, MaintRequestStatus.AWAITING_PREREQUISITES):
            raise HTTPException(status_code=400, detail="Cannot confirm provider for this request in its current state")
            
        sm.provider_id = provider_id
        sm.provider_confirmed = True
        
        if scheduled_start:
            sm.scheduled_start = scheduled_start
            
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=sm.status, to_status=sm.status, action="PROVIDER_CONFIRMED", notes=f"Provider {provider_id} confirmed")
        
        # Check Gate automatically
        await SmService.check_gate_prerequisites(db, sm_id=sm.id, user_id=user_id)
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def schedule_transport_sm(db: AsyncSession, *, sm_id: UUID, user_id: UUID, scheduled_date: datetime, notes: str | None) -> MaintRequest:
        from app.models.maintenance.transport import MaintTransportSchedule
        
        sm = await SmService.get_sm(db, sm_id=sm_id)
        
        if sm.status not in (MaintRequestStatus.APPROVED, MaintRequestStatus.QUOTED_PENDING, MaintRequestStatus.AWAITING_PREREQUISITES):
            raise HTTPException(status_code=400, detail="Cannot schedule transport for this request in its current state")
            
        transport = MaintTransportSchedule(
            maint_request_id=sm.id,
            scheduled_date=scheduled_date,
            trip_type="TO_WORKSHOP",
            notes=notes
        )
        db.add(transport)
        
        sm.transport_scheduled = True
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=sm.status, to_status=sm.status, action="TRANSPORT_SCHEDULED", notes=f"Transport scheduled for {scheduled_date}")
        
        # Check Gate automatically
        await SmService.check_gate_prerequisites(db, sm_id=sm.id, user_id=user_id)
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def check_gate_prerequisites(db: AsyncSession, *, sm_id: UUID, user_id: UUID) -> bool:
        """
        Validates the 3 gate conditions: 
        1. OC linked (purchase_order_code is set)
        2. provider_confirmed is True
        3. transport_scheduled is True
        Transitions to READY_FOR_EXECUTION if all met.
        Returns True if gate passed, False otherwise.
        """
        sm = await SmService.get_sm(db, sm_id=sm_id)
        
        if sm.status != MaintRequestStatus.AWAITING_PREREQUISITES:
            return False
            
        # Optional: In some flows the OC is not strictly mandatory, but TO-BE specifies it is.
        # If OC logic needs to be flexible, we can adjust.
        # Default TO-BE design says OC is mandatory if we use SGP integration.
        has_oc = sm.purchase_order_code is not None or sm.sgp_request_id is not None
        
        if sm.provider_confirmed and sm.transport_scheduled and has_oc:
            sm.status = MaintRequestStatus.READY_FOR_EXECUTION
            await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.AWAITING_PREREQUISITES, to_status=MaintRequestStatus.READY_FOR_EXECUTION, action="GATE_PASSED", notes="All prerequisites fulfilled")
            return True
        
        return False

    @staticmethod
    async def link_purchase_order(db: AsyncSession, *, sm_id: UUID, user_id: UUID, po_code: str) -> MaintRequest:
        sm = await SmService.get_sm(db, sm_id=sm_id)
        if sm.status not in (MaintRequestStatus.APPROVED, MaintRequestStatus.QUOTED_PENDING, MaintRequestStatus.AWAITING_PREREQUISITES):
            raise HTTPException(status_code=400, detail="Cannot link Purchase Order in this state")
            
        sm.purchase_order_code = po_code
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=sm.status, to_status=sm.status, action="PO_LINKED", notes=f"OC {po_code} attached")
        
        # Check Gate automatically
        await SmService.check_gate_prerequisites(db, sm_id=sm.id, user_id=user_id)
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def start_execution(db: AsyncSession, *, sm_id: UUID, user_id: UUID) -> MaintRequest:
        from sqlalchemy.orm import selectinload
        result = await db.execute(select(MaintRequest).options(selectinload(MaintRequest.equipment)).where(MaintRequest.id == sm_id))
        sm = result.scalars().first()
        
        if not sm or sm.status != MaintRequestStatus.READY_FOR_EXECUTION:
            raise HTTPException(status_code=400, detail="Cannot start execution: Request must be READY_FOR_EXECUTION")
            
        sm.status = MaintRequestStatus.IN_TRANSIT_TO_WORKSHOP
        sm.actual_start_date = datetime.utcnow()
        sm.equipment.status = "IN_TRANSIT"
        
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.READY_FOR_EXECUTION, to_status=MaintRequestStatus.IN_TRANSIT_TO_WORKSHOP, action="EXECUTION_STARTED")
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def confirm_workshop_arrival(db: AsyncSession, *, sm_id: UUID, user_id: UUID) -> MaintRequest:
        from sqlalchemy.orm import selectinload
        result = await db.execute(select(MaintRequest).options(selectinload(MaintRequest.equipment)).where(MaintRequest.id == sm_id))
        sm = result.scalars().first()
        
        if not sm or sm.status != MaintRequestStatus.IN_TRANSIT_TO_WORKSHOP:
            raise HTTPException(status_code=400, detail="Cannot confirm arrival: Request must be IN_TRANSIT_TO_WORKSHOP")
            
        sm.status = MaintRequestStatus.IN_MAINTENANCE
        sm.equipment.status = "IN_MAINTENANCE"
        
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.IN_TRANSIT_TO_WORKSHOP, to_status=MaintRequestStatus.IN_MAINTENANCE, action="WORKSHOP_ARRIVAL_CONFIRMED")
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def complete_execution(db: AsyncSession, *, sm_id: UUID, user_id: UUID) -> MaintRequest:
        from sqlalchemy.orm import selectinload
        result = await db.execute(select(MaintRequest).options(selectinload(MaintRequest.equipment)).where(MaintRequest.id == sm_id))
        sm = result.scalars().first()
        
        if not sm or sm.status != MaintRequestStatus.IN_MAINTENANCE:
            raise HTTPException(status_code=400, detail="Cannot complete execution: Request must be IN_MAINTENANCE")
            
        sm.status = MaintRequestStatus.PENDING_RECEPTION
        sm.actual_end_date = datetime.utcnow()
        
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.IN_MAINTENANCE, to_status=MaintRequestStatus.PENDING_RECEPTION, action="EXECUTION_COMPLETED")
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def process_reception(db: AsyncSession, *, sm_id: UUID, user_id: UUID, reception_in: dict) -> MaintRequest:
        from app.models.maintenance.checklist import MaintReceptionChecklist, ChecklistResult
        sm = await SmService.get_sm(db, sm_id=sm_id)
        
        if sm.status != MaintRequestStatus.PENDING_RECEPTION:
            raise HTTPException(status_code=400, detail="Cannot process reception: Request must be PENDING_RECEPTION")
        
        # Determine the transition based on the reception outcome
        to_status = MaintRequestStatus.PENDING_CERTIFICATE if reception_in["status"] == "APPROVED" else MaintRequestStatus.IN_MAINTENANCE
        action = "RECEPTION_APPROVED" if reception_in["status"] == "APPROVED" else "RECEPTION_REJECTED"
        
        c_input = reception_in.get("checklist", {})
        
        # Upsert checklist
        chk_result = await db.execute(select(MaintReceptionChecklist).where(MaintReceptionChecklist.maint_request_id == sm.id))
        checklist = chk_result.scalars().first()
        
        if checklist:
            checklist.reviewer_id = user_id
            checklist.overall_result = ChecklistResult.PASS if reception_in["status"] == "APPROVED" else ChecklistResult.FAIL
            checklist.approved = (reception_in["status"] == "APPROVED")
            checklist.observations = reception_in.get("notes")
            checklist.mechanical_group = c_input.get("scope_verification")
            checklist.electrical_group = c_input.get("equipment_condition")
            checklist.hydraulic_group = c_input.get("operational_tests")
            checklist.safety_group = c_input.get("provider_documentation")
            checklist.reviewed_at = datetime.utcnow()
        else:
            checklist = MaintReceptionChecklist(
                maint_request_id=sm.id,
                reviewer_id=user_id,
                overall_result=ChecklistResult.PASS if reception_in["status"] == "APPROVED" else ChecklistResult.FAIL,
                approved=(reception_in["status"] == "APPROVED"),
                observations=reception_in.get("notes"),
                mechanical_group=c_input.get("scope_verification"),
                electrical_group=c_input.get("equipment_condition"),
                hydraulic_group=c_input.get("operational_tests"),
                safety_group=c_input.get("provider_documentation")
            )
            db.add(checklist)
        
        sm.reception_status = reception_in["status"]
        sm.reception_date = datetime.utcnow()
        sm.reception_by = user_id
        sm.status = to_status
        sm.notes = reception_in.get("notes") or sm.notes
        
        if reception_in["status"] == "REJECTED":
            sm.rejection_reason = reception_in.get("rejection_details")
            sm.remediation_deadline = reception_in.get("remediation_deadline")
            
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.PENDING_RECEPTION, to_status=to_status, action=action, notes=reception_in.get("rejection_details"))
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def upload_certificate(db: AsyncSession, *, sm_id: UUID, user_id: UUID, file_path: str, file_name: str, file_hash: str | None = None) -> MaintRequest:
        from app.models.maintenance.certificate import MaintCertificate
        sm = await SmService.get_sm(db, sm_id=sm_id)
        
        if sm.status != MaintRequestStatus.PENDING_CERTIFICATE:
            raise HTTPException(status_code=400, detail="Cannot upload certificate: Request must be PENDING_CERTIFICATE")
            
        cert = MaintCertificate(
            maint_request_id=sm.id,
            equipment_id=sm.equipment_id,
            file_path=file_path,
            file_name=file_name,
            file_hash=file_hash,
            uploaded_by_id=user_id
        )
        db.add(cert)
        
        # We need to flush so cert.id is populated
        await db.flush()
        
        sm.certificate_uploaded = True
        sm.certificate_file_id = cert.id
        sm.certificate_date = datetime.utcnow()
        sm.status = MaintRequestStatus.IN_TRANSIT_TO_FIELD
        
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.PENDING_CERTIFICATE, to_status=MaintRequestStatus.IN_TRANSIT_TO_FIELD, action="CERTIFICATE_UPLOADED", notes=file_name)
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def confirm_field_return(db: AsyncSession, *, sm_id: UUID, user_id: UUID) -> MaintRequest:
        from sqlalchemy.orm import selectinload
        result = await db.execute(select(MaintRequest).options(
            selectinload(MaintRequest.equipment),
            selectinload(MaintRequest.certificates)
        ).where(MaintRequest.id == sm_id))
        sm = result.scalars().first()
        
        if not sm or sm.status != MaintRequestStatus.IN_TRANSIT_TO_FIELD:
            raise HTTPException(status_code=400, detail="Cannot confirm return: Request must be IN_TRANSIT_TO_FIELD")
            
        sm.status = MaintRequestStatus.PENDING_D5
        sm.equipment_returned_date = datetime.utcnow()

        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.IN_TRANSIT_TO_FIELD, to_status=MaintRequestStatus.PENDING_D5, action="EQUIPMENT_RETURNED")
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def close_sm(db: AsyncSession, *, sm_id: UUID, user_id: UUID, invoice_number: str, invoice_amount: float) -> MaintRequest:
        sm = await SmService.get_sm(db, sm_id=sm_id)
        
        if sm.status != MaintRequestStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Only COMPLETED requests can be formally closed with invoices")
            
        if sm.invoice_number:
            raise HTTPException(status_code=400, detail="Request is already formally closed with an invoice")
            
        sm.invoice_number = invoice_number
        sm.invoice_amount = invoice_amount
        
        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.COMPLETED, to_status=MaintRequestStatus.COMPLETED, action="SM_CLOSED", notes=f"Invoice: {invoice_number}")
        
        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def register_quotation(db: AsyncSession, *, sm_id: UUID, user_id: UUID, quotation_amount: float, notes: str | None) -> MaintRequest:
        sm = await SmService.get_sm(db, sm_id=sm_id)
        if sm.status != MaintRequestStatus.QUOTED_PENDING:
            raise HTTPException(status_code=400, detail="Request must be in QUOTED_PENDING state to register quotation")

        sm.d2_quotation_amount = quotation_amount
        sm.d2_quotation_notes = notes
        sm.d2_registered_at = datetime.utcnow()
        sm.status = MaintRequestStatus.AWAITING_PREREQUISITES

        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.QUOTED_PENDING, to_status=MaintRequestStatus.AWAITING_PREREQUISITES, action="D2_QUOTATION_REGISTERED", notes=f"Amount: {quotation_amount}")

        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def sign_d5(db: AsyncSession, *, sm_id: UUID, user_id: UUID, notes: str | None) -> MaintRequest:
        sm = await SmService.get_sm(db, sm_id=sm_id)
        if sm.status != MaintRequestStatus.PENDING_D5:
            raise HTTPException(status_code=400, detail="Request must be in PENDING_D5 state to sign D5")

        sm.d5_signed_at = datetime.utcnow()
        sm.d5_signed_by_id = user_id
        sm.status = MaintRequestStatus.INVOICING_READY

        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.PENDING_D5, to_status=MaintRequestStatus.INVOICING_READY, action="D5_SIGNED", notes=notes)

        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def register_invoice(db: AsyncSession, *, sm_id: UUID, user_id: UUID, invoice_number: str, invoice_amount: float) -> MaintRequest:
        sm = await SmService.get_sm(db, sm_id=sm_id)
        if sm.status != MaintRequestStatus.INVOICING_READY:
            raise HTTPException(status_code=400, detail="Request must be in INVOICING_READY state to register invoice")

        # RN8: Validate all 5 required documents are present
        missing_docs = []
        if not sm.sgp_request_id and not sm.purchase_order_code:
            missing_docs.append("D1/OC (Orden de Compra)")
        if not sm.d2_quotation_amount:
            missing_docs.append("D2 (Cotización del proveedor)")
        if not sm.provider_confirmed:
            missing_docs.append("D3 (Confirmación de proveedor)")
        if not sm.transport_scheduled:
            missing_docs.append("D4 (Programación de transporte)")
        if not sm.d5_signed_at:
            missing_docs.append("D5 (Documento de término firmado)")
        if missing_docs:
            raise HTTPException(
                status_code=422,
                detail=f"No se puede registrar factura. Documentos faltantes: {', '.join(missing_docs)}"
            )

        sm.invoice_number = invoice_number
        sm.invoice_amount = invoice_amount
        sm.status = MaintRequestStatus.PENDING_PAYMENT

        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.INVOICING_READY, to_status=MaintRequestStatus.PENDING_PAYMENT, action="INVOICE_REGISTERED", notes=f"Invoice: {invoice_number}, Amount: {invoice_amount}")

        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def confirm_payment(db: AsyncSession, *, sm_id: UUID, user_id: UUID, notes: str | None) -> MaintRequest:
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(MaintRequest)
            .options(selectinload(MaintRequest.equipment), selectinload(MaintRequest.certificates))
            .where(MaintRequest.id == sm_id)
        )
        sm = result.scalars().first()
        if not sm:
            raise HTTPException(status_code=404, detail="Maintenance Request not found")
        if sm.status != MaintRequestStatus.PENDING_PAYMENT:
            raise HTTPException(status_code=400, detail="Request must be in PENDING_PAYMENT state to confirm payment")

        sm.payment_confirmed_at = datetime.utcnow()
        sm.payment_confirmed_by_id = user_id
        sm.completed_at = datetime.utcnow()
        sm.status = MaintRequestStatus.CLOSED

        # Equipment updates — deferred from confirm_field_return
        sm.equipment.status = "OPERATIVE"
        sm.equipment.last_maintenance_date = sm.completed_at
        if sm.certificates:
            sm.equipment.last_certificate_id = sm.certificates[-1].id
        if sm.equipment.current_horometer and sm.equipment.maintenance_interval_hours:
            sm.equipment.next_maintenance_due = sm.equipment.current_horometer + sm.equipment.maintenance_interval_hours

        await SmService.log_action(db, sm_id=sm.id, actor_id=user_id, from_status=MaintRequestStatus.PENDING_PAYMENT, to_status=MaintRequestStatus.CLOSED, action="PAYMENT_CONFIRMED", notes=notes)

        await db.commit()
        await db.refresh(sm)
        return sm

    @staticmethod
    async def log_action(db: AsyncSession, *, sm_id: UUID, actor_id: UUID, from_status: MaintRequestStatus | None, to_status: MaintRequestStatus, action: str, notes: str | None = None):
        log = MaintWorkflowLog(
            maint_request_id=sm_id,
            actor_id=actor_id,
            from_status=from_status,
            to_status=to_status,
            action=action,
            notes=notes
        )
        db.add(log)

    @staticmethod
    async def get_timeline(db: AsyncSession, *, sm_id: UUID) -> list[MaintWorkflowLog]:
        sm = await SmService.get_sm(db, sm_id=sm_id)
        from sqlalchemy.orm import selectinload
        
        result = await db.execute(
            select(MaintWorkflowLog)
            .options(selectinload(MaintWorkflowLog.actor))
            .where(MaintWorkflowLog.maint_request_id == sm.id)
            .order_by(MaintWorkflowLog.created_at.asc())
        )
        return list(result.scalars().all())
