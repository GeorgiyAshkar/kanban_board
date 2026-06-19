"""add task blocking fields

Revision ID: 0009_task_blocking_fields
Revises: 0008_board_column_wip_sla_limits
Create Date: 2026-06-19
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0009_task_blocking_fields"
down_revision = "0008_board_column_wip_sla_limits"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _has_column("tasks", "is_blocked"):
        op.add_column("tasks", sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default=sa.false()))
    if not _has_column("tasks", "block_reason"):
        op.add_column("tasks", sa.Column("block_reason", sa.Text(), nullable=True))
    if not _has_column("tasks", "blocker_task_id"):
        op.add_column("tasks", sa.Column("blocker_task_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    if _has_column("tasks", "blocker_task_id"):
        op.drop_column("tasks", "blocker_task_id")
    if _has_column("tasks", "block_reason"):
        op.drop_column("tasks", "block_reason")
    if _has_column("tasks", "is_blocked"):
        op.drop_column("tasks", "is_blocked")
