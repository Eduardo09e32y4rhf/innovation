"""merge multiple heads

Revision ID: 889116dc378c
Revises: 20260227020000, e7428f5217b1
Create Date: 2026-03-02 19:39:20.458425

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '889116dc378c'
down_revision: Union[str, None] = ('20260227020000', 'e7428f5217b1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
