"""rename loginReq enum value

Revision ID: 8ba0b0361021
Revises: a66bfbbbca58
Create Date: 2026-08-29 20:04:54.310282

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '8ba0b0361021'
down_revision: Union[str, Sequence[str], None] = 'a66bfbbbca58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE status RENAME VALUE 'loginReq' TO 'login_required'")

def downgrade():
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE status RENAME VALUE 'login_required' TO 'loginReq'")
