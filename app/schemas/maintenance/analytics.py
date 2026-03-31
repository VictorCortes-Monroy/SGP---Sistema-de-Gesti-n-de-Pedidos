from pydantic import BaseModel
from typing import List
from uuid import UUID
from datetime import datetime

class EquipmentDueAlert(BaseModel):
    equipment_id: UUID
    equipment_name: str
    equipment_code: str
    current_horometer: float
    next_maintenance_due: float
    hours_remaining: float

class MaintenanceAnalyticsSummary(BaseModel):
    total_preventive: int
    total_corrective: int
    in_execution: int
    pending_reception: int
    pending_certificate: int
    average_cycle_time_days: float
    upcoming_maintenance: List[EquipmentDueAlert]
