"""add task service class and work type

Revision ID: 0010_task_service_class_work_type
Revises: 0009_task_blocking_fields
Create Date: 2026-06-19
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0010_task_service_class_work_type"
down_revision = "0009_task_blocking_fields"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _has_column("tasks", "service_class"):
        op.add_column("tasks", sa.Column("service_class", sa.String(length=32), nullable=False, server_default="standard"))
    if not _has_column("tasks", "work_type"):
        op.add_column("tasks", sa.Column("work_type", sa.String(length=32), nullable=False, server_default="feature"))
    if not _has_column("tasks", "policy_note"):
        op.add_column("tasks", sa.Column("policy_note", sa.Text(), nullable=True))


def downgrade() -> None:
    if _has_column("tasks", "policy_note"):
        op.drop_column("tasks", "policy_note")
    if _has_column("tasks", "work_type"):
        op.drop_column("tasks", "work_type")
    if _has_column("tasks", "service_class"):
        op.drop_column("tasks", "service_class")
