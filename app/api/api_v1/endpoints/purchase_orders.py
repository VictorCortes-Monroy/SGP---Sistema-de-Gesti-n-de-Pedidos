from typing import Any, List, Optional
from datetime import date
from sqlalchemy import or_

from fastapi import APIRouter, Depends, HTTPException, Query, Request as FastAPIRequest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.users import User
from app.models.request import Request, RequestStatus
from app.models.workflow import WorkflowLog
from app.models.purchase_order import (
    PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus,
    Quotation, QuotationItem, QuotationStatus, POApprovalLog,
)
from app.schemas.purchase_order import (
    PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse, PurchaseOrderList,
    POReceptionInput, POFinanceAction,
    QuotationCreate, QuotationUpdate, QuotationResponse,
)
from app.services.po_workflow import POWorkflowService
from app.api.deps import get_client_ip

router = APIRouter()
quotations_router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _generate_oc_number(db: AsyncSession) -> tuple[str, int, int]:
    year = date.today().year
    # Use a subquery on an actual row (not an aggregate) to allow FOR UPDATE locking
    # Get the row with the highest oc_seq for this year
    last_row = await db.execute(
        select(PurchaseOrder.oc_seq)
        .where(PurchaseOrder.oc_year == year)
        .order_by(PurchaseOrder.oc_seq.desc())
        .limit(1)
        .with_for_update(skip_locked=False)
    )
    last_seq = last_row.scalar() or 0
    new_seq = last_seq + 1
    oc_number = f"OC-{year}-{new_seq:03d}"
    return oc_number, year, new_seq


def _load_po(po_id: str):
    return select(PurchaseOrder).options(
        selectinload(PurchaseOrder.items),
        selectinload(PurchaseOrder.supplier),
        selectinload(PurchaseOrder.created_by),
        selectinload(PurchaseOrder.approval_logs).selectinload(POApprovalLog.actor),
    ).where(PurchaseOrder.id == po_id)


def _require_purchasing(current_user: User):
    role_name = current_user.role.name if current_user.role else None
    if role_name not in ("Admin", "Purchasing"):
        raise HTTPException(status_code=403, detail="Solo Compras o Admin pueden realizar esta acción")
    return role_name


def _require_finance_role(current_user: User) -> str:
    role_name = current_user.role.name if current_user.role else None
    if role_name not in ("Admin", "Financial Approver", "Finance 2"):
        raise HTTPException(status_code=403, detail="Solo roles financieros pueden realizar esta acción")
    return role_name or ""


# ── Purchase Orders ───────────────────────────────────────────────────────────

@router.post("/", response_model=PurchaseOrderResponse, status_code=201)
async def create_purchase_order(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payload: PurchaseOrderCreate,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest,
) -> Any:
    """Crear OC y transicionar solicitud APPROVED → PURCHASING. El estado inicial de la OC
    se determina automáticamente según el monto vs. umbrales financieros."""
    _require_purchasing(current_user)

    # Validar solicitud
    req_result = await db.execute(select(Request).where(Request.id == payload.request_id))
    request = req_result.scalar_one_or_none()
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if request.status != RequestStatus.APPROVED:
        raise HTTPException(status_code=400, detail="La solicitud debe estar en estado APROBADO")

    if not payload.items:
        raise HTTPException(status_code=400, detail="La OC debe tener al menos un ítem")

    # Generar número OC
    oc_number, oc_year, oc_seq = await _generate_oc_number(db)

    # Calcular total
    total = sum(item.quantity_ordered * item.unit_price for item in payload.items)

    # Crear OC con estado placeholder
    po = PurchaseOrder(
        request_id=payload.request_id,
        supplier_id=payload.supplier_id,
        quotation_id=payload.quotation_id,
        oc_number=oc_number,
        oc_year=oc_year,
        oc_seq=oc_seq,
        status=PurchaseOrderStatus.DRAFT,  # placeholder, se sobreescribe abajo
        total_amount=total,
        currency=payload.currency,
        expected_delivery_date=payload.expected_delivery_date,
        payment_terms_days=payload.payment_terms_days,
        payment_terms_text=payload.payment_terms_text,
        notes=payload.notes,
        created_by_id=current_user.id,
    )
    db.add(po)
    await db.flush()  # para obtener po.id y total_amount en el objeto

    # Determinar estado inicial según umbrales
    po_wf = POWorkflowService(db)
    initial_status = po_wf.get_initial_status(po)
    po.status = initial_status

    # Crear ítems
    for item in payload.items:
        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            request_item_id=item.request_item_id,
            catalog_item_id=item.catalog_item_id,
            description=item.description,
            supplier_sku=item.supplier_sku,
            quantity_ordered=item.quantity_ordered,
            unit_price=item.unit_price,
            total_price=item.quantity_ordered * item.unit_price,
            quantity_received=0,
        )
        db.add(po_item)

    # Transicionar solicitud APPROVED → PURCHASING
    ip_address = get_client_ip(http_request)
    request.status = RequestStatus.PURCHASING
    log = WorkflowLog(
        request_id=request.id,
        actor_id=current_user.id,
        action="OC_CREATED",
        from_status=RequestStatus.APPROVED.value,
        to_status=RequestStatus.PURCHASING.value,
        comment=f"OC {oc_number} creada — estado inicial: {initial_status.value}",
        ip_address=ip_address,
    )
    db.add(log)
    await db.commit()

    result = await db.execute(_load_po(str(po.id)))
    return result.scalar_one()


@router.get("/", response_model=dict)
async def list_purchase_orders(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    request_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(20),
) -> Any:
    role_name = current_user.role.name if current_user.role else None
    query = select(PurchaseOrder).options(selectinload(PurchaseOrder.supplier))

    if request_id:
        # When fetching OCs for a specific request (e.g. from request detail page),
        # show all OCs for that request regardless of role — access to the request
        # itself is already validated by the request endpoints.
        query = query.where(PurchaseOrder.request_id == request_id)
    else:
        # General listing — apply role-based visibility filter
        if role_name in ("Admin", "Purchasing"):
            pass  # full visibility
        elif role_name == "Financial Approver":
            query = query.where(
                PurchaseOrder.status == PurchaseOrderStatus.PENDING_FINANCE_1
            )
        elif role_name == "Finance 2":
            query = query.where(
                PurchaseOrder.status == PurchaseOrderStatus.PENDING_FINANCE_2
            )
        else:
            # Other roles: only OCs from their own requests
            query = query.join(Request).where(Request.requester_id == current_user.id)

    if status:
        query = query.where(PurchaseOrder.status == status)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar() or 0

    query = query.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "items": [PurchaseOrderList.model_validate(po) for po in items],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    *,
    db: AsyncSession = Depends(deps.get_db),
    po_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    result = await db.execute(_load_po(po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    return po


@router.patch("/{po_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    *,
    db: AsyncSession = Depends(deps.get_db),
    po_id: str,
    payload: PurchaseOrderUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    _require_purchasing(current_user)
    result = await db.execute(_load_po(po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    if po.status not in (PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SENT):
        raise HTTPException(status_code=400, detail="Solo se puede modificar una OC en estado DRAFT o SENT")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(po, field, value)
    await db.commit()
    result = await db.execute(_load_po(po_id))
    return result.scalar_one()


@router.post("/{po_id}/send", response_model=PurchaseOrderResponse)
async def send_purchase_order(
    *,
    db: AsyncSession = Depends(deps.get_db),
    po_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Marcar OC como enviada al proveedor. Solo disponible en estado AUTHORIZED."""
    _require_purchasing(current_user)
    result = await db.execute(_load_po(po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    if po.status != PurchaseOrderStatus.AUTHORIZED:
        raise HTTPException(
            status_code=400,
            detail="Solo una OC AUTORIZADA puede ser enviada al proveedor"
        )
    po.status = PurchaseOrderStatus.SENT
    await db.commit()
    result = await db.execute(_load_po(po_id))
    return result.scalar_one()


@router.post("/{po_id}/finance-approve", response_model=PurchaseOrderResponse)
async def finance_approve_purchase_order(
    *,
    db: AsyncSession = Depends(deps.get_db),
    po_id: str,
    action_in: POFinanceAction,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest,
) -> Any:
    """Finance 1 (Financial Approver) o Finance 2 aprueba la OC según su estado actual."""
    _require_finance_role(current_user)
    result = await db.execute(_load_po(po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")

    po_wf = POWorkflowService(db)
    ip = get_client_ip(http_request)
    try:
        po = await po_wf.approve(po, current_user, comment=action_in.comment, ip_address=ip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    result = await db.execute(_load_po(str(po.id)))
    return result.scalar_one()


@router.post("/{po_id}/finance-reject", response_model=PurchaseOrderResponse)
async def finance_reject_purchase_order(
    *,
    db: AsyncSession = Depends(deps.get_db),
    po_id: str,
    action_in: POFinanceAction,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest,
) -> Any:
    """Finance 1 o Finance 2 rechaza la OC. Vuelve a DRAFT para que Compras la corrija."""
    _require_finance_role(current_user)
    result = await db.execute(_load_po(po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")

    po_wf = POWorkflowService(db)
    ip = get_client_ip(http_request)
    try:
        po = await po_wf.reject(po, current_user, comment=action_in.comment, ip_address=ip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    result = await db.execute(_load_po(str(po.id)))
    return result.scalar_one()


@router.post("/{po_id}/resubmit", response_model=PurchaseOrderResponse)
async def resubmit_purchase_order(
    *,
    db: AsyncSession = Depends(deps.get_db),
    po_id: str,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest,
) -> Any:
    """Compras reenvía una OC rechazada (DRAFT) a aprobación financiera sin cambiar el número OC."""
    _require_purchasing(current_user)
    result = await db.execute(_load_po(po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")

    po_wf = POWorkflowService(db)
    ip = get_client_ip(http_request)
    try:
        po = await po_wf.resubmit(po, current_user, ip_address=ip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    result = await db.execute(_load_po(str(po.id)))
    return result.scalar_one()


@router.post("/{po_id}/receive", response_model=PurchaseOrderResponse)
async def receive_purchase_order(
    *,
    db: AsyncSession = Depends(deps.get_db),
    po_id: str,
    reception: POReceptionInput,
    current_user: User = Depends(deps.get_current_user),
    http_request: FastAPIRequest,
) -> Any:
    """Registrar recepción por ítem. Solo disponible para OCs en SENT o RECEIVED_PARTIAL."""
    _require_purchasing(current_user)
    result = await db.execute(_load_po(po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    if po.status not in (PurchaseOrderStatus.SENT, PurchaseOrderStatus.RECEIVED_PARTIAL):
        raise HTTPException(
            status_code=400,
            detail="La OC debe estar en estado SENT o RECEIVED_PARTIAL para registrar recepción"
        )

    item_map = {str(i.id): i for i in po.items}
    for rec in reception.items:
        item = item_map.get(str(rec.purchase_order_item_id))
        if not item:
            raise HTTPException(status_code=404, detail=f"Ítem {rec.purchase_order_item_id} no pertenece a esta OC")
        item.quantity_received = rec.quantity_received

    all_received = all(i.quantity_received >= i.quantity_ordered for i in po.items)
    any_received = any(i.quantity_received > 0 for i in po.items)
    if all_received:
        po.status = PurchaseOrderStatus.RECEIVED_FULL
        new_req_status = RequestStatus.RECEIVED_FULL
    elif any_received:
        po.status = PurchaseOrderStatus.RECEIVED_PARTIAL
        new_req_status = RequestStatus.RECEIVED_PARTIAL
    else:
        new_req_status = None

    if new_req_status:
        req_result = await db.execute(select(Request).where(Request.id == po.request_id))
        request = req_result.scalar_one_or_none()
        if request:
            old_status = request.status
            request.status = new_req_status
            ip_address = get_client_ip(http_request)
            log = WorkflowLog(
                request_id=request.id,
                actor_id=current_user.id,
                action="RECEPTION_REGISTERED",
                from_status=old_status.value if hasattr(old_status, 'value') else str(old_status),
                to_status=new_req_status.value if hasattr(new_req_status, 'value') else str(new_req_status),
                comment=reception.notes,
                ip_address=ip_address,
            )
            db.add(log)

    await db.commit()
    result = await db.execute(_load_po(po_id))
    return result.scalar_one()


@router.post("/{po_id}/cancel", response_model=PurchaseOrderResponse)
async def cancel_purchase_order(
    *,
    db: AsyncSession = Depends(deps.get_db),
    po_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    _require_purchasing(current_user)
    result = await db.execute(_load_po(po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    cancellable = (
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.PENDING_FINANCE_1,
        PurchaseOrderStatus.PENDING_FINANCE_2,
        PurchaseOrderStatus.SENT,
    )
    if po.status not in cancellable:
        raise HTTPException(status_code=400, detail="No se puede cancelar una OC en este estado")
    po.status = PurchaseOrderStatus.CANCELLED
    await db.commit()
    result = await db.execute(_load_po(po_id))
    return result.scalar_one()


# ── Quotations ────────────────────────────────────────────────────────────────

@quotations_router.post("/", response_model=QuotationResponse, status_code=201)
async def create_quotation(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payload: QuotationCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    _require_purchasing(current_user)

    total = sum(i.unit_price * i.quantity for i in payload.items) if payload.items else payload.total_amount

    quotation = Quotation(
        request_id=payload.request_id,
        supplier_id=payload.supplier_id,
        quote_reference=payload.quote_reference,
        status=QuotationStatus.RECEIVED,
        total_amount=total,
        currency=payload.currency,
        valid_until=payload.valid_until,
        notes=payload.notes,
        created_by_id=current_user.id,
    )
    db.add(quotation)
    await db.flush()

    for item in payload.items:
        qi = QuotationItem(
            quotation_id=quotation.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.quantity * item.unit_price,
        )
        db.add(qi)

    await db.commit()

    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items), selectinload(Quotation.supplier))
        .where(Quotation.id == quotation.id)
    )
    return result.scalar_one()


@quotations_router.get("/", response_model=List[QuotationResponse])
async def list_quotations(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    request_id: str = Query(...),
) -> Any:
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items), selectinload(Quotation.supplier))
        .where(Quotation.request_id == request_id)
        .order_by(Quotation.created_at.desc())
    )
    return result.scalars().all()


@quotations_router.patch("/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(
    *,
    db: AsyncSession = Depends(deps.get_db),
    quotation_id: str,
    payload: QuotationUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    _require_purchasing(current_user)
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items), selectinload(Quotation.supplier))
        .where(Quotation.id == quotation_id)
    )
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    if payload.status == QuotationStatus.SELECTED:
        others = await db.execute(
            select(Quotation).where(
                Quotation.request_id == quotation.request_id,
                Quotation.id != quotation.id,
            )
        )
        for other in others.scalars().all():
            other.status = QuotationStatus.REJECTED

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(quotation, field, value)

    await db.commit()
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items), selectinload(Quotation.supplier))
        .where(Quotation.id == quotation_id)
    )
    return result.scalar_one()
