"""extend_maint_flow - add new states and fields for commercial flow

Revision ID: a1b2c3d4e5f6
Revises: 3d0da7ae3ed8
Create Date: 2026-03-06 10:00:00.000000

Adds:
- 5 new MaintRequestStatus enum values: QUOTED_PENDING, PENDING_D5, INVOICING_READY, PENDING_PAYMENT, CLOSED
- D2 quotation fields on maint_requests
- D5 signing fields on maint_requests
- Payment confirmation fields on maint_requests
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '7862e3d1b170'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL requires AUTOCOMMIT to add values to an existing ENUM
    connection = op.get_bind()
    connection.execute(sa.text("COMMIT"))

    for value in ['QUOTED_PENDING', 'PENDING_D5', 'INVOICING_READY', 'PENDING_PAYMENT', 'CLOSED']:
        connection.execute(sa.text(
            f"ALTER TYPE maintrequeststatus ADD VALUE IF NOT EXISTS '{value}'"
        ))

    connection.execute(sa.text("BEGIN"))

    # Add D2 quotation fields
    op.add_column('maint_requests', sa.Column('d2_quotation_amount', sa.Numeric(14, 2), nullable=True))
    op.add_column('maint_requests', sa.Column('d2_quotation_notes', sa.Text(), nullable=True))
    op.add_column('maint_requests', sa.Column('d2_registered_at', sa.DateTime(), nullable=True))

    # Add D5 termination document fields
    op.add_column('maint_requests', sa.Column('d5_signed_at', sa.DateTime(), nullable=True))
    op.add_column('maint_requests', sa.Column('d5_signed_by_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_maint_req_d5_signed_by', 'maint_requests', 'users', ['d5_signed_by_id'], ['id'])

    # Add payment confirmation fields
    op.add_column('maint_requests', sa.Column('payment_confirmed_at', sa.DateTime(), nullable=True))
    op.add_column('maint_requests', sa.Column('payment_confirmed_by_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_maint_req_payment_by', 'maint_requests', 'users', ['payment_confirmed_by_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_maint_req_payment_by', 'maint_requests', type_='foreignkey')
    op.drop_constraint('fk_maint_req_d5_signed_by', 'maint_requests', type_='foreignkey')
    op.drop_column('maint_requests', 'payment_confirmed_by_id')
    op.drop_column('maint_requests', 'payment_confirmed_at')
    op.drop_column('maint_requests', 'd5_signed_by_id')
    op.drop_column('maint_requests', 'd5_signed_at')
    op.drop_column('maint_requests', 'd2_registered_at')
    op.drop_column('maint_requests', 'd2_quotation_notes')
    op.drop_column('maint_requests', 'd2_quotation_amount')
    # Note: PostgreSQL does not support removing values from ENUM types
