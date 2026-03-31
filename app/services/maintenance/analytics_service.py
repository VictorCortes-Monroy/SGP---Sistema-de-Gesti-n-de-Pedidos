from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta

from app.models.maintenance.request import MaintRequest, MaintRequestStatus, MaintenanceType
from app.models.maintenance.equipment import MaintEquipment
from app.schemas.maintenance.analytics import MaintenanceAnalyticsSummary, EquipmentDueAlert

class AnalyticsService:
    @staticmethod
    async def get_summary(db: AsyncSession) -> MaintenanceAnalyticsSummary:
        # Aggregations for open requests
        counts = {
            "total_preventive": 0,
            "total_corrective": 0,
            "in_execution": 0,
            "pending_reception": 0,
            "pending_certificate": 0
        }
        
        result = await db.execute(
            select(
                MaintRequest.maintenance_type,
                MaintRequest.status,
                func.count()
            ).group_by(MaintRequest.maintenance_type, MaintRequest.status)
        )
        for row in result.all():
            m_type, status, count = row
            if m_type == MaintenanceType.PREVENTIVE:
                counts["total_preventive"] += count
            elif m_type == MaintenanceType.CORRECTIVE:
                counts["total_corrective"] += count
                
            if status in (MaintRequestStatus.IN_TRANSIT_TO_WORKSHOP, MaintRequestStatus.IN_MAINTENANCE):
                counts["in_execution"] += count
            elif status == MaintRequestStatus.PENDING_RECEPTION:
                counts["pending_reception"] += count
            elif status == MaintRequestStatus.PENDING_CERTIFICATE:
                counts["pending_certificate"] += count

        # Cycle time calculation (Completed objects)
        completed_result = await db.execute(
            select(MaintRequest.completed_at, MaintRequest.created_at)
            .where(MaintRequest.status == MaintRequestStatus.COMPLETED)
        )
        cycle_times = []
        for row in completed_result.all():
            comp, creat = row
            if comp and creat:
                ct = (comp - creat).total_seconds() / (3600 * 24)
                cycle_times.append(ct)
        avg_cycle_time = sum(cycle_times) / len(cycle_times) if cycle_times else 0.0

        # Equipment Due Alerts (Threshold: e.g. next 50 hours)
        equipment_result = await db.execute(
            select(MaintEquipment).where(
                and_(
                    MaintEquipment.current_horometer.isnot(None), 
                    MaintEquipment.next_maintenance_due.isnot(None)
                )
            )
        )
        due_alerts = []
        for eq in equipment_result.scalars().all():
            remaining = eq.next_maintenance_due - eq.current_horometer
            if remaining <= 100:  # arbitrary threshold for alerts
                due_alerts.append(
                    EquipmentDueAlert(
                        equipment_id=eq.id,
                        equipment_name=eq.name,
                        equipment_code=eq.code,
                        current_horometer=eq.current_horometer,
                        next_maintenance_due=eq.next_maintenance_due,
                        hours_remaining=remaining
                    )
                )
        
        # Sort alerts (closest first)
        due_alerts.sort(key=lambda x: x.hours_remaining)

        return MaintenanceAnalyticsSummary(
            total_preventive=counts["total_preventive"],
            total_corrective=counts["total_corrective"],
            in_execution=counts["in_execution"],
            pending_reception=counts["pending_reception"],
            pending_certificate=counts["pending_certificate"],
            average_cycle_time_days=round(avg_cycle_time, 2),
            upcoming_maintenance=due_alerts[:10]  # Only top 10 most urgent
        )
