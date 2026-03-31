import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.maintenance.checklist import ChecklistResult

class ChecklistGroupInput(BaseModel):
    all_work_completed: Optional[bool] = None
    components_replaced: Optional[bool] = None
    functional_tests_done: Optional[bool] = None
    correct_parts_used: Optional[bool] = None
    # Equipment Condition
    hydraulic_systems: Optional[bool] = None
    electrical_systems: Optional[bool] = None
    safety_systems: Optional[bool] = None
    fluid_levels: Optional[bool] = None
    structure_condition: Optional[bool] = None
    # Operational Tests
    startup_shutdown: Optional[bool] = None
    idle_operation: Optional[bool] = None
    load_operation: Optional[bool] = None
    instruments_gauges: Optional[bool] = None
    # Documentation
    technical_report: Optional[bool] = None
    parts_list: Optional[bool] = None
    observations_reported: Optional[bool] = None
    photo_evidence: Optional[bool] = None

class ChecklistInput(BaseModel):
    scope_verification: Optional[ChecklistGroupInput] = None
    equipment_condition: Optional[ChecklistGroupInput] = None
    operational_tests: Optional[ChecklistGroupInput] = None
    provider_documentation: Optional[ChecklistGroupInput] = None

class ReceptionInput(BaseModel):
    status: str = Field(..., description="APPROVED or REJECTED")
    checklist: ChecklistInput
    notes: Optional[str] = None
    rejection_details: Optional[str] = None
    remediation_deadline: Optional[datetime] = None

class ReceptionResponse(BaseModel):
    id: uuid.UUID
    maint_request_id: uuid.UUID
    reviewer_id: uuid.UUID
    overall_result: ChecklistResult
    mechanical_group: Optional[Dict[str, Any]] = None
    electrical_group: Optional[Dict[str, Any]] = None
    hydraulic_group: Optional[Dict[str, Any]] = None
    safety_group: Optional[Dict[str, Any]] = None
    observations: Optional[str] = None
    approved: bool
    reviewed_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
