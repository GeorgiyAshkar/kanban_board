"""add canonical status to board columns

Revision ID: 0003_board_columns_canonical_status
Revises: 0002_task_assignee_fields
Create Date: 2026-04-23
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_board_columns_canonical_status"
down_revision = "0002_task_assignee_fields"
branch_labels = None
depends_on = None


STATUS_BY_NAME = {
    "Входящие": "inbox",
    "К выполнению": "todo",
    "В работе": "in_progress",
    "На паузе": "paused",
    "Готово": "done",
}


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _has_column("board_columns", "canonical_status"):
        op.add_column(
            "board_columns",
            sa.Column("canonical_status", sa.String(length=64), nullable=False, server_default="inbox"),
        )

    bind = op.get_bind()
    for name, status in STATUS_BY_NAME.items():
        bind.execute(
            sa.text(
                "UPDATE board_columns SET canonical_status = :status WHERE name = :name"
            ),
            {"status": status, "name": name},
        )


def downgrade() -> None:
    if _has_column("board_columns", "canonical_status"):
        op.drop_column("board_columns", "canonical_status")
