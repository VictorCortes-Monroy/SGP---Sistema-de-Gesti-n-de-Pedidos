"""add_maint_alerts

Revision ID: d1e2f3a4b5c6
Revises: c1d2e3f4a5b6
Create Date: 2026-03-31 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'maint_alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('alert_type', sa.String(), nullable=False),
        sa.Column('target_role', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('hours_overdue', sa.Numeric(8, 1), nullable=True),
        sa.Column('request_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('maint_requests.id', ondelete='CASCADE'), nullable=True),
        sa.Column('equipment_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('maint_equipment.id', ondelete='CASCADE'), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_maint_alerts_alert_type', 'maint_alerts', ['alert_type'])
    op.create_index('ix_maint_alerts_request_id', 'maint_alerts', ['request_id'])
    op.create_index('ix_maint_alerts_equipment_id', 'maint_alerts', ['equipment_id'])


def downgrade() -> None:
    op.drop_index('ix_maint_alerts_equipment_id', table_name='maint_alerts')
    op.drop_index('ix_maint_alerts_request_id', table_name='maint_alerts')
    op.drop_index('ix_maint_alerts_alert_type', table_name='maint_alerts')
    op.drop_table('maint_alerts')
