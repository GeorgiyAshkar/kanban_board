"""add emoji field to tasks

Revision ID: 0005_task_emoji
Revises: 0004_reminder_notifications
Create Date: 2026-04-23
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0005_task_emoji"
down_revision = "0004_reminder_notifications"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [column["name"] for column in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    if not _column_exists("tasks", "emoji"):
        op.add_column("tasks", sa.Column("emoji", sa.String(length=16), nullable=True))


def downgrade() -> None:
    if _column_exists("tasks", "emoji"):
        op.drop_column("tasks", "emoji")
