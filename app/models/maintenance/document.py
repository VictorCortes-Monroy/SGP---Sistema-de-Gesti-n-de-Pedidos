import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


DOCUMENT_TYPES = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']


class MaintDocument(Base):
    __tablename__ = "maint_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    maint_request_id = Column(UUID(as_uuid=True), ForeignKey("maint_requests.id"), nullable=False, index=True)
    document_type = Column(String(5), nullable=False)   # D1 through D7
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)           # bytes
    mime_type = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    maint_request = relationship("MaintRequest", back_populates="documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
