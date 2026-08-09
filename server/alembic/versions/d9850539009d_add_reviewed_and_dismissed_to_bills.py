from alembic import op
import sqlalchemy as sa

revision = "d9850539009d"
down_revision = "0cab68b4d7ee"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bills", sa.Column("reviewed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("bills", sa.Column("dismissed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column("bills", "reviewed", server_default=None)
    op.alter_column("bills", "dismissed", server_default=None)


def downgrade() -> None:
    op.drop_column("bills", "dismissed")
    op.drop_column("bills", "reviewed")