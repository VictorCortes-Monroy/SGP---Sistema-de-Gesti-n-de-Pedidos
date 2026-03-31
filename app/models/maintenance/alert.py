import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class MaintAlert(Base):
    __tablename__ = "maint_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_type = Column(String, nullable=False, index=True)
    # SLA_PENDING_APPROVAL | SLA_PROVIDER_CONFIRM | SLA_RECEPTION | SLA_EQUIPMENT_DUE

    target_role = Column(String, nullable=False)
    # maintenance_chief | maintenance_planner

    message = Column(Text, nullable=False)
    hours_overdue = Column(Numeric(8, 1), nullable=True)

    request_id = Column(UUID(as_uuid=True), ForeignKey("maint_requests.id", ondelete="CASCADE"), nullable=True, index=True)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("maint_equipment.id", ondelete="CASCADE"), nullable=True, index=True)

    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    request = relationship("MaintRequest", foreign_keys=[request_id])
    equipment = relationship("MaintEquipment", foreign_keys=[equipment_id])
