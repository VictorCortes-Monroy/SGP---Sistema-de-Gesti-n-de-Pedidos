from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class WorkflowAction(BaseModel):
    """Input schema for approve/reject actions."""
    comment: Optional[str] = None


class WorkflowLogResponse(BaseModel):
    """Output schema for a single audit log entry."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    request_id: UUID
    actor_id: UUID
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    comment: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime


class RequestTimeline(BaseModel):
    """Track & Trace output: current status + full history."""
    request_id: UUID
    title: str
    current_status: str
    current_step: int
    total_steps: int
    next_approver_role: Optional[str] = None
    logs: List[WorkflowLogResponse] = []


class ReceptionInput(BaseModel):
    """Input schema for reception confirmation."""
    is_partial: bool = False
    comment: Optional[str] = None


# ── Audit Log schemas ──

class AuditLogResponse(WorkflowLogResponse):
    """Extended workflow log with request title for audit reports."""
    request_title: Optional[str] = None
