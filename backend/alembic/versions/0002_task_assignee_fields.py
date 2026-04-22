"""add assignee fields to tasks

Revision ID: 0002_task_assignee_fields
Revises: 0001_initial_schema
Create Date: 2026-04-22
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_task_assignee_fields"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    columns = [
        ("assignee_last_name", sa.String(length=128)),
        ("assignee_first_name", sa.String(length=128)),
        ("assignee_middle_name", sa.String(length=128)),
        ("assignee_phone", sa.String(length=64)),
        ("assignee_email", sa.String(length=255)),
        ("assignee_org", sa.String(length=255)),
    ]
    for name, col_type in columns:
        if not _has_column("tasks", name):
            op.add_column("tasks", sa.Column(name, col_type, nullable=True))


def downgrade() -> None:
    pass
