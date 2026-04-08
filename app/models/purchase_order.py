import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Integer, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class PurchaseOrderStatus(str, enum.Enum):
    DRAFT             = "DRAFT"
    PENDING_FINANCE_1 = "PENDING_FINANCE_1"
    PENDING_FINANCE_2 = "PENDING_FINANCE_2"
    AUTHORIZED        = "AUTHORIZED"
    SENT              = "SENT"
    RECEIVED_PARTIAL  = "RECEIVED_PARTIAL"
    RECEIVED_FULL     = "RECEIVED_FULL"
    CLOSED            = "CLOSED"
    CANCELLED         = "CANCELLED"


class QuotationStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    SELECTED = "SELECTED"
    REJECTED = "REJECTED"


class Quotation(Base):
    __tablename__ = "quotations"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id      = Column(UUID(as_uuid=True), ForeignKey("requests.id"), nullable=False, index=True)
    supplier_id     = Column(UUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True)
    quote_reference = Column(String, nullable=True)
    status          = Column(String, default=QuotationStatus.RECEIVED, nullable=False)
    total_amount    = Column(Numeric(14, 2), nullable=True)
    currency        = Column(String, default="CLP", nullable=False)
    valid_until     = Column(Date, nullable=True)
    notes           = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_by_id   = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    request         = relationship("Request",  back_populates="quotations")
    supplier        = relationship("Supplier", back_populates="quotations")
    items           = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="quotation", foreign_keys="PurchaseOrder.quotation_id")
    created_by      = relationship("User", foreign_keys=[created_by_id])

    @property
    def supplier_name(self):
        return self.supplier.name if self.supplier else None


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id = Column(UUID(as_uuid=True), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    description  = Column(String, nullable=False)
    quantity     = Column(Numeric(10, 2), nullable=False)
    unit_price   = Column(Numeric(14, 2), nullable=False)
    total_price  = Column(Numeric(14, 2), nullable=False)

    quotation    = relationship("Quotation", back_populates="items")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id      = Column(UUID(as_uuid=True), ForeignKey("requests.id"), nullable=False, index=True)
    supplier_id     = Column(UUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False)
    quotation_id    = Column(UUID(as_uuid=True), ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True)

    oc_number       = Column(String, unique=True, nullable=False, index=True)
    oc_year         = Column(Integer, nullable=False)
    oc_seq          = Column(Integer, nullable=False)

    status          = Column(String, default=PurchaseOrderStatus.DRAFT, nullable=False)
    total_amount    = Column(Numeric(14, 2), nullable=False, default=0)
    currency        = Column(String, default="CLP", nullable=False)

    expected_delivery_date = Column(Date, nullable=True)
    payment_terms_days     = Column(Integer, nullable=True)
    payment_terms_text     = Column(String, nullable=True)
    notes                  = Column(Text, nullable=True)

    created_by_id   = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    request       = relationship("Request",   back_populates="purchase_orders")
    supplier      = relationship("Supplier",  back_populates="purchase_orders")
    quotation     = relationship("Quotation", back_populates="purchase_orders", foreign_keys=[quotation_id])
    items         = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    created_by    = relationship("User", foreign_keys=[created_by_id])
    approval_logs = relationship("POApprovalLog", back_populates="purchase_order",
                                 cascade="all, delete-orphan",
                                 order_by="POApprovalLog.timestamp")

    @property
    def supplier_name(self):
        return self.supplier.name if self.supplier else None


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    request_item_id   = Column(UUID(as_uuid=True), ForeignKey("request_items.id", ondelete="SET NULL"), nullable=True)
    catalog_item_id   = Column(UUID(as_uuid=True), ForeignKey("catalog_items.id", ondelete="SET NULL"), nullable=True)

    description       = Column(String, nullable=False)
    supplier_sku      = Column(String, nullable=True)
    quantity_ordered  = Column(Numeric(10, 2), nullable=False)
    unit_price        = Column(Numeric(14, 2), nullable=False)
    total_price       = Column(Numeric(14, 2), nullable=False)
    quantity_received = Column(Numeric(10, 2), nullable=False, default=0)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    request_item   = relationship("RequestItem",   back_populates="purchase_order_items")
    catalog_item   = relationship("CatalogItem",   back_populates="purchase_order_items")


class POApprovalLog(Base):
    __tablename__ = "po_approval_logs"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_id         = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"),
                           nullable=False, index=True)
    actor_id      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action        = Column(String, nullable=False)          # APPROVE | REJECT | RESUBMITTED
    finance_level = Column(Integer, nullable=False)         # 1 or 2 (0 for resubmit)
    from_status   = Column(String, nullable=False)
    to_status     = Column(String, nullable=False)
    comment       = Column(Text, nullable=True)
    ip_address    = Column(String, nullable=True)
    timestamp     = Column(DateTime, default=datetime.utcnow, nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="approval_logs")
    actor          = relationship("User", foreign_keys=[actor_id])
