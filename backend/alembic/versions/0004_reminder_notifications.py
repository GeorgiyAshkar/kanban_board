"""reminder notifications queue

Revision ID: 0004_reminder_notifications
Revises: 0003_board_columns_canonical_status
Create Date: 2026-04-23
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_reminder_notifications"
down_revision = "0003_board_columns_canonical_status"
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return inspector.has_table(table_name)


def upgrade() -> None:
    if not _table_exists("reminder_notifications"):
        op.create_table(
            "reminder_notifications",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("reminder_id", sa.Integer(), nullable=False),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("body", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=12), nullable=False, server_default="queued"),
            sa.Column("available_at", sa.DateTime(), nullable=False),
            sa.Column("dispatched_at", sa.DateTime(), nullable=True),
            sa.Column("acknowledged_at", sa.DateTime(), nullable=True),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_error", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["reminder_id"], ["task_reminders.id"]),
            sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("reminder_id"),
        )
        op.create_index("ix_reminder_notifications_status", "reminder_notifications", ["status"])
        op.create_index("ix_reminder_notifications_available_at", "reminder_notifications", ["available_at"])


def downgrade() -> None:
    if _table_exists("reminder_notifications"):
        op.drop_index("ix_reminder_notifications_available_at", table_name="reminder_notifications")
        op.drop_index("ix_reminder_notifications_status", table_name="reminder_notifications")
        op.drop_table("reminder_notifications")
