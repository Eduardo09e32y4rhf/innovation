"""mvp models

Revision ID: c1a2b3d4e5f6
Revises: 79ddefb476fb
Create Date: 2026-01-31 23:12:31.531000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1a2b3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "79ddefb476fb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "plans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("price", sa.Integer(), nullable=True),
        sa.Column("features", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_plans_id"), "plans", ["id"], unique=False)

    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("status", sa.String(length=40), server_default=sa.text("'open'"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_jobs_company_id_companies"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_jobs_id"), "jobs", ["id"], unique=False)

    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("candidate_user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), server_default=sa.text("'pending'"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["candidate_user_id"], ["users.id"], name="fk_applications_candidate_user_id_users"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_applications_company_id_companies"),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], name="fk_applications_job_id_jobs"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id", "candidate_user_id", name="uq_applications_job_candidate"),
    )
    op.create_index(op.f("ix_applications_id"), "applications", ["id"], unique=False)

    op.create_table(
        "candidates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_candidates_company_id_companies"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_candidates_user_id_users"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_candidates_id"), "candidates", ["id"], unique=False)

    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("doc_type", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_documents_company_id_companies"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_documents_user_id_users"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_documents_id"), "documents", ["id"], unique=False)

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.Integer(), nullable=False),
        sa.Column("mp_preapproval_id", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=40), server_default=sa.text("'pending'"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], name="fk_subscriptions_plan_id_plans"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_subscriptions_user_id_users"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("mp_preapproval_id", name="uq_subscriptions_mp_preapproval_id"),
    )
    op.create_index(op.f("ix_subscriptions_id"), "subscriptions", ["id"], unique=False)
    op.create_index(
        op.f("ix_subscriptions_mp_preapproval_id"),
        "subscriptions",
        ["mp_preapproval_id"],
        unique=True,
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_audit_logs_user_id_users"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"], unique=False)

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("phone", sa.String(length=30), nullable=True))
        batch_op.add_column(
            sa.Column(
                "two_factor_enabled",
                sa.Boolean(),
                server_default=sa.text("true"),
                nullable=False,
            ),
        )

    op.execute("UPDATE users SET two_factor_enabled = true WHERE two_factor_enabled IS NULL")

    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.add_column(sa.Column("plan_id", sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "status",
                sa.String(length=30),
                server_default=sa.text("'active'"),
                nullable=False,
            ),
        )
        batch_op.create_foreign_key("fk_companies_plan_id_plans", "plans", ["plan_id"], ["id"])

    plan_table = sa.table(
        "plans",
        sa.column("id", sa.Integer()),
        sa.column("name", sa.String()),
        sa.column("price", sa.Integer()),
        sa.column("features", sa.JSON()),
    )
    op.bulk_insert(
        plan_table,
        [
            {"id": 1, "name": "basic", "price": None, "features": None},
            {"id": 2, "name": "equipe", "price": None, "features": None},
            {"id": 3, "name": "empresa", "price": None, "features": None},
        ],
    )

    op.execute("UPDATE companies SET plan_id = 1 WHERE plan_id IS NULL")
    op.execute("UPDATE companies SET status = 'active' WHERE status IS NULL")

    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.alter_column("plan_id", nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.drop_constraint("fk_companies_plan_id_plans", type_="foreignkey")
        batch_op.drop_column("status")
        batch_op.drop_column("plan_id")

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("two_factor_enabled")
        batch_op.drop_column("phone")

    op.drop_index(op.f("ix_audit_logs_id"), table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index(op.f("ix_subscriptions_mp_preapproval_id"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_id"), table_name="subscriptions")
    op.drop_table("subscriptions")

    op.drop_index(op.f("ix_documents_id"), table_name="documents")
    op.drop_table("documents")

    op.drop_index(op.f("ix_candidates_id"), table_name="candidates")
    op.drop_table("candidates")

    op.drop_index(op.f("ix_applications_id"), table_name="applications")
    op.drop_table("applications")

    op.drop_index(op.f("ix_jobs_id"), table_name="jobs")
    op.drop_table("jobs")

    op.drop_index(op.f("ix_plans_id"), table_name="plans")
    op.drop_table("plans")
