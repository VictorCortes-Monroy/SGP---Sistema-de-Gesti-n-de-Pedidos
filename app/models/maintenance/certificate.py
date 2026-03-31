import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class MaintCertificate(Base):
    __tablename__ = "maint_certificates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    maint_request_id = Column(UUID(as_uuid=True), ForeignKey("maint_requests.id"), nullable=False)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("maint_equipment.id"), nullable=False)
    
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_hash = Column(String, nullable=True)  # SHA-256 hash
    
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    maint_request = relationship("MaintRequest", back_populates="certificates")
    equipment = relationship("MaintEquipment", foreign_keys=[equipment_id])
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
