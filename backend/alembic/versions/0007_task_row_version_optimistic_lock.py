"""add row_version for optimistic locking on tasks

Revision ID: 0007_task_row_version_optimistic_lock
Revises: 0006_task_query_indexes
Create Date: 2026-04-27
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0007_task_row_version_optimistic_lock"
down_revision = "0006_task_query_indexes"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _has_column("tasks", "row_version"):
        op.add_column("tasks", sa.Column("row_version", sa.Integer(), nullable=False, server_default="1"))


def downgrade() -> None:
    if _has_column("tasks", "row_version"):
        op.drop_column("tasks", "row_version")
