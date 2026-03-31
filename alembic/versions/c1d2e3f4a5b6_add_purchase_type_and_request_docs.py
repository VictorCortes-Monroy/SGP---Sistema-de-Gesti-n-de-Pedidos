"""add_purchase_type_and_request_docs

Revision ID: c1d2e3f4a5b6
Revises: b1c2d3e4f5a6
Create Date: 2026-03-13 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add purchase_type to requests
    op.add_column('requests', sa.Column('purchase_type', sa.String(), nullable=True, server_default='INSUMOS'))

    # Create request_documents table
    op.create_table(
        'request_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('requests.id', ondelete='CASCADE'), nullable=False),
        sa.Column('file_name', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('uploaded_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_request_documents_request_id', 'request_documents', ['request_id'])


def downgrade() -> None:
    op.drop_index('ix_request_documents_request_id', table_name='request_documents')
    op.drop_table('request_documents')
    op.drop_column('requests', 'purchase_type')
