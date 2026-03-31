"""
SLA Engine — verifica violaciones de tiempo en SMs y equipos,
crea/actualiza alertas en maint_alerts (deduplicadas por tipo + entidad).
"""
from datetime import datetime, timedelta
from typing import List

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.maintenance.request import MaintRequest, MaintRequestStatus
from app.models.maintenance.equipment import MaintEquipment
from app.models.maintenance.alert import MaintAlert


# ── Umbrales ──────────────────────────────────────────────────────────────────
SLA_PENDING_APPROVAL_HOURS = 16       # PENDING_APPROVAL sin movimiento
SLA_PROVIDER_CONFIRM_HOURS = 24       # AWAITING_PREREQUISITES sin proveedor confirmado
SLA_RECEPTION_HOURS = 8              # PENDING_RECEPTION sin movimiento
EQUIPMENT_DUE_THRESHOLD_PCT = 0.10   # < 10% intervalo restante


class SLAService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run_checks(self) -> int:
        """Ejecuta todos los checks y retorna cantidad de alertas creadas."""
        created = 0
        created += await self._check_pending_approval()
        created += await self._check_provider_confirm()
        created += await self._check_pending_reception()
        created += await self._check_equipment_due()
        return created

    # ── 1. PENDING_APPROVAL > 16h ─────────────────────────────────────────────
    async def _check_pending_approval(self) -> int:
        cutoff = datetime.utcnow() - timedelta(hours=SLA_PENDING_APPROVAL_HOURS)
        result = await self.db.execute(
            select(MaintRequest).where(
                and_(
                    MaintRequest.status == MaintRequestStatus.PENDING_APPROVAL,
                    MaintRequest.updated_at <= cutoff,
                )
            )
        )
        requests = result.scalars().all()
        created = 0
        for req in requests:
            hours = (datetime.utcnow() - req.updated_at).total_seconds() / 3600
            msg = (
                f"SM {req.code} lleva {hours:.1f}h en PENDING_APPROVAL "
                f"(límite {SLA_PENDING_APPROVAL_HOURS}h). Requiere aprobación del Jefe de Mantención."
            )
            if await self._upsert_alert("SLA_PENDING_APPROVAL", "maintenance_chief", msg, request_id=req.id, hours=hours):
                created += 1
        return created

    # ── 2. AWAITING_PREREQUISITES sin proveedor > 24h ────────────────────────
    async def _check_provider_confirm(self) -> int:
        cutoff = datetime.utcnow() - timedelta(hours=SLA_PROVIDER_CONFIRM_HOURS)
        result = await self.db.execute(
            select(MaintRequest).where(
                and_(
                    MaintRequest.status == MaintRequestStatus.AWAITING_PREREQUISITES,
                    MaintRequest.provider_confirmed == False,  # noqa: E712
                    MaintRequest.updated_at <= cutoff,
                )
            )
        )
        requests = result.scalars().all()
        created = 0
        for req in requests:
            hours = (datetime.utcnow() - req.updated_at).total_seconds() / 3600
            msg = (
                f"SM {req.code} lleva {hours:.1f}h sin confirmación de proveedor "
                f"(límite {SLA_PROVIDER_CONFIRM_HOURS}h)."
            )
            if await self._upsert_alert("SLA_PROVIDER_CONFIRM", "maintenance_planner", msg, request_id=req.id, hours=hours):
                created += 1
        return created

    # ── 3. PENDING_RECEPTION > 8h ─────────────────────────────────────────────
    async def _check_pending_reception(self) -> int:
        cutoff = datetime.utcnow() - timedelta(hours=SLA_RECEPTION_HOURS)
        result = await self.db.execute(
            select(MaintRequest).where(
                and_(
                    MaintRequest.status == MaintRequestStatus.PENDING_RECEPTION,
                    MaintRequest.updated_at <= cutoff,
                )
            )
        )
        requests = result.scalars().all()
        created = 0
        for req in requests:
            hours = (datetime.utcnow() - req.updated_at).total_seconds() / 3600
            msg = (
                f"SM {req.code} lleva {hours:.1f}h en PENDING_RECEPTION "
                f"(límite {SLA_RECEPTION_HOURS}h). Se requiere recepción conforme."
            )
            if await self._upsert_alert("SLA_RECEPTION", "maintenance_chief", msg, request_id=req.id, hours=hours):
                created += 1
        return created

    # ── 4. Equipos con < 10% de intervalo restante ────────────────────────────
    async def _check_equipment_due(self) -> int:
        result = await self.db.execute(
            select(MaintEquipment).where(
                and_(
                    MaintEquipment.is_active == True,  # noqa: E712
                    MaintEquipment.next_maintenance_due.isnot(None),
                )
            )
        )
        equipments = result.scalars().all()
        created = 0
        for eq in equipments:
            interval = eq.maintenance_interval_hours or 500
            remaining = float(eq.next_maintenance_due) - float(eq.current_horometer)
            threshold = interval * EQUIPMENT_DUE_THRESHOLD_PCT
            if remaining <= threshold:
                pct = max(0, remaining / interval * 100)
                msg = (
                    f"Equipo {eq.code} ({eq.name}) tiene solo {remaining:.0f}h restantes "
                    f"para próximo PM ({pct:.1f}% del intervalo). Programar mantención."
                )
                if await self._upsert_alert("SLA_EQUIPMENT_DUE", "maintenance_planner", msg, equipment_id=eq.id):
                    created += 1
        return created

    # ── Helper: upsert deduplicado ────────────────────────────────────────────
    async def _upsert_alert(
        self,
        alert_type: str,
        target_role: str,
        message: str,
        request_id=None,
        equipment_id=None,
        hours: float = None,
    ) -> bool:
        """Crea alerta solo si no existe una activa (is_read=False) del mismo tipo+entidad."""
        filters = [
            MaintAlert.alert_type == alert_type,
            MaintAlert.is_read == False,  # noqa: E712
        ]
        if request_id:
            filters.append(MaintAlert.request_id == request_id)
        if equipment_id:
            filters.append(MaintAlert.equipment_id == equipment_id)

        existing = await self.db.execute(select(MaintAlert).where(and_(*filters)))
        alert = existing.scalar_one_or_none()

        if alert:
            # Actualiza mensaje y horas si cambió
            alert.message = message
            if hours is not None:
                alert.hours_overdue = hours
            await self.db.commit()
            return False

        new_alert = MaintAlert(
            alert_type=alert_type,
            target_role=target_role,
            message=message,
            hours_overdue=hours,
            request_id=request_id,
            equipment_id=equipment_id,
        )
        self.db.add(new_alert)
        await self.db.commit()
        return True
