"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-22
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return inspector.has_table(table_name)


def upgrade() -> None:
    if not _table_exists("board_columns"):
        op.create_table(
            "board_columns",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("color", sa.String(length=32), nullable=True, server_default="#e2e8f0"),
            sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )

    if not _table_exists("tasks"):
        op.create_table(
            "tasks",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=64), nullable=True),
            sa.Column("priority", sa.String(length=8), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.Column("deadline_at", sa.DateTime(), nullable=True),
            sa.Column("planned_return_at", sa.DateTime(), nullable=True),
            sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("is_done", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("done_at", sa.DateTime(), nullable=True),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("board_column_id", sa.Integer(), nullable=True),
            sa.Column("project_id", sa.String(length=128), nullable=True),
            sa.Column("color_mark", sa.String(length=32), nullable=True),
            sa.Column("estimate_minutes", sa.Integer(), nullable=True),
            sa.Column("spent_minutes", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["board_column_id"], ["board_columns.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists("task_history"):
        op.create_table(
            "task_history",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("action_type", sa.String(length=64), nullable=False),
            sa.Column("field_name", sa.String(length=64), nullable=True),
            sa.Column("old_value", sa.Text(), nullable=True),
            sa.Column("new_value", sa.Text(), nullable=True),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("author", sa.String(length=128), nullable=False),
            sa.Column("meta_json", sa.JSON(), nullable=True),
            sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists("task_comments"):
        op.create_table(
            "task_comments",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("text", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.Column("author", sa.String(length=128), nullable=False),
            sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists("task_reminders"):
        op.create_table(
            "task_reminders",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("remind_at", sa.DateTime(), nullable=False),
            sa.Column("message", sa.Text(), nullable=True),
            sa.Column("repeat_type", sa.String(length=8), nullable=True),
            sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("notification_sent_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists("tags"):
        op.create_table(
            "tags",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=64), nullable=False),
            sa.Column("color", sa.String(length=32), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )

    if not _table_exists("task_tags"):
        op.create_table(
            "task_tags",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("tag_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["tag_id"], ["tags.id"]),
            sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("task_id", "tag_id", name="uq_task_tag"),
        )

    if not _table_exists("task_checklist_items"):
        op.create_table(
            "task_checklist_items",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_done", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("done_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    pass
