"""Add receipt fields

Revision ID: e7428f5217b1
Revises: d0346c349405
Create Date: 2026-03-05 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e7428f5217b1"
down_revision: Union[str, None] = "d0346c349405"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("attachment_url", sa.String(length=500), nullable=True),
    )
    op.add_column("transactions", sa.Column("ai_metadata", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("transactions", "ai_metadata")
    op.drop_column("transactions", "attachment_url")
