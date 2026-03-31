import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class TripType(str, enum.Enum):
    TO_WORKSHOP = "TO_WORKSHOP"
    TO_FIELD = "TO_FIELD"


class TransportStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_TRANSIT = "IN_TRANSIT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class MaintTransportSchedule(Base):
    __tablename__ = "maint_transport_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    maint_request_id = Column(UUID(as_uuid=True), ForeignKey("maint_requests.id"), nullable=False)
    
    trip_type = Column(Enum(TripType), nullable=False)
    status = Column(Enum(TransportStatus), default=TransportStatus.SCHEDULED, nullable=False)
    
    scheduled_date = Column(DateTime, nullable=False)
    actual_date = Column(DateTime, nullable=True)
    
    transport_company = Column(String, nullable=True)
    driver_name = Column(String, nullable=True)
    driver_phone = Column(String, nullable=True)
    plate_number = Column(String, nullable=True)
    
    cost = Column(Numeric(14, 2), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    maint_request = relationship("MaintRequest", back_populates="transport_schedules")
