from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.models.users import User
from app.models.maintenance.alert import MaintAlert
from app.services.maintenance.sla_service import SLAService

router = APIRouter()

MAINT_ROLES = {"Admin", "maintenance_planner", "maintenance_chief"}


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    alert_type: str
    target_role: str
    message: str
    hours_overdue: Optional[float] = None
    request_id: Optional[UUID] = None
    equipment_id: Optional[UUID] = None
    is_read: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None


@router.get("/", response_model=List[AlertResponse])
async def list_alerts(
    unread_only: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna alertas SLA. Admin ve todas; roles mantencion ven solo las de su rol.
    """
    if not current_user.role or current_user.role.name not in MAINT_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    filters = []
    if unread_only:
        filters.append(MaintAlert.is_read == False)  # noqa: E712

    if current_user.role.name != "Admin":
        filters.append(MaintAlert.target_role == current_user.role.name)

    q = select(MaintAlert).order_by(MaintAlert.created_at.desc())
    if filters:
        q = q.where(and_(*filters))

    result = await db.execute(q)
    return result.scalars().all()


@router.get("/count")
async def alert_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna cantidad de alertas no leídas para el badge del sidebar."""
    if not current_user.role or current_user.role.name not in MAINT_ROLES:
        return {"count": 0}

    filters = [MaintAlert.is_read == False]  # noqa: E712
    if current_user.role.name != "Admin":
        filters.append(MaintAlert.target_role == current_user.role.name)

    result = await db.execute(
        select(MaintAlert).where(and_(*filters))
    )
    return {"count": len(result.scalars().all())}


@router.patch("/{alert_id}/read")
async def mark_as_read(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name not in MAINT_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(MaintAlert).where(MaintAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    alert.resolved_at = datetime.utcnow()
    await db.commit()
    return {"ok": True}


@router.post("/run-checks")
async def run_sla_checks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ejecuta verificación SLA manualmente (Admin only)."""
    if not current_user.role or current_user.role.name != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")

    svc = SLAService(db)
    created = await svc.run_checks()
    return {"alerts_created": created}
