import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Numeric, Integer, Date, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class Supplier(Base):
    """Proveedores comerciales de insumos/servicios (independiente de maint_providers)."""
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    rut = Column(String, unique=True, nullable=True)          # RUT / Tax ID
    contact_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)

    # Clasificación
    category = Column(String, default='MIXTO', nullable=False)
    # INSUMOS | ACTIVOS_FIJOS | SERVICIOS | MIXTO

    # Condiciones comerciales
    payment_terms_days = Column(Integer, default=30, nullable=True)  # Plazo de pago (días)
    delivery_days = Column(Integer, nullable=True)                   # Plazo entrega promedio
    rating = Column(Numeric(3, 1), nullable=True)                   # Calificación 1.0–5.0

    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones
    products = relationship("SupplierProduct", back_populates="supplier", cascade="all, delete-orphan")
    catalog_items = relationship("CatalogItem", back_populates="preferred_supplier", foreign_keys="CatalogItem.preferred_supplier_id")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")
    quotations = relationship("Quotation", back_populates="supplier")


class CatalogItem(Base):
    """Catálogo maestro de productos, insumos y servicios."""
    __tablename__ = "catalog_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(String, unique=True, nullable=False, index=True)    # SKU interno
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)

    category = Column(String, nullable=False, index=True)
    # INSUMOS | ACTIVOS_FIJOS | SERVICIOS

    unit_of_measure = Column(String, default='UN', nullable=False)
    # UN | KG | LT | MT | HR | GL | M2 | M3 | TN | PZ

    reference_price = Column(Numeric(14, 2), nullable=True)
    currency = Column(String, default='CLP', nullable=False)

    preferred_supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)

    technical_specs = Column(JSONB, nullable=True)
    # {marca, modelo, color, voltaje, potencia, etc.} — flexible por tipo de producto

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones
    preferred_supplier = relationship("Supplier", back_populates="catalog_items", foreign_keys=[preferred_supplier_id])
    suppliers = relationship("SupplierProduct", back_populates="catalog_item", cascade="all, delete-orphan")
    request_items = relationship("RequestItem", back_populates="catalog_item")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="catalog_item")


class SupplierProduct(Base):
    """Tabla intermedia: qué proveedor ofrece qué producto, a qué precio."""
    __tablename__ = "supplier_products"
    __table_args__ = (UniqueConstraint("supplier_id", "catalog_item_id", name="uq_supplier_catalog_item"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, index=True)
    catalog_item_id = Column(UUID(as_uuid=True), ForeignKey("catalog_items.id", ondelete="CASCADE"), nullable=False, index=True)

    supplier_sku = Column(String, nullable=True)       # SKU propio del proveedor
    unit_price = Column(Numeric(14, 2), nullable=True)
    currency = Column(String, default='CLP', nullable=False)
    lead_time_days = Column(Integer, nullable=True)
    is_preferred = Column(Boolean, default=False, nullable=False)
    last_purchase_date = Column(Date, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones
    supplier = relationship("Supplier", back_populates="products")
    catalog_item = relationship("CatalogItem", back_populates="suppliers")
