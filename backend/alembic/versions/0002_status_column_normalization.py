"""normalize status/columns and enforce task_tag uniqueness

Revision ID: 0002_status_column_normalization
Revises: 0001_initial_schema
Create Date: 2026-04-22
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_status_column_normalization"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _index_exists(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if _column_exists("board_columns", "system_key") is False:
        op.add_column("board_columns", sa.Column("system_key", sa.String(length=64), nullable=True))

    bind.execute(
        sa.text(
            """
            UPDATE board_columns
            SET system_key = CASE
                WHEN lower(name) LIKE '%вход%' THEN 'inbox'
                WHEN lower(name) LIKE '%выполн%' THEN 'todo'
                WHEN lower(name) LIKE '%работ%' THEN 'in_progress'
                WHEN lower(name) LIKE '%пауз%' THEN 'paused'
                WHEN lower(name) LIKE '%готов%' THEN 'done'
                ELSE system_key
            END
            WHERE system_key IS NULL
            """
        )
    )

    if _index_exists("board_columns", "uq_board_columns_system_key") is False:
        op.create_index("uq_board_columns_system_key", "board_columns", ["system_key"], unique=True)

    bind.execute(
        sa.text(
            """
            UPDATE tasks
            SET status = CASE
                WHEN status IN ('inbox', 'todo', 'in_progress', 'paused', 'done') THEN status
                ELSE 'inbox'
            END
            """
        )
    )

    bind.execute(
        sa.text(
            """
            DELETE FROM task_tags
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM task_tags
                GROUP BY task_id, tag_id
            )
            """
        )
    )
    if _index_exists("task_tags", "uq_task_tag") is False:
        op.create_index("uq_task_tag", "task_tags", ["task_id", "tag_id"], unique=True)


def downgrade() -> None:
    pass
