import uuid
from sqlalchemy import Column, Numeric, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class Budget(Base):
    __tablename__ = "budgets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cost_center_id = Column(UUID(as_uuid=True), ForeignKey("cost_centers.id"), unique=True)
    year = Column(Integer, nullable=False)
    total_amount = Column(Numeric(14, 2), default=0.0) # 14 digits, 2 decimals
    reserved_amount = Column(Numeric(14, 2), default=0.0) # Money in pending requests
    executed_amount = Column(Numeric(14, 2), default=0.0) # Money in completed/paid requests
    
    cost_center = relationship("CostCenter", back_populates="budget")

class BudgetReservation(Base):
    __tablename__ = "budget_reservations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_id = Column(UUID(as_uuid=True), ForeignKey("budgets.id"))
    request_id = Column(UUID(as_uuid=True), ForeignKey("requests.id"))
    amount = Column(Numeric(14, 2), nullable=False)
    
    # Relationships to track back if needed, but mainly for logic
