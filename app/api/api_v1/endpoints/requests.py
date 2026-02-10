from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request as FastAPIRequest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.api import deps
from app.api.deps import get_client_ip
from app.models.users import User
from app.models.request import Request, RequestItem, RequestStatus
from app.models.workflow import WorkflowLog
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


# ─── CREATE ──────────────────────────────────────────────────────────────────

@router.post("/", response_model=RequestSchema)
async def create_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_in: RequestCreate,
    current_user: User = Depends(deps.get_current_user)
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
        current_step=0
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
            total_price=item.quantity * item.unit_price
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
    http_request: FastAPIRequest
) -> Any:
    """Submit a draft request for approval. Reserves budget and starts workflow."""
    request = await _load_request(db, request_id)

    if request.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the requester can submit this request")

    if request.status != RequestStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only DRAFT requests can be submitted")

    # Reserve budget
    budget_service = BudgetService(db)
    try:
        await budget_service.reserve_funds(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Determine approval chain
    wf_engine = WorkflowEngine(db)
    steps = await wf_engine.get_required_approvals(request)

    if not steps:
        new_status = RequestStatus.APPROVED
    else:
        new_status = await wf_engine.determine_status_for_step(steps, 0)

    request.status = new_status
    request.current_step = 0

    # Create audit log for submission
    ip_address = get_client_ip(http_request)
    log = WorkflowLog(
        request_id=request.id,
        actor_id=current_user.id,
        action="SUBMITTED",
        from_status=RequestStatus.DRAFT.value,
        to_status=new_status.value,
        comment="Request submitted for approval",
        ip_address=ip_address
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
    http_request: FastAPIRequest
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
            ip_address=ip_address
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
    http_request: FastAPIRequest
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
            ip_address=ip_address
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    # Release reserved budget
    budget_service = BudgetService(db)
    await budget_service.release_reservation(request)

    return await _load_request(db, request_id)


# ─── LIST ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[RequestSchema])
async def list_requests(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    List requests filtered by the user's role:
    - Requester: only their own requests
    - Technical Approver: PENDING_TECHNICAL requests + their own
    - Financial Approver: PENDING_FINANCIAL requests + their own
    """
    query = select(Request).options(
        selectinload(Request.items),
        selectinload(Request.cost_center),
    )

    role_name = current_user.role.name if current_user.role else None

    if role_name == "Technical Approver":
        query = query.where(
            or_(
                Request.requester_id == current_user.id,
                Request.status == RequestStatus.PENDING_TECHNICAL
            )
        )
    elif role_name == "Financial Approver":
        query = query.where(
            or_(
                Request.requester_id == current_user.id,
                Request.status == RequestStatus.PENDING_FINANCIAL
            )
        )
    else:
        query = query.where(Request.requester_id == current_user.id)

    if status:
        try:
            status_enum = RequestStatus(status)
            query = query.where(Request.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    query = query.order_by(Request.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    requests = result.scalars().all()
    return requests


# ─── DETAIL ──────────────────────────────────────────────────────────────────

@router.get("/{request_id}", response_model=RequestDetail)
async def get_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    current_user: User = Depends(deps.get_current_user)
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
            timestamp=log.timestamp
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
        logs=enriched_logs
    )


# ─── TIMELINE ────────────────────────────────────────────────────────────────

@router.get("/{request_id}/timeline", response_model=RequestTimeline)
async def get_request_timeline(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    current_user: User = Depends(deps.get_current_user)
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
            timestamp=log.timestamp
        ))

    return RequestTimeline(
        request_id=request.id,
        title=request.title,
        current_status=request.status.value,
        current_step=request.current_step,
        total_steps=len(steps),
        next_approver_role=next_role.name if next_role else None,
        logs=enriched_logs
    )


# ─── RECEIVE ─────────────────────────────────────────────────────────────────

@router.post("/{request_id}/receive", response_model=RequestSchema)
async def receive_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    reception_in: ReceptionInput,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest
) -> Any:
    """Confirm reception of goods. Closes the request lifecycle."""
    request = await _load_request(db, request_id)

    if request.status not in (RequestStatus.APPROVED, RequestStatus.PURCHASING, RequestStatus.RECEIVED_PARTIAL):
        raise HTTPException(
            status_code=400,
            detail="Request must be in APPROVED, PURCHASING, or RECEIVED_PARTIAL status to receive"
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
        ip_address=ip_address
    )
    db.add(log)

    # If full reception, commit funds from reserved to executed
    if not reception_in.is_partial:
        budget_service = BudgetService(db)
        await budget_service.commit_funds(request)

    await db.commit()
    return await _load_request(db, request_id)


# ─── CANCEL ─────────────────────────────────────────────────────────────────

@router.post("/{request_id}/cancel", response_model=RequestSchema)
async def cancel_request(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request_id: str,
    action_in: WorkflowAction,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest
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
            detail=f"Cannot cancel a request in {request.status.value} status"
        )

    from_status = request.status
    ip_address = get_client_ip(http_request)

    # Release budget if it was reserved (not DRAFT)
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
        ip_address=ip_address
    )
    db.add(log)

    await db.commit()
    return await _load_request(db, request_id)


# ─── SOFT DELETE ────────────────────────────────────────────────────────────

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
            detail="Only DRAFT or CANCELLED requests can be deleted"
        )

    request.is_deleted = True
    request.deleted_at = datetime.utcnow()
    await db.commit()
