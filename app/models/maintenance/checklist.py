import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class ChecklistResult(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    PARTIAL = "PARTIAL"


class MaintReceptionChecklist(Base):
    __tablename__ = "maint_reception_checklists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    maint_request_id = Column(UUID(as_uuid=True), ForeignKey("maint_requests.id"), unique=True, nullable=False)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    overall_result = Column(Enum(ChecklistResult), nullable=False)

    # 4 checklist groups as JSONB — each item: {item: str, passed: bool, notes: str|null}
    mechanical_group = Column(JSONB, nullable=True)
    electrical_group = Column(JSONB, nullable=True)
    hydraulic_group = Column(JSONB, nullable=True)
    safety_group = Column(JSONB, nullable=True)

    observations = Column(Text, nullable=True)
    approved = Column(Boolean, nullable=False)
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    maint_request = relationship("MaintRequest", back_populates="checklist")
    reviewer = relationship("User")
