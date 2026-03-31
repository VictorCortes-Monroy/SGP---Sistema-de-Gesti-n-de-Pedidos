from typing import Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.users import User, Role
from app.models.workflow import WorkflowLog
from app.models.request import Request
from app.schemas.workflow import AuditLogResponse
from app.schemas.pagination import PaginatedResponse
from app.services.export_service import export_audit_excel, export_audit_pdf

router = APIRouter()


def _build_base_filters(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    action: Optional[str] = None,
    actor_id: Optional[str] = None,
    request_id: Optional[str] = None,
):
    """Return a list of filter conditions."""
    filters = []
    if date_from:
        filters.append(WorkflowLog.timestamp >= datetime.fromisoformat(date_from))
    if date_to:
        filters.append(WorkflowLog.timestamp <= datetime.fromisoformat(date_to + "T23:59:59"))
    if action:
        filters.append(WorkflowLog.action == action)
    if actor_id:
        filters.append(WorkflowLog.actor_id == actor_id)
    if request_id:
        filters.append(WorkflowLog.request_id == request_id)
    return filters


async def _fetch_audit_logs(
    db: AsyncSession,
    filters: list,
    skip: int = 0,
    limit: int = 50,
) -> list[AuditLogResponse]:
    """Fetch audit logs with actor name, role, and request title."""
    query = (
        select(
            WorkflowLog.id,
            WorkflowLog.request_id,
            WorkflowLog.actor_id,
            User.full_name.label("actor_name"),
            Role.name.label("actor_role"),
            WorkflowLog.action,
            WorkflowLog.from_status,
            WorkflowLog.to_status,
            WorkflowLog.comment,
            WorkflowLog.ip_address,
            WorkflowLog.timestamp,
            Request.title.label("request_title"),
        )
        .join(Request, WorkflowLog.request_id == Request.id)
        .outerjoin(User, WorkflowLog.actor_id == User.id)
        .outerjoin(Role, User.role_id == Role.id)
    )
    for f in filters:
        query = query.where(f)

    query = query.order_by(WorkflowLog.timestamp.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    return [
        AuditLogResponse(
            id=row.id,
            request_id=row.request_id,
            actor_id=row.actor_id,
            actor_name=row.actor_name,
            actor_role=row.actor_role,
            action=row.action,
            from_status=row.from_status,
            to_status=row.to_status,
            comment=row.comment,
            ip_address=row.ip_address,
            timestamp=row.timestamp,
            request_title=row.request_title,
        )
        for row in rows
    ]


@router.get("/logs", response_model=PaginatedResponse[AuditLogResponse])
async def list_audit_logs(
    *,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    actor_id: Optional[str] = Query(default=None),
    request_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.require_role("Admin")),
) -> Any:
    """List audit logs (paginated, filtered). Admin only."""
    filters = _build_base_filters(date_from, date_to, action, actor_id, request_id)

    # Count
    count_q = select(func.count()).select_from(WorkflowLog)
    for f in filters:
        count_q = count_q.where(f)
    total = (await db.execute(count_q)).scalar()

    items = await _fetch_audit_logs(db, filters, skip, limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/logs/export")
async def export_audit_logs(
    *,
    format: str = Query("excel", regex="^(excel|pdf)$"),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    actor_id: Optional[str] = Query(default=None),
    request_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.require_role("Admin")),
) -> StreamingResponse:
    """Export audit logs as Excel or PDF. Admin only."""
    filters = _build_base_filters(date_from, date_to, action, actor_id, request_id)
    items = await _fetch_audit_logs(db, filters, skip=0, limit=5000)

    if format == "pdf":
        content = export_audit_pdf(items)
        return StreamingResponse(
            content,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=auditoria.pdf"},
        )
    else:
        content = export_audit_excel(items)
        return StreamingResponse(
            content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=auditoria.xlsx"},
        )
