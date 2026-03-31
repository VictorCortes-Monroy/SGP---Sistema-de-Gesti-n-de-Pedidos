import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Enum, Integer, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class EquipmentStatus(str, enum.Enum):
    OPERATIVE = "OPERATIVE"
    IN_TRANSIT = "IN_TRANSIT"
    IN_MAINTENANCE = "IN_MAINTENANCE"
    OUT_OF_SERVICE = "OUT_OF_SERVICE"
    SCRAPPED = "SCRAPPED"


class EquipmentType(str, enum.Enum):
    EXCAVATOR = "EXCAVATOR"
    CRANE = "CRANE"
    TRUCK = "TRUCK"
    GENERATOR = "GENERATOR"
    COMPRESSOR = "COMPRESSOR"
    PUMP = "PUMP"
    FORKLIFT = "FORKLIFT"
    OTHER = "OTHER"


class MaintEquipment(Base):
    __tablename__ = "maint_equipment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    equipment_type = Column(Enum(EquipmentType), nullable=False)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    model_year = Column(Integer, nullable=True)
    serial_number = Column(String, nullable=True)
    status = Column(Enum(EquipmentStatus), default=EquipmentStatus.OPERATIVE, nullable=False)

    # Organizational
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    cost_center_id = Column(UUID(as_uuid=True), ForeignKey("cost_centers.id"), nullable=True)

    # Horometer and PM tracking
    current_horometer = Column(Numeric(10, 1), default=0.0, nullable=False)
    maintenance_interval_hours = Column(Integer, default=500, nullable=False)
    last_maintenance_date = Column(DateTime, nullable=True)
    next_maintenance_due = Column(Numeric(10, 1), nullable=True)  # horometer value

    # Last certificate FK (set on completion)
    last_certificate_id = Column(UUID(as_uuid=True), ForeignKey("maint_certificates.id", use_alter=True, name="fk_maint_equipment_last_cert"), nullable=True)

    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    cost_center = relationship("CostCenter")
    horometer_logs = relationship("MaintHorometerLog", back_populates="equipment", order_by="MaintHorometerLog.recorded_at")
    maint_requests = relationship("MaintRequest", back_populates="equipment", foreign_keys="MaintRequest.equipment_id")


class MaintHorometerLog(Base):
    __tablename__ = "maint_horometer_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("maint_equipment.id"), nullable=False)
    reading = Column(Numeric(10, 1), nullable=False)
    previous_reading = Column(Numeric(10, 1), nullable=True)
    hours_delta = Column(Numeric(10, 1), nullable=True)
    recorded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)

    equipment = relationship("MaintEquipment", back_populates="horometer_logs")
    recorded_by = relationship("User")
