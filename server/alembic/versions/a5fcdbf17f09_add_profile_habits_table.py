from alembic import op
import sqlalchemy as sa
import sqlmodel

revision = "a5fcdbf17f09"
down_revision = "d9850539009d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "habitprofile",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("userId", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("clustersJson", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("currentClusterLabel", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("computedAt", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_habitprofile_userId"), "habitprofile", ["userId"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_habitprofile_userId"), table_name="habitprofile")
    op.drop_table("habitprofile")

