"""add users, sessions and task ownership columns

Revision ID: 0008_multi_user_security_baseline
Revises: 0007_task_row_version_optimistic_lock
Create Date: 2026-04-27
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0008_multi_user_security_baseline"
down_revision = "0007_task_row_version_optimistic_lock"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return inspector.has_table(table_name)


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _table_exists("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("password_hash", sa.String(length=255), nullable=False),
            sa.Column("role", sa.String(length=16), nullable=False, server_default="member"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email"),
        )

    if not _table_exists("user_sessions"):
        op.create_table(
            "user_sessions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("token_hash", sa.String(length=255), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("token_hash"),
        )

    if not _has_column("tasks", "owner_id"):
        op.add_column("tasks", sa.Column("owner_id", sa.Integer(), nullable=True))
        op.create_foreign_key("fk_tasks_owner_id_users", "tasks", "users", ["owner_id"], ["id"])


def downgrade() -> None:
    if _has_column("tasks", "owner_id"):
        op.drop_constraint("fk_tasks_owner_id_users", "tasks", type_="foreignkey")
        op.drop_column("tasks", "owner_id")
    if _table_exists("user_sessions"):
        op.drop_table("user_sessions")
    if _table_exists("users"):
        op.drop_table("users")
