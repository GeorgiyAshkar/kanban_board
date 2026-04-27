from __future__ import annotations

from datetime import datetime

from app.models.models import Task


def touch_task(task: Task, *, at: datetime | None = None) -> None:
    task.updated_at = at or datetime.utcnow()
    task.row_version = (task.row_version or 0) + 1
