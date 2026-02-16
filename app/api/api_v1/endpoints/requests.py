from typing import Any, List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, Request as FastAPIRequest
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload

from app.api import deps
from app.api.deps import get_client_ip
from app.models.users import User
from app.models.request import Request, RequestItem, RequestStatus
from app.models.workflow import WorkflowLog
from app.models.comment import Comment
from app.schemas.request import (
    RequestCreate,
    Request as RequestSchema,
    RequestDetail,
)
from app.schemas.workflow import (
    WorkflowAction,
    WorkflowLogResponse,
    RequestTimeline,
    ReceptionInput,
)
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.pagination import PaginatedResponse
from app.services.workflow import WorkflowEngine
from app.services.budget_service import BudgetService

router = APIRouter()


async def _load_request(db: AsyncSession, request_id: str) -> Request:
    """Helper to load a request with its relationships."""
    query = select(Request).options(
        selectinload(Request.cost_center),
        selectinload(Request.items),
        selectinload(Request.requester),
    ).where(Request.id == request_id, Request.is_deleted == False)
    result = await db.execute(query)
    request = result.scalars().first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


async def _load_request_with_logs(db: AsyncSession, request_id: str) -> Request:
    """Helper to load a request with all relationships including logs."""
    query = select(Request).options(
        selectinload(Request.cost_center),
        selectinload(Request.items),
        selectinload(Request.requester),
        selectinload(Request.logs).selectinload(WorkflowLog.actor),
    ).where(Request.id == request_id, Request.is_deleted == False)
    result = await db.execute(query)
    request = result.scalars().first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


def _build_role_filter(query, current_user: User):
    """Apply role-based visibility filter to a query."""
    role_name = current_user.role.name if current_user.role else None

    if role_name == "Admin":
        pass  # Admin sees all
    elif role_name == "Technical Approver":
        query = query.where(
            or_(
                Request.requester_id == current_user.id,
                Request.status == RequestStatus.PENDING_TECHNICAL,
            )
        )
    elif role_name == "Financial Approver":
        query = query.where(
            or_(
                Request.requester_id == current_user.id,
                Request.status == RequestStatus.PENDING_FINANCIAL,
            )
        )
    else:
        query = query.where(Request.requester_id == current_user.id)

    return query


def _apply_filters(query, *, status, search, created_from, created_to, min_amount, max_amount, cost_center_id):
    """Apply optional filters to a request query."""
    if status:
        try:
            status_enum = RequestStatus(status)
            query = query.where(Request.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Request.title.ilike(pattern),
                Request.description.ilike(pattern),
            )
        )

    if created_from:
        query = query.where(Request.created_at >= datetime.combine(created_from, datetime.min.time()))
    if created_to:
        query = query.where(Request.created_at <= datetime.combine(created_to, datetime.max.time()))
    if min_amount is not None:
        query = query.where(Request.total_amount >= min_amount)
    if max_amount is not None:
        query = query.where(Request.total_amount <= max_amount)
    if cost_center_id:
        query = query.where(Request.cost_center_id == cost_center_id)

    return query


# ─── CREATE ──────────────────────────────────────────────────────────────────

@router.post("/", response_model=RequestSchema)
async def create_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_in: RequestCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create a new request in DRAFT status."""
    total = sum(item.quantity * item.unit_price for item in request_in.items)

    db_request = Request(
        title=request_in.title,
        description=request_in.description,
        requester_id=current_user.id,
        cost_center_id=request_in.cost_center_id,
        total_amount=total,
        status=RequestStatus.DRAFT,
        current_step=0,
    )
    db.add(db_request)
    await db.flush()

    for item in request_in.items:
        db_item = RequestItem(
            request_id=db_request.id,
            description=item.description,
            sku=item.sku,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.quantity * item.unit_price,
        )
        db.add(db_item)

    await db.commit()
    return await _load_request(db, str(db_request.id))


# ─── SUBMIT ──────────────────────────────────────────────────────────────────

@router.post("/{request_id}/submit", response_model=RequestSchema)
async def submit_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest,
) -> Any:
    """Submit a draft request for approval. Reserves budget and starts workflow."""
    request = await _load_request(db, request_id)

    if request.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the requester can submit this request")

    if request.status != RequestStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only DRAFT requests can be submitted")

    budget_service = BudgetService(db)
    try:
        await budget_service.reserve_funds(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    wf_engine = WorkflowEngine(db)
    steps = await wf_engine.get_required_approvals(request)

    if not steps:
        new_status = RequestStatus.APPROVED
    else:
        new_status = await wf_engine.determine_status_for_step(steps, 0)

    request.status = new_status
    request.current_step = 0

    ip_address = get_client_ip(http_request)
    log = WorkflowLog(
        request_id=request.id,
        actor_id=current_user.id,
        action="SUBMITTED",
        from_status=RequestStatus.DRAFT.value,
        to_status=new_status.value,
        comment="Request submitted for approval",
        ip_address=ip_address,
    )
    db.add(log)

    await db.commit()
    return await _load_request(db, request_id)


# ─── APPROVE ─────────────────────────────────────────────────────────────────

@router.post("/{request_id}/approve", response_model=RequestSchema)
async def approve_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    action_in: WorkflowAction,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest,
) -> Any:
    """Approve a request at the current workflow step."""
    request = await _load_request(db, request_id)

    if request.status not in (RequestStatus.PENDING_TECHNICAL, RequestStatus.PENDING_FINANCIAL):
        raise HTTPException(status_code=400, detail="Request is not in a pending approval state")

    wf_engine = WorkflowEngine(db)
    ip_address = get_client_ip(http_request)

    try:
        request = await wf_engine.process_action(
            request=request,
            user=current_user,
            action="APPROVE",
            comment=action_in.comment,
            ip_address=ip_address,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    return await _load_request(db, request_id)


# ─── REJECT ──────────────────────────────────────────────────────────────────

@router.post("/{request_id}/reject", response_model=RequestSchema)
async def reject_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    action_in: WorkflowAction,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest,
) -> Any:
    """Reject a request. Releases reserved budget."""
    request = await _load_request(db, request_id)

    if request.status not in (RequestStatus.PENDING_TECHNICAL, RequestStatus.PENDING_FINANCIAL):
        raise HTTPException(status_code=400, detail="Request is not in a pending approval state")

    wf_engine = WorkflowEngine(db)
    ip_address = get_client_ip(http_request)

    try:
        request = await wf_engine.process_action(
            request=request,
            user=current_user,
            action="REJECT",
            comment=action_in.comment,
            ip_address=ip_address,
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    budget_service = BudgetService(db)
    await budget_service.release_reservation(request)

    return await _load_request(db, request_id)


# ─── LIST (with pagination, filters, search) ────────────────────────────────

@router.get("/", response_model=PaginatedResponse[RequestSchema])
async def list_requests(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    status: Optional[str] = None,
    search: Optional[str] = None,
    created_from: Optional[date] = None,
    created_to: Optional[date] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    cost_center_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> Any:
    """
    List requests filtered by the user's role, with pagination and filters.
    """
    base_where = Request.is_deleted == False

    # Count query
    count_q = select(func.count()).select_from(Request).where(base_where)
    count_q = _build_role_filter(count_q, current_user)
    count_q = _apply_filters(
        count_q, status=status, search=search,
        created_from=created_from, created_to=created_to,
        min_amount=min_amount, max_amount=max_amount,
        cost_center_id=cost_center_id,
    )
    total = (await db.execute(count_q)).scalar()

    # Data query
    query = select(Request).options(
        selectinload(Request.items),
        selectinload(Request.cost_center),
    ).where(base_where)
    query = _build_role_filter(query, current_user)
    query = _apply_filters(
        query, status=status, search=search,
        created_from=created_from, created_to=created_to,
        min_amount=min_amount, max_amount=max_amount,
        cost_center_id=cost_center_id,
    )
    query = query.order_by(Request.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    requests = result.scalars().all()

    return PaginatedResponse(items=requests, total=total, skip=skip, limit=limit)


# ─── EXPORT ──────────────────────────────────────────────────────────────────

@router.get("/export")
async def export_requests(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    format: str = Query("excel", pattern="^(excel|pdf)$"),
    status: Optional[str] = None,
) -> StreamingResponse:
    """Export requests to Excel or PDF."""
    from app.services.export_service import export_requests_excel, export_requests_pdf

    query = select(Request).options(
        selectinload(Request.items),
        selectinload(Request.cost_center),
    ).where(Request.is_deleted == False)

    query = _build_role_filter(query, current_user)

    if status:
        try:
            query = query.where(Request.status == RequestStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    query = query.order_by(Request.created_at.desc())
    result = await db.execute(query)
    requests_list = result.scalars().all()

    if format == "pdf":
        output = export_requests_pdf(requests_list)
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=solicitudes.pdf"},
        )
    else:
        output = export_requests_excel(requests_list)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=solicitudes.xlsx"},
        )


# ─── DETAIL ──────────────────────────────────────────────────────────────────

@router.get("/{request_id}", response_model=RequestDetail)
async def get_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get request detail with full audit trail."""
    request = await _load_request_with_logs(db, request_id)

    enriched_logs = []
    for log in sorted(request.logs, key=lambda l: l.timestamp):
        actor = log.actor
        enriched_logs.append(WorkflowLogResponse(
            id=log.id,
            request_id=log.request_id,
            actor_id=log.actor_id,
            actor_name=actor.full_name if actor else None,
            actor_role=None,
            action=log.action,
            from_status=log.from_status,
            to_status=log.to_status,
            comment=log.comment,
            ip_address=log.ip_address,
            timestamp=log.timestamp,
        ))

    return RequestDetail(
        id=request.id,
        title=request.title,
        description=request.description,
        cost_center_id=request.cost_center_id,
        requester_id=request.requester_id,
        status=request.status,
        total_amount=request.total_amount,
        currency=request.currency,
        current_step=request.current_step,
        created_at=request.created_at,
        updated_at=request.updated_at,
        items=[item for item in request.items],
        logs=enriched_logs,
    )


# ─── TIMELINE ────────────────────────────────────────────────────────────────

@router.get("/{request_id}/timeline", response_model=RequestTimeline)
async def get_request_timeline(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Track & Trace: get current status, step progress, and full history."""
    request = await _load_request_with_logs(db, request_id)

    wf_engine = WorkflowEngine(db)
    steps = await wf_engine.get_required_approvals(request)
    next_role = await wf_engine.get_next_approver_role(request)

    enriched_logs = []
    for log in sorted(request.logs, key=lambda l: l.timestamp):
        actor = log.actor
        enriched_logs.append(WorkflowLogResponse(
            id=log.id,
            request_id=log.request_id,
            actor_id=log.actor_id,
            actor_name=actor.full_name if actor else None,
            actor_role=None,
            action=log.action,
            from_status=log.from_status,
            to_status=log.to_status,
            comment=log.comment,
            ip_address=log.ip_address,
            timestamp=log.timestamp,
        ))

    return RequestTimeline(
        request_id=request.id,
        title=request.title,
        current_status=request.status.value,
        current_step=request.current_step,
        total_steps=len(steps),
        next_approver_role=next_role.name if next_role else None,
        logs=enriched_logs,
    )


# ─── RECEIVE ─────────────────────────────────────────────────────────────────

@router.post("/{request_id}/receive", response_model=RequestSchema)
async def receive_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    reception_in: ReceptionInput,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest,
) -> Any:
    """Confirm reception of goods. Closes the request lifecycle."""
    request = await _load_request(db, request_id)

    if request.status not in (RequestStatus.APPROVED, RequestStatus.PURCHASING, RequestStatus.RECEIVED_PARTIAL):
        raise HTTPException(
            status_code=400,
            detail="Request must be in APPROVED, PURCHASING, or RECEIVED_PARTIAL status to receive",
        )

    from_status = request.status
    ip_address = get_client_ip(http_request)

    if reception_in.is_partial:
        new_status = RequestStatus.RECEIVED_PARTIAL
    else:
        new_status = RequestStatus.COMPLETED

    request.status = new_status

    log = WorkflowLog(
        request_id=request.id,
        actor_id=current_user.id,
        action="RECEIVED_PARTIAL" if reception_in.is_partial else "RECEIVED_FULL",
        from_status=from_status.value,
        to_status=new_status.value,
        comment=reception_in.comment,
        ip_address=ip_address,
    )
    db.add(log)

    if not reception_in.is_partial:
        budget_service = BudgetService(db)
        await budget_service.commit_funds(request)

    await db.commit()
    return await _load_request(db, request_id)


# ─── CANCEL ──────────────────────────────────────────────────────────────────

@router.post("/{request_id}/cancel", response_model=RequestSchema)
async def cancel_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    action_in: WorkflowAction,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest,
) -> Any:
    """Cancel a request. Only the requester can cancel, and only in DRAFT or PENDING states."""
    request = await _load_request(db, request_id)

    if request.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the requester can cancel this request")

    cancellable_statuses = (
        RequestStatus.DRAFT,
        RequestStatus.PENDING_TECHNICAL,
        RequestStatus.PENDING_FINANCIAL,
    )
    if request.status not in cancellable_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel a request in {request.status.value} status",
        )

    from_status = request.status
    ip_address = get_client_ip(http_request)

    if request.status != RequestStatus.DRAFT:
        budget_service = BudgetService(db)
        await budget_service.release_reservation(request)

    request.status = RequestStatus.CANCELLED

    log = WorkflowLog(
        request_id=request.id,
        actor_id=current_user.id,
        action="CANCELLED",
        from_status=from_status.value,
        to_status=RequestStatus.CANCELLED.value,
        comment=action_in.comment,
        ip_address=ip_address,
    )
    db.add(log)

    await db.commit()
    return await _load_request(db, request_id)


# ─── SOFT DELETE ─────────────────────────────────────────────────────────────

@router.delete("/{request_id}", status_code=204)
async def delete_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> None:
    """Soft delete a request. Only DRAFT or CANCELLED requests can be deleted."""
    request = await _load_request(db, request_id)

    if request.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the requester can delete this request")

    if request.status not in (RequestStatus.DRAFT, RequestStatus.CANCELLED):
        raise HTTPException(
            status_code=400,
            detail="Only DRAFT or CANCELLED requests can be deleted",
        )

    request.is_deleted = True
    request.deleted_at = datetime.utcnow()
    await db.commit()


# ─── COMMENTS ────────────────────────────────────────────────────────────────

@router.post("/{request_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    comment_in: CommentCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Add a comment to a request."""
    await _load_request(db, request_id)

    comment = Comment(
        request_id=request_id,
        user_id=current_user.id,
        text=comment_in.text,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        request_id=comment.request_id,
        user_id=comment.user_id,
        user_name=current_user.full_name,
        text=comment.text,
        created_at=comment.created_at,
    )


@router.get("/{request_id}/comments", response_model=List[CommentResponse])
async def list_comments(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List all comments for a request."""
    await _load_request(db, request_id)

    query = (
        select(Comment)
        .options(selectinload(Comment.user))
        .where(Comment.request_id == request_id)
        .order_by(Comment.created_at.asc())
    )
    result = await db.execute(query)
    comments = result.scalars().all()

    return [
        CommentResponse(
            id=c.id,
            request_id=c.request_id,
            user_id=c.user_id,
            user_name=c.user.full_name if c.user else None,
            text=c.text,
            created_at=c.created_at,
        )
        for c in comments
    ]
