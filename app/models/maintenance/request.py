import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Enum, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class MaintRequestStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    QUOTED_PENDING = "QUOTED_PENDING"           # Approved, awaiting provider quotation (D2)
    AWAITING_PREREQUISITES = "AWAITING_PREREQUISITES"
    READY_FOR_EXECUTION = "READY_FOR_EXECUTION"
    IN_TRANSIT_TO_WORKSHOP = "IN_TRANSIT_TO_WORKSHOP"
    IN_MAINTENANCE = "IN_MAINTENANCE"
    PENDING_RECEPTION = "PENDING_RECEPTION"
    PENDING_CERTIFICATE = "PENDING_CERTIFICATE"
    IN_TRANSIT_TO_FIELD = "IN_TRANSIT_TO_FIELD"
    COMPLETED = "COMPLETED"
    PENDING_D5 = "PENDING_D5"                  # Equipment returned, awaiting D5 signing
    INVOICING_READY = "INVOICING_READY"        # D5 signed, provider can invoice
    PENDING_PAYMENT = "PENDING_PAYMENT"        # Invoice registered, awaiting payment
    CLOSED = "CLOSED"                          # Payment confirmed, expedition complete
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class MaintenanceType(str, enum.Enum):
    PREVENTIVE = "PREVENTIVE"
    CORRECTIVE = "CORRECTIVE"
    PREDICTIVE = "PREDICTIVE"
    OVERHAUL = "OVERHAUL"


class MaintRequest(Base):
    __tablename__ = "maint_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False, index=True)  # SM-YYYY-NNNN

    # Core references
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("maint_equipment.id"), nullable=False)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("maint_providers.id"), nullable=True)
    requested_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Classification
    maintenance_type = Column(Enum(MaintenanceType), nullable=False)
    status = Column(Enum(MaintRequestStatus), default=MaintRequestStatus.DRAFT, nullable=False)

    # Description
    description = Column(Text, nullable=False)
    estimated_cost = Column(Numeric(14, 2), nullable=True)
    actual_cost = Column(Numeric(14, 2), nullable=True)
    currency = Column(String, default="CLP", nullable=False)

    # Dates
    planned_date = Column(DateTime, nullable=False)
    scheduled_start = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # SGP integration (RF-M07)
    sgp_request_id = Column(UUID(as_uuid=True), ForeignKey("requests.id"), nullable=True)
    purchase_order_code = Column(String, nullable=True)  # Set when OC is generated in SGP

    # Gate prerequisites flags
    provider_confirmed = Column(Boolean, default=False, nullable=False)
    transport_scheduled = Column(Boolean, default=False, nullable=False)

    # D2 - Quotation fields
    d2_quotation_amount = Column(Numeric(14, 2), nullable=True)
    d2_quotation_notes = Column(Text, nullable=True)
    d2_registered_at = Column(DateTime, nullable=True)

    # D5 - Termination document (cierre operativo)
    d5_signed_at = Column(DateTime, nullable=True)
    d5_signed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Closing fields
    invoice_number = Column(String, nullable=True)
    invoice_amount = Column(Numeric(14, 2), nullable=True)

    # D7 - Payment confirmation
    payment_confirmed_at = Column(DateTime, nullable=True)
    payment_confirmed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Workflow metadata
    rejection_reason = Column(Text, nullable=True)
    remediation_deadline = Column(DateTime, nullable=True)  # For rejected reception
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    equipment = relationship("MaintEquipment", back_populates="maint_requests", foreign_keys=[equipment_id])
    provider = relationship("MaintProvider", back_populates="maint_requests")
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    d5_signed_by = relationship("User", foreign_keys=[d5_signed_by_id])
    payment_confirmed_by = relationship("User", foreign_keys=[payment_confirmed_by_id])
    sgp_request = relationship("Request", foreign_keys=[sgp_request_id])
    checklist = relationship("MaintReceptionChecklist", back_populates="maint_request", uselist=False)
    certificates = relationship("MaintCertificate", back_populates="maint_request")
    transport_schedules = relationship("MaintTransportSchedule", back_populates="maint_request")
    workflow_logs = relationship("MaintWorkflowLog", back_populates="maint_request")
    documents = relationship("MaintDocument", back_populates="maint_request")


class MaintWorkflowLog(Base):
    __tablename__ = "maint_workflow_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    maint_request_id = Column(UUID(as_uuid=True), ForeignKey("maint_requests.id"), nullable=False, index=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    from_status = Column(Enum(MaintRequestStatus), nullable=True)
    to_status = Column(Enum(MaintRequestStatus), nullable=False)
    action = Column(String, nullable=False)
    
    notes = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    maint_request = relationship("MaintRequest", back_populates="workflow_logs")
    actor = relationship("User")
