"""create interviews table

Revision ID: 20260227012348_create_interviews_table
Revises:
Create Date: 2026-02-27 01:23:48.974157307

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260227012348_create_interviews_table"
down_revision = None  # Update this manually if needed based on existing migrations
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "interviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("interviewer_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("type", sa.String(length=50), nullable=True),
        sa.Column("location", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("scheduled_date", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("recommendation", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["application_id"],
            ["applications.id"],
        ),
        sa.ForeignKeyConstraint(
            ["candidate_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["interviewer_id"],
            ["users.id"],
        ),
    )
    op.create_index(op.f("ix_interviews_id"), "interviews", ["id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_interviews_id"), table_name="interviews")
    op.drop_table("interviews")
