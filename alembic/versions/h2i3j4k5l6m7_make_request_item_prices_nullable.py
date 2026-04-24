"""Make request_items.unit_price and total_price nullable with default 0

The SP form no longer captures prices — they are set on the Purchase Order instead.
Existing rows keep their values. New rows from SP create with 0 unless backfilled by an OC.

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-04-23
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'h2i3j4k5l6m7'
down_revision = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        'request_items', 'unit_price',
        existing_type=sa.Numeric(14, 2),
        nullable=True,
        server_default=sa.text('0'),
    )
    op.alter_column(
        'request_items', 'total_price',
        existing_type=sa.Numeric(14, 2),
        nullable=True,
        server_default=sa.text('0'),
    )


def downgrade() -> None:
    # Backfill NULLs to 0 before restoring NOT NULL
    op.execute("UPDATE request_items SET unit_price = 0 WHERE unit_price IS NULL")
    op.execute("UPDATE request_items SET total_price = 0 WHERE total_price IS NULL")
    op.alter_column(
        'request_items', 'unit_price',
        existing_type=sa.Numeric(14, 2),
        nullable=False,
        server_default=None,
    )
    op.alter_column(
        'request_items', 'total_price',
        existing_type=sa.Numeric(14, 2),
        nullable=False,
        server_default=None,
    )
