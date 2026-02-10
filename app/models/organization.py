import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    tax_id = Column(String, unique=True, index=True) # RUT/NIT
    
    cost_centers = relationship("CostCenter", back_populates="company")

class CostCenter(Base):
    __tablename__ = "cost_centers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"))
    
    company = relationship("Company", back_populates="cost_centers")
    budget = relationship("Budget", back_populates="cost_center", uselist=False)
    requests = relationship("Request", back_populates="cost_center")
