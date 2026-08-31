"""updating income to allow for auto income detection

Revision ID: 88d621e1e0f6
Revises: 8ba0b0361021
Create Date: 2026-08-30 12:11:33.730667

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '88d621e1e0f6'
down_revision: Union[str, Sequence[str], None] = '8ba0b0361021'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column("incomesource", sa.Column("streamId", sa.String(), nullable=True))
    op.add_column("incomesource", sa.Column("isAuto", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("incomesource", sa.Column("reviewed", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("incomesource", sa.Column("dismissed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_incomesource_streamId", "incomesource", ["streamId"])
 
 
def downgrade():
    op.drop_index("ix_incomesource_streamId", table_name="incomesource")
    op.drop_column("incomesource", "dismissed")
    op.drop_column("incomesource", "reviewed")
    op.drop_column("incomesource", "isAuto")
    op.drop_column("incomesource", "streamId")