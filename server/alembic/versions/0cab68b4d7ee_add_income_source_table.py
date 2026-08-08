from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

revision = "0cab68b4d7ee"
down_revision = "583d6357b1f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    incomefrequency = postgresql.ENUM("weekly", "biweekly", "monthly", name="incomefrequency")
    incomefrequency.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "incomesource",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("userId", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("accountId", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("sourceAccountId", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("isInternalTransfer", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("amountToCent", sa.Integer(), nullable=False),
        sa.Column("frequency", postgresql.ENUM("weekly", "biweekly", "monthly", name="incomefrequency", create_type=False), nullable=False),
        sa.Column("anchorDate", sa.Date(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("createdAt", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["accountId"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["sourceAccountId"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_incomesource_userId"), "incomesource", ["userId"], unique=False)
    op.create_index(op.f("ix_incomesource_accountId"), "incomesource", ["accountId"], unique=False)
    op.create_index(op.f("ix_incomesource_sourceAccountId"), "incomesource", ["sourceAccountId"], unique=False)
    op.alter_column("incomesource", "isInternalTransfer", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_incomesource_sourceAccountId"), table_name="incomesource")
    op.drop_index(op.f("ix_incomesource_accountId"), table_name="incomesource")
    op.drop_index(op.f("ix_incomesource_userId"), table_name="incomesource")
    op.drop_table("incomesource")
    op.execute("DROP TYPE IF EXISTS incomefrequency")