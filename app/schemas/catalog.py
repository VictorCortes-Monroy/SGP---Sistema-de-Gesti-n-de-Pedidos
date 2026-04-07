from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


# ── Supplier ──────────────────────────────────────────────────────────────────

class SupplierBase(BaseModel):
    name: str
    rut: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    category: str = 'MIXTO'
    payment_terms_days: Optional[int] = 30
    delivery_days: Optional[int] = None
    rating: Optional[Decimal] = None
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SupplierBase):
    name: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SupplierDetail(SupplierResponse):
    products: List['SupplierProductResponse'] = []
    total_spend: Optional[Decimal] = None
    purchase_count: Optional[int] = None


# ── CatalogItem ───────────────────────────────────────────────────────────────

class CatalogItemBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category: str                         # INSUMOS | ACTIVOS_FIJOS | SERVICIOS
    unit_of_measure: str = 'UN'
    reference_price: Optional[Decimal] = None
    currency: str = 'CLP'
    preferred_supplier_id: Optional[UUID] = None
    technical_specs: Optional[dict] = None


class CatalogItemCreate(CatalogItemBase):
    pass


class CatalogItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: Optional[str] = None
    reference_price: Optional[Decimal] = None
    currency: Optional[str] = None
    preferred_supplier_id: Optional[UUID] = None
    technical_specs: Optional[dict] = None
    is_active: Optional[bool] = None


class CatalogItemResponse(CatalogItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    preferred_supplier_name: Optional[str] = None

    @classmethod
    def from_orm_with_supplier(cls, item):
        data = cls.model_validate(item)
        if item.preferred_supplier:
            data.preferred_supplier_name = item.preferred_supplier.name
        return data


class CatalogItemDetail(CatalogItemResponse):
    suppliers: List['SupplierProductResponse'] = []
    purchase_history: List['PurchaseHistoryEntry'] = []


# ── SupplierProduct ───────────────────────────────────────────────────────────

class SupplierProductBase(BaseModel):
    supplier_id: UUID
    catalog_item_id: UUID
    supplier_sku: Optional[str] = None
    unit_price: Optional[Decimal] = None
    currency: str = 'CLP'
    lead_time_days: Optional[int] = None
    is_preferred: bool = False
    last_purchase_date: Optional[date] = None


class SupplierProductCreate(BaseModel):
    supplier_id: UUID
    supplier_sku: Optional[str] = None
    unit_price: Optional[Decimal] = None
    currency: str = 'CLP'
    lead_time_days: Optional[int] = None
    is_preferred: bool = False


class SupplierProductResponse(SupplierProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    supplier_name: Optional[str] = None
    catalog_item_name: Optional[str] = None
    updated_at: datetime


# ── Purchase History ──────────────────────────────────────────────────────────

class PurchaseHistoryEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    request_id: UUID
    request_title: str
    quantity: Decimal
    unit_price: Decimal
    total_price: Decimal
    purchased_at: datetime
    status: str


# ── Stats ─────────────────────────────────────────────────────────────────────

class TopProductEntry(BaseModel):
    catalog_item_id: UUID
    sku: str
    name: str
    category: str
    total_quantity: Decimal
    total_spend: Decimal
    purchase_count: int


class SupplierSpendEntry(BaseModel):
    supplier_id: UUID
    supplier_name: str
    total_spend: Decimal
    purchase_count: int
    last_purchase_date: Optional[date] = None
