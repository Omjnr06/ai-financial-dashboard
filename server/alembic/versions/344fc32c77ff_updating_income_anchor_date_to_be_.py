"""updating income anchor date to be nullable, filled out later by endpoint or left empty

Revision ID: 344fc32c77ff
Revises: 88d621e1e0f6
Create Date: 2026-08-30 12:30:52.084547

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '344fc32c77ff'
down_revision: Union[str, Sequence[str], None] = '88d621e1e0f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    conn = op.get_bind()
    insp = inspect(conn)
    existing_cols = {c["name"] for c in insp.get_columns("incomesource")}
    existing_indexes = {i["name"] for i in insp.get_indexes("incomesource")}
 
    if "streamId" not in existing_cols:
        op.add_column("incomesource", sa.Column("streamId", sa.String(), nullable=True))
    if "isAuto" not in existing_cols:
        op.add_column("incomesource", sa.Column("isAuto", sa.Boolean(), nullable=False, server_default=sa.false()))
    if "reviewed" not in existing_cols:
        op.add_column("incomesource", sa.Column("reviewed", sa.Boolean(), nullable=False, server_default=sa.true()))
    if "dismissed" not in existing_cols:
        op.add_column("incomesource", sa.Column("dismissed", sa.Boolean(), nullable=False, server_default=sa.false()))
    if "ix_incomesource_streamId" not in existing_indexes:
        op.create_index("ix_incomesource_streamId", "incomesource", ["streamId"])
 
    op.alter_column("incomesource", "anchorDate", existing_type=sa.Date(), nullable=True)
 
 
def downgrade():
    op.alter_column("incomesource", "anchorDate", existing_type=sa.Date(), nullable=False)
    op.drop_index("ix_incomesource_streamId", table_name="incomesource")
    op.drop_column("incomesource", "dismissed")
    op.drop_column("incomesource", "reviewed")
    op.drop_column("incomesource", "isAuto")
    op.drop_column("incomesource", "streamId") 
