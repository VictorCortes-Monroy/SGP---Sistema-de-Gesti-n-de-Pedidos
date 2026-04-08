from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

from app.models.purchase_order import PurchaseOrderStatus, QuotationStatus


# ── QuotationItem ─────────────────────────────────────────────────────────────

class QuotationItemCreate(BaseModel):
    description: str
    quantity: Decimal
    unit_price: Decimal


class QuotationItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    quotation_id: UUID
    description: str
    quantity: Decimal
    unit_price: Decimal
    total_price: Decimal


# ── Quotation ─────────────────────────────────────────────────────────────────

class QuotationCreate(BaseModel):
    request_id: UUID
    supplier_id: UUID
    quote_reference: Optional[str] = None
    total_amount: Optional[Decimal] = None
    currency: str = "CLP"
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    items: List[QuotationItemCreate] = []


class QuotationUpdate(BaseModel):
    status: Optional[QuotationStatus] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    valid_until: Optional[date] = None


class QuotationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    request_id: UUID
    supplier_id: UUID
    supplier_name: Optional[str] = None
    quote_reference: Optional[str] = None
    status: str
    total_amount: Optional[Decimal] = None
    currency: str
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime
    items: List[QuotationItemResponse] = []


# ── PurchaseOrderItem ─────────────────────────────────────────────────────────

class PurchaseOrderItemCreate(BaseModel):
    request_item_id: Optional[UUID] = None
    catalog_item_id: Optional[UUID] = None
    description: str
    supplier_sku: Optional[str] = None
    quantity_ordered: Decimal
    unit_price: Decimal


class PurchaseOrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    purchase_order_id: UUID
    request_item_id: Optional[UUID] = None
    catalog_item_id: Optional[UUID] = None
    description: str
    supplier_sku: Optional[str] = None
    quantity_ordered: Decimal
    unit_price: Decimal
    total_price: Decimal
    quantity_received: Decimal


# ── PurchaseOrder ─────────────────────────────────────────────────────────────

class PurchaseOrderCreate(BaseModel):
    request_id: UUID
    supplier_id: UUID
    quotation_id: Optional[UUID] = None
    currency: str = "CLP"
    expected_delivery_date: Optional[date] = None
    payment_terms_days: Optional[int] = None
    payment_terms_text: Optional[str] = None
    notes: Optional[str] = None
    items: List[PurchaseOrderItemCreate]


class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[UUID] = None
    quotation_id: Optional[UUID] = None
    expected_delivery_date: Optional[date] = None
    payment_terms_days: Optional[int] = None
    payment_terms_text: Optional[str] = None
    notes: Optional[str] = None


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    request_id: UUID
    supplier_id: UUID
    supplier_name: Optional[str] = None
    quotation_id: Optional[UUID] = None
    oc_number: str
    status: str
    total_amount: Decimal
    currency: str
    expected_delivery_date: Optional[date] = None
    payment_terms_days: Optional[int] = None
    payment_terms_text: Optional[str] = None
    notes: Optional[str] = None
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseOrderItemResponse] = []
    approval_logs: List["POApprovalLogResponse"] = []


class PurchaseOrderList(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    request_id: UUID
    supplier_id: UUID
    supplier_name: Optional[str] = None
    oc_number: str
    status: str
    total_amount: Decimal
    currency: str
    expected_delivery_date: Optional[date] = None
    created_at: datetime


# ── Reception ─────────────────────────────────────────────────────────────────

class ItemReceptionUpdate(BaseModel):
    purchase_order_item_id: UUID
    quantity_received: Decimal


class POReceptionInput(BaseModel):
    items: List[ItemReceptionUpdate]
    notes: Optional[str] = None


# ── Finance Approval ───────────────────────────────────────────────────────────

class POFinanceAction(BaseModel):
    comment: Optional[str] = None


class POApprovalLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    po_id: UUID
    actor_id: UUID
    actor_name: Optional[str] = None
    action: str
    finance_level: int
    from_status: str
    to_status: str
    comment: Optional[str] = None
    timestamp: datetime

    @classmethod
    def from_orm_with_actor(cls, log: object) -> "POApprovalLogResponse":
        actor_name = log.actor.full_name if log.actor else None  # type: ignore
        return cls(
            id=log.id,  # type: ignore
            po_id=log.po_id,  # type: ignore
            actor_id=log.actor_id,  # type: ignore
            actor_name=actor_name,
            action=log.action,  # type: ignore
            finance_level=log.finance_level,  # type: ignore
            from_status=log.from_status,  # type: ignore
            to_status=log.to_status,  # type: ignore
            comment=log.comment,  # type: ignore
            timestamp=log.timestamp,  # type: ignore
        )
