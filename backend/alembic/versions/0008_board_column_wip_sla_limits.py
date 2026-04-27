"""add WIP and SLA settings for board columns

Revision ID: 0008_board_column_wip_sla_limits
Revises: 0007_task_row_version_optimistic_lock
Create Date: 2026-04-27
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0008_board_column_wip_sla_limits"
down_revision = "0007_task_row_version_optimistic_lock"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _has_column("board_columns", "wip_limit"):
        op.add_column("board_columns", sa.Column("wip_limit", sa.Integer(), nullable=True))
    if not _has_column("board_columns", "sla_hours"):
        op.add_column("board_columns", sa.Column("sla_hours", sa.Integer(), nullable=True))


def downgrade() -> None:
    if _has_column("board_columns", "sla_hours"):
        op.drop_column("board_columns", "sla_hours")
    if _has_column("board_columns", "wip_limit"):
        op.drop_column("board_columns", "wip_limit")
