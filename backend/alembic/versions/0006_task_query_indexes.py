"""add indexes for board and analytics query patterns

Revision ID: 0006_task_query_indexes
Revises: 0005_task_emoji
Create Date: 2026-04-26
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0006_task_query_indexes"
down_revision = "0005_task_emoji"
branch_labels = None
depends_on = None


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def _create_index_if_missing(name: str, table_name: str, columns: list[str]) -> None:
    if not _has_index(table_name, name):
        op.create_index(name, table_name, columns)


def _drop_index_if_exists(name: str, table_name: str) -> None:
    if _has_index(table_name, name):
        op.drop_index(name, table_name=table_name)


def upgrade() -> None:
    _create_index_if_missing(
        "ix_tasks_archived_done_column_position",
        "tasks",
        ["is_archived", "is_done", "board_column_id", "position"],
    )
    _create_index_if_missing("ix_tasks_deadline_at", "tasks", ["deadline_at"])
    _create_index_if_missing("ix_tasks_planned_return_at", "tasks", ["planned_return_at"])
    _create_index_if_missing(
        "ix_tasks_assignee_last_first",
        "tasks",
        ["assignee_last_name", "assignee_first_name"],
    )

    _create_index_if_missing("ix_task_tags_task_id_tag_id", "task_tags", ["task_id", "tag_id"])
    _create_index_if_missing("ix_task_tags_tag_id_task_id", "task_tags", ["tag_id", "task_id"])
    _create_index_if_missing("ix_task_comments_task_id_created_at", "task_comments", ["task_id", "created_at"])
    _create_index_if_missing("ix_task_history_task_id_created_at", "task_history", ["task_id", "created_at"])
    _create_index_if_missing(
        "ix_task_reminders_task_id_completed_remind_at",
        "task_reminders",
        ["task_id", "is_completed", "remind_at"],
    )


def downgrade() -> None:
    _drop_index_if_exists("ix_task_reminders_task_id_completed_remind_at", "task_reminders")
    _drop_index_if_exists("ix_task_history_task_id_created_at", "task_history")
    _drop_index_if_exists("ix_task_comments_task_id_created_at", "task_comments")
    _drop_index_if_exists("ix_task_tags_tag_id_task_id", "task_tags")
    _drop_index_if_exists("ix_task_tags_task_id_tag_id", "task_tags")

    _drop_index_if_exists("ix_tasks_assignee_last_first", "tasks")
    _drop_index_if_exists("ix_tasks_planned_return_at", "tasks")
    _drop_index_if_exists("ix_tasks_deadline_at", "tasks")
    _drop_index_if_exists("ix_tasks_archived_done_column_position", "tasks")
