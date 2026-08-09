"""typed accounts + bill detection

Revision ID: f09760e2fcfb
Revises: 9952bebc9d75
Create Date: 2026-08-05 22:54:14.853246

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f09760e2fcfb'
down_revision: Union[str, Sequence[str], None] = '9952bebc9d75'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    accounttype = postgresql.ENUM('spending', 'credit', 'savings', 'investment', 'loan', name='accounttype')
    accounttype.create(op.get_bind(), checkfirst=True)

    op.add_column('accounts', sa.Column('accountType', sa.Enum('spending', 'credit', 'savings', 'investment', 'loan', name='accounttype'), nullable=False, server_default='spending'))
    op.alter_column('accounts', 'accountType', server_default=None)
    op.add_column('accounts', sa.Column('plaidType', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('accounts', sa.Column('plaidSubtype', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('accounts', sa.Column('availableBalanceToCent', sa.Integer(), nullable=True))
    op.add_column('accounts', sa.Column('limitToCent', sa.Integer(), nullable=True))
    op.drop_column('accounts', 'type')

    op.add_column('bills', sa.Column('accountId', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('bills', sa.Column('streamId', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('bills', sa.Column('userModified', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column('bills', 'userModified', server_default=None)
    op.add_column('bills', sa.Column('rawName', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.create_index(op.f('ix_bills_accountId'), 'bills', ['accountId'], unique=False)
    op.create_index(op.f('ix_bills_streamId'), 'bills', ['streamId'], unique=True)
    op.create_foreign_key(None, 'bills', 'accounts', ['accountId'], ['id'])

    op.add_column('bucket', sa.Column('accountId', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.create_index(op.f('ix_bucket_accountId'), 'bucket', ['accountId'], unique=False)
    op.create_foreign_key(None, 'bucket', 'accounts', ['accountId'], ['id'])

    op.add_column('plaiditem', sa.Column('institutionName', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.drop_column('plaiditem', 'instituionName')

    op.execute('DROP TYPE IF EXISTS type')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('plaiditem', sa.Column('instituionName', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_column('plaiditem', 'institutionName')

    op.drop_constraint(None, 'bucket', type_='foreignkey')
    op.drop_index(op.f('ix_bucket_accountId'), table_name='bucket')
    op.drop_column('bucket', 'accountId')

    op.drop_constraint(None, 'bills', type_='foreignkey')
    op.drop_index(op.f('ix_bills_streamId'), table_name='bills')
    op.drop_index(op.f('ix_bills_accountId'), table_name='bills')
    op.drop_column('bills', 'rawName')
    op.drop_column('bills', 'userModified')
    op.drop_column('bills', 'streamId')
    op.drop_column('bills', 'accountId')

    old_type = postgresql.ENUM('checking', 'saving', 'credit', name='type')
    old_type.create(op.get_bind(), checkfirst=True)
    op.add_column('accounts', sa.Column('type', sa.Enum('checking', 'saving', 'credit', name='type'), autoincrement=False, nullable=False, server_default='checking'))
    op.alter_column('accounts', 'type', server_default=None)
    op.drop_column('accounts', 'limitToCent')
    op.drop_column('accounts', 'availableBalanceToCent')
    op.drop_column('accounts', 'plaidSubtype')
    op.drop_column('accounts', 'plaidType')
    op.drop_column('accounts', 'accountType')
    op.execute('DROP TYPE IF EXISTS accounttype')