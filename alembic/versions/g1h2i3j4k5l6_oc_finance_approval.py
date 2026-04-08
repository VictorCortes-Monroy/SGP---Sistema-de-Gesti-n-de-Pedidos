"""OC finance approval workflow: po_approval_logs table, Finance 2 role, remove financial matrix rule

Revision ID: g1h2i3j4k5l6
Revises: f1a2b3c4d5e6
Create Date: 2026-04-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers
revision = 'g1h2i3j4k5l6'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create po_approval_logs table
    op.create_table(
        'po_approval_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('po_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('purchase_orders.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id'), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('finance_level', sa.Integer(), nullable=False),
        sa.Column('from_status', sa.String(), nullable=False),
        sa.Column('to_status', sa.String(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_po_approval_logs_po_id', 'po_approval_logs', ['po_id'], if_not_exists=True)

    # 2. Insert "Finance 2" role (General Manager)
    op.execute("""
        INSERT INTO roles (id, name, description)
        VALUES (gen_random_uuid(), 'Finance 2', 'Gerencia General — Aprueba OC mayor a 5 millones CLP')
        ON CONFLICT (name) DO NOTHING;
    """)

    # 3. Remove Financial Approver from approval_matrix for requests
    #    (financial approval moves to the OC, not the request)
    op.execute("""
        DELETE FROM approval_matrix
        WHERE role_id = (SELECT id FROM roles WHERE name = 'Financial Approver')
          AND step_order = 2;
    """)


def downgrade() -> None:
    op.drop_index('ix_po_approval_logs_po_id', table_name='po_approval_logs')
    op.drop_table('po_approval_logs')
    op.execute("DELETE FROM roles WHERE name = 'Finance 2';")
    # NOTE: The approval_matrix rule is NOT restored on downgrade — re-run initial_data.py if needed
