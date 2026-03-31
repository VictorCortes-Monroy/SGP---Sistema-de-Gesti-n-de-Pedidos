import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class MaintProvider(Base):
    __tablename__ = "maint_providers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    rut = Column(String, unique=True, nullable=False, index=True)  # Chilean tax ID
    contact_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    equipment_types = relationship("MaintProviderEquipmentType", back_populates="provider", cascade="all, delete-orphan")
    maint_requests = relationship("MaintRequest", back_populates="provider")


class MaintProviderEquipmentType(Base):
    __tablename__ = "maint_provider_equipment_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("maint_providers.id"), nullable=False)
    equipment_type = Column(String, nullable=False)  # matches EquipmentType enum values

    provider = relationship("MaintProvider", back_populates="equipment_types")
