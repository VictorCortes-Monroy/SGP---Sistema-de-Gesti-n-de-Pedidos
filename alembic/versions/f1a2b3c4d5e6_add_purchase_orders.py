"""add_purchase_orders

Revision ID: f1a2b3c4d5e6
Revises: e1f2a3b4c5d6
Create Date: 2026-04-07 18:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── quotations ────────────────────────────────────────────────────────────
    op.create_table(
        'quotations',
        sa.Column('id',               postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('request_id',       postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('requests.id'), nullable=False),
        sa.Column('supplier_id',      postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('suppliers.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('quote_reference',  sa.String(),    nullable=True),
        sa.Column('status',           sa.String(),    nullable=False, server_default='RECEIVED'),
        sa.Column('total_amount',     sa.Numeric(14, 2), nullable=True),
        sa.Column('currency',         sa.String(),    nullable=False, server_default='CLP'),
        sa.Column('valid_until',      sa.Date(),      nullable=True),
        sa.Column('notes',            sa.Text(),      nullable=True),
        sa.Column('rejection_reason', sa.Text(),      nullable=True),
        sa.Column('created_by_id',    postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at',       sa.DateTime(),  nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at',       sa.DateTime(),  nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_quotations_request_id',  'quotations', ['request_id'])
    op.create_index('ix_quotations_supplier_id', 'quotations', ['supplier_id'])

    # ── quotation_items ───────────────────────────────────────────────────────
    op.create_table(
        'quotation_items',
        sa.Column('id',           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('quotation_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('quotations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('description',  sa.String(),       nullable=False),
        sa.Column('quantity',     sa.Numeric(10, 2), nullable=False),
        sa.Column('unit_price',   sa.Numeric(14, 2), nullable=False),
        sa.Column('total_price',  sa.Numeric(14, 2), nullable=False),
    )
    op.create_index('ix_quotation_items_quotation_id', 'quotation_items', ['quotation_id'])

    # ── purchase_orders ───────────────────────────────────────────────────────
    op.create_table(
        'purchase_orders',
        sa.Column('id',           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('request_id',   postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('requests.id'), nullable=False),
        sa.Column('supplier_id',  postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('suppliers.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('quotation_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('quotations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('oc_number',    sa.String(),    unique=True, nullable=False),
        sa.Column('oc_year',      sa.Integer(),   nullable=False),
        sa.Column('oc_seq',       sa.Integer(),   nullable=False),
        sa.Column('status',       sa.String(),    nullable=False, server_default='DRAFT'),
        sa.Column('total_amount', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('currency',     sa.String(),    nullable=False, server_default='CLP'),
        sa.Column('expected_delivery_date', sa.Date(), nullable=True),
        sa.Column('payment_terms_days',     sa.Integer(), nullable=True),
        sa.Column('payment_terms_text',     sa.String(),  nullable=True),
        sa.Column('notes',         sa.Text(),     nullable=True),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at',    sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at',    sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_purchase_orders_request_id', 'purchase_orders', ['request_id'])
    op.create_index('ix_purchase_orders_oc_number',  'purchase_orders', ['oc_number'])

    # ── purchase_order_items ──────────────────────────────────────────────────
    op.create_table(
        'purchase_order_items',
        sa.Column('id',                  postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('purchase_order_id',   postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('purchase_orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('request_item_id',     postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('request_items.id', ondelete='SET NULL'), nullable=True),
        sa.Column('catalog_item_id',     postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('catalog_items.id', ondelete='SET NULL'), nullable=True),
        sa.Column('description',         sa.String(),       nullable=False),
        sa.Column('supplier_sku',        sa.String(),       nullable=True),
        sa.Column('quantity_ordered',    sa.Numeric(10, 2), nullable=False),
        sa.Column('unit_price',          sa.Numeric(14, 2), nullable=False),
        sa.Column('total_price',         sa.Numeric(14, 2), nullable=False),
        sa.Column('quantity_received',   sa.Numeric(10, 2), nullable=False, server_default='0'),
    )
    op.create_index('ix_po_items_purchase_order_id', 'purchase_order_items', ['purchase_order_id'])


def downgrade() -> None:
    op.drop_index('ix_po_items_purchase_order_id', table_name='purchase_order_items')
    op.drop_table('purchase_order_items')
    op.drop_index('ix_purchase_orders_oc_number',  table_name='purchase_orders')
    op.drop_index('ix_purchase_orders_request_id', table_name='purchase_orders')
    op.drop_table('purchase_orders')
    op.drop_index('ix_quotation_items_quotation_id', table_name='quotation_items')
    op.drop_table('quotation_items')
    op.drop_index('ix_quotations_supplier_id', table_name='quotations')
    op.drop_index('ix_quotations_request_id',  table_name='quotations')
    op.drop_table('quotations')
