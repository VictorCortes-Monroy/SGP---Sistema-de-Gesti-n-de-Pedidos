"""add_sm_sequence

Revision ID: 7862e3d1b170
Revises: 3d0da7ae3ed8
Create Date: 2026-03-02 19:07:05.966226

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7862e3d1b170'
down_revision: Union[str, None] = '3d0da7ae3ed8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS maint_request_seq START 1;")
    op.execute("""
    CREATE OR REPLACE FUNCTION generate_sm_code()
    RETURNS TEXT AS $$
    BEGIN
        RETURN 'SM-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('maint_request_seq')::text, 4, '0');
    END;
    $$ LANGUAGE plpgsql;
    """)


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS generate_sm_code();")
    op.execute("DROP SEQUENCE IF EXISTS maint_request_seq;")
