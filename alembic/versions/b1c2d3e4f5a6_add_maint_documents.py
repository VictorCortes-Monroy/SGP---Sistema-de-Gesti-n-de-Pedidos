"""add_maint_documents - tabla de documentos D1-D7 por SM

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-03-09 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'maint_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('maint_request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('maint_requests.id'), nullable=False, index=True),
        sa.Column('document_type', sa.String(5), nullable=False),
        sa.Column('file_name', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('uploaded_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_maint_documents_request_id', 'maint_documents', ['maint_request_id'])


def downgrade() -> None:
    op.drop_index('ix_maint_documents_request_id', table_name='maint_documents')
    op.drop_table('maint_documents')
