import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class ApprovalMatrix(Base):
    """
    Defines who approves what.
    Example: 
    - Company A, CostCenter X, Amount > 1000 -> Needs FinancialManager
    - Company A, CostCenter X, Amount < 1000 -> Needs TechnicalLead
    """
    __tablename__ = "approval_matrix"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True) # Null means all companies
    cost_center_id = Column(UUID(as_uuid=True), ForeignKey("cost_centers.id"), nullable=True) # Null means all CCs
    
    min_amount = Column(Numeric(14, 2), default=0.0)
    max_amount = Column(Numeric(14, 2), nullable=True) # Null means infinity
    
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False) # The role that must approve
    step_order = Column(Integer, default=1) # 1 = First approver, 2 = Second, etc.
    
    # Relationships
    role = relationship("Role")


class WorkflowLog(Base):
    __tablename__ = "workflow_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("requests.id"))
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    action = Column(String, nullable=False) # APPROVED, REJECTED, CREATED
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=True)
    comment = Column(String, nullable=True)
    ip_address = Column(String, nullable=True) # Audit
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    request = relationship("Request", back_populates="logs")
    actor = relationship("User", back_populates="approvals")
