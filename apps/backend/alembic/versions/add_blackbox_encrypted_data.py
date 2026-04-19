'''Add encrypted_data to users table for BlackBox'''

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('users', sa.Column('encrypted_data', sa.LargeBinary(), nullable=True))

def downgrade():
    op.drop_column('users', 'encrypted_data')

