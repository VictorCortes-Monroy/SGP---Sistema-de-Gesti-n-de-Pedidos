import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Enum, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class RequestStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_TECHNICAL = "PENDING_TECHNICAL"
    PENDING_FINANCIAL = "PENDING_FINANCIAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PURCHASING = "PURCHASING"
    RECEIVED_PARTIAL = "RECEIVED_PARTIAL"
    RECEIVED_FULL = "RECEIVED_FULL"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Request(Base):
    __tablename__ = "requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(String)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    cost_center_id = Column(UUID(as_uuid=True), ForeignKey("cost_centers.id"))
    status = Column(Enum(RequestStatus), default=RequestStatus.DRAFT)
    total_amount = Column(Numeric(14, 2), default=0.0)
    currency = Column(String, default="USD")
    current_step = Column(Integer, default=0)
    is_deleted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    requester = relationship("User", back_populates="requests")
    cost_center = relationship("CostCenter", back_populates="requests")
    items = relationship("RequestItem", back_populates="request", cascade="all, delete-orphan")
    logs = relationship("WorkflowLog", back_populates="request")

class RequestItem(Base):
    __tablename__ = "request_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("requests.id"))
    description = Column(String, nullable=False)
    sku = Column(String, nullable=True)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(14, 2), nullable=False)
    total_price = Column(Numeric(14, 2), nullable=False)
    
    request = relationship("Request", back_populates="items")
