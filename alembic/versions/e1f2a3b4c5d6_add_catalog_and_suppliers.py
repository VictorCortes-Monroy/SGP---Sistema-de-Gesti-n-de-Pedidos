"""add_catalog_and_suppliers

Revision ID: e1f2a3b4c5d6
Revises: d1e2f3a4b5c6
Create Date: 2026-04-07 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── suppliers ─────────────────────────────────────────────────────────────
    op.create_table(
        'suppliers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('rut', sa.String(), unique=True, nullable=True),
        sa.Column('contact_name', sa.String(), nullable=True),
        sa.Column('contact_email', sa.String(), nullable=True),
        sa.Column('contact_phone', sa.String(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('category', sa.String(), nullable=False, server_default='MIXTO'),
        sa.Column('payment_terms_days', sa.Integer(), nullable=True, server_default='30'),
        sa.Column('delivery_days', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Numeric(3, 1), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_suppliers_name', 'suppliers', ['name'])

    # ── catalog_items ─────────────────────────────────────────────────────────
    op.create_table(
        'catalog_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sku', sa.String(), nullable=False, unique=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('unit_of_measure', sa.String(), nullable=False, server_default='UN'),
        sa.Column('reference_price', sa.Numeric(14, 2), nullable=True),
        sa.Column('currency', sa.String(), nullable=False, server_default='CLP'),
        sa.Column('preferred_supplier_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('suppliers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('technical_specs', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_catalog_items_sku', 'catalog_items', ['sku'])
    op.create_index('ix_catalog_items_name', 'catalog_items', ['name'])
    op.create_index('ix_catalog_items_category', 'catalog_items', ['category'])

    # ── supplier_products ─────────────────────────────────────────────────────
    op.create_table(
        'supplier_products',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('supplier_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('suppliers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('catalog_item_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('catalog_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('supplier_sku', sa.String(), nullable=True),
        sa.Column('unit_price', sa.Numeric(14, 2), nullable=True),
        sa.Column('currency', sa.String(), nullable=False, server_default='CLP'),
        sa.Column('lead_time_days', sa.Integer(), nullable=True),
        sa.Column('is_preferred', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('last_purchase_date', sa.Date(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('supplier_id', 'catalog_item_id', name='uq_supplier_catalog_item'),
    )
    op.create_index('ix_supplier_products_supplier_id', 'supplier_products', ['supplier_id'])
    op.create_index('ix_supplier_products_catalog_item_id', 'supplier_products', ['catalog_item_id'])

    # ── request_items: agregar catalog_item_id ────────────────────────────────
    op.add_column(
        'request_items',
        sa.Column('catalog_item_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('catalog_items.id', ondelete='SET NULL'), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('request_items', 'catalog_item_id')
    op.drop_index('ix_supplier_products_catalog_item_id', table_name='supplier_products')
    op.drop_index('ix_supplier_products_supplier_id', table_name='supplier_products')
    op.drop_table('supplier_products')
    op.drop_index('ix_catalog_items_category', table_name='catalog_items')
    op.drop_index('ix_catalog_items_name', table_name='catalog_items')
    op.drop_index('ix_catalog_items_sku', table_name='catalog_items')
    op.drop_table('catalog_items')
    op.drop_index('ix_suppliers_name', table_name='suppliers')
    op.drop_table('suppliers')
